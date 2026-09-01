import {
  AdminDeleteUserCommand,
  CognitoIdentityProviderClient,
} from "@aws-sdk/client-cognito-identity-provider";
import {
  DeleteCommand,
  GetCommand,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";
import { APIGatewayProxyHandler } from "aws-lambda";
import {
  assertFamilyAccess,
  ForbiddenFamilyError,
  UnlinkedAccountError,
} from "../../lib/auth";
import { ddb, TABLE_NAME } from "../../lib/dynamo";
import { familyPK, memberSK } from "../../lib/keys";
import { err, ok } from "../../lib/response";

const USER_POOL_ID = process.env.USER_POOL_ID as string;
const cognito = new CognitoIdentityProviderClient({});

// DELETE /families/{familyId}/members/me
// Alvo é sempre o custom:memberId/email do token (assertFamilyAccess),
// nunca um memberId vindo do path ou do body.
export const handler: APIGatewayProxyHandler = async (event) => {
  const familyId = event.pathParameters?.familyId;
  if (!familyId) return err(400, "familyId é obrigatório");

  let memberId: string;
  let email: string;
  try {
    ({ memberId, email } = assertFamilyAccess(event, familyId));
  } catch (e) {
    if (e instanceof UnlinkedAccountError || e instanceof ForbiddenFamilyError)
      return err(403, e.message);
    throw e;
  }

  const existing = await ddb.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { PK: familyPK(familyId), SK: memberSK(memberId) },
    }),
  );

  // Item já ausente (exclusão repetida): trata como sucesso idempotente,
  // pulando as checagens de owner/referência (não há mais o que proteger).
  if (existing.Item) {
    if (existing.Item.isOwner === true) {
      return err(403, "Dono da família não pode excluir a própria conta");
    }

    const [taskRefs, eventRefs] = await Promise.all([
      ddb.send(
        new QueryCommand({
          TableName: TABLE_NAME,
          KeyConditionExpression: "PK = :pk AND begins_with(SK, :prefix)",
          FilterExpression: "contains(rotationOrder, :m)",
          ExpressionAttributeValues: {
            ":pk": familyPK(familyId),
            ":prefix": "TASK#",
            ":m": memberId,
          },
        }),
      ),
      ddb.send(
        new QueryCommand({
          TableName: TABLE_NAME,
          KeyConditionExpression: "PK = :pk AND begins_with(SK, :prefix)",
          FilterExpression: "contains(#mem, :m)",
          ExpressionAttributeNames: { "#mem": "members" },
          ExpressionAttributeValues: {
            ":pk": familyPK(familyId),
            ":prefix": "EVENT#",
            ":m": memberId,
          },
        }),
      ),
    ]);

    if (
      (taskRefs.Items?.length ?? 0) > 0 ||
      (eventRefs.Items?.length ?? 0) > 0
    ) {
      return err(
        409,
        "Membro precisa ser removido de tarefas/eventos antes de excluir a conta",
      );
    }
  }

  try {
    await cognito.send(
      new AdminDeleteUserCommand({
        UserPoolId: USER_POOL_ID,
        Username: email,
      }),
    );
  } catch (e) {
    if (!(e instanceof Error && e.name === "UserNotFoundException")) {
      return err(500, "Erro ao excluir usuário no Cognito");
    }
  }

  try {
    await ddb.send(
      new DeleteCommand({
        TableName: TABLE_NAME,
        Key: { PK: familyPK(familyId), SK: memberSK(memberId) },
      }),
    );
  } catch {
    return err(
      500,
      "Usuário removido do login, mas falha ao remover o registro da família",
    );
  }

  return ok({}, 204);
};
