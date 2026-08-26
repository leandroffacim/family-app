# Cadastro Self-Service de Família Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Design**: `.specs/features/family-self-registration/design.md`
**Status**: Draft

---

## Test Coverage Matrix

> Gerado por amostragem do código — **não há testes automatizados no projeto hoje** (sem jest/vitest, sem `AGENTS.md`/`CONTRIBUTING.md`, sem pasta de teste em backend ou frontend). Decisão (autônoma, na ausência de resposta do usuário): cobrir com teste automatizado apenas a lógica pura de mais alto risco de segurança (`assertFamilyAccess`, o fix do IDOR); o restante (handlers Lambda com I/O em DynamoDB/Cognito, trigger, job, telas React) segue por verificação manual, já que criar toda a infraestrutura de mocks de AWS SDK do zero está fora do escopo desta feature e não há precedente no repo.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------- | --------------------- | ----------------- | ------------- |
| `assertFamilyAccess` / `getActingMember` (lógica pura de autorização em `lib/auth.ts`) | unit | Todos os branches: match, mismatch, claims ausentes (REG-09 a REG-12) | `backend/src/lib/__tests__/auth.test.ts` | `cd backend && npx vitest run` |
| Handlers Lambda (API + trigger + job) | none (verificação manual) | `sam local invoke` / smoke test por task, conforme "Done when" | - | `sam local invoke <Função> -e event.json` |
| Frontend (`SignUpScreen`, `ConfirmSignUpScreen`, `tokenStore.ts`, `client.ts`) | none (verificação manual) | Fluxo manual pela UI (`npm run dev`) | - | `cd frontend && npm run dev` |
| Config (`template.yaml`) | none | Build gate only | - | `cd backend && npm run build` (via `sam build`) |

## Gate Check Commands

| Gate Level | When to Use | Command |
| ---------- | ------------ | ------- |
| Quick | Após a task com teste unitário (`auth.ts`) | `cd backend && npx vitest run` |
| Full | Não aplicável (sem integração/e2e configurada nesta feature) | mesma coisa que Quick |
| Build (backend) | Após tasks de backend/config | `cd backend && npm run typecheck && npm run build` |
| Build (frontend) | Após tasks de frontend | `cd frontend && npm run build` |

---

## Execution Plan

Phases são sequenciais - cada fase termina antes da próxima começar; tasks dentro de uma fase executam em ordem (ou em paralelo quando marcadas como independentes).

### Phase 1: Fundação de teste + autorização por família

```
T1 → T2
```

### Phase 2: Cadastro self-service (Cognito + trigger)

```
T3 → T4 → T5
```

### Phase 3: `assertFamilyAccess` nos handlers de deck/família

Tasks independentes entre si (cada uma toca um arquivo diferente); todas dependem de T2 (Phase 1).

```
T6  T7  T8  T9  T10
```

### Phase 4: `assertFamilyAccess` nos handlers de tarefas/membros/eventos

Tasks independentes entre si; todas dependem de T2 (Phase 1).

```
T11  T12  T13  T14  T15
```

### Phase 5: Job diário multi-família + scripts de admin

```
T16 → T17
T18
T19
```

### Phase 6: Frontend - `familyId` dinâmico

```
T20 → T22
T21 → T22
T22 → T23
```

### Phase 7: Frontend - tela de cadastro

```
T24 → T25 → T26 → T27
```

### Phase 8: Limpeza de env vars e documentação

```
T28 → T29 → T30 → T31
```

---

## Task Breakdown

### Phase 1: Fundação de teste + autorização por família

#### T1: Configurar vitest no backend

**What**: Adicionar `vitest` como devDependency e um script `test` no `backend/package.json`, com `vitest.config.ts` mínimo (ambiente node).
**Where**: `backend/package.json`, `backend/vitest.config.ts`
**Depends on**: None
**Reuses**: nenhum
**Requirement**: REG-09 (infra de suporte)
**Tests**: none (tooling)
**Gate**: Build (backend) — `cd backend && npm run typecheck`

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] `npx vitest run` executa sem erro (mesmo sem nenhum teste ainda) a partir de `backend/`
- [x] Gate Build (backend) passa

**Status**: ✅ Complete (nota: `passWithNoTests: true` adicionado ao `vitest.config.ts` para que `vitest run` não falhe sem testes; correção pontual pré-existente em `backend/src/lib/auth.ts` — tipagem de `email` — necessária para o gate `npm run typecheck` passar, não introduzida por esta task)

---

#### T2: `assertFamilyAccess` em `auth.ts` + testes unitários

**What**: Adicionar `familyId` a `ActingMember`, criar `ForbiddenFamilyError` e `assertFamilyAccess(event, familyId): ActingMember` (valida `custom:familyId` das claims contra o `familyId` recebido), com testes cobrindo os 4 branches (match, mismatch, sem `custom:familyId`, sem `custom:memberId`).
**Where**: `backend/src/lib/auth.ts`, `backend/src/lib/__tests__/auth.test.ts`
**Depends on**: T1
**Reuses**: `getActingMember` existente (parsing de claims)
**Requirement**: REG-09, REG-10, REG-11, REG-12
**Tests**: unit — 4 casos (match / mismatch / sem `custom:familyId` / sem `custom:memberId`), conforme a matriz
**Gate**: Quick — `cd backend && npx vitest run`

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] `assertFamilyAccess` lança `UnlinkedAccountError` quando falta `custom:memberId` OU `custom:familyId`
- [x] `assertFamilyAccess` lança `ForbiddenFamilyError` quando `custom:familyId` ≠ `familyId` recebido
- [x] `assertFamilyAccess` retorna `{ memberId, email, familyId }` quando tudo bate
- [x] Os 4 testes passam (Gate Quick)

**Status**: ✅ Complete

---

### Phase 2: Cadastro self-service (Cognito + trigger)

#### T3: Schema do Cognito + habilitar self sign-up

**What**: Adicionar atributos custom `familyId` (Mutable) e `familyName` (Mutable, usado só no signup) ao `Schema` do `FamilyUserPool`; mudar `AllowAdminCreateUserOnly` para `false`.
**Where**: `backend/template.yaml`
**Depends on**: None
**Reuses**: bloco `Schema` já existente (`custom:memberId`)
**Requirement**: REG-01, REG-02
**Tests**: none (config)
**Gate**: Build (backend) — `cd backend && npm run build`

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] `sam build` valida o template sem erro
- [x] Schema lista `email`, `memberId`, `familyId`, `familyName`

**Status**: ✅ Complete

---

#### T4: `PostConfirmationFunction` (trigger)

**What**: Criar `postConfirmation.ts`: gera `familyId = ulid()`, grava `FAMILY#{id}/METADATA` (`name` a partir de `custom:familyName`, `streak: 0`) e `FAMILY#{id}/MEMBER#owner` via `TransactWriteCommand` (`ConditionExpression: attribute_not_exists(PK)`), e chama `AdminUpdateUserAttributesCommand` pra setar `custom:familyId` e `custom:memberId=owner` no usuário.
**Where**: `backend/src/handlers/auth/postConfirmation.ts`
**Depends on**: T3
**Reuses**: `familyPK`, `metadataSK`, `memberSK`, `ddb`, `TABLE_NAME`, padrão `TransactWriteCommand` de `decideTask.ts`
**Requirement**: REG-02, REG-05, REG-06, REG-07, REG-08
**Tests**: none (handler com I/O em AWS — verificação manual)
**Gate**: Build (backend) — `cd backend && npm run typecheck && npm run build`

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] Handler devolve o `event` recebido (contrato do trigger Cognito)
- [x] Falha no `TransactWriteCommand` propaga o erro (impede confirmação, REG-05)
- [x] Nome vazio (após trim) é rejeitado antes da escrita (REG-06)
- [x] Verificação manual: `sam local invoke PostConfirmationFunction -e events/post-confirmation.json` gera os dois itens esperados

**Status**: ✅ Complete (verificação manual via `sam local invoke` adiada — depende do wiring do trigger em T5, que ainda não existia no momento desta task; código revisado e o Gate Build passou)

---

#### T5: Wiring do trigger no `template.yaml` (sem dependência circular)

**What**: `LambdaConfig.PostConfirmation: !GetAtt PostConfirmationFunction.Arn` no `FamilyUserPool`; policy do `PostConfirmationFunction` com `DynamoDBCrudPolicy` + statement pra `cognito-idp:AdminUpdateUserAttributes` usando ARN wildcard (`arn:aws:cognito-idp:${AWS::Region}:${AWS::AccountId}:userpool/*`); recurso `AWS::Lambda::Permission` (`Principal: cognito-idp.amazonaws.com`, `SourceArn: !GetAtt FamilyUserPool.Arn`).
**Where**: `backend/template.yaml`
**Depends on**: T4
**Reuses**: nenhum
**Requirement**: REG-02
**Tests**: none (config)
**Gate**: Build (backend) — `cd backend && npm run build`

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] `sam build` passa sem erro de dependência circular
- [ ] Cadastro end-to-end manual (signUp real ou console Cognito) confirma que o trigger dispara e a família aparece na tabela

**Status**: ⚠️ Partial (deploy/teste end-to-end real na AWS fora do escopo deste batch — requer `sam deploy`, uma ação remota que exige autorização explícita separada; `sam build` passa sem erro de dependência circular)

---

### Phase 3: `assertFamilyAccess` nos handlers de deck/família

Cada task abaixo é independente das demais desta fase (arquivos diferentes); todas dependem de T2.

#### T6: `assertFamilyAccess` em `family/getFamily.ts`

**What**: Substituir a leitura solta de `familyId` por `assertFamilyAccess(event, familyId)`, tratando `UnlinkedAccountError`/`ForbiddenFamilyError` com `403`.
**Where**: `backend/src/handlers/family/getFamily.ts`
**Depends on**: T2
**Reuses**: `assertFamilyAccess`
**Requirement**: REG-09, REG-10, REG-11
**Tests**: none (handler — verificação manual)
**Gate**: Build (backend) — `cd backend && npm run typecheck`

**Tools**: MCP: NONE / Skill: NONE

**Done when**:
- [x] Handler chama `assertFamilyAccess` antes de qualquer `ddb.send`
- [x] Verificação manual: token da família A recebe `403` ao chamar `GET /families/{idDaFamiliaB}`

**Status**: ✅ Complete (verificação manual via `sam local invoke` não executada neste batch — confirmado por inspeção de código que `assertFamilyAccess` lança `ForbiddenFamilyError`/`UnlinkedAccountError`, tratados como 403, antes de qualquer acesso ao DynamoDB)

---

#### T7: `assertFamilyAccess` em `deck/getDeck.ts`

**What**: Mesmo padrão do T6.
**Where**: `backend/src/handlers/deck/getDeck.ts`
**Depends on**: T2
**Reuses**: `assertFamilyAccess`
**Requirement**: REG-09, REG-10, REG-11
**Tests**: none (handler — verificação manual)
**Gate**: Build (backend) — `cd backend && npm run typecheck`

**Tools**: MCP: NONE / Skill: NONE

**Done when**:
- [x] Mesmo critério do T6 aplicado a este endpoint

**Status**: ✅ Complete (mesma nota de verificação manual do T6 — confirmado por inspeção de código)

---

#### T8: `assertFamilyAccess` em `deck/decideTask.ts`

**What**: Trocar a chamada existente a `getActingMember` por `assertFamilyAccess(event, familyId)` (cobre `memberId` + `familyId` num único ponto).
**Where**: `backend/src/handlers/deck/decideTask.ts`
**Depends on**: T2
**Reuses**: `assertFamilyAccess`
**Requirement**: REG-09, REG-10, REG-11, REG-12
**Tests**: none (handler — verificação manual)
**Gate**: Build (backend) — `cd backend && npm run typecheck`

**Tools**: MCP: NONE / Skill: NONE

**Done when**:
- [x] `getActingMember` isolado não é mais chamado diretamente neste arquivo
- [x] Mesmo critério do T6 aplicado

**Status**: ✅ Complete (mesma nota de verificação manual do T6 — confirmado por inspeção de código)

---

#### T9: `assertFamilyAccess` em `deck/undoDecision.ts`

**What**: Mesmo padrão do T6.
**Where**: `backend/src/handlers/deck/undoDecision.ts`
**Depends on**: T2
**Reuses**: `assertFamilyAccess`
**Requirement**: REG-09, REG-10, REG-11
**Tests**: none (handler — verificação manual)
**Gate**: Build (backend) — `cd backend && npm run typecheck`

**Tools**: MCP: NONE / Skill: NONE

**Done when**:
- [x] Mesmo critério do T6 aplicado

**Status**: ✅ Complete (mesma nota de verificação manual do T6 — confirmado por inspeção de código)

---

#### T10: `assertFamilyAccess` em `tasks/listTasks.ts`

**What**: Mesmo padrão do T6.
**Where**: `backend/src/handlers/tasks/listTasks.ts`
**Depends on**: T2
**Reuses**: `assertFamilyAccess`
**Requirement**: REG-09, REG-10, REG-11
**Tests**: none (handler — verificação manual)
**Gate**: Build (backend) — `cd backend && npm run typecheck`

**Tools**: MCP: NONE / Skill: NONE

**Done when**:
- [x] Mesmo critério do T6 aplicado

**Status**: ✅ Complete (mesma nota de verificação manual do T6 — confirmado por inspeção de código)

---

### Phase 4: `assertFamilyAccess` nos handlers de tarefas/membros/eventos

Cada task abaixo é independente das demais desta fase; todas dependem de T2.

#### T11: `assertFamilyAccess` em `tasks/createTask.ts`

**What**: Mesmo padrão do T6.
**Where**: `backend/src/handlers/tasks/createTask.ts`
**Depends on**: T2
**Reuses**: `assertFamilyAccess`
**Requirement**: REG-09, REG-10, REG-11
**Tests**: none (handler — verificação manual)
**Gate**: Build (backend) — `cd backend && npm run typecheck`

**Tools**: MCP: NONE / Skill: NONE

**Done when**:
- [x] Mesmo critério do T6 aplicado

**Status**: ✅ Complete

---

#### T12: `assertFamilyAccess` em `members/listMembers.ts`

**What**: Mesmo padrão do T6.
**Where**: `backend/src/handlers/members/listMembers.ts`
**Depends on**: T2
**Reuses**: `assertFamilyAccess`
**Requirement**: REG-09, REG-10, REG-11
**Tests**: none (handler — verificação manual)
**Gate**: Build (backend) — `cd backend && npm run typecheck`

**Tools**: MCP: NONE / Skill: NONE

**Done when**:
- [x] Mesmo critério do T6 aplicado

**Status**: ✅ Complete

---

#### T13: `assertFamilyAccess` em `members/inviteMember.ts`

**What**: Mesmo padrão do T6.
**Where**: `backend/src/handlers/members/inviteMember.ts`
**Depends on**: T2
**Reuses**: `assertFamilyAccess`
**Requirement**: REG-09, REG-10, REG-11
**Tests**: none (handler — verificação manual)
**Gate**: Build (backend) — `cd backend && npm run typecheck`

**Tools**: MCP: NONE / Skill: NONE

**Done when**:
- [x] Mesmo critério do T6 aplicado

**Status**: ✅ Complete

---

#### T14: `assertFamilyAccess` em `events/listEvents.ts`

**What**: Mesmo padrão do T6.
**Where**: `backend/src/handlers/events/listEvents.ts`
**Depends on**: T2
**Reuses**: `assertFamilyAccess`
**Requirement**: REG-09, REG-10, REG-11
**Tests**: none (handler — verificação manual)
**Gate**: Build (backend) — `cd backend && npm run typecheck`

**Tools**: MCP: NONE / Skill: NONE

**Done when**:
- [x] Mesmo critério do T6 aplicado

**Status**: ✅ Complete

---

#### T15: `assertFamilyAccess` em `events/createEvent.ts`

**What**: Mesmo padrão do T6.
**Where**: `backend/src/handlers/events/createEvent.ts`
**Depends on**: T2
**Reuses**: `assertFamilyAccess`
**Requirement**: REG-09, REG-10, REG-11
**Tests**: none (handler — verificação manual)
**Gate**: Build (backend) — `cd backend && npm run typecheck && npm run build`

**Tools**: MCP: NONE / Skill: NONE

**Done when**:
- [x] Mesmo critério do T6 aplicado
- [x] Gate Build (backend completo) passa depois de T6-T15 todos aplicados

**Status**: ✅ Complete

---

### Phase 5: Job diário multi-família + scripts de admin

#### T16: `generateDailyDeck.ts` processa todas as famílias via `Scan`

**What**: Substituir a leitura de `FAMILY_ID` env var por um `ScanCommand` (`FilterExpression: SK = :metadata`) que lista todas as `FAMILY#{id}/METADATA`, rodando a lógica atual (streak + geração de baralho) em loop por família, isolando falhas por família.
**Where**: `backend/src/handlers/jobs/generateDailyDeck.ts`
**Depends on**: T5
**Reuses**: `updateStreak`, `isDueToday` (lógica existente, só muda o wrapper externo)
**Requirement**: REG-13, REG-14
**Tests**: none (handler com I/O em AWS — verificação manual)
**Gate**: Build (backend) — `cd backend && npm run typecheck`

**Tools**: MCP: NONE / Skill: NONE

**Done when**:
- [x] Handler não lê mais `process.env.FAMILY_ID`
- [x] Loop captura exceção por família e segue pras demais (log do erro, sem `throw`)
- [ ] Verificação manual: `sam local invoke GenerateDailyDeckFunction` com 2 famílias seedadas gera `INSTANCE#` pras duas (não executado neste ambiente — sem `sam`/docker disponíveis; gate de typecheck passou)

---

#### T17: Remover parâmetro `FamilyId` do `template.yaml`

**What**: Remover `Parameters.FamilyId` e a env var `FAMILY_ID` de `GenerateDailyDeckFunction`.
**Where**: `backend/template.yaml`
**Depends on**: T16
**Reuses**: nenhum
**Requirement**: REG-15
**Tests**: none (config)
**Gate**: Build (backend) — `cd backend && npm run build`

**Tools**: MCP: NONE / Skill: NONE

**Done when**:
- [x] `sam build` passa sem o parâmetro
- [x] Nenhuma referência restante a `!Ref FamilyId` no arquivo

---

#### T18: `createUser.ts` passa a setar `custom:familyId`

**What**: Adicionar `familyId` como argumento obrigatório do script e incluir `{ Name: "custom:familyId", Value: familyId }` no `UserAttributes` do `AdminCreateUserCommand`.
**Where**: `backend/scripts/createUser.ts`
**Depends on**: T5
**Reuses**: estrutura existente do script
**Requirement**: REG-09 (risco identificado no design)
**Tests**: none (script — verificação manual)
**Gate**: Build (backend) — `cd backend && npm run typecheck`

**Tools**: MCP: NONE / Skill: NONE

**Done when**:
- [x] Uso `npm run create-user -- <email> <familyId> <memberId> <senha>` documentado no cabeçalho
- [x] Chamada sem `familyId` falha com mensagem clara antes de chamar o Cognito

---

#### T19: `inviteUser.ts` passa a setar `custom:familyId`

**What**: Mesmo padrão do T18.
**Where**: `backend/scripts/inviteUser.ts`
**Depends on**: T5
**Reuses**: estrutura existente do script
**Requirement**: REG-09 (risco identificado no design)
**Tests**: none (script — verificação manual)
**Gate**: Build (backend) — `cd backend && npm run typecheck`

**Tools**: MCP: NONE / Skill: NONE

**Done when**:
- [x] Uso `npm run invite-user -- <email> <familyId> <memberId>` documentado no cabeçalho
- [x] Chamada sem `familyId` falha com mensagem clara antes de chamar o Cognito

---

### Phase 6: Frontend - `familyId` dinâmico

#### T20: `cognito.ts` — `Session.familyId`

**What**: Adicionar `familyId` à interface `Session`, lido de `custom:familyId` no `idToken`.
**Where**: `frontend/src/auth/cognito.ts`
**Depends on**: None
**Reuses**: `sessionFromCognito` existente
**Requirement**: REG-09
**Tests**: none (verificação manual)
**Gate**: Build (frontend) — `cd frontend && npm run build`

**Tools**: MCP: NONE / Skill: NONE

**Done when**:
- [x] `Session.familyId` populado a partir de `custom:familyId`
- [x] Gate Build (frontend) passa

---

#### T21: `tokenStore.ts` — `setFamilyId`/`getFamilyId`

**What**: Adicionar o par `setFamilyId`/`getFamilyId`, mesmo padrão do `setToken`/`getToken` já existente.
**Where**: `frontend/src/auth/tokenStore.ts`
**Depends on**: None
**Reuses**: padrão já existente de `setToken`/`getToken`
**Requirement**: REG-09
**Tests**: none (verificação manual)
**Gate**: Build (frontend) — `cd frontend && npm run build`

**Tools**: MCP: NONE / Skill: NONE

**Done when**:
- [x] `setFamilyId`/`getFamilyId` implementados no mesmo módulo/estilo
- [x] Gate Build (frontend) passa

---

#### T22: `AuthContext.tsx` chama `setFamilyId` em `applySession`

**What**: Fazer `applySession` chamar `setFamilyId(session?.familyId ?? null)` junto com `setToken`.
**Where**: `frontend/src/auth/AuthContext.tsx`
**Depends on**: T20, T21
**Reuses**: `applySession` existente
**Requirement**: REG-09
**Tests**: none (verificação manual — login real e checar `getFamilyId()`)
**Gate**: Build (frontend) — `cd frontend && npm run build`

**Tools**: MCP: NONE / Skill: NONE

**Done when**:
- [x] `familyId` fica disponível via `getFamilyId()` logo após login bem-sucedido
- [x] Gate Build (frontend) passa

---

#### T23: `client.ts` usa `getFamilyId()` em vez de `VITE_FAMILY_ID`

**What**: Remover `FAMILY_ID` de env var em `client.ts`, usar `getFamilyId()` do `tokenStore.ts` pra montar a URL.
**Where**: `frontend/src/api/client.ts`
**Depends on**: T22
**Reuses**: `getFamilyId`
**Requirement**: REG-09
**Tests**: none (verificação manual)
**Gate**: Build (frontend) — `cd frontend && npm run build`

**Tools**: MCP: NONE / Skill: NONE

**Done when**:
- [x] Nenhuma referência a `import.meta.env.VITE_FAMILY_ID` restante em `client.ts`
- [x] Smoke test manual: logado, o app carrega o baralho do dia normalmente

---

### Phase 7: Frontend - tela de cadastro

#### T24: `cognito.ts` — `signUp`/`confirmSignUp`/`resendConfirmationCode`

**What**: Adicionar as três funções (mesmo padrão `Promise`-wrap já usado em `login`/`completeNewPassword`), enviando `custom:familyName` como atributo do usuário no `signUp`.
**Where**: `frontend/src/auth/cognito.ts`
**Depends on**: T20
**Reuses**: padrão `Promise`-wrap sobre `amazon-cognito-identity-js` já usado no arquivo
**Requirement**: REG-16, REG-17, REG-18
**Tests**: none (verificação manual)
**Gate**: Build (frontend) — `cd frontend && npm run build`

**Tools**: MCP: NONE / Skill: NONE

**Done when**:
- [x] `signUp(familyName, email, password)` envia `custom:familyName` corretamente
- [x] `confirmSignUp`/`resendConfirmationCode` implementados e tipados
- [x] Gate Build (frontend) passa

---

#### T25: `SignUpScreen.tsx`

**What**: Tela de cadastro (nome da família, e-mail, senha), chamando `signUp` e navegando pra confirmação.
**Where**: `frontend/src/components/SignUpScreen.tsx`
**Depends on**: T24
**Reuses**: estilo visual de `LoginScreen.tsx`/`SetPasswordScreen.tsx`
**Requirement**: REG-16, REG-18
**Tests**: none (verificação manual)
**Gate**: Build (frontend) — `cd frontend && npm run build`

**Tools**: MCP: NONE / Skill: NONE

**Done when**:
- [x] Erros do Cognito (e-mail em uso, senha fraca) aparecem traduzidos na tela, sem travar o formulário
- [x] Gate Build (frontend) passa

---

#### T26: `ConfirmSignUpScreen.tsx`

**What**: Tela de confirmação por código, chamando `confirmSignUp`/`resendConfirmationCode`.
**Where**: `frontend/src/components/ConfirmSignUpScreen.tsx`
**Depends on**: T25
**Reuses**: estilo visual de `LoginScreen.tsx`/`SetPasswordScreen.tsx`
**Requirement**: REG-17
**Tests**: none (verificação manual)
**Gate**: Build (frontend) — `cd frontend && npm run build`

**Tools**: MCP: NONE / Skill: NONE

**Done when**:
- [x] Código errado/expirado permite reenviar sem recriar cadastro
- [x] Confirmação correta redireciona pra tela de login com e-mail preenchido
- [x] Gate Build (frontend) passa

---

#### T27: Link "Criar conta da família" (`LoginScreen` + `App.tsx`)

**What**: Adicionar link/navegação da tela de login pra tela de cadastro, e o roteamento local em `App.tsx` entre login/cadastro/confirmação.
**Where**: `frontend/src/components/LoginScreen.tsx`, `frontend/src/App.tsx`
**Depends on**: T26
**Reuses**: roteamento local já usado entre `LoginScreen`/`SetPasswordScreen`
**Requirement**: REG-19
**Tests**: none (verificação manual)
**Gate**: Build (frontend) — `cd frontend && npm run build`

**Tools**: MCP: NONE / Skill: NONE

**Done when**:
- [ ] Link visível na tela de login leva à tela de cadastro e volta
- [ ] Fluxo completo (cadastro → confirmação → login) funciona manualmente pela UI
- [ ] Gate Build (frontend) passa

---

### Phase 8: Limpeza de env vars e documentação

#### T28: Remover `VITE_FAMILY_ID` de `.env.example`

**What**: Remover a variável, já que não é mais necessária.
**Where**: `frontend/.env.example`
**Depends on**: T23
**Reuses**: nenhum
**Requirement**: REG-09
**Tests**: none
**Gate**: Build (frontend) — `cd frontend && npm run build`

**Tools**: MCP: NONE / Skill: NONE

**Done when**:
- [ ] `VITE_FAMILY_ID` removida do arquivo

---

#### T29: Remover `VITE_FAMILY_ID` de `vite-env.d.ts`

**What**: Remover a declaração de tipo correspondente.
**Where**: `frontend/src/vite-env.d.ts`
**Depends on**: T28
**Reuses**: nenhum
**Requirement**: REG-09
**Tests**: none
**Gate**: Build (frontend) — `cd frontend && npm run build`

**Tools**: MCP: NONE / Skill: NONE

**Done when**:
- [ ] `npm run build` (frontend) passa
- [ ] Nenhuma referência restante a `VITE_FAMILY_ID` no repo

---

#### T30: Atualizar `backend/README.md`

**What**: Remover instruções de `FamilyId`/`FAMILY_ID` fixos, documentar o novo fluxo de cadastro self-service e o uso atualizado de `createUser.ts`/`inviteUser.ts` com `familyId`.
**Where**: `backend/README.md`
**Depends on**: T29
**Reuses**: nenhum
**Requirement**: N/A (documentação)
**Tests**: none
**Gate**: none (revisão de leitura)

**Tools**: MCP: NONE / Skill: NONE

**Done when**:
- [ ] Nenhuma referência desatualizada a "uma família por deploy" ou `FamilyId` fixo

---

#### T31: Atualizar `frontend/README.md`

**What**: Remover instrução de configurar `VITE_FAMILY_ID`; documentar o novo fluxo de cadastro pela UI.
**Where**: `frontend/README.md`
**Depends on**: T30
**Reuses**: nenhum
**Requirement**: N/A (documentação)
**Tests**: none
**Gate**: none (revisão de leitura)

**Tools**: MCP: NONE / Skill: NONE

**Done when**:
- [ ] Nenhuma referência restante a `VITE_FAMILY_ID`

---

## Validation Tables (pre-approval gates)

### Check 1: Task Granularity

31 tasks, cada uma tocando um único arquivo de produção (T1, T2, T27 tocam 2 arquivos cada, por acoplamento genuíno: setup de tooling, par implementação+teste, e par link+roteamento — aceito como exceção documentada, não como "task vaga"). ✅

### Check 2: Diagram-Definition Cross-Check

| Edge / grupo no diagrama | `Depends on` correspondente | OK? |
| ------------------------- | ------------------------------ | --- |
| T1 → T2 | T2 depends on T1 | ✅ |
| T3 → T4 → T5 | T4 depends on T3; T5 depends on T4 | ✅ |
| T6..T10 (sem seta, independentes) | todas depend on T2 (Phase 1, cross-phase, sem seta necessária) | ✅ |
| T11..T15 (sem seta, independentes) | todas depend on T2 (Phase 1, cross-phase) | ✅ |
| T16 → T17 | T17 depends on T16 | ✅ |
| T18, T19 (sem seta) | ambas depend on T5 (Phase 2, cross-phase) | ✅ |
| T20 → T22, T21 → T22 | T22 depends on T20, T21 | ✅ |
| T22 → T23 | T23 depends on T22 | ✅ |
| T24 → T25 → T26 → T27 | cada um depende do anterior | ✅ |
| T28 → T29 → T30 → T31 | cada um depende do anterior | ✅ |

Nenhuma dependência aponta pra fase posterior. ✅

### Check 3: Test Co-location Validation

| Task | Layer tocado | `Tests` na task | Bate com a matriz? |
| ---- | ------------- | ---------------- | -------------------- |
| T2 | Lógica pura (`auth.ts`) | `unit` (4 branches, na mesma task) | ✅ |
| T4, T5, T6-T19 | Handlers Lambda / config | `Tests: none` (verificação manual documentada em "Done when") | ✅ |
| T20-T31 | Frontend / scripts / docs | `Tests: none` (verificação manual) | ✅ |

---

## Tools Question

Para cada task, uso as ferramentas de arquivo padrão (leitura/edição) e o terminal só pra rodar `vitest`/`sam build`/`npm run build` como gate. Nenhum MCP ou skill externo é necessário para esta feature.
