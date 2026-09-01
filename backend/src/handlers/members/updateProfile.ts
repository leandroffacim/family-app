import { UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { APIGatewayProxyHandler } from "aws-lambda";
import { z } from "zod";
import {
  assertFamilyAccess,
  ForbiddenFamilyError,
  UnlinkedAccountError,
} from "../../lib/auth";
import { ddb, TABLE_NAME } from "../../lib/dynamo";
import { familyPK, memberSK } from "../../lib/keys";
import { err, ok } from "../../lib/response";
import { AVATAR_COLORS } from "../../lib/types";

// PATCH /families/{familyId}/members/me
// Alvo da atualização é sempre o custom:memberId do token (assertFamilyAccess),
// nunca um memberId vindo do path ou do body.
const bodySchema = z
  .object({
    name: z.string().trim().min(1).max(50).optional(),
    color: z.enum(AVATAR_COLORS).optional(),
  })
  .refine((v) => v.name !== undefined || v.color !== undefined, {
    message: "informe ao menos um campo (name ou color) para atualizar",
  });

export const handler: APIGatewayProxyHandler = async (event) => {
  const familyId = event.pathParameters?.familyId;
  if (!familyId) return err(400, "familyId é obrigatório");

  let memberId: string;
  try {
    ({ memberId } = assertFamilyAccess(event, familyId));
  } catch (e) {
    if (e instanceof UnlinkedAccountError || e instanceof ForbiddenFamilyError)
      return err(403, e.message);
    throw e;
  }

  let body;
  try {
    body = bodySchema.parse(JSON.parse(event.body ?? "{}"));
  } catch (e) {
    return err(400, e instanceof Error ? e.message : "body inválido");
  }

  const setClauses: string[] = [];
  const attributeNames: Record<string, string> = {};
  const attributeValues: Record<string, unknown> = {};

  if (body.name !== undefined) {
    setClauses.push("#name = :name");
    attributeNames["#name"] = "name";
    attributeValues[":name"] = body.name;
  }
  if (body.color !== undefined) {
    setClauses.push("color = :color");
    attributeValues[":color"] = body.color;
  }

  await ddb.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { PK: familyPK(familyId), SK: memberSK(memberId) },
      UpdateExpression: `SET ${setClauses.join(", ")}`,
      ExpressionAttributeNames:
        Object.keys(attributeNames).length > 0 ? attributeNames : undefined,
      ExpressionAttributeValues: attributeValues,
      ConditionExpression: "attribute_exists(PK)",
    }),
  );

  return ok({ memberId, ...body });
};
