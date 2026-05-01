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

Status: Completed on 2026-04-30

Goal:

- replace redirect-link-centered magic login with a login code architecture

Tasks:

1. [x] Design short-lived email code issuance.
2. [x] Design code verification endpoint.
3. [x] Define anti-abuse and rate limiting rules.
4. [x] Define cross-device UX.
5. [x] Remove magic-link-centered runtime flow in favor of OTP.

Completed in this item:

- replaced passwordless login in `pages/login.vue` and `composables/useLoginWorkflow.ts` with in-page OTP request/verify steps
- replaced passwordless registration in `components/RegisterForm.vue` with in-page OTP verification
- changed password-setup confirmation from `confirm_email` to `confirm_code`
- retired `pages/confirm.vue` and `pages/magic-login.vue` into compatibility notices instead of active auth callback handlers
- normalized newly written preferred login method values to `otp` while keeping legacy `magiclink` data readable
- updated focused integration coverage for the login workflow semantics

Acceptance criteria:

- passwordless login can be completed on another device
- callback page complexity is no longer central to account correctness

### Item 5 - Move Admin Authorization to Supabase

Status: Completed on 2026-05-01

Goal:

- move admin role ownership to Supabase-managed auth/authorization

Tasks:

1. [x] Choose role storage mechanism in Supabase.
2. [x] Update server admin verification to use Supabase-derived role data.
3. [x] Plan retirement or downgrade of `admin_users`.

Completed in this item:

- added `server/util/adminAccess.ts` as the shared Supabase-backed admin role resolver
- chose Supabase `app_metadata` as the runtime admin authority, accepting `role`, `user_role`, `roles`, and `is_admin` shapes for migration tolerance
- updated `server/middleware/admin.ts` and `server/api/admin/check.get.ts` to stop depending on `users.admin_users`
- migrated remaining server-side admin authority checks in admin history, admin error logs, and event participant visibility away from local `admin_users` lookups
- downgraded `admin_users` to legacy compatibility data only; it is no longer the runtime authorization source of truth
- added focused unit coverage updates for admin middleware and admin check semantics

Acceptance criteria:

- admin checks no longer depend on local DB row existence as the authority

### Item 6 - Stop Event Registration From Creating Canonical Players

Status: Completed on 2026-05-01

Goal:

- keep event registration limited to the authenticated booker plus ticket-level participant data
- prevent event flows from creating, inferring, or later upgrading guest participants into canonical account identities

Tasks:

1. [x] Require authenticated linked user/player context for account-owned registrations.
2. [x] Represent extra ticket participants without creating canonical `Player` rows.
3. [x] Ensure guest participants remain ticket data only, with no implicit linkage to current or future authenticated users.
4. [x] Update UI/API contracts if guest participant handling changes.

Completed in this item:

- updated `server/api/events/[id]/register.post.ts` so event registrations are always owned by the authenticated linked player resolved via `supabaseId`
- removed the old fallback behavior that looked up or created the registration owner from submitted `bookerPlayerId` and email
- preserved guest participant handling as ticket-only data via `RegistrationTicket.participantName` and optional `participantPlayerId`
- ensured guest participant entries do not create, update, or infer canonical `Player` identities
- added focused endpoint coverage for the new invariant in `tests/unit/eventRegistrationEndpoint.test.ts`

Acceptance criteria:

- event registration no longer provisions app accounts implicitly
- guest participant data is never treated as a latent account identity
- later signups do not retroactively link to guest participants unless an explicit future linking flow is built

### Item 7 - Audit and Reconcile Existing Data

Status: In progress on 2026-05-01

Goal:

- cleanly migrate existing users, players, admin assignments, and ticket-related records

Tasks:

1. Audit auth users without players.
2. Audit players without `supabaseId`.
3. Audit ambiguous matches and duplicates.
4. Audit locally-managed admin users.
5. Produce reconciliation scripts and manual review queue.

Progress so far:

- added `scripts/audit-auth-identity.js` to classify auth/player/admin reconciliation buckets
- added `AUTH_IDENTITY_DATA_AUDIT.md` to define the manual review buckets and operating procedure
- updated `server/plugins/account-mismatch-check.ts` to use strict `supabaseId` linkage and log ambiguous email-only candidates separately
- ran the live audit against the current environment and captured the resulting manual-review rows
- current live result: 9 auth users without linked players, 1 email-match-only auth/player ambiguity, 1 player without `supabaseId`, and 1 legacy admin row missing Supabase admin metadata

Acceptance criteria:

- current production/state data can be classified into safe auto-fixes and manual review buckets

### Item 8 - Enforce New Invariants and Retire Legacy Paths

Status: In progress on 2026-05-01

Goal:

- remove compatibility logic after the migration window

Tasks:

1. Remove authenticated email fallback logic.
2. Remove client repair logic.
3. Remove webhook-critical assumptions.
4. Retire obsolete auth/account models or document the survivors clearly.

Progress so far:

- tightened `server/api/players/register.post.ts` so it provisions only for the authenticated Supabase user through `ensurePlayerForAuthUser`
- added focused unit coverage for the authenticated `players/register` contract
- tightened `server/api/players/check.post.ts` so email is no longer used to auto-link canonical players
- added `legacyPlayerOnly` response semantics so the client can stop sending orphaned legacy rows through the wrong login/registration path
- updated login and registration UI flows to surface legacy manual-reconciliation cases explicitly instead of oscillating between "account not found" and "account exists"
- added focused unit coverage for the `players/check` invariant
- removed unused legacy Prisma auth/account models (`users.User`, `users.UserDeck`, and `public.Participants`) from the generated client surface
- clarified `users.admin_users` in the Prisma schema as legacy compatibility data only

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

Continue Item 8 by removing the next remaining legacy identity fallback path after `players/check` and `players/register`, then perform the manual reconciliation identified in the live audit.

Detailed cut list and execution order for this step are recorded in `AUTH_IDENTITY_STEP8_PREP.md`.
