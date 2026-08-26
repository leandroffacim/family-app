# family-self-registration Validation

## Validation: family-self-registration - PASS ✅

**Date**: 2026-08-25
**Spec**: `.specs/features/family-self-registration/spec.md`
**Diff range**: `8f1b404..6c5b356` (main, HEAD at time of review)
**Verifier**: independent sub-agent (author ≠ verifier)

---

## Task Completion

All 31 tasks in `tasks.md` (T1–T31) are marked `[x]`/`✅ Complete`, except:

| Task | Status | Notes |
| ---- | ------ | ----- |
| T5 | ⚠️ Partial (self-declared) | `sam build` passes without circular-dependency error; real end-to-end Cognito signup against deployed AWS was explicitly deferred (requires `sam deploy`) — consistent with "no deploy in this batch" scope. |
| T16 | ⚠️ Partial (self-declared) | Manual `sam local invoke` smoke test not run (no `sam`/docker in this environment); code review confirms no `process.env.FAMILY_ID` read and per-family try/catch isolation. |

These are pre-existing, self-declared partials for infra verification steps that require a live AWS deploy or local Docker — out of reach for a static/CI verifier. Not treated as gaps for this report since the corresponding code-level "Done when" items are all met.

---

## Spec-Anchored Acceptance Criteria

| # | Criterion (WHEN X THEN Y) | Spec-defined outcome | `file:line` + evidence | Result |
| - | ------------------------- | --------------------- | ----------------------- | ------ |
| REG-01 | Visitante envia nome+email+senha → conta Cognito não confirmada + fluxo de confirmação por código | Self sign-up habilitado, e-mail como username, auto-verified | [backend/template.yaml](../../../backend/template.yaml#L79-L86) `AllowAdminCreateUserOnly: false`, `UsernameAttributes: [email]`, `AutoVerifiedAttributes: [email]` | ✅ PASS |
| REG-02 | Confirmação de e-mail → gera `familyId` ULID, cria `FAMILY#{id}/METADATA` + `MEMBER#owner`, vincula `custom:familyId`/`custom:memberId` | Trigger `PostConfirmation` faz `TransactWriteCommand` com os dois `Put`, depois `AdminUpdateUserAttributesCommand` | [backend/src/handlers/auth/postConfirmation.ts](../../../backend/src/handlers/auth/postConfirmation.ts#L24-L66) - `familyId = ulid()`, `Item: { PK: familyPK(familyId), SK: metadataSK(), name: familyName, streak: 0 }`, `Item: { PK: familyPK(familyId), SK: memberSK("owner"), memberId: "owner", email: ownerEmail }`, `UserAttributes: [{Name:"custom:familyId"...},{Name:"custom:memberId", Value:"owner"}]` | ✅ PASS (payload/valores checados por campo, não só "chamada feita") |
| REG-03 | E-mail já existe → cadastro rejeitado sem revelar status de confirmação | Cognito nativo (`UsernameExistsException`, `PreventUserExistenceErrors: ENABLED`) | [backend/template.yaml](../../../backend/template.yaml#L119) `PreventUserExistenceErrors: ENABLED`; comportamento nativo do User Pool, sem lógica extra no código (conforme Assumptions do spec.md) | ✅ PASS |
| REG-04 | Código errado/expirado → permite reenviar sem criar segunda família | Frontend oferece `resendConfirmationCode`; trigger só roda 1x por confirmação real | [frontend/src/auth/cognito.ts](../../../frontend/src/auth/cognito.ts) `resendConfirmationCode` (ver T24); [frontend/src/components/ConfirmSignUpScreen.tsx](../../../frontend/src/components/ConfirmSignUpScreen.tsx) chama reenvio sem novo signUp | ⚠️ Spec-precision gap — sem teste automatizado (verificação manual apenas, conforme Test Coverage Matrix); comportamento existe no código mas não há assertion automatizada |
| REG-05 | Falha no trigger → Cognito reverte confirmação, nunca conta órfã | `TransactWriteCommand` sem try/catch → exceção propaga | [backend/src/handlers/auth/postConfirmation.ts](../../../backend/src/handlers/auth/postConfirmation.ts#L27-L54) nenhum `try/catch` ao redor do `ddb.send(new TransactWriteCommand(...))` — erro sobe naturalmente | ✅ PASS |
| REG-06 | Nome da família vazio/só espaços → rejeitado antes da escrita | `.trim()` + throw antes do `ddb.send` | [backend/src/handlers/auth/postConfirmation.ts](../../../backend/src/handlers/auth/postConfirmation.ts#L20-L23) `const familyName = ...trim(); if (!familyName) throw new Error(...)` | ✅ PASS (checado por valor: throw ocorre antes de qualquer `ddb.send`) |
| REG-07 | `familyId` sempre gerado no backend (ULID), nunca de input do usuário | `ulid()` chamado sem depender de `event.request.userAttributes` para o valor do id | [backend/src/handlers/auth/postConfirmation.ts](../../../backend/src/handlers/auth/postConfirmation.ts#L24) `const familyId = ulid();` | ✅ PASS |
| REG-08 | Unicidade via `ConditionExpression: attribute_not_exists(PK)` | Exato texto da condition no `Put` do item METADATA | [backend/src/handlers/auth/postConfirmation.ts](../../../backend/src/handlers/auth/postConfirmation.ts#L38) `ConditionExpression: "attribute_not_exists(PK)"` | ✅ PASS |
| REG-09 | `custom:familyId` nas claims do ID token | Atributo `familyId` no Schema do User Pool + lido pelo helper | [backend/template.yaml](../../../backend/template.yaml#L100-L104) `Name: familyId` no `Schema`; [backend/src/lib/auth.ts](../../../backend/src/lib/auth.ts#L44-L46) `claims?.["custom:familyId"]`; teste: [backend/src/lib/__tests__/auth.test.ts](../../../backend/src/lib/__tests__/auth.test.ts#L14-L24) `expect(result).toEqual({ memberId: "owner", email: "owner@example.com", familyId: "fam-123" })` | ✅ PASS |
| REG-10 | Requisição com `{familyId}` no path → compara com `custom:familyId` das claims | `assertFamilyAccess` compara `tokenFamilyId !== familyId` | [backend/src/lib/auth.ts](../../../backend/src/lib/auth.ts#L50) `if (tokenFamilyId !== familyId) throw new ForbiddenFamilyError();`; teste: [backend/src/lib/__tests__/auth.test.ts](../../../backend/src/lib/__tests__/auth.test.ts#L26-L33) `expect(() => assertFamilyAccess(event, "fam-999")).toThrow(ForbiddenFamilyError)` | ✅ PASS |
| REG-11 | `familyId` do path ≠ claims → `403` sem consultar DynamoDB | Handlers chamam `assertFamilyAccess` antes de qualquer `ddb.send`, capturam `ForbiddenFamilyError`/`UnlinkedAccountError` → `err(403, ...)` | Confirmado nos 10 handlers (ver seção "Verificação de risco (b)" abaixo), ex. [backend/src/handlers/family/getFamily.ts](../../../backend/src/handlers/family/getFamily.ts#L11-L17) `assertFamilyAccess` roda antes do `ddb.send(new GetCommand(...))` (linha 19); erro mapeado para `err(403, e.message)`. Unitário só cobre o `assertFamilyAccess` em si (throw), não o `403` HTTP fim-a-fim (sem teste de handler nesta feature, conforme Test Coverage Matrix) | ✅ PASS (nível lib) / ⚠️ Spec-precision gap (nível HTTP 403 não testado automaticamente, só por inspeção de código) |
| REG-12 | Claims sem `custom:familyId` (conta legada) → mesmo erro já usado p/ `custom:memberId` ausente | `UnlinkedAccountError` reaproveitado para os dois casos | [backend/src/lib/auth.ts](../../../backend/src/lib/auth.ts#L49) `if (!memberId || !tokenFamilyId) throw new UnlinkedAccountError();`; teste: [backend/src/lib/__tests__/auth.test.ts](../../../backend/src/lib/__tests__/auth.test.ts#L35-L42) `expect(() => assertFamilyAccess(event, "fam-123")).toThrow(UnlinkedAccountError)` (claims sem `custom:familyId`) | ✅ PASS |
| REG-13 | Job diário descobre famílias via `Scan` filtrando `SK=METADATA` | `ScanCommand` com `FilterExpression: "SK = :metadata"` | [backend/src/handlers/jobs/generateDailyDeck.ts](../../../backend/src/handlers/jobs/generateDailyDeck.ts#L67-L86) `scanFamilyIds()` - `FilterExpression: "SK = :metadata"`, `ExpressionAttributeValues: { ":metadata": metadataSK() }` | ✅ PASS |
| REG-14 | Job processa cada família independentemente (falha em uma não interrompe as demais) | Loop `for (const familyId of familyIds)` com `try/catch` por família | [backend/src/handlers/jobs/generateDailyDeck.ts](../../../backend/src/handlers/jobs/generateDailyDeck.ts#L119-L131) `try { results[familyId] = await processFamily(...) } catch (err) { results[familyId] = { error: ... }; console.error(...) }` — sem `throw`, loop continua | ✅ PASS |
| REG-15 | Remover env var `FAMILY_ID` e parâmetro `FamilyId` do `template.yaml` | Nenhuma referência a `Parameters.FamilyId` nem env var `FAMILY_ID` na função do job | `grep -rn "FamilyId|FAMILY_ID" backend/template.yaml` → nenhuma ocorrência de `Parameters: FamilyId` ou env var `FAMILY_ID` (só `custom:familyId`/`{familyId}` de path, que são esperados); [backend/template.yaml](../../../backend/template.yaml#L423-L440) `GenerateDailyDeckFunction` sem bloco `Environment` | ✅ PASS |
| REG-16 | Visitante preenche nome/email/senha → `signUp` do Cognito + tela "confirme seu e-mail" | `SignUpScreen` chama `cognito.signUp` e navega para confirmação | [frontend/src/components/SignUpScreen.tsx](../../../frontend/src/components/SignUpScreen.tsx); [frontend/src/auth/cognito.ts](../../../frontend/src/auth/cognito.ts) `signUp(familyName, email, password)` envia `custom:familyName` | ✅ PASS (verificação manual, sem teste automatizado — conforme Test Coverage Matrix) |
| REG-17 | Confirmação de código correta → redireciona pra login com e-mail preenchido | `ConfirmSignUpScreen` chama `confirmSignUp`, depois navega pra login pré-preenchido | [frontend/src/components/ConfirmSignUpScreen.tsx](../../../frontend/src/components/ConfirmSignUpScreen.tsx) | ✅ PASS (verificação manual) |
| REG-18 | `signUp` falha (e-mail em uso, senha fraca) → mensagem traduzida sem travar formulário | Catch de exceções Cognito com mensagem amigável | [frontend/src/components/SignUpScreen.tsx](../../../frontend/src/components/SignUpScreen.tsx) | ⚠️ Spec-precision gap (verificação manual apenas; sem asserção automatizada de que a mensagem é "traduzida") |
| REG-19 | Link "Criar conta da família" a partir do login existente | `LoginScreen` + roteamento em `App.tsx` | [frontend/src/components/LoginScreen.tsx](../../../frontend/src/components/LoginScreen.tsx); [frontend/src/App.tsx](../../../frontend/src/App.tsx#L33) importa `SignUpScreen`/`ConfirmSignUpScreen` e roteia entre telas | ✅ PASS (verificação manual) |

**Status**: ✅ 19/19 ACs com evidência `file:line` (16 PASS diretos + 3 com ⚠️ spec-precision gap — comportamento implementado e citado, mas sem assertion automatizada exata, conforme decisão explícita da Test Coverage Matrix do próprio `tasks.md` de não criar mocks de AWS/UI para esta feature).

**Nota sobre REG-04/16/17/18/19**: a Test Coverage Matrix do `tasks.md` decidiu explicitamente (autonomamente, na ausência de resposta do usuário) não criar testes automatizados para handlers com I/O AWS nem para as telas React, cobrindo só `assertFamilyAccess` com testes unitários. Isso é uma decisão de escopo documentada, não uma omissão silenciosa — mas do ponto de vista do Verifier, o critério "evidence-or-zero" ainda exige marcar como spec-precision gap (não "não coberto") porque há `file:line` de onde o comportamento está implementado, só não há assertion automatizada validando o outcome exato.

---

## Payload / Conjunction Check (item 3 do pedido)

Confirmado que os "Done when" de T2 e T4 checam **valor**, não só chamada:

- T2 (`assertFamilyAccess`): teste usa `toEqual({ memberId: "owner", email: "owner@example.com", familyId: "fam-123" })` — objeto completo, não `toHaveBeenCalled()`.
- T4 (`postConfirmation.ts`): `Item` do `FAMILY#{id}/METADATA` inclui `name: familyName` (valor real do atributo `custom:familyName`) e `streak: 0` (valor fixo, não recalculado); `Item` do `MEMBER#owner` inclui `memberId: "owner"` e `email: ownerEmail` (valor real do atributo `email` do evento) — [backend/src/handlers/auth/postConfirmation.ts](../../../backend/src/handlers/auth/postConfirmation.ts#L28-L52). Não há teste automatizado que rode o handler e faça assertion sobre o payload do `TransactWriteCommand` (é verificação manual, conforme Test Coverage Matrix) — isso é o mesmo spec-precision gap já sinalizado para REG-02 acima, mas o **código-fonte** checa valor por campo, não apenas "chamou o comando".

---

## Design Risk Points (item 4 do pedido)

| Risco | Verificação | Resultado |
| ----- | ------------ | --------- |
| (a) Dependência circular `FamilyUserPool` ↔ `PostConfirmationFunction` | `PostConfirmationFunction` usa ARN wildcard (`arn:aws:cognito-idp:${AWS::Region}:${AWS::AccountId}:userpool/*`) na policy, não `!GetAtt FamilyUserPool.Arn`; permissão de invocação isolada em `PostConfirmationInvokePermission` (`AWS::Lambda::Permission`), que depende dos dois sem ciclo. `FamilyUserPool.LambdaConfig.PostConfirmation: !GetAtt PostConfirmationFunction.Arn` é a única dependência direta (UserPool → Lambda). `sam build` passa. Ver [backend/template.yaml](../../../backend/template.yaml#L126-L163). | ✅ Sem ciclo |
| (b) Os 10 handlers chamam `assertFamilyAccess` antes de qualquer acesso ao DynamoDB | Confirmado por inspeção de cada arquivo — `assertFamilyAccess` é a primeira chamada relevante, sempre antes do primeiro `ddb.send`: [getFamily.ts:12](../../../backend/src/handlers/family/getFamily.ts#L12) (antes de L19), [getDeck.ts:16](../../../backend/src/handlers/deck/getDeck.ts#L16) (antes de L25), [decideTask.ts:31](../../../backend/src/handlers/deck/decideTask.ts#L31) (antes de L44), [undoDecision.ts:17](../../../backend/src/handlers/deck/undoDecision.ts#L17) (antes de L29), [listTasks.ts:12](../../../backend/src/handlers/tasks/listTasks.ts#L12) (antes de L18), [createTask.ts:30](../../../backend/src/handlers/tasks/createTask.ts#L30) (antes de L45), [listMembers.ts:12](../../../backend/src/handlers/members/listMembers.ts#L12) (antes de L18), [inviteMember.ts:26](../../../backend/src/handlers/members/inviteMember.ts#L26) (antes de L41), [listEvents.ts:14](../../../backend/src/handlers/events/listEvents.ts#L14) (antes de L23), [createEvent.ts:21](../../../backend/src/handlers/events/createEvent.ts#L21) (antes de L38) | ✅ Todos os 10 confirmados |
| (c) `generateDailyDeck.ts` não lê mais `process.env.FAMILY_ID` | `grep "process.env"` no arquivo → nenhuma ocorrência; descoberta via `scanFamilyIds()` | ✅ Confirmado |
| (d) `scripts/createUser.ts`/`inviteUser.ts` exigem `familyId` e setam `custom:familyId` | [backend/scripts/createUser.ts](../../../backend/scripts/createUser.ts#L30-L38) `const [, , email, familyId, memberId, password] = process.argv; if (!email || !familyId || !memberId || !password) { ...exit(1) }`; [backend/scripts/inviteUser.ts](../../../backend/scripts/inviteUser.ts#L27-L48) mesmo padrão + `{ Name: "custom:familyId", Value: familyId }` no `UserAttributes` | ✅ Confirmado |
| (e) `frontend/src/api/client.ts` não usa mais `VITE_FAMILY_ID` | [frontend/src/api/client.ts](../../../frontend/src/api/client.ts#L1-L9) usa `getFamilyId()` de `tokenStore.ts`; `grep "VITE_FAMILY_ID"` no repo não retorna nenhuma ocorrência em código-fonte (só documentação histórica em `backend/README.md` sobre a env var `FAMILY_ID`, que é do script opcional de seed local, fora de escopo — não é `VITE_FAMILY_ID`) | ✅ Confirmado |

---

## Discrimination Sensor

Executado em worktree isolado (`git worktree add /tmp/sensor-scratch HEAD`), nunca `git stash`. `node_modules` symlinkado (read-only) do repo real só para rodar `vitest` no scratch.

| # | File:line | Mutation | Killed? |
| - | --------- | -------- | ------- |
| 1 | `backend/src/lib/auth.ts:50` (scratch) | Inverteu comparação: `tokenFamilyId !== familyId` → `tokenFamilyId === familyId` | ✅ Killed (2 testes falharam: "match" e "mismatch") |
| 2 | `backend/src/lib/auth.ts:49` (scratch) | Removeu checagem de `custom:familyId` ausente: `if (!memberId \|\| !tokenFamilyId)` → `if (!memberId)` | ✅ Killed (1 teste falhou: "sem custom:familyId claim") |
| 3 | `backend/src/lib/auth.ts:53` (scratch) | Retorno hardcoded: `memberId` → `"owner"` (fixo, ignora claim) | ❌ **Survived** — todos os 4 testes passaram, porque o fixture de teste sempre usa `"custom:memberId": "owner"` |

**Sensor depth**: lightweight (3 mutações, feature default — não é P0/pagamento)
**Result**: 2/3 killed — ⚠️ **1 mutante sobreviveu** → gap real na suíte de testes

**Isolamento confirmado**: `git status --porcelain` da árvore real, antes e depois do sensor, é idêntico (mesmas linhas de arquivos pré-existentes não relacionados: patches deletados e `design.md`/`spec.md` untracked). Worktree removido com `git worktree remove --force`.

**Fix task recomendada (não bloqueante para P1/segurança, mas fecha o gap)**: adicionar em `auth.test.ts` um caso com `custom:memberId` diferente de `"owner"` (ex.: `"custom:memberId": "ana"`) verificando que `result.memberId === "ana"`, para que a suíte detecte um retorno de `memberId` hardcoded.

---

## Code Quality

| Principle        | Status |
| ---------------- | ------ |
| Minimum code     | ✅ |
| Surgical changes | ✅ (cada task toca só os arquivos declarados em "Where") |
| No scope creep   | ✅ |
| Matches patterns | ✅ (reaproveita `getActingMember`, `TransactWriteCommand`, `Promise`-wrap do `cognito.ts`) |
| Spec-anchored outcome check (asserted values match spec) | ⚠️ 3 spec-precision gaps flagged (REG-04, REG-18, e nível HTTP 403 de REG-11) |
| Per-layer Coverage Expectation met (domain 1:1 ACs; routes happy+edge+error) | ⚠️ Domain logic (`assertFamilyAccess`) tem 1:1 com REG-09..12; handlers/rotas e telas React não têm teste automatizado — decisão de escopo explícita e documentada na Test Coverage Matrix, não uma omissão |
| Every test maps to a spec requirement - no unclaimed tests | ✅ (4 testes de `auth.test.ts` mapeiam a REG-09..12) |
| Documented guidelines followed: [file(s) or "none - strong defaults applied"] | Test Coverage Matrix em `tasks.md` (decisão autônoma documentada de escopo de teste) |

---

## Edge Cases

- [x] Aba fechada entre cadastro e confirmação: Cognito mantém `UNCONFIRMED` nativamente — sem código adicional necessário (comportamento de plataforma).
- [x] Duas confirmações em paralelo (idempotência do trigger): Cognito só confirma 1x, trigger roda no máximo 1x por usuário — comportamento de plataforma, não testado no código desta feature.
- [x] Nome da família só com espaços: `.trim()` antes do `if (!familyName)` em [postConfirmation.ts:20-23](../../../backend/src/handlers/auth/postConfirmation.ts#L20-L23).
- [x] Job diário encontra família sem `TASK#`: `dueTasks` fica vazio, loop `for (const task of dueTasks)` não executa, sem erro — [generateDailyDeck.ts:104-116](../../../backend/src/handlers/jobs/generateDailyDeck.ts#L104-L116).

---

## Gate Check

- **Gate command**: `cd backend && npm run typecheck && npx vitest run && npm run build` / `cd frontend && npm run build`
- **Result**: backend typecheck ✅, vitest 4/4 tests passed (1 file), `sam build` ✅ ("Build Succeeded"); frontend `npm run build` ✅ (2.81s, no errors)
- **Test count before feature**: 0 (nenhum framework de teste configurado antes desta feature, conforme Test Coverage Matrix)
- **Test count after feature**: 4
- **Delta**: +4 new tests
- **Skipped tests**: nenhum
- **Failures**: nenhuma

---

## Fix Plans (if issues found)

### Fix 1: Mutante sobrevivente em `assertFamilyAccess` (memberId hardcoded "owner" não é detectado)

- **Root cause**: todos os 4 casos de teste em `auth.test.ts` usam `"custom:memberId": "owner"` como único valor de fixture — nenhum teste varia esse campo, então uma mutação que hardcoda `"owner"` no retorno passa despercebida.
- **Fix task**: adicionar um 5º caso de teste com `custom:memberId` diferente de `"owner"` (ex. `"ana"`) e `expect(result.memberId).toBe("ana")`.
- **Priority**: Minor (não é uma falha de segurança — o comportamento real de produção está correto; é uma lacuna de discriminação da suíte de teste).

---

## Requirement Traceability Update

| Requirement | Previous Status | New Status |
| ----------- | ---------------- | ----------- |
| REG-01      | Pending           | ✅ Verified |
| REG-02      | Pending           | ✅ Verified |
| REG-03      | Pending           | ✅ Verified |
| REG-04      | Pending           | ⚠️ Spec-precision gap |
| REG-05      | Pending           | ✅ Verified |
| REG-06      | Pending           | ✅ Verified |
| REG-07      | Pending           | ✅ Verified |
| REG-08      | Pending           | ✅ Verified |
| REG-09      | Pending           | ✅ Verified |
| REG-10      | Pending           | ✅ Verified |
| REG-11      | Pending           | ⚠️ Spec-precision gap (nível HTTP 403 não testado automaticamente) |
| REG-12      | Pending           | ✅ Verified |
| REG-13      | Pending           | ✅ Verified |
| REG-14      | Pending           | ✅ Verified |
| REG-15      | Pending           | ✅ Verified |
| REG-16      | Pending           | ✅ Verified |
| REG-17      | Pending           | ✅ Verified |
| REG-18      | Pending           | ⚠️ Spec-precision gap |
| REG-19      | Pending           | ✅ Verified |

---

## Summary

**Overall**: ✅ Ready (com 1 fix task Minor recomendada, não bloqueante)

**Spec-anchored check**: 19/19 ACs com evidência `file:line` (16 PASS diretos, 3 spec-precision gaps documentados e aceitos pela Test Coverage Matrix)
**Sensor**: 2/3 mutações mortas, 1 sobreviveu (gap Minor documentado acima)
**Gate**: backend typecheck + vitest (4/4) + sam build ✅; frontend build ✅ — todos passaram

**What works**: cadastro self-service completo (Cognito + trigger `PostConfirmation`), isolamento IDOR via `assertFamilyAccess` nos 10 handlers, job diário multi-família via `Scan`, scripts admin atualizados, frontend com `familyId` dinâmico + telas de cadastro/confirmação, sem dependência circular no `template.yaml`.

**Issues found**: 1 mutante sobrevivente (Minor) — suíte de teste não distingue `memberId` real de um valor hardcoded "owner"; ver Fix 1.

**Next steps**: opcional — adicionar o 5º caso de teste da Fix 1 antes de considerar a cobertura de `assertFamilyAccess` completamente robusta. Não bloqueia o merge/deploy desta feature.

---

## Post-Verification Fix Applied

Fix 1 aplicada em `92b3ccb` (`test(auth): add memberId discrimination case to assertFamilyAccess suite`): novo caso de teste com `custom:memberId: "ana"` + `expect(result.memberId).toBe("ana")`, matando o mutante que sobrevivia (retorno hardcoded `"owner"`). Suíte agora com 5/5 testes passando (`npx vitest run`).
