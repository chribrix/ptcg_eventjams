# Auth / Account System Review

Date: 2026-04-30
Branch: `re-auth`

## Goal

Review the current login and account system, explain why users can hit inconsistent states like:

- registration says an account already exists
- login says no account was found

and define a more robust approach with one clear source of truth.

## Executive Summary

The current system does not have a single authoritative account lifecycle.

Supabase is already the real identity provider for:

- email + password
- magic link / OTP
- sessions
- password state

But the application still relies on local `Player` rows for most authenticated behavior, and those rows are created from several different places:

- password registration
- Supabase auth webhook
- magic login fallback logic
- event registration flow

Because those paths are not centralized, the app can end up with:

- a Supabase auth user without a linked `Player`
- a `Player` without `supabaseId`
- a `Player` created from event registration only
- login checks that treat auth existence and app existence as the same thing in some places, but not in others

That is the root cause of the inconsistent user experience.

## Product Direction Notes

The following target constraints should guide the redesign:

- the local database should primarily hold application data such as decklists, registrations, tickets, and player profile data
- admin role handling should move from the local database to Supabase-managed auth/authorization
- player provisioning must be centralized
- the current magic-login callback flow likely needs an architectural rewrite
- email login without password should move from magic link to login code so the code can be entered on another device
- the user auth and identity model should be explicit and clean
- a `User` is always a `Player`
- a `User` may buy or manage tickets for additional non-user players
- the legacy local `users.User` model should be removed
- non-user participants should remain ticket records, not account records

These notes tighten the target state considerably and reduce the number of valid account models.

## Current Identity Model

### Actual Identity Provider

Supabase is the effective identity system.

It owns:

- credentials
- password login
- magic link login
- session state
- email confirmation
- auth user id

Relevant files:

- `server/api/auth/login-password.post.ts`
- `server/api/auth/register-password.post.ts`
- `server/api/auth/request-password-setup.post.ts`
- `server/api/auth/finalize-password-setup.post.ts`
- `server/api/auth/set-password.post.ts`

### Local App Record Used By Business Logic

The application relies on `public.Player` for profile and domain behavior.

Relevant schema:

- `prisma/schema.prisma`

Important fields:

- `Player.supabaseId` - optional link to Supabase auth user
- `Player.playerId` - domain-specific player identifier
- `Player.email` - mutable contact value
- `Player.preferredLoginMethod` - UX preference, not identity

### Additional Model Ambiguity

There is also a `users.User` model in the schema, but the current login flow does not appear to use it as the active authenticated account model.

This increases conceptual confusion because there are effectively multiple account-like models in the schema, while the runtime mostly uses `Player`.

Decision:

- remove the local `users.User` model from the target design unless a clearly separate non-auth domain use case emerges

### Admin Role Ownership Today

Admin authorization is currently determined via the local `admin_users` table.

Relevant files:

- `server/api/admin/check.get.ts`
- `server/middleware/admin.ts`

That works technically, but it means authorization is split:

- Supabase owns authentication
- local DB owns admin role resolution

The preferred direction is to move admin role handling to Supabase-managed auth claims or equivalent Supabase-side role assignment.

Decision:

- admin authorization should live in Supabase
- local DB should not be the authority for admin role resolution

## Confirmed Weaknesses

### 1. Registration and Login Use Different Definitions of "Account Exists"

The login workflow checks `/api/players/check` and then treats auth existence as enough to continue into the login flow.

Relevant files:

- `composables/useLoginWorkflow.ts`
- `server/api/players/check.post.ts`

The registration form also checks `/api/players/check`, but blocks registration if either:

- a local `Player` exists
- or a Supabase auth user exists

Relevant file:

- `components/RegisterForm.vue`

This creates the exact user-visible inconsistency:

- register says "account exists"
- but later login logic may still fail because there is no usable linked `Player`

### 2. Player Provisioning Is Distributed Across Multiple Paths

`Player` records can currently be created from several places:

1. Supabase database webhook
2. manual fallback in `pages/magic-login.vue`
3. `/api/players/register`
4. event registration flow in `server/api/events/[id]/register.post.ts`

This means the same conceptual entity can be created by different workflows with different guarantees and different data completeness.

That is the main architectural problem.

### 3. The Webhook Is Part of Correctness, Not Just Automation

Password registration creates the Supabase user first, and local `Player` creation is then expected to happen via webhook logic.

Relevant files:

- `server/api/auth/register-password.post.ts`
- `server/api/auth/webhook.post.ts`

When the webhook does not run or lags, the magic-login page waits, retries, and then manually creates the `Player`.

Relevant file:

- `pages/magic-login.vue`

That means account correctness currently depends on an asynchronous side effect plus client-side recovery logic.

This should not be required for core identity consistency.

### 4. Authenticated User Resolution Still Falls Back to Email

Some authenticated endpoints still resolve the current `Player` by email, or by `supabaseId` and then email as fallback.

Relevant files:

- `server/api/players/me.get.ts`
- `server/api/dashboard/registrations.get.ts`
- `server/api/players/check.post.ts`
- several dashboard/profile endpoints follow the same pattern

This is risky because email is:

- mutable
- user-facing
- not the canonical join key after authentication

The authenticated join key should be `supabaseId` only.

### 5. Event Registration Can Create Shadow Accounts

The event registration endpoint creates a `Player` if it cannot find one by `playerId` or email.

Relevant file:

- `server/api/events/[id]/register.post.ts`

This means domain activity can create account-like records outside the auth lifecycle.

That produces `Player` rows that may:

- have no `supabaseId`
- have incomplete profile data
- later collide with real auth registration

This is also at odds with the desired model:

- a user is always a player
- but a user may register additional non-user players as ticket participants

That means the system should distinguish between:

- the authenticated account owner
- the canonical player profile linked to that account
- additional participant identities attached to tickets

Today those concepts are still too blurred.

### 6. The System Already Knows Drift Happens

There is a server plugin specifically checking for mismatches such as:

- auth users without player records
- players without `supabaseId`

Relevant file:

- `server/plugins/account-mismatch-check.ts`

This is useful operationally, but it also confirms that broken identity invariants are currently expected.

## Root Cause

The root cause is not a single bug.

The root cause is that identity ownership and local profile provisioning are split across multiple flows with different assumptions.

In short:

- Supabase owns authentication
- `Player` owns application behavior
- but the system does not guarantee that every authenticated user deterministically maps to exactly one `Player`

## Recommended Source of Truth Model

## Proposed Rule

Use Supabase `auth.users` as the single source of truth for identity.

Use local `Player` as the single source of truth for app profile and player-domain data.

But enforce a strict invariant:

> Every authenticated user must map to exactly one `Player` via `Player.supabaseId`.

## Refined Domain Model

### User

`User` means an authenticated Supabase identity.

It owns:

- authentication
- credentials
- verification state
- session lifecycle
- authorization claims such as admin access

### Player

`Player` means the canonical in-app player profile for an authenticated user.

It owns:

- player profile
- player id
- decklists
- event history
- registrations made by that user

Target invariant:

> Every authenticated `User` is exactly one `Player`.

### Ticket Participant

Ticket participants are not the same thing as authenticated users.

A user may create registrations for:

- themselves
- additional participants who are not authenticated users

That means the ticket layer must support non-user participants cleanly without creating shadow `Player` account records.

Decision:

- non-user participants remain ticket records
- ticket records are the place where participant-specific state lives, such as decklist, cancellation status, attendance state, and similar registration-specific fields
- if a participant corresponds to a canonical player, the ticket may link to that player, but the ticket remains the source of registration-specific participant state

## Target Authorization Model

### Supabase Should Also Own Admin Role

Admin role should move out of `admin_users` and into Supabase-side authorization.

Recommended direction:

- use Supabase auth claims / app metadata / role assignment for admin access
- treat local admin tables only as optional profile/audit extensions if still needed
- keep authorization checks server-side, but source them from Supabase identity claims rather than local user existence

This remains the recommended approach. There is no stronger alternative in this codebase than keeping authentication and authorization ownership together in Supabase.

This keeps identity and authorization aligned under the same authority.

### What Supabase Should Own

- email + password credentials
- email login code / OTP login
- password recovery / password setup
- email verification
- session lifecycle
- canonical auth user id
- admin role / authorization claims

### What `Player` Should Own

- `playerId`
- name
- birth date
- contact details
- registration and event-facing data
- decklists
- login method preference as UX metadata only

### What Should Stop Being Used for Identity

- email as authenticated join key
- webhook timing as required correctness path
- client callback pages as data repair layers
- event registration as account creation path
- local DB table membership as the source of admin authorization

## Target Architecture

### 1. Centralize Provisioning in One Server-Owned Function

Introduce one server-side account bootstrap function, for example:

- `ensurePlayerForAuthUser(authUser)`

Responsibilities:

- load by `supabaseId`
- if missing, reconcile with an allowed pending registration record
- create or upsert the single `Player`
- never create duplicates
- return the authoritative app profile

Every successful signup and login completion should use this function.

This helper should be the only allowed place that can create or bind a canonical `Player` for an authenticated `User`.

### 2. Remove Webhook Dependency From Correctness

The webhook can remain for:

- observability
- auxiliary sync
- safety checks

But it should no longer be required for a valid account to exist.

Core account provisioning should happen synchronously in a server-owned flow.

### 3. Replace Email Fallback With `supabaseId`

For authenticated APIs:

- resolve current player by `supabaseId` only
- if not found, treat it as a provisioning/data integrity error
- do not silently fall back to email

Email can still be used for:

- pre-auth discovery
- support/admin tooling
- migration utilities

But not for authenticated identity joins.

### 4. Separate Registration Intent From Auth User Creation

For passwordless signup/login, move away from email redirect links and use a login code flow.

Recommended product direction:

- user enters email on device A
- system sends short-lived code by email
- user enters code on device A or another device
- server verifies the code and completes auth bootstrap

This removes the architectural dependency on callback pages as the core passwordless login mechanism.

For signup and login, use one of these models:

#### Option A: Pending Registration Table

Create a `pending_registration` row first.

Then after verified login:

- create or reconcile the Supabase user
- finalize the `Player`
- bind `supabaseId`

#### Option B: Server-Owned Signup Finalization

If Supabase user creation happens first, the same server flow must immediately create the matching local `Player` before the user is considered registered.

Either option is valid.

The key requirement is that signup completion must be deterministic and server-owned.

### 5. Model Account Owner and Ticket Participants Separately

Event registration should have a clean ownership model:

- one authenticated account owner
- one canonical player profile for that owner
- zero or more additional ticket participants

The ticket participants may or may not be authenticated users.

This means:

- event registration should not implicitly create account-bound `Player` rows
- extra participants should live at the ticket layer unless they explicitly become real users later
- ticket rows should support an optional canonical player link when applicable, while still owning ticket-specific state

### 6. Stop Creating `Player` Records Inside Event Registration

Event registration should either:

- require an authenticated, linked account
- or create a separate guest/contact entity if guest registration is needed

It should not create `Player` rows implicitly.

### 7. Clarify the Role of `users.User`

Decide whether `users.User` is:

- obsolete
- purely domain-specific
- or intended to be the real app account model

If it is obsolete, plan removal.

If it is still needed, document its purpose clearly and avoid overlapping identity responsibility with `Player`.

Given the target model, the likely cleanest outcome is:

- Supabase auth user = identity
- local `Player` = canonical player profile for that identity
- ticket participants = separate participant/ticket data, not account rows

Approved direction:

- remove `users.User`

## Recommended Implementation Plan

The implementation order should now reflect the clarified domain model.

### Phase 1 - Define and Lock the Domain Model

1. Decide and document the invariant: every authenticated user is exactly one player.
2. Decide how non-user ticket participants are represented.
3. Decide the fate of `users.User`.
4. Decide how admin role will be represented in Supabase.

Expected result:

- one agreed account model before touching flow logic

### Phase 2 - Stabilize Identity Resolution

1. Introduce a shared server helper for resolving the current authenticated player by `supabaseId`.
2. Refactor authenticated endpoints to use that helper.
3. Remove email fallback from core authenticated paths.
4. Keep logging when a logged-in auth user has no linked player.

Expected result:

- fewer silent mismatches
- authenticated behavior becomes deterministic

### Phase 3 - Centralize Provisioning

1. Create a single server-side provisioning flow for account bootstrap.
2. Route password signup through that flow.
3. Route magic-link signup completion through that flow.
4. Remove manual `Player` creation from `pages/magic-login.vue`.
5. Downgrade the webhook from required correctness path to optional sync/monitoring.

Expected result:

- signup and first login create the same local state every time

### Phase 4 - Replace Magic Link Architecture With Login Code

1. Design the passwordless login code flow.
2. Add server-side code issuance and verification.
3. Remove the dependency on redirect-link callback logic for normal passwordless login.
4. Keep transitional compatibility only if required during rollout.

Expected result:

- passwordless login works cross-device
- callback-page complexity is no longer central to account correctness

### Phase 5 - Remove Shadow Creation Paths

1. Remove `Player` creation from event registration.
2. Require linked account context for account-owned actions.
3. If guest registration is required, model it explicitly instead of reusing `Player`.

Expected result:

- no more account-like rows being created from unrelated product flows

### Phase 6 - Move Admin Authorization to Supabase

1. Add admin role representation in Supabase.
2. Update server-side admin checks to read Supabase-derived authorization.
3. retire or downgrade `admin_users` to optional legacy/support data.

Expected result:

- auth and authorization come from the same authority

### Phase 7 - Data Cleanup and Backfill

1. Audit all existing auth users and players.
2. Backfill `supabaseId` for safe one-to-one matches.
3. Quarantine ambiguous collisions for manual review.
4. Mark or merge orphan rows where appropriate.

Expected result:

- existing production data matches the new invariants

### Phase 8 - Enforce Invariants

After migration:

- all authenticated account lookups use `supabaseId`
- every active auth user has exactly one `Player`
- `Player` creation only happens in one centralized account bootstrap path
- drift detection becomes a rare alert, not a normal maintenance tool

## Suggested Concrete Rules

These rules should guide future auth-related changes.

1. Supabase auth id is the canonical identity key.
2. `Player.supabaseId` is the only valid join key for authenticated account resolution.
3. Email is not a durable identity join after login.
4. No UI component should repair missing account state by creating `Player` rows directly.
5. No domain workflow should create account records as a side effect unless it is the designated account bootstrap flow.
6. Webhooks may assist, but they must not be required for a valid signup to complete.
7. Admin authorization should come from Supabase, not local row existence.
8. A ticket participant is not automatically a user or canonical player.

## Practical Next Step Recommendation

If implementing incrementally, the best first step is:

1. implement the shared authenticated player resolver
2. begin removing authenticated email fallback logic
3. prepare the first migration-safe refactor around `supabaseId`

The target domain model is now agreed enough to start the first code-facing item.

## Migration Approach

Migration needs to be staged so users do not get locked out and existing registrations remain intact.

### Migration Principles

1. never break existing authenticated users during the cutover
2. never infer identity from email when a stronger key is available
3. quarantine ambiguous rows instead of auto-merging them
4. keep old and new auth flows in parallel briefly if required for rollout safety

### Migration Stages

#### Stage A - Audit and Classification

Build an audit report for:

- auth users with no linked `Player`
- players with no `supabaseId`
- duplicate or conflicting email matches
- event-created `Player` rows likely not tied to real auth users
- current admin users in local DB

Classify each row into:

- safe auto-link
- safe keep-as-participant-only
- manual review required

#### Stage B - Add New Invariants Without Enforcing Them Yet

Introduce the new shared identity resolution and provisioning helpers first.

Do not delete old fallback paths until:

- audit is complete
- reconciliation scripts exist
- monitoring is in place

#### Stage C - Backfill

Backfill `Player.supabaseId` where there is exactly one safe match.

Do not auto-link when:

- multiple players match one auth user
- multiple auth users match one player
- player profile data looks synthetic or event-generated only

#### Stage D - Shift Runtime Reads

Move runtime authenticated reads to `supabaseId`.

During transition:

- log every fallback path still hit
- review remaining mismatches

#### Stage E - Cut Over Writes

Once centralized provisioning is live:

- disable account creation from event registration
- remove client-side repair creation from `magic-login`
- stop relying on webhook timing for correctness

#### Stage F - Retire Legacy Paths

After clean monitoring window:

- remove email-based authenticated fallback paths
- remove obsolete webhook-critical assumptions
- migrate admin auth to Supabase claims
- retire or repurpose legacy local admin structures

## Files Reviewed

- `components/RegisterForm.vue`
- `composables/useAuth.ts`
- `composables/useLoginWorkflow.ts`
- `pages/confirm.vue`
- `pages/login.vue`
- `pages/magic-login.vue`
- `plugins/auth-monitor.client.ts`
- `plugins/supabase-auth-handler.client.ts`
- `prisma/schema.prisma`
- `server/api/auth/check-password.post.ts`
- `server/api/auth/finalize-password-setup.post.ts`
- `server/api/auth/login-password.post.ts`
- `server/api/auth/register-password.post.ts`
- `server/api/auth/request-password-setup.post.ts`
- `server/api/auth/set-password.post.ts`
- `server/api/auth/webhook.post.ts`
- `server/api/dashboard/registrations.get.ts`
- `server/api/events/[id]/register.post.ts`
- `server/api/players/check.post.ts`
- `server/api/players/me.get.ts`
- `server/api/players/preferred-login-method.post.ts`
- `server/api/players/register.post.ts`
- `server/plugins/account-mismatch-check.ts`
