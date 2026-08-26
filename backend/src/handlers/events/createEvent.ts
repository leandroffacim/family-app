import { APIGatewayProxyHandler } from "aws-lambda";
import { PutCommand } from "@aws-sdk/lib-dynamodb";
import { ulid } from "ulid";
import { z } from "zod";
import { ddb, TABLE_NAME } from "../../lib/dynamo";
import { familyPK, eventSK } from "../../lib/keys";
import { ok, err } from "../../lib/response";
import { assertFamilyAccess, UnlinkedAccountError, ForbiddenFamilyError } from "../../lib/auth";

// POST /families/{familyId}/events
const bodySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date deve ser YYYY-MM-DD"),
  time: z.string().regex(/^\d{2}:\d{2}$/, "time deve ser HH:mm"),
  title: z.string().min(1),
  members: z.array(z.string()).min(1),
  location: z.string().optional(),
});

export const handler: APIGatewayProxyHandler = async (event) => {
  const familyId = event.pathParameters?.familyId;
  if (!familyId) return err(400, "familyId é obrigatório");

  try {
    assertFamilyAccess(event, familyId);
  } catch (e) {
    if (e instanceof UnlinkedAccountError || e instanceof ForbiddenFamilyError) return err(403, e.message);
    throw e;
  }

  let body;
  try {
    body = bodySchema.parse(JSON.parse(event.body ?? "{}"));
  } catch (e) {
    return err(400, e instanceof Error ? e.message : "body inválido");
  }

  const id = ulid();
  await ddb.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: { PK: familyPK(familyId), SK: eventSK(body.date, id), id, ...body },
    })
  );

  return ok({ id }, 201);
};
