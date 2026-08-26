# Project State

## Decisions

| ID     | Decision                                                                                                                                                                                                                                      | Status | Rationale                                                                                                                                                                                                                      |
| ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| AD-001 | `familyId` nasce no cadastro (self-service, via trigger Cognito `PostConfirmation`) e é sempre gerado pelo backend (`ulid()`) — nunca é parâmetro de deploy (`FamilyId`/`FAMILY_ID` removidos do `template.yaml`) nem escolhido pelo usuário. | active | Necessário para o app deixar de ser "uma família por deploy" e virar multi-tenant self-service. Ver `.specs/features/family-self-registration/`.                                                                               |
| AD-002 | Toda rota que recebe `{familyId}` no path chama `assertFamilyAccess(event, familyId)` (em `backend/src/lib/auth.ts`) antes de qualquer acesso ao DynamoDB, comparando com `custom:familyId` das claims do token.                              | active | Fecha o IDOR: sem essa checagem, qualquer conta autenticada acessaria dados de qualquer família. Convenção obrigatória para todo handler novo que receba `familyId`. Ver `.specs/features/family-self-registration/design.md`. |

## Handoff

**Last completed feature**: `family-self-registration` — spec, design, tasks e validação (`PASS ✅`) completos; 32 commits atômicos (T1–T31 + fix pós-verificação). Ver `.specs/features/family-self-registration/validation.md`.

**Known follow-ups (não bloqueantes, fora do escopo atual)**:

- Verificação manual de deploy real (`sam deploy` + signup ponta a ponta contra AWS) ainda não executada neste ambiente (T5/T16 no `tasks.md`).
- `Scan` no job diário (`generateDailyDeck.ts`) pode precisar de um GSI dedicado se o número de famílias crescer muito (ver Risks & Concerns em `design.md`).
