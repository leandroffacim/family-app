import { DynamoDBStreamHandler } from "aws-lambda";
import { unmarshall } from "@aws-sdk/util-dynamodb";
import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";

// Disparado pelo DynamoDB Streams da FamilyTable. Observa mudanças de
// status nas INSTANCE# (baralho do dia) e publica uma notificação no
// SNS. Quem recebe (email, SMS, push) depende da subscription que
// você configurar no tópico depois do deploy — ver README.

const sns = new SNSClient({});
const TOPIC_ARN = process.env.SNS_TOPIC_ARN as string;

export const handler: DynamoDBStreamHandler = async (event) => {
  for (const record of event.Records) {
    if (record.eventName !== "MODIFY") continue;
    if (!record.dynamodb?.NewImage || !record.dynamodb.OldImage) continue;

    const newImage = unmarshall(record.dynamodb.NewImage as any);
    const oldImage = unmarshall(record.dynamodb.OldImage as any);

    if (typeof newImage.SK !== "string" || !newImage.SK.startsWith("INSTANCE#")) continue;
    if (newImage.status === oldImage.status) continue;

    if (newImage.status === "passed") {
      await sns.send(
        new PublishCommand({
          TopicArn: TOPIC_ARN,
          Subject: "Tarefa passada adiante",
          Message: `A tarefa "${newImage.name}" foi passada para outro membro da família.`,
        })
      );
    }

    if (newImage.status === "done") {
      await sns.send(
        new PublishCommand({
          TopicArn: TOPIC_ARN,
          Subject: "Tarefa concluída",
          Message: `A tarefa "${newImage.name}" foi concluída.`,
        })
      );
    }
  }
};
