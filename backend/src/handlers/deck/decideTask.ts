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

// POST /families/{familyId}/deck/{taskId}/decide   body: { "action": "done" | "pass" | "defer" }
//
// done   -> marca a instância de hoje como concluída
// defer  -> marca como adiada (fica pendente de novo amanhã, o job diário não recria a mesma data)
// pass   -> avança o rodízio da tarefa (TASK.currentIndex) e reatribui a
//           instância de hoje, tudo numa transação (mesmo padrão de
//           TransactWriteItems usado no outbox pattern)

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
    return err(
      400,
      "body inválido: esperado { action: 'done' | 'pass' | 'defer' }",
    );
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
          },
          ConditionExpression: "attribute_exists(PK)",
        }),
      );
    } catch {
      return err(404, "Instância da tarefa não encontrada para hoje");
    }
    return ok({ status: newStatus, completedBy: acting.memberId });
  }

  // action === "pass"
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

  const nextIndex = (task.Item.currentIndex + 1) % rotationOrder.length;
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
              ExpressionAttributeValues: { ":i": nextIndex },
            },
          },
          {
            Update: {
              TableName: TABLE_NAME,
              Key: { PK: pk, SK: instanceSK(date, taskId) },
              // guarda previousAssignee/previousIndex para permitir desfazer
              // (undoDecision.ts) sem precisar recalcular o rodízio ao contrário
              UpdateExpression:
                "SET #s = :passed, assignee = :next, GSI1PK = :gsi1pk, GSI1SK = :date, previousAssignee = :prevAssignee, previousIndex = :prevIndex, passedBy = :passedBy",
              ExpressionAttributeNames: { "#s": "status" },
              ExpressionAttributeValues: {
                ":passed": "passed",
                ":next": nextAssignee,
                ":gsi1pk": gsi1pkMember(familyId, nextAssignee),
                ":date": date,
                ":prevAssignee":
                  task.Item.rotationOrder[task.Item.currentIndex],
                ":prevIndex": task.Item.currentIndex,
                ":passedBy": acting.memberId,
              },
              ConditionExpression: "attribute_exists(PK)",
            },
          },
        ],
      }),
    );
  } catch {
    return err(
      409,
      "Não foi possível passar a tarefa (conflito ou instância inexistente)",
    );
  }

  return ok({ status: "passed", nextAssignee, passedBy: acting.memberId });
};
