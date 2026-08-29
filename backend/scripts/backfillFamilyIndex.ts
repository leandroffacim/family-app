// Rodar UMA VEZ depois de dar deploy do GSI2 (ver template.yaml).
//
// generateDailyDeck agora lista famílias fazendo Query no GSI2 em vez
// de Scan na tabela inteira — mas isso só funciona pras linhas
// METADATA que já têm GSI2PK/GSI2SK. Famílias criadas ANTES desse
// deploy não têm esses atributos, e ficariam invisíveis pro job
// diário (0 famílias processadas) até esse backfill rodar.
//
// Depois de rodar isso uma vez, nunca mais precisa rodar de novo —
// postConfirmation.ts já grava GSI2PK/GSI2SK em toda família nova.
//
// Uso:
//   export TABLE_NAME=<nome-da-tabela-no-output-do-deploy>
//   npm run backfill-family-index

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  ScanCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";

const TABLE_NAME = process.env.TABLE_NAME;
if (!TABLE_NAME) {
  console.error(
    "Defina TABLE_NAME antes de rodar (veja o output do `sam deploy`).",
  );
  process.exit(1);
}

const ddb = DynamoDBDocumentClient.from(
  new DynamoDBClient({ region: "us-east-1" }),
);

async function main() {
  let ExclusiveStartKey: Record<string, unknown> | undefined;
  let scanned = 0;
  let updated = 0;

  do {
    const result = await ddb.send(
      new ScanCommand({
        TableName: TABLE_NAME,
        FilterExpression: "SK = :metadata AND attribute_not_exists(GSI2PK)",
        ExpressionAttributeValues: { ":metadata": "METADATA" },
        ExclusiveStartKey,
      }),
    );

    for (const item of result.Items ?? []) {
      scanned++;
      const familyId = String(item.PK).replace("FAMILY#", "");
      await ddb.send(
        new UpdateCommand({
          TableName: TABLE_NAME,
          Key: { PK: item.PK, SK: item.SK },
          UpdateExpression: "SET GSI2PK = :gsi2pk, GSI2SK = :gsi2sk",
          ExpressionAttributeValues: {
            ":gsi2pk": "FAMILIES",
            ":gsi2sk": familyId,
          },
        }),
      );
      updated++;
      console.log(`  -> ${familyId} atualizada`);
    }

    ExclusiveStartKey = result.LastEvaluatedKey;
  } while (ExclusiveStartKey);

  console.log(
    `Backfill concluído: ${updated}/${scanned} famílias sem GSI2 atualizadas.`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
