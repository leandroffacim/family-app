// Roda localmente pra bootstrapar a tabela recém-criada: metadata da
// família + membros + algumas tarefas de exemplo com rodízio.
//
// Uso:
//   export TABLE_NAME=<nome-da-tabela-no-output-do-deploy>
//   export FAMILY_ID=minha-familia   # mesmo valor do Parameter no template.yaml
//   npm run seed

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import { ulid } from "ulid";

const TABLE_NAME = process.env.TABLE_NAME ?? "FAMILY-APP-TABLE";
const FAMILY_ID = process.env.FAMILY_ID ?? "minha-familia";

if (!TABLE_NAME) {
  console.error(
    "Defina TABLE_NAME antes de rodar (veja o output do `sam deploy`).",
  );
  process.exit(1);
}

const ddb = DynamoDBDocumentClient.from(
  new DynamoDBClient({ region: "us-east-1" }),
);
const pk = `FAMILY#${FAMILY_ID}`;

const members = [
  { id: "voce", name: "Você", color: "#1E3A32" },
  { id: "ana", name: "Ana", color: "#D9A441" },
  { id: "theo", name: "Theo", color: "#A83E3E" },
];

async function main() {
  await ddb.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        PK: pk,
        SK: "METADATA",
        name: "Minha família",
        streak: 0,
        GSI2PK: "FAMILIES",
        GSI2SK: FAMILY_ID,
      },
    }),
  );

  for (const m of members) {
    await ddb.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: { PK: pk, SK: `MEMBER#${m.id}`, ...m },
      }),
    );
  }

  const rotationOrder = members.map((m) => m.id);
  const tasks = [
    { name: "Tirar o lixo", freq: "DAILY" as const, weight: 1 as const },
    { name: "Lavar a louça", freq: "DAILY" as const, weight: 2 as const },
    {
      name: "Fazer compras",
      freq: "WEEKLY" as const,
      weight: 3 as const,
      dayOfWeek: 6,
    },
  ];

  for (const t of tasks) {
    const id = ulid();
    await ddb.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: {
          PK: pk,
          SK: `TASK#${id}`,
          id,
          ...t,
          rotationOrder,
          currentIndex: 0,
        },
      }),
    );
  }

  console.log(`Seed concluído para a família "${FAMILY_ID}".`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
