# Frontend Rework Checklist

Date: 2026-05-01
Scope: core player-facing auth, dashboard, booking, registration, and logout flows
Out of scope: admin route audit

## Item 1 - Booking Ownership Uses Canonical Player

Status: Completed on 2026-05-01

Goal:

- make booking details and ticket-management routes authorize through the canonical linked `Player` resolved by `supabaseId`

Completed in this item:

- migrated player-facing booking endpoints away from `Player.email` ownership checks
- aligned booking read/add/edit/delete ticket flows with `server/util/authenticatedPlayer.ts`
- added focused regression coverage for booking endpoints when auth email and player email differ

Acceptance criteria:

- dashboard booking access still works after auth email changes
- friend-ticket add/edit/delete flows no longer depend on email matching

## Item 2 - Protected Route Redirect Hygiene

Status: Completed on 2026-05-01

Goal:

- preserve destination context for unauthenticated users on dashboard, profile, booking, and reservation routes

Completed in this item:

- updated auth route protection to redirect guests to `/login?redirect=...`
- preserved deep-link query strings via `to.fullPath`
- covered client-side missing-session and server-side unauthenticated redirect behavior with focused tests

Acceptance criteria:

- protected pages redirect to login instead of `/`
- login can return users to the originally requested dashboard/profile/booking route

## Item 3 - Reservation Prefill Integrity

Status: Completed on 2026-05-01

Goal:

- stop treating auth metadata as a substitute for a canonical linked player on the event registration screen

Completed in this item:

- removed the reservation-page fallback that copied `user_metadata` into the registration form when canonical player lookup failed
- surfaced a dedicated linked-player integrity error on the registration screen
- blocked registration submission while the authenticated user is missing the required canonical player profile

Acceptance criteria:

- registration form only auto-fills from canonical player data
- missing player linkage is shown explicitly before users attempt to submit

## Item 4 - Logout Consolidation

Status: Pending

Goal:

- route all player-facing logout actions through one shared cleanup path

## Item 5 - Core Flow Coverage

Status: Pending

Goal:

- add focused coverage for login, registration, booking, friend tickets, and logout flows