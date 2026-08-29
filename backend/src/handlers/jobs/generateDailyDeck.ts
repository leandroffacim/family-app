import {
  GetCommand,
  PutCommand,
  QueryCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { dayOfMonthOf, shiftISO, todayISO, weekdayIndex } from "../../lib/date";
import { ddb, TABLE_NAME } from "../../lib/dynamo";
import { GSI2PK_FAMILIES, gsi1pkMember, instanceSK, metadataSK } from "../../lib/keys";
import { Task } from "../../lib/types";

// Instâncias diárias não são mais lidas por nada depois de ~1 dia (o
// streak só olha "ontem", ver updateStreak) — TTL evita a tabela
// crescer pra sempre. DynamoDB costuma remover o item em até 48h
// depois do expiresAt, não instantaneamente.
const INSTANCE_TTL_DAYS = 90;
function instanceExpiresAt(): number {
  return Math.floor(Date.now() / 1000) + INSTANCE_TTL_DAYS * 24 * 60 * 60;
}

// Disparado pelo EventBridge (cron diário). Faz um Query no GSI2 pra
// achar todas as FAMILY#{id}/METADATA existentes (sem Scan na tabela
// inteira) e cria a INSTANCE# do dia para cada tarefa "em dia" hoje,
// em cada família, respeitando a frequência.
//
// Idempotente: usa ConditionExpression pra nunca sobrescrever uma
// instância que já existe (ex: se o job rodar 2x no mesmo dia).

function isDueToday(task: Task, date: string): boolean {
  if (task.freq === "DAILY") return true;
  if (task.freq === "WEEKLY") return task.dayOfWeek === weekdayIndex(date);
  if (task.freq === "MONTHLY") return task.dayOfMonth === dayOfMonthOf(date);
  return false;
}

// Streak = dias seguidos em que o baralho foi zerado (nenhuma
// instância ficou "pending"). "Passou" ou "adiou" ainda conta como
// zerado — o que quebra o streak é deixar carta sem decidir.
// Um dia sem nenhuma tarefa devida não conta nem quebra o streak.
// Guarda streakUpdatedDate pra não recalcular 2x se o job rodar de
// novo no mesmo dia (mesmo padrão de idempotência do resto do job).
async function updateStreak(pk: string, today: string): Promise<number> {
  const meta = (
    await ddb.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: { PK: pk, SK: metadataSK() },
      }),
    )
  ).Item as { streak?: number; streakUpdatedDate?: string } | undefined;

  const currentStreak = meta?.streak ?? 0;
  if (meta?.streakUpdatedDate === today) return currentStreak;

  const yesterday = shiftISO(today, -1);
  const yesterdayItems =
    (
      await ddb.send(
        new QueryCommand({
          TableName: TABLE_NAME,
          KeyConditionExpression: "PK = :pk AND begins_with(SK, :prefix)",
          ExpressionAttributeValues: {
            ":pk": pk,
            ":prefix": `INSTANCE#${yesterday}#`,
          },
        }),
      )
    ).Items ?? [];

  let nextStreak = currentStreak;
  if (yesterdayItems.length > 0) {
    const hadPending = yesterdayItems.some((item) => item.status === "pending");
    nextStreak = hadPending ? 0 : currentStreak + 1;
  }

  await ddb.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { PK: pk, SK: metadataSK() },
      UpdateExpression: "SET streak = :s, streakUpdatedDate = :d",
      ExpressionAttributeValues: { ":s": nextStreak, ":d": today },
    }),
  );

  return nextStreak;
}

async function listFamilyIds(): Promise<string[]> {
  const familyIds: string[] = [];
  let ExclusiveStartKey: Record<string, unknown> | undefined;

  do {
    const result = await ddb.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        IndexName: "GSI2",
        KeyConditionExpression: "GSI2PK = :pk",
        ExpressionAttributeValues: { ":pk": GSI2PK_FAMILIES },
        ExclusiveStartKey,
      }),
    );
    for (const item of result.Items ?? []) {
      const pk = item.PK as string;
      familyIds.push(pk.replace("FAMILY#", ""));
    }
    ExclusiveStartKey = result.LastEvaluatedKey;
  } while (ExclusiveStartKey);

  return familyIds;
}

async function processFamily(familyId: string, date: string) {
  const pk = `FAMILY#${familyId}`;

  const streak = await updateStreak(pk, date);

  const tasksResult = await ddb.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :prefix)",
      ExpressionAttributeValues: { ":pk": pk, ":prefix": "TASK#" },
    }),
  );

  const tasks = (tasksResult.Items ?? []) as Task[];
  const dueTasks = tasks.filter((t) => isDueToday(t, date));

  let created = 0;
  for (const task of dueTasks) {
    const assignee =
      task.rotationOrder[task.currentIndex % task.rotationOrder.length];
    try {
      await ddb.send(
        new PutCommand({
          TableName: TABLE_NAME,
          Item: {
            PK: pk,
            SK: instanceSK(date, task.id),
            GSI1PK: gsi1pkMember(familyId, assignee),
            GSI1SK: date,
            date,
            taskId: task.id,
            name: task.name,
            freq: task.freq,
            weight: task.weight,
            assignee,
            status: "pending",
            expiresAt: instanceExpiresAt(),
          },
          ConditionExpression: "attribute_not_exists(PK)",
        }),
      );
      created++;
    } catch {
      // já existia (job rodou de novo hoje) — segue o baile
    }
  }

  return { created, due: dueTasks.length, streak };
}

export const handler = async () => {
  const date = todayISO();
  const familyIds = await listFamilyIds();

  const results: Record<
    string,
    { created: number; due: number; streak: number } | { error: string }
  > = {};

  for (const familyId of familyIds) {
    try {
      results[familyId] = await processFamily(familyId, date);
      const r = results[familyId] as {
        created: number;
        due: number;
        streak: number;
      };
      console.log(
        `Baralho de ${date} (família ${familyId}): ${r.created}/${r.due} instâncias criadas (streak=${r.streak})`,
      );
    } catch (err) {
      results[familyId] = {
        error: err instanceof Error ? err.message : String(err),
      };
      console.error(`Falha ao gerar baralho da família ${familyId}:`, err);
    }
  }

  return { date, families: results };
};
