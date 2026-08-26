import { APIGatewayProxyHandler } from "aws-lambda";
import { QueryCommand } from "@aws-sdk/lib-dynamodb";
import { ddb, TABLE_NAME } from "../../lib/dynamo";
import { familyPK } from "../../lib/keys";
import { ok, err } from "../../lib/response";
import { todayISO } from "../../lib/date";
import { assertFamilyAccess, UnlinkedAccountError, ForbiddenFamilyError } from "../../lib/auth";

// GET /families/{familyId}/deck?date=YYYY-MM-DD (date é opcional, default hoje)
// Retorna só as instâncias com status "pending" — as já decididas
// (done/passed/deferred) saem do baralho do dia.
export const handler: APIGatewayProxyHandler = async (event) => {
  const familyId = event.pathParameters?.familyId;
  if (!familyId) return err(400, "familyId é obrigatório");

  try {
    assertFamilyAccess(event, familyId);
  } catch (e) {
    if (e instanceof UnlinkedAccountError || e instanceof ForbiddenFamilyError) return err(403, e.message);
    throw e;
  }

  const date = event.queryStringParameters?.date ?? todayISO();

  const result = await ddb.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :skPrefix)",
      ExpressionAttributeValues: {
        ":pk": familyPK(familyId),
        ":skPrefix": `INSTANCE#${date}#`,
      },
    })
  );

  const items = (result.Items ?? []).filter((i) => i.status === "pending");
  return ok({ date, items });
};
