# Cadastro Self-Service de Família Specification

## Problem Statement

Hoje o `familyId` é um parâmetro fixo do deploy (`FamilyId` no `template.yaml`), definido uma vez pelo dono do app e injetado como env var (`FAMILY_ID`) no job diário. Isso trava o sistema em "uma família por deploy". Para permitir que qualquer família se cadastre e use o sistema no futuro, o `familyId` precisa ser criado dinamicamente no momento do cadastro, e o resto do backend precisa parar de depender de um único `FAMILY_ID` fixo.

## Goals

- [ ] Uma família nova pode se cadastrar (nome + e-mail + senha do primeiro membro) sem intervenção manual de admin/scripts.
- [ ] O `familyId` é sempre gerado pelo sistema (nunca escolhido pelo usuário), garantindo unicidade sem fricção no cadastro.
- [ ] Nenhum usuário autenticado consegue ler ou escrever dados de uma família que não é a sua (fecha o IDOR atual, onde qualquer token válido acessa qualquer `{familyId}` no path).
- [ ] O job diário (`generateDailyDeck`) processa todas as famílias cadastradas, não só uma fixa via env var.

## Out of Scope

| Feature                                               | Reason                                                                                                  |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Convite de membros adicionais durante o cadastro      | Já existe fluxo separado (`scripts/inviteUser.ts`) — fora desta feature                                 |
| Usuário escolher/editar o `familyId` (slug amigável)  | Decidido: sempre gerado pelo sistema (ver Assumptions)                                                  |
| Recuperação de senha / "esqueci minha senha"          | Cognito já oferece isso nativamente; não é parte do cadastro                                            |
| Exclusão de família / cancelamento de conta           | Não solicitado; adicionar depois se necessário                                                          |
| Cotas de uso, planos pagos, billing multi-tenant      | Fora do escopo atual — só o modelo de dados/registro multi-família                                      |
| Múltiplos `FamilyId` legados migrarem automaticamente | Migração de dado existente (seed atual) é feita manualmente (task dedicada), não por código de produção |

---

## Assumptions & Open Questions

| Assumption / decision                                           | Chosen default                                                                                 | Rationale                                                                                                                 | Confirmed? |
| --------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | ---------- |
| Quem gera o `familyId`                                          | Sempre o sistema (ULID, mesma lib já usada pra `taskId`/`eventId`)                             | Evita colisão e fricção de UX; reaproveita convenção existente (`ulid` já é dependência)                                  | y          |
| Mecanismo de cadastro                                           | Cognito Self Sign-Up nativo + trigger `PostConfirmation` cria `FAMILY#`/`MEMBER#`              | Reusa a infra de auth existente (Cognito), sem endpoint público adicional pra validar/hashear senha                       | y          |
| `memberId` do dono da família                                   | Fixo `"owner"`                                                                                 | Simples, previsível, sem fricção extra no formulário                                                                      | y          |
| Vínculo usuário→família no token                                | Adicionar `custom:familyId` ao User Pool e validar em todo handler                             | Fecha o IDOR atual; necessário pra multi-tenant real                                                                      | y          |
| Escopo                                                          | Backend + frontend (nova tela de cadastro)                                                     | Decidido com o usuário                                                                                                    | y          |
| Como o job diário descobre todas as famílias                    | `Scan` da tabela filtrando `SK = "METADATA"`                                                   | Volume esperado é baixo (poucas famílias); evita criar índice novo agora. Reavaliar se o número de famílias crescer muito | y          |
| E-mail duplicado no cadastro                                    | Cognito já rejeita username (e-mail) duplicado nativamente (`UsernameExists`)                  | Comportamento padrão do User Pool, sem lógica extra necessária                                                            | y          |
| Falha do trigger `PostConfirmation` (não grava FAMILY#/MEMBER#) | Cognito reverte a confirmação (erro no trigger = signup falha) e o usuário pode tentar de novo | Garante que nunca existe usuário confirmado sem família associada (evita conta órfã)                                      | y          |

**Open questions:** none — todas resolvidas ou registradas acima.

---

## User Stories

### P1: Cadastro self-service cria a família ⭐ MVP

**User Story**: Como uma pessoa que quer usar o Sistema Familiar pela primeira vez, eu quero me cadastrar informando o nome da família, meu e-mail e uma senha, para começar a usar o app sem depender de alguém rodar um script de admin.

**Why P1**: É o core da mudança — sem isso, o app continua preso a uma família por deploy.

**Acceptance Criteria**:

1. WHEN um visitante envia nome da família, e-mail e senha válidos pro formulário de cadastro THEN o sistema SHALL criar uma conta Cognito não confirmada e disparar o fluxo de confirmação por e-mail (código).
2. WHEN o visitante confirma o e-mail com o código correto THEN o sistema SHALL gerar um `familyId` único (ULID, mesma convenção já usada para `taskId`/`eventId`), criar o item `FAMILY#{familyId}` (`SK=METADATA`, `name`, `streak=0`) e o item `MEMBER#owner` associado, e vincular a conta Cognito a esse `familyId` e `memberId=owner` via `custom:familyId` e `custom:memberId`.
3. IF o e-mail informado já existe no User Pool THEN o sistema SHALL rejeitar o cadastro com uma mensagem indicando que o e-mail já está em uso (sem revelar se a conta está confirmada ou não).
4. IF o código de confirmação estiver errado ou expirado THEN o sistema SHALL permitir reenviar um novo código, sem criar uma segunda família para o mesmo cadastro.
5. IF a criação do `FAMILY#`/`MEMBER#` falhar dentro do trigger `PostConfirmation` THEN o sistema SHALL impedir a confirmação da conta (o Cognito reverte), garantindo que nunca existe conta confirmada sem família vinculada.
6. The system SHALL exigir nome da família não vazio (mínimo 1 caractere após trim) e senha conforme a política já configurada no User Pool (mínimo 8 caracteres, maiúscula, minúscula, número).

**Independent Test**: Cadastrar uma família nova pela tela de signup, confirmar o e-mail, logar e ver o próprio baralho/família vazios (sem depender de seed manual).

---

### P1: `familyId` nunca é escolhido pelo usuário

**User Story**: Como mantenedor do sistema, eu quero que o `familyId` seja sempre gerado pelo backend, para nunca ter colisão de IDs nem depender de validação de formato de slug.

**Why P1**: Decisão estrutural que evita retrabalho de unicidade/validação de slug.

**Acceptance Criteria**:

1. WHEN uma nova família é criada THEN o sistema SHALL gerar o `familyId` como ULID no backend, nunca a partir de input do usuário.
2. The system SHALL garantir unicidade do `familyId` usando `ConditionExpression: attribute_not_exists(PK)` na escrita do item `FAMILY#{familyId}` (`SK=METADATA`).

**Independent Test**: Inspecionar o item criado na tabela após um cadastro e confirmar que `PK` é um ULID, não um valor derivado do nome da família.

---

### P1: Isolamento entre famílias (fecha o IDOR atual)

**User Story**: Como membro de uma família, eu quero ter certeza de que ninguém de outra família consegue ver ou alterar meus dados, para que o cadastro aberto não vire um risco de segurança.

**Why P1**: Hoje qualquer token Cognito válido acessa qualquer `{familyId}` no path — abrir cadastro sem corrigir isso é uma vulnerabilidade de controle de acesso (IDOR / broken access control).

**Acceptance Criteria**:

1. The system SHALL incluir `custom:familyId` nas claims do ID token do Cognito (schema do User Pool + populado no cadastro).
2. WHEN uma requisição autenticada chega em qualquer handler que recebe `{familyId}` no path THEN o sistema SHALL comparar esse `familyId` com o `custom:familyId` das claims do token.
3. IF o `familyId` do path for diferente do `custom:familyId` das claims THEN o sistema SHALL responder `403` sem consultar o DynamoDB.
4. IF as claims não tiverem `custom:familyId` (conta ainda não vinculada) THEN o sistema SHALL responder o mesmo erro já usado hoje para `custom:memberId` ausente (conta não vinculada).

**Independent Test**: Com dois tokens de duas famílias diferentes, chamar `GET /families/{familyId}` da família B usando o token da família A e confirmar `403`.

---

### P2: Job diário cobre todas as famílias

**User Story**: Como mantenedor do sistema, eu quero que o job diário gere o baralho de tarefas para todas as famílias cadastradas, não só para uma família fixa via variável de ambiente.

**Why P2**: Necessário pra multi-tenant funcionar de ponta a ponta, mas não bloqueia o cadastro em si (pode ser feito logo em seguida).

**Acceptance Criteria**:

1. WHEN o job diário roda THEN o sistema SHALL descobrir todas as famílias fazendo `Scan` na tabela filtrando itens com `SK = "METADATA"`.
2. WHEN o job diário roda THEN o sistema SHALL processar a geração de baralho e o cálculo de streak para cada família encontrada, de forma independente (falha em uma família não interrompe as demais).
3. The system SHALL remover a env var `FAMILY_ID` e o parâmetro `FamilyId` do `template.yaml`, já que o job deixa de depender de uma família fixa.

**Independent Test**: Cadastrar duas famílias, rodar o job manualmente (`sam local invoke` ou similar) e confirmar que ambas ganham `INSTANCE#` do dia.

---

### P2: Tela de cadastro no frontend

**User Story**: Como visitante, eu quero uma tela de cadastro (nome da família, e-mail, senha) e uma tela de confirmação de código, para me cadastrar sem usar o console AWS.

**Why P2**: Completa a experiência self-service ponta a ponta; sem isso o backend funciona mas só é testável via API direta.

**Acceptance Criteria**:

1. WHEN o visitante preenche nome, e-mail e senha e confirma THEN o frontend SHALL chamar o `signUp` do Cognito e mostrar a tela de "confirme seu e-mail" (input de código).
2. WHEN o visitante confirma o código corretamente THEN o frontend SHALL redirecionar pra tela de login já com o e-mail preenchido.
3. IF o `signUp` falhar (e-mail em uso, senha fraca, etc.) THEN o frontend SHALL mostrar a mensagem de erro traduzida da exceção do Cognito, sem deixar o formulário travado.
4. The system SHALL disponibilizar link "Criar conta da família" a partir da tela de login existente (`LoginScreen`).

**Independent Test**: Fluxo completo pela UI — cadastrar, confirmar e-mail, logar — sem tocar em nenhuma API diretamente.

---

## Edge Cases

- IF o usuário fecha a aba entre o cadastro e a confirmação do e-mail THEN o sistema SHALL permitir retomar a confirmação depois (Cognito mantém o usuário em `UNCONFIRMED` até confirmar ou expirar).
- IF duas confirmações do mesmo cadastro chegarem em paralelo (retry) THEN o trigger `PostConfirmation` SHALL ser idempotente (não criar duas famílias) — Cognito só confirma uma vez, então o trigger roda no máximo uma vez por usuário.
- IF o nome da família contiver apenas espaços THEN o sistema SHALL rejeitar como nome vazio (trim antes de validar).
- WHEN o job diário encontra uma família sem nenhuma `TASK#` cadastrada THEN o sistema SHALL pular essa família sem erro (0 tarefas devidas).

---

## Requirement Traceability

| Requirement ID | Story                                    | Phase  | Status  |
| -------------- | ---------------------------------------- | ------ | ------- |
| REG-01         | P1: Cadastro self-service cria a família | Design | Pending |
| REG-02         | P1: Cadastro self-service cria a família | Design | Pending |
| REG-03         | P1: Cadastro self-service cria a família | Design | Pending |
| REG-04         | P1: Cadastro self-service cria a família | Design | Pending |
| REG-05         | P1: Cadastro self-service cria a família | Design | Pending |
| REG-06         | P1: Cadastro self-service cria a família | Design | Pending |
| REG-07         | P1: `familyId` nunca é escolhido         | Design | Pending |
| REG-08         | P1: `familyId` nunca é escolhido         | Design | Pending |
| REG-09         | P1: Isolamento entre famílias            | Design | Pending |
| REG-10         | P1: Isolamento entre famílias            | Design | Pending |
| REG-11         | P1: Isolamento entre famílias            | Design | Pending |
| REG-12         | P1: Isolamento entre famílias            | Design | Pending |
| REG-13         | P2: Job diário cobre todas as famílias   | Design | Pending |
| REG-14         | P2: Job diário cobre todas as famílias   | Design | Pending |
| REG-15         | P2: Job diário cobre todas as famílias   | Design | Pending |
| REG-16         | P2: Tela de cadastro no frontend         | Design | Pending |
| REG-17         | P2: Tela de cadastro no frontend         | Design | Pending |
| REG-18         | P2: Tela de cadastro no frontend         | Design | Pending |
| REG-19         | P2: Tela de cadastro no frontend         | Design | Pending |

**Coverage:** 19 total, 0 mapped to tasks, 19 unmapped ⚠️ (mapeamento acontece na fase Tasks)

---

## Success Criteria

- [ ] Uma família nova consegue se cadastrar e usar o app (login, baralho, tarefas) sem nenhum comando manual de admin.
- [ ] Um token de uma família recebe `403` ao tentar acessar `{familyId}` de outra família, em todos os endpoints que recebem `familyId` no path.
- [ ] O job diário gera baralho para N famílias cadastradas (testado com N ≥ 2), sem env var fixa de família.
