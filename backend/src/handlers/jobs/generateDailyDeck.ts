import { QueryCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import { ddb, TABLE_NAME } from "../../lib/dynamo";
import { familyPK, instanceSK, gsi1pkMember } from "../../lib/keys";
import { todayISO, weekdayIndex, dayOfMonthOf } from "../../lib/date";
import { Task } from "../../lib/types";

// Disparado pelo EventBridge (cron diário). Lê as TASK# da família
// configurada em FAMILY_ID e cria a INSTANCE# do dia para cada
// tarefa que está "em dia" hoje, respeitando a frequência.
//
// Idempotente: usa ConditionExpression pra nunca sobrescrever uma
// instância que já existe (ex: se o job rodar 2x no mesmo dia).

const FAMILY_ID = process.env.FAMILY_ID as string;

function isDueToday(task: Task, date: string): boolean {
  if (task.freq === "DAILY") return true;
  if (task.freq === "WEEKLY") return task.dayOfWeek === weekdayIndex(date);
  if (task.freq === "MONTHLY") return task.dayOfMonth === dayOfMonthOf(date);
  return false;
}

export const handler = async () => {
  const date = todayISO();
  const pk = familyPK(FAMILY_ID);

  const tasksResult = await ddb.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :prefix)",
      ExpressionAttributeValues: { ":pk": pk, ":prefix": "TASK#" },
    })
  );

  const tasks = (tasksResult.Items ?? []) as Task[];
  const dueTasks = tasks.filter((t) => isDueToday(t, date));

  let created = 0;
  for (const task of dueTasks) {
    const assignee = task.rotationOrder[task.currentIndex % task.rotationOrder.length];
    try {
      await ddb.send(
        new PutCommand({
          TableName: TABLE_NAME,
          Item: {
            PK: pk,
            SK: instanceSK(date, task.id),
            GSI1PK: gsi1pkMember(FAMILY_ID, assignee),
            GSI1SK: date,
            date,
            taskId: task.id,
            name: task.name,
            freq: task.freq,
            weight: task.weight,
            assignee,
            status: "pending",
          },
          ConditionExpression: "attribute_not_exists(PK)",
        })
      );
      created++;
    } catch {
      // já existia (job rodou de novo hoje) — segue o baile
    }
  }

  console.log(`Baralho de ${date}: ${created}/${dueTasks.length} instâncias criadas`);
  return { date, created, due: dueTasks.length };
};
