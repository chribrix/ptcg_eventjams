# Auth Identity Step 8 Prep

Date: 2026-05-01
Related:

- `AUTH_IDENTITY_IMPLEMENTATION_CHECKLIST.md`
- `AUTH_IDENTITY_DATA_AUDIT.md`

## Purpose

This note turns Item 8 into a concrete cut list.

Item 8 goal:

- remove the remaining compatibility logic after the migration window
- make runtime behavior match the approved auth and player invariants everywhere

## Current Preconditions

Before the final cleanup pass, one manual reconciliation still matters:

- auth user `304884d7-6b75-424a-8d56-74ab9fc18d15` (`chrisbrinker@pm.me`) still only email-matches local player `Chris (198193)`
- local player `Chris (198193)` still has `supabase_id = null`
- one legacy admin row still needs to be migrated to Supabase admin metadata

These are documented in `AUTH_IDENTITY_DATA_AUDIT.md`.

## Remaining Step 8 Survivors

### 1. `server/api/players/register.post.ts`

Current state:

- endpoint already ignores request-body identity fields and uses the authenticated Supabase user
- schema still accepts deprecated compatibility fields: `email`, `supabaseId`, `userId`
- schema still accepts `preferredLoginMethod: "magiclink"`

Step 8 cut:

- remove deprecated request fields from the schema
- accept only the fields still used by the endpoint contract
- narrow preferred login method input to `password | otp`

### 2. `server/api/players/check.post.ts`

Current state:

- endpoint no longer auto-links canonical players by email
- still accepts deprecated compatibility inputs: `supabaseId`, `userId`, `email`
- active callers currently use only `email`
- endpoint still contains temporary compatibility semantics:
  - `authOnly`
  - `legacyPlayerOnly`

Step 8 cut:

- decide whether the endpoint remains an email-based existence probe for login and registration UX
- if yes, keep `email` only and remove `supabaseId` / `userId`
- if no, replace the endpoint with more explicit auth and registration probes and retire `authOnly` / `legacyPlayerOnly`

Recommended direction:

- keep the endpoint for now because it is still used by login and registration UX
- narrow the contract to `email` only
- remove `supabaseId` and `userId` support

### 3. `server/api/players/preferred-login-method.post.ts`

Current state:

- endpoint normalizes `magiclink` to `otp`
- this is still compatibility logic, not target-state behavior

Step 8 cut:

- narrow accepted input to `password | otp`
- keep read-side normalization for stored legacy values only where needed

### 4. `server/api/auth/ensure-player.post.ts`

Current state:

- endpoint is already server-owned provisioning
- request body type still accepts `preferredLoginMethod?: "password" | "otp" | "magiclink"`

Step 8 cut:

- narrow the body type to `password | otp`
- keep normalization helper support only as long as old stored values still exist

### 5. `server/util/playerProvisioning.ts`

Current state:

- `normalizePreferredLoginMethod(...)` still accepts `magiclink`
- `ProvisionPlayerInput.preferredLoginMethod` still includes `magiclink`

Step 8 cut:

- decide whether stored legacy data should still be readable at this layer
- recommended: keep read-side normalization for old DB values temporarily, but remove `magiclink` from new write-side input types once endpoints are narrowed

### 6. Password setup flows

Files reviewed:

- `server/api/auth/request-password-setup.post.ts`
- `server/api/auth/finalize-password-setup.post.ts`

Current state:

- flows already avoid email-based player linking by using auth-user metadata plus centralized provisioning
- they still contain Supabase admin REST fallback paths and explicit GoTrue race-condition workarounds

Step 8 implication:

- these are not the first cleanup target unless the team wants to refactor Supabase admin access more broadly
- they should be treated as operational integration code, not simple compatibility leftovers

## Proposed Execution Order

### Phase 1: Safe Contract Tightening

1. Narrow `players/register` request schema to its real contract.
2. Narrow `players/check` request schema to `email` only.
3. Narrow `preferred-login-method` and `ensure-player` request types from `password | otp | magiclink` to `password | otp`.

Why first:

- these are low-risk API contract cleanups
- active callers are already close to the target behavior
- they remove the clearest remaining legacy surfaces without changing the domain model again

### Phase 2: Compatibility Type Cleanup

1. Remove `magiclink` from write-side provisioning input types.
2. Keep read-side normalization for stored legacy values only where still necessary.
3. Re-run focused tests for login, registration, provisioning, and preferred login method updates.

### Phase 3: Optional Post-Cutover Simplification

1. Revisit whether `players/check` should keep `authOnly` and `legacyPlayerOnly` response flags.
2. If manual reconciliation is complete and support cases are resolved, simplify the endpoint contract further.

## Focused Validation Set

When implementing Item 8, prefer this validation order:

```bash
npx vitest run tests/unit/playerRegisterEndpoint.test.ts
npx vitest run tests/unit/playerCheckEndpoint.test.ts
npx vitest run tests/unit/ensurePlayerEndpoint.test.ts
npx vitest run tests/unit/authenticatedPlayerHandlers.test.ts
```

If the contract changes touch login or registration flow semantics, also run the focused login/register coverage already updated during Items 3 and 4.

## Not In Scope For The First Pass

- dropping legacy database tables physically
- removing `users.admin_users` before historical creator relations are migrated or redesigned
- rewriting the password-setup integration logic unless a concrete bug is found
- changing guest ticket participant behavior, which is already aligned with the target model