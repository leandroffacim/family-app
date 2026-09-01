# Perfil do Membro Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Design**: `.specs/features/profile/design.md`
**Status**: Draft (generated autonomously — user unavailable to confirm test-type/tooling questions below; confirm before Execute)

---

## Test Coverage Matrix

> Generated from codebase sampling (`backend/src/lib/__tests__/auth.test.ts` is the only existing test in the repo; `backend/package.json`/`vitest.config.ts` for commands). Guidelines found: none (no `AGENTS.md`, no lint config, no CI workflow) — strong defaults applied where the sampled floor doesn't already dictate a shape.
>
> **Needs explicit confirmation before Execute:** the frontend has **zero** test infrastructure today (no test runner in `frontend/package.json`, no `@testing-library/*`). Per the Tasks process this normally requires asking the user "what test types will this project use for the frontend?" — the user was unavailable, so the default below (build-gate only, matching 100% of existing frontend code) was applied. Override before Execute if you want a frontend test runner introduced.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------- | --------------------- | ----------------- | ------------ |
| Backend handler business logic (`updateProfile.ts`, `deleteAccount.ts`) | unit | All branches; 1:1 to PROFILE-01..12 ACs + every listed edge case; AWS SDK clients (`ddb`, Cognito) hand-mocked via `vi.mock(...)`, same lightweight style as the existing `auth.test.ts` (no new test dependency) | `backend/src/handlers/members/__tests__/*.test.ts` | `cd backend && npm test` |
| Backend auth trigger modification (`postConfirmation.ts`) | unit | The new `isOwner: true` attribute is present on the owner `Put` item and absent for the invited-member branch (supports PROFILE-08) | `backend/src/handlers/auth/__tests__/postConfirmation.test.ts` | `cd backend && npm test` |
| Backend infra (`template.yaml` routes, IAM policy) | none | Config/entity layer — build gate only | n/a | `cd backend && sam build` |
| Frontend (`ProfileScreen.tsx`, `api/client.ts`, `App.tsx` wiring, `types.ts`) | none | No test runner exists in this repo today (see confirmation note above) — typecheck + bundler build only | n/a | `cd frontend && npm run build` |

## Gate Check Commands

> Generated from `backend/package.json` (`test`, `typecheck`) and `frontend/package.json` (`build`) — confirm before Execute. No lint config exists in either project, so no lint step is included.

| Gate Level | When to Use | Command |
| ---------- | ----------- | ------- |
| Quick | After a backend-only task with unit tests | `cd backend && npm test` |
| Full | After a phase that touches both backend logic and its typecheck | `cd backend && npm test && npx tsc --noEmit` |
| Build | After phase completion, or after infra-only (`template.yaml`) or frontend-only tasks | `cd backend && sam build` (backend infra tasks) — `cd frontend && npm run build` (frontend tasks) |

---

## Execution Plan

Phases are ordered and run sequentially - each phase completes before the next begins, and tasks within a phase execute in order.

### Phase 1: Paleta de cor do avatar (constante compartilhada)

```
T1, T2
```

### Phase 2: Atributo `isOwner` (pré-requisito da exclusão de conta)

```
T3
```

### Phase 3: Endpoints backend

```
T4, T5, T6, T7
```

### Phase 4: Integração frontend

```
T8, T9, T10
```

---

## Task Breakdown

### T1: Add `AVATAR_COLORS` constant (backend)

**What**: Export the fixed 8-value avatar color palette as a typed constant for server-side validation.
**Where**: `backend/src/lib/types.ts`
**Depends on**: None
**Reuses**: n/a (new constant; mirrors tones already used in `frontend/src/theme.ts`)
**Requirement**: N/A (shared infra for PROFILE-04)

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `export const AVATAR_COLORS = ["#4F46E5", "#EF4444", "#F59E0B", "#10B981", "#0EA5E9", "#8B5CF6", "#EC4899", "#64748B"] as const;` added to `backend/src/lib/types.ts`
- [x] `npx tsc --noEmit` (in `backend/`) passes with no errors

**Tests**: none
**Gate**: build (`cd backend && npx tsc --noEmit`)

**Commit**: `feat(profile): add avatar color palette constant (backend)`

---

### T2: Add `AVATAR_COLORS` constant (frontend)

**What**: Mirror the same 8-value avatar color palette on the frontend for the color-picker UI, matching the existing dual-copy `types.ts` convention.
**Where**: `frontend/src/types.ts`
**Depends on**: T1
**Reuses**: n/a (mirrors T1's values exactly)
**Requirement**: N/A (shared infra for PROFILE-01/02 UI)

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `export const AVATAR_COLORS = [...]` added to `frontend/src/types.ts`, values identical to `backend/src/lib/types.ts`
- [x] `cd frontend && npm run build` passes (typecheck + vite build)

**Tests**: none
**Gate**: build (`cd frontend && npm run build`)

**Commit**: `feat(profile): add avatar color palette constant (frontend)`

---

### T3: Stamp `isOwner: true` on the owner member (postConfirmation)

**What**: Add `isOwner: true` to the owner `MEMBER#owner` item created during self-registration, decoupling future owner-only checks from the `memberId === "owner"` literal.
**Where**: `backend/src/handlers/auth/postConfirmation.ts`
**Depends on**: None
**Reuses**: existing `TransactWriteCommand` call in the same handler (no new write)
**Requirement**: N/A (prerequisite for PROFILE-08)

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] The owner `Put` item (`SK: memberSK("owner")`) includes `isOwner: true`
- [x] The invited-member branch (existing `UpdateCommand` earlier in the same handler) is untouched and does NOT set `isOwner`
- [x] Unit tests written in `backend/src/handlers/auth/__tests__/postConfirmation.test.ts` (mocking `ddb.send` and the Cognito client, same style as `lib/__tests__/auth.test.ts`) asserting: (a) new-family signup writes `isOwner: true` on the owner item, (b) invited-member confirmation path never sets `isOwner`
- [x] `cd backend && npm test` passes, test count increases by at least 2

**Tests**: unit
**Gate**: quick (`cd backend && npm test`)

**Commit**: `feat(profile): stamp isOwner flag on family owner at signup`

---

### T4: Create `updateProfile` handler

**What**: New Lambda handler for `PATCH /families/{familyId}/members/me` — validates and updates the caller's own `name`/`color`.
**Where**: `backend/src/handlers/members/updateProfile.ts`
**Depends on**: T1
**Reuses**: `assertFamilyAccess` (`lib/auth.ts`), `err`/`ok` (`lib/response.ts`), `memberSK` (`lib/keys.ts`), Zod body-validation shape from `handlers/tasks/createTask.ts`
**Requirement**: PROFILE-01, PROFILE-02, PROFILE-03, PROFILE-04, PROFILE-05, PROFILE-06

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Handler calls `assertFamilyAccess(event, familyId)` and uses only its returned `memberId` as the update target (never path/body)
- [x] Zod schema requires at least one of `name` (1-50 chars after trim) / `color` (must be one of `AVATAR_COLORS`); rejects with `400` otherwise
- [x] Valid request runs `UpdateCommand` on `MEMBER#{memberId}` with `attribute_exists(PK)` and returns `200` with the updated fields
- [x] Unit tests written in `backend/src/handlers/members/__tests__/updateProfile.test.ts` (mocking `ddb`), covering: successful name update, successful color update, empty-name rejection (PROFILE-03), invalid-color rejection (PROFILE-04), target always derived from token even if a different `memberId` is sent in the body (PROFILE-05)
- [x] `cd backend && npm test` passes, test count increases by at least 5

**Tests**: unit
**Gate**: quick (`cd backend && npm test`)

**Commit**: `feat(profile): add updateProfile handler for self name/color edit`

---

### T5: Wire `UpdateProfileFunction` into `template.yaml`

**What**: Register the new handler as a SAM function bound to `PATCH /families/{familyId}/members/me`.
**Where**: `backend/template.yaml`
**Depends on**: T4
**Reuses**: `ListMembersFunction`/`CreateTaskFunction` resource shape (`DynamoDBCrudPolicy`, `BuildMethod: esbuild`)
**Requirement**: N/A (infra wiring for PROFILE-01..06)

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] New `UpdateProfileFunction` resource added under the `# ---------- Membros ----------` section, `CodeUri: src/handlers/members/`, `Handler: updateProfile.handler`
- [x] `Policies: [DynamoDBCrudPolicy]` scoped to `FamilyTable`
- [x] `Events.Api` set to `Path: /families/{familyId}/members/me`, `Method: PATCH`
- [x] `cd backend && sam build` completes without error

**Tests**: none
**Gate**: build (`cd backend && sam build`)

**Commit**: `feat(profile): wire PATCH /families/{familyId}/members/me route`

---

### T6: Create `deleteAccount` handler

**What**: New Lambda handler for `DELETE /families/{familyId}/members/me` — deletes the caller's own account (Cognito user + `MEMBER#` item), blocked for the owner and for members referenced in active tasks/events.
**Where**: `backend/src/handlers/members/deleteAccount.ts`
**Depends on**: T3
**Reuses**: `assertFamilyAccess`, `listTasks.ts`/`listEvents.ts` `Query` shape (+ `FilterExpression: contains(...)`), `inviteMember.ts`'s Cognito SDK + IAM policy shape
**Requirement**: PROFILE-07, PROFILE-08, PROFILE-09, PROFILE-10, PROFILE-11, PROFILE-12

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Handler calls `assertFamilyAccess`, then `GetCommand MEMBER#{memberId}`; missing item → skip straight to the idempotent-success path (still attempts Cognito delete, then returns `204`)
- [x] If `item.isOwner === true` → `403` before any Query/Cognito/Dynamo mutation (PROFILE-08)
- [x] Otherwise, `Query` on `TASK#` (`contains(rotationOrder, :m)`) and `EVENT#` (`contains(#mem, :m)`) prefixes; any match → `409` (PROFILE-09)
- [x] Otherwise: `AdminDeleteUserCommand` (catch `UserNotFoundException`, ignore — PROFILE-10), then `DeleteCommand MEMBER#{memberId}` (no condition, naturally idempotent), return `204`
- [x] DynamoDB delete failure after a successful Cognito delete returns `500` and never re-creates the Cognito user (PROFILE-11)
- [x] Unit tests written in `backend/src/handlers/members/__tests__/deleteAccount.test.ts` (mocking `ddb` and the Cognito client) covering: happy-path deletion, owner rejection (`403`), task-referenced rejection (`409`), event-referenced rejection (`409`), repeated/idempotent deletion (`204`), Dynamo-failure-after-Cognito-success (`500`, no Cognito re-creation attempted)
- [x] `cd backend && npm test` passes, test count increases by at least 6

**Tests**: unit
**Gate**: quick (`cd backend && npm test`)

**Commit**: `feat(profile): add deleteAccount handler with owner/reference guards`

---

### T7: Wire `DeleteAccountFunction` into `template.yaml`

**What**: Register the new handler as a SAM function bound to `DELETE /families/{familyId}/members/me`, with the `cognito-idp:AdminDeleteUser` IAM permission.
**Where**: `backend/template.yaml`
**Depends on**: T6
**Reuses**: `InviteMemberFunction`'s `USER_POOL_ID` env var + scoped `cognito-idp:*` `Statement` policy shape
**Requirement**: N/A (infra wiring for PROFILE-07..12)

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] New `DeleteAccountFunction` resource added under `# ---------- Membros ----------`, `CodeUri: src/handlers/members/`, `Handler: deleteAccount.handler`
- [x] `Environment.Variables.USER_POOL_ID: !Ref FamilyUserPool` set
- [x] `Policies: [DynamoDBCrudPolicy, Statement: [cognito-idp:AdminDeleteUser scoped to !GetAtt FamilyUserPool.Arn]]`
- [x] `Events.Api` set to `Path: /families/{familyId}/members/me`, `Method: DELETE`
- [x] `cd backend && sam build` completes without error

**Tests**: none
**Gate**: build (`cd backend && sam build`)

**Commit**: `feat(profile): wire DELETE /families/{familyId}/members/me route`

---

### T8: Add `updateProfile`/`deleteAccount` methods to the API client

**What**: Extend the frontend `api` object with the two new calls.
**Where**: `frontend/src/api/client.ts`
**Depends on**: T5, T7
**Reuses**: existing `request<T>()` wrapper and `api` object shape (same pattern as `inviteMember`/`createTask`)
**Requirement**: N/A (frontend infra for PROFILE-01..12)

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `api.updateProfile(payload: { name?: string; color?: string }) => request<Member>("/members/me", { method: "PATCH", body: JSON.stringify(payload) })` added
- [x] `api.deleteAccount() => request<void>("/members/me", { method: "DELETE" })` added
- [x] `cd frontend && npm run build` passes

**Tests**: none
**Gate**: build (`cd frontend && npm run build`)

**Commit**: `feat(profile): add updateProfile/deleteAccount to api client`

---

### T9: Create `ProfileScreen` component

**What**: New screen showing the caller's own name/avatar color with an edit form, and a delete-account flow behind an explicit confirmation step.
**Where**: `frontend/src/components/ProfileScreen.tsx`
**Depends on**: T2, T8
**Reuses**: `Avatar.tsx` for live preview, `AVATAR_COLORS` for the color swatches, the existing sheet/`Drawer` presentation pattern already used for task/event/invite forms in `App.tsx`
**Requirement**: PROFILE-01, PROFILE-02, PROFILE-03, PROFILE-04, PROFILE-06, PROFILE-07

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Component signature: `<ProfileScreen member={Member} onClose={() => void} onSaved={(m: Member) => void} onAccountDeleted={() => void} />`
- [x] Shows current `name`/`color`, lets the user edit both, disables the save button while the update call is pending (PROFILE-06)
- [x] On save failure, keeps the entered values in the form (does not reset) and shows an inline error
- [x] Delete-account action requires an explicit confirmation step before calling `api.deleteAccount()`; on success calls `onAccountDeleted()`
- [x] `cd frontend && npm run build` passes

**Tests**: none
**Gate**: build (`cd frontend && npm run build`)

**Commit**: `feat(profile): add ProfileScreen component`

---

### T10: Wire `ProfileScreen` into `App.tsx`

**What**: Add a new AppBar icon that opens `ProfileScreen` for the current member, and handle the save/delete callbacks.
**Where**: `frontend/src/App.tsx`
**Depends on**: T9
**Reuses**: `useAuth()` (for `memberId`/`logout`), `membersById` (already computed in `App.tsx`), existing sheet/overlay open/close state pattern
**Requirement**: PROFILE-01, PROFILE-02, PROFILE-12

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] New icon in the `AppBar` opens `ProfileScreen` with `member={membersById[memberId]}`
- [x] `onSaved` updates the local `members` state so avatars refresh everywhere without a manual reload (PROFILE-02)
- [x] `onAccountDeleted` calls `useAuth().logout()` and returns to the login screen immediately, without waiting for a `401` (PROFILE-12)
- [x] `cd frontend && npm run build` passes

**Tests**: none
**Gate**: build (`cd frontend && npm run build`)

**Commit**: `feat(profile): wire ProfileScreen into the AppBar`

---

## Phase Execution Map

Each line below is exactly one dependency edge (matches every task's `Depends on` field one-for-one — see the Diagram-Definition Cross-Check table):

```
T1 --> T2
T1 --> T4
T4 --> T5
T3 --> T6
T6 --> T7
T5 --> T8
T7 --> T8
T2 --> T9
T8 --> T9
T9 --> T10
```

Phase grouping (for batching/sequencing purposes only — the edges above are the actual dependency graph):

- Phase 1: T1, T2
- Phase 2: T3
- Phase 3: T4, T5, T6, T7
- Phase 4: T8, T9, T10

Execution is strictly sequential - there is no intra-phase parallelism. A single agent (or batch worker) works one task at a time, in order.

**Sub-agent note**: 10 tasks total → exceeds the ~8-task single-batch threshold. At Execute, offer batch sub-agents (e.g. Batch 1 = Phases 1-3 → T1-T7 [7 tasks], Batch 2 = Phase 4 → T8-T10 [3 tasks]) — offer-then-confirm, never auto-spawn.

---

## Task Granularity Check

| Task | Scope | Status |
| ---- | ----- | ------ |
| T1: Add `AVATAR_COLORS` (backend) | 1 constant, 1 file | ✅ Granular |
| T2: Add `AVATAR_COLORS` (frontend) | 1 constant, 1 file | ✅ Granular |
| T3: Stamp `isOwner` on signup | 1 field addition + its unit tests, 1 file | ✅ Granular |
| T4: Create `updateProfile` handler | 1 handler + its unit tests, 1 file | ✅ Granular |
| T5: Wire `UpdateProfileFunction` | 1 SAM resource, 1 file | ✅ Granular |
| T6: Create `deleteAccount` handler | 1 handler + its unit tests, 1 file | ✅ Granular |
| T7: Wire `DeleteAccountFunction` | 1 SAM resource, 1 file | ✅ Granular |
| T8: API client methods | 2 methods, 1 file | ✅ Granular (cohesive pair, same object) |
| T9: `ProfileScreen` component | 1 component, 1 file | ✅ Granular |
| T10: Wire into `App.tsx` | 1 integration point, 1 file | ✅ Granular |

---

## Diagram-Definition Cross-Check

| Task | Depends On (task body) | Diagram Shows | Status |
| ---- | ----------------------- | -------------- | ------ |
| T1 | None | (none) | ✅ Match |
| T2 | T1 | T1→T2 | ✅ Match |
| T3 | None | (none) | ✅ Match |
| T4 | T1 | T1→T4 (cross-phase edge) | ✅ Match |
| T5 | T4 | T4→T5 | ✅ Match |
| T6 | T3 | T3→T6 (cross-phase edge) | ✅ Match |
| T7 | T6 | T6→T7 | ✅ Match |
| T8 | T5, T7 | T5→T8, T7→T8 (cross-phase edges) | ✅ Match |
| T9 | T2, T8 | T2→T9 (cross-phase edge), T8→T9 | ✅ Match |
| T10 | T9 | T9→T10 | ✅ Match |

---

## Test Co-location Validation

| Task | Code Layer Created/Modified | Matrix Requires | Task Says | Status |
| ---- | ---------------------------- | ---------------- | ---------- | ------ |
| T1: `AVATAR_COLORS` (backend) | Entity/config (`lib/types.ts`) | none | none | ✅ OK |
| T2: `AVATAR_COLORS` (frontend) | Entity/config (`types.ts`) | none | none | ✅ OK |
| T3: `isOwner` stamp | Backend auth trigger (`postConfirmation.ts`) | unit | unit | ✅ OK |
| T4: `updateProfile` handler | Backend handler business logic | unit | unit | ✅ OK |
| T5: wire `UpdateProfileFunction` | Backend infra (`template.yaml`) | none | none | ✅ OK |
| T6: `deleteAccount` handler | Backend handler business logic | unit | unit | ✅ OK |
| T7: wire `DeleteAccountFunction` | Backend infra (`template.yaml`) | none | none | ✅ OK |
| T8: API client methods | Frontend (no test runner) | none | none | ✅ OK |
| T9: `ProfileScreen` component | Frontend (no test runner) | none | none | ✅ OK |
| T10: wire into `App.tsx` | Frontend (no test runner) | none | none | ✅ OK |
