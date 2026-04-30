# Auth / Identity Implementation Checklist

Date: 2026-04-30
Status: Draft for review
Related: `AUTH_ACCOUNT_SYSTEM_REVIEW.md`

## Purpose

This checklist turns the auth/account review into an implementation sequence.

The intent is to work item by item, starting with the domain model and invariants before refactoring code paths.

## Ground Rules

1. Supabase is the source of truth for authentication and authorization.
2. Every authenticated user is exactly one canonical `Player`.
3. A user may hold tickets for additional non-user participants.
4. Event registration must not create canonical account-bound `Player` rows implicitly.
5. Migration must be staged and reversible where possible.

## Checklist

### Item 1 - Approve the Target Domain Model

Status: Approved on 2026-04-30

Goal:

- lock the meaning of `User`, `Player`, admin role, and ticket participant before code changes begin

Approved decisions:

1. `User` means Supabase-authenticated identity.
2. `Player` means the canonical app-side player profile linked one-to-one to a `User`.
3. A user is always a player.
4. A user can create registrations containing extra ticket participants who are not users.
5. Ticket participants are not automatically players or users.
6. Admin authorization should come from Supabase-managed claims/roles, not the local DB.
7. Local DB should hold app data such as player profile, decklists, registrations, tickets, and related domain state.
8. The legacy local `users.User` model should be removed.
9. Non-user participants remain ticket records.
10. Ticket-specific participant state stays on tickets, such as decklist, cancelled state, and related registration-specific fields.

What this means structurally:

- Supabase owns identity
- local `Player` owns the canonical application profile
- ticket participant data is separate from canonical player identity
- `users.User` is not part of the target model
- admin role is Supabase-owned authorization, not local DB authority

Acceptance criteria:

- the above decisions are fixed for implementation
- the team agrees which local models remain authoritative for app data
- the team agrees that email is not an authenticated identity join key

### Item 2 - Add a Shared Authenticated Player Resolver

Status: Completed on 2026-04-30

Goal:

- add one server helper that resolves the current canonical player by `supabaseId`
- make `Player` the only local authenticated app profile model

Tasks:

1. [x] Create a shared helper for authenticated player lookup.
2. [x] Use `supabaseId` as the primary and only authenticated join key.
3. [x] Return a clear integrity error when an auth user has no linked player.
4. [x] Add structured logging for missing links.
5. [x] Ensure the helper never touches ticket-only participant records.

Completed in this item:

- added `server/util/authenticatedPlayer.ts`
- migrated authenticated player and dashboard endpoints away from ad hoc email-based joins
- migrated `players/profile.get`, `players/profile.put`, and `players/preferred-login-method.post`
- fixed impersonation resolution to use local `Player.playerId`
- added focused unit coverage for resolver behavior and migrated handlers

Acceptance criteria:

- authenticated APIs stop implementing ad hoc player lookup logic
- new helper is used consistently in the first migrated endpoints
- no authenticated endpoint resolves account identity from email

### Item 3 - Centralize Player Provisioning

Status: Completed on 2026-04-30

Goal:

- create one server-owned provisioning path for creating or binding the canonical `Player`

Tasks:

1. [x] Add `ensurePlayerForAuthUser(...)` or equivalent.
2. [x] Route password signup through it.
3. [x] Route passwordless signup/login completion through it.
4. [x] Remove client-side account repair creation.

Completed so far:

- added `server/util/playerProvisioning.ts`
- updated `server/api/auth/register-password.post.ts` to provision the canonical player synchronously
- added rollback so the Supabase auth user is deleted again if local player provisioning fails
- updated `server/api/auth/request-password-setup.post.ts` direct completion path to provision the canonical player synchronously
- updated `server/api/auth/finalize-password-setup.post.ts` to provision the canonical player after password activation
- added `server/api/auth/ensure-player.post.ts` for passwordless completion flows
- replaced the client-side manual `players/register` repair path in `pages/magic-login.vue` with the server-owned provisioning endpoint
- added focused unit coverage for the provisioning helper and password registration endpoint
- added focused unit coverage for password setup completion and ensure-player provisioning flows

Acceptance criteria:

- canonical `Player` creation is no longer spread across multiple code paths

### Item 4 - Rework Passwordless Login to Use Login Code

Goal:

- replace redirect-link-centered magic login with a login code architecture

Tasks:

1. Design short-lived email code issuance.
2. Design code verification endpoint.
3. Define anti-abuse and rate limiting rules.
4. Define cross-device UX.
5. Keep temporary compatibility with magic links only if needed during rollout.

Acceptance criteria:

- passwordless login can be completed on another device
- callback page complexity is no longer central to account correctness

### Item 5 - Move Admin Authorization to Supabase

Goal:

- move admin role ownership to Supabase-managed auth/authorization

Tasks:

1. Choose role storage mechanism in Supabase.
2. Update server admin verification to use Supabase-derived role data.
3. Plan retirement or downgrade of `admin_users`.

Acceptance criteria:

- admin checks no longer depend on local DB row existence as the authority

### Item 6 - Stop Event Registration From Creating Canonical Players

Goal:

- remove shadow account creation from event flows

Tasks:

1. Require authenticated linked user/player context for account-owned registrations.
2. Represent extra ticket participants without creating canonical `Player` rows.
3. Update UI/API contracts if guest participant handling changes.

Acceptance criteria:

- event registration no longer provisions app accounts implicitly

### Item 7 - Audit and Reconcile Existing Data

Goal:

- cleanly migrate existing users, players, admin assignments, and ticket-related records

Tasks:

1. Audit auth users without players.
2. Audit players without `supabaseId`.
3. Audit ambiguous matches and duplicates.
4. Audit locally-managed admin users.
5. Produce reconciliation scripts and manual review queue.

Acceptance criteria:

- current production/state data can be classified into safe auto-fixes and manual review buckets

### Item 8 - Enforce New Invariants and Retire Legacy Paths

Goal:

- remove compatibility logic after the migration window

Tasks:

1. Remove authenticated email fallback logic.
2. Remove client repair logic.
3. Remove webhook-critical assumptions.
4. Retire obsolete auth/account models or document the survivors clearly.

Acceptance criteria:

- runtime behavior matches the approved domain model

## Migration Checklist

### Pre-Migration

1. Build an audit report.
2. Snapshot the affected account/player/admin tables.
3. Identify ambiguous rows requiring manual review.
4. Define rollback conditions.

### Transition

1. Introduce shared lookup and provisioning helpers first.
2. Run dual logging on legacy fallback paths.
3. Backfill safe `supabaseId` links.
4. Keep old passwordless path only as temporary compatibility if needed.

### Cutover

1. Switch authenticated reads to `supabaseId`.
2. Switch provisioning to centralized server flow.
3. Switch admin checks to Supabase-backed authorization.
4. Disable account creation from event registration.

### Post-Cutover

1. Remove legacy fallback paths.
2. Remove deprecated account repair logic.
3. Clean up obsolete schema pieces.
4. Keep monitoring for mismatches until the system is stable.

## Recommended Next Action

Item 3 is complete.

The next implementation step is Item 4: replace redirect-link-centered passwordless login with a login code architecture.