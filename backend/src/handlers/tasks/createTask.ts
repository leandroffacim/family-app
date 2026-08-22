import { APIGatewayProxyHandler } from "aws-lambda";
import { PutCommand } from "@aws-sdk/lib-dynamodb";
import { ulid } from "ulid";
import { z } from "zod";
import { ddb, TABLE_NAME } from "../../lib/dynamo";
import { familyPK, taskSK } from "../../lib/keys";
import { ok, err } from "../../lib/response";

// POST /families/{familyId}/tasks
const bodySchema = z
  .object({
    name: z.string().min(1),
    freq: z.enum(["DAILY", "WEEKLY", "MONTHLY"]),
    weight: z.union([z.literal(1), z.literal(2), z.literal(3)]),
    rotationOrder: z.array(z.string()).min(1),
    dayOfWeek: z.number().min(0).max(6).optional(),
    dayOfMonth: z.number().min(1).max(31).optional(),
  })
  .refine((v) => v.freq !== "WEEKLY" || v.dayOfWeek !== undefined, {
    message: "dayOfWeek é obrigatório para tarefas semanais",
  })
  .refine((v) => v.freq !== "MONTHLY" || v.dayOfMonth !== undefined, {
    message: "dayOfMonth é obrigatório para tarefas mensais",
  });

export const handler: APIGatewayProxyHandler = async (event) => {
  const familyId = event.pathParameters?.familyId;
  if (!familyId) return err(400, "familyId é obrigatório");

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
      Item: { PK: familyPK(familyId), SK: taskSK(id), id, ...body, currentIndex: 0 },
    })
  );

  return ok({ id }, 201);
};
