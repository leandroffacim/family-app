import { APIGatewayProxyHandler } from "aws-lambda";
import { QueryCommand } from "@aws-sdk/lib-dynamodb";
import { ddb, TABLE_NAME } from "../../lib/dynamo";
import { familyPK } from "../../lib/keys";
import { ok, err } from "../../lib/response";
import { assertFamilyAccess, UnlinkedAccountError, ForbiddenFamilyError } from "../../lib/auth";

// GET /families/{familyId}/tasks
export const handler: APIGatewayProxyHandler = async (event) => {
  const familyId = event.pathParameters?.familyId;
  if (!familyId) return err(400, "familyId é obrigatório");

  try {
    assertFamilyAccess(event, familyId);
  } catch (e) {
    if (e instanceof UnlinkedAccountError || e instanceof ForbiddenFamilyError) return err(403, e.message);
    throw e;
  }

  const result = await ddb.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :prefix)",
      ExpressionAttributeValues: { ":pk": familyPK(familyId), ":prefix": "TASK#" },
    })
  );

  return ok({ items: result.Items ?? [] });
};
