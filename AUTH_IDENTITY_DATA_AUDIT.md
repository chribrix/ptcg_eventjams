# Auth Identity Data Audit

Date: 2026-05-01
Related:

- `AUTH_IDENTITY_IMPLEMENTATION_CHECKLIST.md`
- `scripts/audit-auth-identity.js`
- `server/plugins/account-mismatch-check.ts`

## Purpose

This document defines the reconciliation buckets for Item 7.

The current identity model is:

- Supabase auth user is the authentication source of truth
- canonical local `Player` is linked by `Player.supabaseId`
- event guest participants remain ticket data only
- `users.admin_users` is legacy compatibility data, not runtime authority

## Audit Buckets

### 1. Auth users without linked player

Definition:

- Supabase auth user exists
- no local `Player.supabaseId` matches that auth user id
- no assumptions should be made from email alone

Action:

- inspect whether the user should have a canonical player
- if yes, provision or repair explicitly
- if no, classify as harmless auth-only user

### 2. Auth users with only email-match player candidates

Definition:

- Supabase auth user exists
- no local `Player.supabaseId` matches the auth user id
- one or more players share the same email

Why this matters:

- this is exactly the kind of legacy ambiguity that must not be auto-linked anymore

Action:

- manual review only
- do not auto-attach by email

### 3. Players without `supabaseId`

Definition:

- local `Player` exists
- `supabaseId` is null

Interpretation:

- may be legacy pre-migration canonical players
- may be orphaned records that never had a real auth user

Action:

- if there is a verified matching auth user, repair explicitly
- otherwise classify for manual review or cleanup

### 4. Duplicate player emails

Definition:

- two or more local players share the same email

Why this matters:

- email is not a safe authenticated identity join key
- duplicate emails make any old email-based migration assumptions unsafe

Action:

- manual review bucket
- identify the canonical survivor explicitly before any merge or delete action

### 5. Legacy admin rows without Supabase admin role

Definition:

- row exists in `users.admin_users`
- matching auth user either does not exist or does not carry admin role metadata in Supabase

Action:

- either assign the admin role in Supabase intentionally
- or treat the local row as stale legacy data and remove it later

## How To Run

Command:

```bash
node scripts/audit-auth-identity.js
```

Required environment:

- `DATABASE_URL`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

The script prints a bucketed summary to stdout and is intended to produce a manual review queue.

## Runtime Guardrail

The startup checker in `server/plugins/account-mismatch-check.ts` now uses the current invariants:

- strict `supabaseId` linkage for authenticated users
- email-only matches are logged as ambiguous candidates, not treated as linked
- legacy admin rows are checked against Supabase admin metadata rather than treated as authority

## Current Status

Tooling is in place.

The next operational step is to run the audit against the real environment and record the resulting counts plus any manual-review rows.