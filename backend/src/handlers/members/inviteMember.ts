import {
  AdminCreateUserCommand,
  CognitoIdentityProviderClient,
} from "@aws-sdk/client-cognito-identity-provider";
import { GetCommand } from "@aws-sdk/lib-dynamodb";
import { APIGatewayProxyHandler } from "aws-lambda";
import {
  assertFamilyAccess,
  ForbiddenFamilyError,
  UnlinkedAccountError,
} from "../../lib/auth";
import { ddb, TABLE_NAME } from "../../lib/dynamo";
import { familyPK, memberSK } from "../../lib/keys";
import { err, ok } from "../../lib/response";

// POST /families/{familyId}/members/invite   body: { email, memberId }
//
// Qualquer membro logado pode convidar outro — mesma coisa que
// scripts/inviteUser.ts, só que direto pela tela em vez do terminal.
// O Cognito gera a senha temporária e manda o e-mail de convite
// sozinho (ver InviteMessageTemplate no template.yaml).

const USER_POOL_ID = process.env.USER_POOL_ID as string;
const cognito = new CognitoIdentityProviderClient({});

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

  let body: { email?: string; memberId?: string };
  try {
    body = JSON.parse(event.body ?? "{}");
  } catch {
    return err(400, "JSON inválido");
  }
  const email = body.email?.trim();
  const memberId = body.memberId?.trim();
  if (!email || !memberId) return err(400, "email e memberId são obrigatórios");

  const member = await ddb.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { PK: familyPK(familyId), SK: memberSK(memberId) },
    }),
  );
  if (!member.Item) return err(404, "Membro não encontrado");

  try {
    await cognito.send(
      new AdminCreateUserCommand({
        UserPoolId: USER_POOL_ID,
        Username: email,
        UserAttributes: [
          { Name: "email", Value: email },
          { Name: "email_verified", Value: "true" },
          { Name: "custom:memberId", Value: memberId },
        ],
        // sem MessageAction: SUPPRESS -> o Cognito manda o convite sozinho
      }),
    );
  } catch (error) {
    if (error instanceof Error && error.name === "UsernameExistsException") {
      return err(409, "Já existe uma conta com esse e-mail");
    }
    throw error;
  }

  return ok({ invited: true, email, memberId });
};
