import {
  AdminUpdateUserAttributesCommand,
  CognitoIdentityProviderClient,
} from "@aws-sdk/client-cognito-identity-provider";
import { TransactWriteCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { PostConfirmationTriggerHandler } from "aws-lambda";
import { ulid } from "ulid";
import { ddb, TABLE_NAME } from "../../lib/dynamo";
import { familyPK, memberSK, metadataSK } from "../../lib/keys";

const cognito = new CognitoIdentityProviderClient({});

export const handler: PostConfirmationTriggerHandler = async (event) => {
  const attrs = event.request.userAttributes;
  const existingFamilyId = attrs["custom:familyId"]?.trim();
  const existingMemberId = attrs["custom:memberId"]?.trim();

  // Usuário convidado: o MEMBER já foi criado pelo endpoint de convite.
  // O primeiro login/confirmacao apenas ativa o vínculo; não cria outro
  // membro nem outra família.
  if (existingFamilyId && existingMemberId) {
    await ddb.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: {
          PK: familyPK(existingFamilyId),
          SK: memberSK(existingMemberId),
        },
        UpdateExpression: "SET #status = :status, email = :email",
        ExpressionAttributeNames: { "#status": "status" },
        ExpressionAttributeValues: {
          ":status": "ACTIVE",
          ":email": attrs["email"] ?? "",
        },
        ConditionExpression: "attribute_exists(PK)",
      }),
    );

    return event;
  }

  // Cadastro de uma nova família: cria a família e o owner.
  const familyName = attrs["custom:familyName"]?.trim();
  if (!familyName) {
    throw new Error(
      "custom:familyName é obrigatório para completar o cadastro",
    );
  }

  const familyId = ulid();
  const ownerEmail = attrs["email"] ?? "";

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
              name: ownerEmail.split("@")[0] || "Dono",
              status: "ACTIVE",
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
