# Supabase Admin Migration

Date: 2026-05-01
Related:

- `server/util/adminAccess.ts`
- `scripts/add-admin.js`
- `AUTH_IDENTITY_DATA_AUDIT.md`

## Purpose

This guide explains how to migrate admin authorization from the legacy local `users.admin_users` table to Supabase `app_metadata`.

## Short Answer

Yes: for admin authorization, only admin accounts need migration.

Why:

- runtime admin checks now read only from Supabase auth metadata
- users without an admin role in `app_metadata` are treated as regular users
- the legacy local `users.admin_users` table is compatibility data only and is no longer the authority source

Important scope note:

- this guide is only about admin role migration
- it does not replace separate player-link reconciliation such as setting `players.supabase_id`

## How Admin Is Evaluated Now

The server currently treats a user as admin if any of these are present in Supabase `app_metadata`:

- `is_admin: true`
- `user_role: "admin"`
- `role: "admin"`
- `roles: ["admin", ...]`

If none of those values exist, the user is treated as a normal user.

## What Does Not Need Migration

These users do not need admin-role migration:

- regular authenticated users who should remain non-admin
- users who already have the correct Supabase admin metadata
- legacy `admin_users` rows that should no longer grant admin access

## Required Environment

The helper script expects:

- `DATABASE_URL`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

## Recommended Process

### 1. Inspect legacy admin rows

```bash
node scripts/add-admin.js list-legacy
```

This shows which rows still exist in `users.admin_users`.

### 2. Inspect current Supabase admins

```bash
node scripts/add-admin.js list
```

This shows which auth users already have admin metadata in Supabase.

### 3. Migrate one admin manually

If you know the Supabase auth user id that should remain admin:

```bash
node scripts/add-admin.js add <supabase-user-id>
```

Example:

```bash
node scripts/add-admin.js add 304884d7-6b75-424a-8d56-74ab9fc18d15
```

This writes admin metadata into the user record in Supabase.

### 4. Migrate all legacy admin rows automatically

If you want to migrate every legacy row that still matches a real Supabase auth user:

```bash
node scripts/add-admin.js migrate-legacy
```

What this does:

- loads all rows from `users.admin_users`
- looks up the same user id in Supabase Auth
- adds admin metadata if the auth user exists and is not already admin
- prints a summary of migrated, already-admin, and missing users

### 5. Verify the result

```bash
node scripts/add-admin.js list
node scripts/audit-auth-identity.js
```

You want the audit to stop reporting:

- `Legacy admin rows without Supabase admin role`

## Rollback

If you granted admin by mistake, remove it from Supabase metadata:

```bash
node scripts/add-admin.js remove <supabase-user-id>
```

This removes the admin flags from `app_metadata`.

## What To Do With `users.admin_users`

For now:

- keep the rows as compatibility data
- do not treat them as authority
- do not delete them until you are sure historical relations and audit needs are covered

## Current Project-Specific Example

The current audit identified this admin migration case:

- `chrisbrinker@pm.me`
- auth user id: `304884d7-6b75-424a-8d56-74ab9fc18d15`
- legacy local admin row exists
- Supabase admin metadata was missing at the time of the audit

Manual migration command:

```bash
node scripts/add-admin.js add 304884d7-6b75-424a-8d56-74ab9fc18d15
```

Then verify:

```bash
node scripts/add-admin.js list
node scripts/audit-auth-identity.js
```

## FAQ

### Do regular users need migration?

No, not for admin authorization.

If a user has no admin metadata in Supabase, the code treats that user as a regular user.

### Does this migrate player records?

No.

Admin-role migration only changes Supabase `app_metadata` for authorization.

If a user still has no linked local `Player`, that is a separate reconciliation task.
