import { QueryCommand } from "@aws-sdk/lib-dynamodb";
import { APIGatewayProxyHandler } from "aws-lambda";
import {
  assertFamilyAccess,
  ForbiddenFamilyError,
  UnlinkedAccountError,
} from "../../lib/auth";
import { ddb, TABLE_NAME } from "../../lib/dynamo";
import { familyPK } from "../../lib/keys";
import { err, ok } from "../../lib/response";

// GET /families/{familyId}/members
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
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :prefix)",
      ExpressionAttributeValues: {
        ":pk": familyPK(familyId),
        ":prefix": "MEMBER#",
      },
    }),
  );

  // A tabela usa `memberId`, enquanto o frontend trabalha com `id`.
  // Antes dessa normalização o createTask recebia rotationOrder vazio
  // porque `member.id` era undefined e era removido pelo filter(Boolean).
  const items = (result.Items ?? []).map((item) => ({
    id: String(item.memberId ?? String(item.SK ?? "").replace(/^MEMBER#/, "")),
    name: String(item.name ?? item.email ?? "Membro"),
    color: String(item.color ?? "#4F46E5"),
  }));

  return ok({ items });
};
