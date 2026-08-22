# Sistema Familiar — backend

Backend serverless do sistema familiar: baralho de tarefas diário,
rodízio automático de responsáveis e agenda compartilhada. Uma
família por deploy (não é multi-tenant).

## Estrutura

```
template.yaml               # SAM: tabela, funções, EventBridge, SNS
src/
  lib/
    types.ts                # Member, Task, TaskInstance, FamilyEvent
    keys.ts                 # geração de PK/SK do single-table design
    dynamo.ts                # DocumentClient compartilhado
    date.ts                  # data de hoje em America/Sao_Paulo
    response.ts              # helpers de resposta da API Gateway
  handlers/
    deck/getDeck.ts          # GET  /families/{id}/deck
    deck/decideTask.ts       # POST /families/{id}/deck/{taskId}/decide
    tasks/listTasks.ts       # GET  /families/{id}/tasks
    tasks/createTask.ts      # POST /families/{id}/tasks
    members/listMembers.ts   # GET  /families/{id}/members
    events/listEvents.ts     # GET  /families/{id}/events
    events/createEvent.ts    # POST /families/{id}/events
    jobs/generateDailyDeck.ts # EventBridge (cron diário, 03:00 -03:00)
  streams/onInstanceChange.ts # DynamoDB Streams -> SNS
scripts/seed.ts              # popula membros + tarefas de exemplo
```

## Modelo de dados (DynamoDB, single-table)

| Item | PK | SK |
|---|---|---|
| Família | `FAMILY#{id}` | `METADATA` |
| Membro | `FAMILY#{id}` | `MEMBER#{memberId}` |
| Tarefa | `FAMILY#{id}` | `TASK#{taskId}` |
| Instância do dia | `FAMILY#{id}` | `INSTANCE#{date}#{taskId}` |
| Evento | `FAMILY#{id}` | `EVENT#{date}#{eventId}` |

`GSI1` (`GSI1PK = FAMILY#{id}#MEMBER#{memberId}`, `GSI1SK = date`) fica
disponível pra consultar "tarefas de um membro por data" — ainda não
tem endpoint usando ele, é só a estrutura pronta.

## Como decisões do baralho batem na tabela

- **Feito** (swipe direita) → `INSTANCE.status = done`
- **Adia** (swipe cima) → `INSTANCE.status = deferred` (o job do dia
  seguinte gera uma instância nova pra amanhã; a de hoje fica
  registrada como adiada)
- **Passa** (swipe esquerda) → transação: avança `TASK.currentIndex`
  (rodízio) **e** reatribui a `INSTANCE` de hoje pro próximo da fila,
  atomicamente (`TransactWriteItems`)

## Deploy

```bash
npm install
sam build
sam deploy --guided
```

No `--guided`, o SAM vai perguntar o valor de `FamilyId` (default
`minha-familia` — deixe fixo por enquanto, é uma família só).

Depois do deploy, pegue `TableName` no output e rode o seed:

```bash
export TABLE_NAME=<valor-do-output>
export FAMILY_ID=minha-familia
npm run seed
```

Isso cria 3 membros de exemplo (`voce`, `ana`, `theo`) e 3 tarefas.
Ajuste `scripts/seed.ts` com os nomes reais da sua família antes de
rodar, ou crie via `POST /families/{id}/tasks` depois.

O baralho do dia só aparece depois que o job `GenerateDailyDeckFunction`
rodar pela primeira vez (às 03:00 America/Sao_Paulo) — pra testar na
hora, invoque a função manualmente:

```bash
aws lambda invoke --function-name <nome-da-GenerateDailyDeckFunction> /dev/stdout
```

## Notificações (SNS)

O tópico `TaskEventsTopic` é criado vazio — sem subscription. Pra
receber as notificações de "tarefa passada" / "tarefa concluída" no
seu email, assine depois do deploy:

```bash
aws sns subscribe --topic-arn <TopicArn-do-output> --protocol email --notification-endpoint voce@exemplo.com
```

## Segurança / próximos passos

- **Sem autenticação nesta versão.** A API fica aberta (com CORS
  liberado) — ok pra testar, mas antes de expor a URL de verdade pra
  família usar, adicione um authorizer (Cognito) ou pelo menos uma
  API key + usage plan no `template.yaml`.
- Rate limit / usage plan: nenhum configurado ainda.
- O streak da família (`METADATA.streak`) existe no modelo mas ainda
  não é atualizado por nenhuma função — é o próximo pedaço de lógica
  a implementar (provavelmente na própria `onInstanceChange` ou num
  job que roda quando o baralho zera).

## Conectando o frontend

O protótipo React do baralho (artifact separado) espera consumir uma
API assim. Aponte as chamadas pra `ApiUrl` do output do stack,
usando `familyId` = valor de `FamilyId` do deploy.
