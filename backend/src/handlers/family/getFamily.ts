import { APIGatewayProxyHandler } from "aws-lambda";
import { GetCommand } from "@aws-sdk/lib-dynamodb";
import { ddb, TABLE_NAME } from "../../lib/dynamo";
import { familyPK, metadataSK } from "../../lib/keys";
import { ok, err } from "../../lib/response";

// GET /families/{familyId}
export const handler: APIGatewayProxyHandler = async (event) => {
  const familyId = event.pathParameters?.familyId;
  if (!familyId) return err(400, "familyId é obrigatório");

  const result = await ddb.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { PK: familyPK(familyId), SK: metadataSK() },
    })
  );

  if (!result.Item) return err(404, "Família não encontrada");

  return ok({
    name: result.Item.name,
    streak: result.Item.streak ?? 0,
  });
};
