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
    deck/undoDecision.ts     # POST /families/{id}/deck/{taskId}/undo
    tasks/listTasks.ts       # GET  /families/{id}/tasks
    tasks/createTask.ts      # POST /families/{id}/tasks
    members/listMembers.ts   # GET  /families/{id}/members
    family/getFamily.ts      # GET  /families/{id}  (nome + streak)
    events/listEvents.ts     # GET  /families/{id}/events
    events/createEvent.ts    # POST /families/{id}/events
    jobs/generateDailyDeck.ts # EventBridge (cron diário, 03:00 -03:00)
  streams/onInstanceChange.ts # DynamoDB Streams -> SNS
scripts/seed.ts              # popula membros + tarefas de exemplo
scripts/createUser.ts        # cria login (Cognito) com senha definitiva na hora
scripts/inviteUser.ts        # convida membro por e-mail (senha temporária)
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

- **Autenticação via Cognito.** A API inteira exige um `idToken` válido
  do User Pool (`Authorization: Bearer <idToken>`) — ver seção
  "Autenticação (Cognito)" abaixo. Não tem self sign-up: só quem roda
  `npm run create-user` consegue criar conta.
- Rate limit / usage plan: nenhum configurado ainda.
- "Esqueci minha senha" ainda não está implementado — só a troca de
  senha do primeiro acesso (convite). Se alguém esquecer a senha
  definitiva, por enquanto o jeito é reenviar convite (o Cognito
  aceita convidar de novo por cima de um usuário existente) ou usar
  `create-user` pra forçar uma nova senha definitiva.

## Streak da família

`GET /families/{familyId}` retorna `{ name, streak }`. O streak é
recalculado todo dia pelo `GenerateDailyDeckFunction`, antes de criar
o baralho do dia: ele olha as instâncias de ontem e soma +1 se
nenhuma ficou `pending` (passar/adiar conta como "zerado", só ficar
sem decidir quebra o streak). Um dia sem nenhuma tarefa devida não
mexe no streak. `METADATA.streakUpdatedDate` evita recalcular 2x se
o job rodar de novo no mesmo dia.

## Autenticação (Cognito)

Cada membro da família precisa de uma conta pra logar — não existe
cadastro pelo próprio app. Depois do `sam deploy`, com o `UserPoolId`
do output, tem dois jeitos de criar a conta:

**Convite por e-mail (recomendado)** — o Cognito gera a senha
temporária e manda o convite sozinho:

```bash
export USER_POOL_ID=<valor do output UserPoolId>
npm run invite-user -- ana@familia.com ana
```

A pessoa recebe o e-mail, loga com a senha temporária e o app pede
pra ela escolher a senha definitiva na hora (tela "Escolha sua
senha", primeiro acesso).

**Senha definida na hora (alternativa, sem depender de e-mail)**:

```bash
export USER_POOL_ID=<valor do output UserPoolId>
npm run create-user -- ana@familia.com ana "umaSenh4Boa"
```

Nos dois casos, o segundo argumento (`ana` acima) precisa ser o
mesmo `id` do membro em `MEMBER#{id}` (o que você usou no seed ou
criou depois) — é isso que liga a conta do Cognito ao membro certo.
Esse vínculo vai no token como `custom:memberId`, e o frontend usa
ele pra saber quem está logado.

## Conectando o frontend

O protótipo React do baralho (artifact separado) espera consumir uma
API assim. Aponte as chamadas pra `ApiUrl` do output do stack,
usando `familyId` = valor de `FamilyId` do deploy, e configure
`VITE_COGNITO_USER_POOL_ID` / `VITE_COGNITO_CLIENT_ID` com os outputs
`UserPoolId` / `UserPoolClientId` (ver `frontend/.env.example`).
