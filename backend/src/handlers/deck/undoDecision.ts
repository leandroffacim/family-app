import { APIGatewayProxyHandler } from "aws-lambda";
import { GetCommand, TransactWriteCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { ddb, TABLE_NAME } from "../../lib/dynamo";
import { familyPK, taskSK, instanceSK, gsi1pkMember } from "../../lib/keys";
import { ok, err } from "../../lib/response";
import { todayISO } from "../../lib/date";

// POST /families/{familyId}/deck/{taskId}/undo   body: {} (opcional: ?date=YYYY-MM-DD)
//
// Reverte a última decisão (done/pass/defer) da instância de hoje, trazendo a
// tarefa de volta pro baralho pendente na hora, sem esperar o job diário.
export const handler: APIGatewayProxyHandler = async (event) => {
  const familyId = event.pathParameters?.familyId;
  const taskId = event.pathParameters?.taskId;
  if (!familyId || !taskId) return err(400, "familyId e taskId são obrigatórios");

  const date = event.queryStringParameters?.date ?? todayISO();
  const pk = familyPK(familyId);

  const current = await ddb.send(
    new GetCommand({ TableName: TABLE_NAME, Key: { PK: pk, SK: instanceSK(date, taskId) } })
  );
  if (!current.Item) return err(404, "Instância da tarefa não encontrada");
  if (current.Item.status === "pending") {
    return err(400, "Essa tarefa já está pendente, nada para desfazer");
  }

  if (current.Item.status === "done" || current.Item.status === "deferred") {
    try {
      await ddb.send(
        new UpdateCommand({
          TableName: TABLE_NAME,
          Key: { PK: pk, SK: instanceSK(date, taskId) },
          UpdateExpression: "SET #s = :pending REMOVE completedBy",
          ExpressionAttributeNames: { "#s": "status" },
          ExpressionAttributeValues: { ":pending": "pending" },
          ConditionExpression: "attribute_exists(PK) AND #s <> :pending",
        })
      );
    } catch {
      return err(409, "Não foi possível desfazer (conflito)");
    }
    return ok({ status: "pending" });
  }

  // status === "passed" -> reverte assignee/rodízio usando os valores
  // gravados pelo decideTask no momento do "pass"
  const previousAssignee = current.Item.previousAssignee ?? current.Item.assignee;
  const previousIndex = current.Item.previousIndex;

  if (previousIndex === undefined) {
    return err(400, "Não há dados suficientes para desfazer esse 'passa'");
  }

  const task = await ddb.send(
    new GetCommand({ TableName: TABLE_NAME, Key: { PK: pk, SK: taskSK(taskId) } })
  );
  if (!task.Item) return err(404, "Tarefa não encontrada");

  try {
    await ddb.send(
      new TransactWriteCommand({
        TransactItems: [
          {
            Update: {
              TableName: TABLE_NAME,
              Key: { PK: pk, SK: taskSK(taskId) },
              UpdateExpression: "SET currentIndex = :i",
              ExpressionAttributeValues: { ":i": previousIndex },
            },
          },
          {
            Update: {
              TableName: TABLE_NAME,
              Key: { PK: pk, SK: instanceSK(date, taskId) },
              UpdateExpression:
                "SET #s = :pending, assignee = :prevAssignee, GSI1PK = :gsi1pk, GSI1SK = :date REMOVE previousAssignee, previousIndex, passedBy",
              ExpressionAttributeNames: { "#s": "status" },
              ExpressionAttributeValues: {
                ":pending": "pending",
                ":prevAssignee": previousAssignee,
                ":gsi1pk": gsi1pkMember(familyId, previousAssignee),
                ":date": date,
              },
              ConditionExpression: "attribute_exists(PK)",
            },
          },
        ],
      })
    );
  } catch {
    return err(409, "Não foi possível desfazer (conflito)");
  }

  return ok({ status: "pending", assignee: previousAssignee });
};
