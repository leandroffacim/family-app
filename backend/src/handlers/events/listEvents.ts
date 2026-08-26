import { QueryCommand } from "@aws-sdk/lib-dynamodb";
import { APIGatewayProxyHandler } from "aws-lambda";
import { ddb, TABLE_NAME } from "../../lib/dynamo";
import { familyPK } from "../../lib/keys";
import { err, ok } from "../../lib/response";
import { assertFamilyAccess, UnlinkedAccountError, ForbiddenFamilyError } from "../../lib/auth";

// GET /families/{familyId}/events?date=YYYY-MM-DD (opcional — sem
// data, retorna todos os compromissos cadastrados)
export const handler: APIGatewayProxyHandler = async (event) => {
  console.log("listEvents", JSON.stringify(event));
  const familyId = event.pathParameters?.familyId;
  if (!familyId) return err(400, "familyId é obrigatório");

  try {
    assertFamilyAccess(event, familyId);
  } catch (e) {
    if (e instanceof UnlinkedAccountError || e instanceof ForbiddenFamilyError) return err(403, e.message);
    throw e;
  }

  const date = event.queryStringParameters?.date;
  const prefix = date ? `EVENT#${date}#` : "EVENT#";

  const result = await ddb.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :prefix)",
      ExpressionAttributeValues: {
        ":pk": familyPK(familyId),
        ":prefix": prefix,
      },
    }),
  );

  return ok({ items: result.Items ?? [] });
};
