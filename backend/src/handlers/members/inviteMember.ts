import {
  AdminCreateUserCommand,
  CognitoIdentityProviderClient,
} from "@aws-sdk/client-cognito-identity-provider";
import { GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import { APIGatewayProxyHandler } from "aws-lambda";
import { ulid } from "ulid";
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

// POST /families/{familyId}/members/invite
// body: { email, name?, memberId? }
//
// O membro passa a existir no DynamoDB antes do convite.
// Se memberId for informado e já existir, apenas vincula a conta Cognito
// a esse membro. Se não existir, criamos um novo membro com ULID.
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

  let body: { email?: string; name?: string; memberId?: string };
  try {
    body = JSON.parse(event.body ?? "{}");
  } catch {
    return err(400, "JSON inválido");
  }

  const email = body.email?.trim().toLowerCase();
  const requestedMemberId = body.memberId?.trim();
  const name = body.name?.trim() || email?.split("@")[0] || "Membro";
  if (!email) return err(400, "email é obrigatório");

  let memberId = requestedMemberId;
  let member: Record<string, unknown> | undefined;

  if (requestedMemberId) {
    const result = await ddb.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: { PK: familyPK(familyId), SK: memberSK(requestedMemberId) },
      }),
    );
    member = result.Item as Record<string, unknown> | undefined;
  }

  // Compatibilidade com a UI atual: ela seleciona o owner por padrão.
  // Se o e-mail do convite for diferente do membro selecionado, tratamos
  // isso como um novo membro em vez de vincular o convite ao owner.
  if (!member || (member.email && String(member.email).toLowerCase() !== email)) {
    memberId = ulid();
    member = {
      PK: familyPK(familyId),
      SK: memberSK(memberId),
      memberId,
      name,
      email,
      color: "#4F46E5",
      status: "INVITED",
    };

    await ddb.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: member,
        ConditionExpression: "attribute_not_exists(PK)",
      }),
    );
  } else if (!member.status) {
    await ddb.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: { ...member, status: "INVITED" },
      }),
    );
  }

  try {
    await cognito.send(
      new AdminCreateUserCommand({
        UserPoolId: USER_POOL_ID,
        Username: email,
        UserAttributes: [
          { Name: "email", Value: email },
          { Name: "email_verified", Value: "true" },
          { Name: "custom:memberId", Value: memberId! },
          { Name: "custom:familyId", Value: familyId },
        ],
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
