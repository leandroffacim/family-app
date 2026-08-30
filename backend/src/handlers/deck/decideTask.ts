import {
  GetCommand,
  TransactWriteCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { APIGatewayProxyHandler } from "aws-lambda";
import { z } from "zod";
import {
  assertFamilyAccess,
  ForbiddenFamilyError,
  UnlinkedAccountError,
} from "../../lib/auth";
import { todayISO } from "../../lib/date";
import { ddb, TABLE_NAME } from "../../lib/dynamo";
import { familyPK, gsi1pkMember, instanceSK, taskSK } from "../../lib/keys";
import { err, ok } from "../../lib/response";

const bodySchema = z.object({ action: z.enum(["done", "pass", "defer"]) });

export const handler: APIGatewayProxyHandler = async (event) => {
  const familyId = event.pathParameters?.familyId;
  const taskId = event.pathParameters?.taskId;
  if (!familyId || !taskId)
    return err(400, "familyId e taskId são obrigatórios");

  let parsedBody;
  try {
    parsedBody = bodySchema.parse(JSON.parse(event.body ?? "{}"));
  } catch {
    return err(400, "body inválido: esperado { action: 'done' | 'pass' | 'defer' }");
  }

  let acting;
  try {
    acting = assertFamilyAccess(event, familyId);
  } catch (e) {
    if (e instanceof UnlinkedAccountError || e instanceof ForbiddenFamilyError)
      return err(403, e.message);
    throw e;
  }

  const date = todayISO();
  const pk = familyPK(familyId);

  if (parsedBody.action === "done" || parsedBody.action === "defer") {
    const newStatus = parsedBody.action === "done" ? "done" : "deferred";
    try {
      await ddb.send(
        new UpdateCommand({
          TableName: TABLE_NAME,
          Key: { PK: pk, SK: instanceSK(date, taskId) },
          UpdateExpression: "SET #s = :status, completedBy = :completedBy",
          ExpressionAttributeNames: { "#s": "status" },
          ExpressionAttributeValues: {
            ":status": newStatus,
            ":completedBy": acting.memberId,
            ":pending": "pending",
          },
          // Só decide uma carta que ainda está "pending" — sem isso,
          // um "concluir" e um "passar" concorrentes na mesma carta (ou
          // duas decisões atrasadas/retry) podiam pisar um no outro e
          // deixar a instância num estado contraditório (ex: marcada
          // como "done" depois de já ter sido passada pra outra
          // pessoa). Mesmo raciocínio do bloqueio otimista do "passar".
          ConditionExpression: "attribute_exists(PK) AND #s = :pending",
        }),
      );
    } catch {
      return err(
        409,
        "Não foi possível registrar a decisão (conflito ou instância inexistente)",
      );
    }
    return ok({ status: newStatus, completedBy: acting.memberId });
  }

  const task = await ddb.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { PK: pk, SK: taskSK(taskId) },
    }),
  );
  if (!task.Item) return err(404, "Tarefa não encontrada");

  const rotationOrder: string[] = task.Item.rotationOrder ?? [];
  if (rotationOrder.length === 0)
    return err(400, "Tarefa sem rodízio configurado");

  const currentIndex = Number(task.Item.currentIndex ?? 0);
  const nextIndex = (currentIndex + 1) % rotationOrder.length;
  const nextAssignee = rotationOrder[nextIndex];

  try {
    await ddb.send(
      new TransactWriteCommand({
        TransactItems: [
          {
            Update: {
              TableName: TABLE_NAME,
              Key: { PK: pk, SK: taskSK(taskId) },
              UpdateExpression: "SET currentIndex = :i",
              // Bloqueio otimista: só avança se currentIndex ainda for o
              // valor que acabamos de ler. Se duas decisões concorrentes
              // (retry de rede, app aberto em 2 aparelhos) chegarem quase
              // juntas, a segunda falha aqui em vez de avançar o rodízio
              // duas vezes e pular uma pessoa da fila.
              ConditionExpression: "currentIndex = :expectedCurrent",
              ExpressionAttributeValues: {
                ":i": nextIndex,
                ":expectedCurrent": currentIndex,
              },
            },
          },
          {
            Update: {
              TableName: TABLE_NAME,
              Key: { PK: pk, SK: instanceSK(date, taskId) },
              UpdateExpression:
                "SET #s = :pending, assignee = :next, GSI1PK = :gsi1pk, GSI1SK = :date, previousAssignee = :prevAssignee, previousIndex = :prevIndex, passedBy = :passedBy",
              ExpressionAttributeNames: { "#s": "status" },
              ExpressionAttributeValues: {
                ":pending": "pending",
                ":next": nextAssignee,
                ":gsi1pk": gsi1pkMember(familyId, nextAssignee),
                ":date": date,
                ":prevAssignee": rotationOrder[currentIndex],
                ":prevIndex": currentIndex,
                ":passedBy": acting.memberId,
              },
              ConditionExpression: "attribute_exists(PK)",
            },
          },
        ],
      }),
    );
  } catch {
    return err(409, "Não foi possível passar a tarefa (conflito ou instância inexistente)");
  }

  return ok({ status: "passed", nextAssignee, passedBy: acting.memberId });
};
