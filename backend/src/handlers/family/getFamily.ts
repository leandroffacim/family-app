import { GetCommand } from "@aws-sdk/lib-dynamodb";
import { APIGatewayProxyHandler } from "aws-lambda";
import {
  assertFamilyAccess,
  ForbiddenFamilyError,
  UnlinkedAccountError,
} from "../../lib/auth";
import { ddb, TABLE_NAME } from "../../lib/dynamo";
import { familyPK, metadataSK } from "../../lib/keys";
import { err, ok } from "../../lib/response";

// GET /families/{familyId}
export const handler: APIGatewayProxyHandler = async (event) => {
  const familyId = event.pathParameters?.familyId;
  if (!familyId) return err(400, "familyId é obrigatório");

  try {
    assertFamilyAccess(event, familyId);
  } catch (e) {
    if (e instanceof UnlinkedAccountError || e instanceof ForbiddenFamilyError)
      return err(403, e.message);
    throw e;
  }

  const result = await ddb.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { PK: familyPK(familyId), SK: metadataSK() },
    }),
  );

  if (!result.Item) return err(404, "Família não encontrada");

  return ok({
    name: result.Item.name,
    streak: result.Item.streak ?? 0,
  });
};
