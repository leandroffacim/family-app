import { UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { PostAuthenticationTriggerHandler } from "aws-lambda";
import { ddb, TABLE_NAME } from "../../lib/dynamo";
import { familyPK, memberSK } from "../../lib/keys";

// Executado após um login bem-sucedido. Para contas convidadas, o Cognito
// já carrega familyId/memberId e o membro foi criado durante o convite.
// Aqui apenas garantimos que ele esteja ACTIVE.
export const handler: PostAuthenticationTriggerHandler = async (event) => {
  const familyId = event.request.userAttributes["custom:familyId"]?.trim();
  const memberId = event.request.userAttributes["custom:memberId"]?.trim();

  if (!familyId || !memberId || memberId === "owner") return event;

  await ddb.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: familyPK(familyId),
        SK: memberSK(memberId),
      },
      UpdateExpression: "SET #status = :status, email = :email",
      ExpressionAttributeNames: { "#status": "status" },
      ExpressionAttributeValues: {
        ":status": "ACTIVE",
        ":email": event.request.userAttributes["email"] ?? "",
      },
      ConditionExpression: "attribute_exists(PK)",
    }),
  );

  return event;
};
