import {
  AdminUpdateUserAttributesCommand,
  CognitoIdentityProviderClient,
} from "@aws-sdk/client-cognito-identity-provider";
import { TransactWriteCommand } from "@aws-sdk/lib-dynamodb";
import { PostConfirmationTriggerHandler } from "aws-lambda";
import { ulid } from "ulid";
import { ddb, TABLE_NAME } from "../../lib/dynamo";
import { familyPK, memberSK, metadataSK } from "../../lib/keys";

// Trigger PostConfirmation do Cognito: roda uma única vez, logo após o
// usuário confirmar o e-mail do cadastro. Cria a família + membro owner
// e vincula a conta ao familyId gerado. Se falhar, o Cognito reverte a
// confirmação — nunca existe conta confirmada sem família (REG-05).

const cognito = new CognitoIdentityProviderClient({});

export const handler: PostConfirmationTriggerHandler = async (event) => {
  const familyName = event.request.userAttributes["custom:familyName"]?.trim();
  if (!familyName) {
    throw new Error(
      "custom:familyName é obrigatório para completar o cadastro",
    );
  }

  const familyId = ulid();
  const ownerEmail = event.request.userAttributes["email"] ?? "";

  await ddb.send(
    new TransactWriteCommand({
      TransactItems: [
        {
          Put: {
            TableName: TABLE_NAME,
            Item: {
              PK: familyPK(familyId),
              SK: metadataSK(),
              name: familyName,
              streak: 0,
            },
            ConditionExpression: "attribute_not_exists(PK)",
          },
        },
        {
          Put: {
            TableName: TABLE_NAME,
            Item: {
              PK: familyPK(familyId),
              SK: memberSK("owner"),
              memberId: "owner",
              email: ownerEmail,
            },
          },
        },
      ],
    }),
  );

  await cognito.send(
    new AdminUpdateUserAttributesCommand({
      UserPoolId: event.userPoolId,
      Username: event.userName,
      UserAttributes: [
        { Name: "custom:familyId", Value: familyId },
        { Name: "custom:memberId", Value: "owner" },
      ],
    }),
  );

  return event;
};
