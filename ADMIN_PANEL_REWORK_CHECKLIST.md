# Admin Panel Rework Checklist

Date: 2026-05-01
Scope: admin events, admin users, admin account actions, and landing-page information banner management
Out of scope: player-facing auth flows, registration-flow redesign, and unrelated visual polish outside the admin surface

Detailed file/API/model planning is documented in `ADMIN_PANEL_REWORK_SPEC.md`.

## Non-Negotiable Architecture Rules

Implementation snapshot as of 2026-05-01:

- shared admin controller wrapper added at `server/services/admin/adminRoute.ts`
- shared admin services added for custom events, players, auth users, role changes, account actions, and landing banner settings
- admin player deletion no longer deletes linked Supabase auth users
- external event override writes no longer accept client-owned `createdBy`; actor identity is derived server-side only
- admin event details, registrations, and external override mutations now run through shared server-side services instead of inline route logic
- landing-page information banner is now driven by one persisted `MetaState` record (`landing_banner`) and rendered through a shared public reader
- admin users surface, role controls, password-reset action, and banner editor page are implemented
- canonical admin event management now lives at `/admin/events`; the legacy `/admin/custom-events` page is reduced to a compatibility redirect
- admin dashboard stats and recent activity now load from a real server-side dashboard read model instead of hardcoded placeholder data
- focused controller-route coverage now passes for admin users, admin custom-event CRUD, combined event reads, event detail reads, banner settings, and dashboard reads
- remaining work is concentrated in full admin-route migration and event projection-focused validation coverage

This rework must centralize sources of truth and controller logic. The target pattern is strict MVC.

Rules:

- Views:
  - pages and components render state and emit user intents only
  - views must not contain business rules for permissions, role evaluation, event-type derivation, or banner publication logic
  - views must not duplicate request-shape normalization or record-merging logic
- Controllers:
  - API handlers are controllers
  - controllers validate input, authorize access, call one shared service path, and return a stable response shape
  - controllers must not duplicate model logic already implemented elsewhere
- Models / services:
  - domain rules, aggregation, and source-of-truth resolution must live in shared server-side services or model helpers
  - the same event, user, banner, or role transformation must not be reimplemented in multiple API handlers
- Source of truth:
  - Supabase `auth.users` plus `app_metadata` is the source of truth for authentication and admin role state
  - local `Player` is the source of truth for app profile and player-domain data
  - local `CustomEvent` is the source of truth for admin-created local events
  - local `ExternalEventOverride` is the source of truth for admin-managed overrides of external events
  - landing-page banner state must live in one persisted settings record, not in hardcoded page content
- Read/write separation:
  - write-side logic must go through one controller/service path per domain capability
  - read-side view models may compose multiple sources, but the composition must happen in one shared server-side place
- No duplicate authority checks:
  - admin role evaluation must remain centralized through `server/util/adminAccess.ts` or a successor service
  - no page, component, or ad hoc API handler may reinterpret Supabase role metadata independently

Implementation guardrails:

- do not add new admin features directly in pages first
- do not let admin pages talk to Supabase admin APIs directly from the client
- do not create parallel event creation flows for admin-created events
- do not store banner content in `pages/index.vue` or any other view file

## Non-Negotiable Security Rules

This rework must treat admin capability as a server-authorized security boundary, not a UI state.

Rules:

- Clean admin page middleware:
  - admin pages must use one clean route-protection path only
  - page middleware may gate navigation, but it must never be treated as sufficient authorization for server mutations
  - route middleware must fail closed for unknown auth/admin states
- Server-side authorization first:
  - every admin controller must verify admin access server-side before reading or mutating protected data
  - no admin controller may rely on hidden buttons, client route guards, or client-provided role fields
- Centralized privilege checks:
  - all admin authorization must flow through `server/util/adminAccess.ts` or one approved successor service
  - no controller may implement ad hoc role parsing or alternate admin heuristics
- No client authority:
  - the client must never send `isAdmin`, `role`, `user_role`, `createdBy`, `updatedBy`, `supabaseId`, or similar authority-bearing fields as trusted inputs
  - actor identity must be derived from the authenticated server session only
- No privilege escalation by payload shaping:
  - user-edit endpoints must whitelist editable fields explicitly
  - protected fields such as role metadata, linked auth ids, creator ids, and audit fields must be server-owned only
  - target-user actions must validate that the actor is authorized to mutate that target and that the requested action is in the approved action set
- No confused-deputy flows:
  - self-service endpoints and admin endpoints must remain separate controller surfaces
  - player CRUD must not implicitly become auth-user administration
  - password-reset, role-change, and disable-account flows must not piggyback on unrelated profile-update endpoints
- Sensitive action hygiene:
  - role changes, account actions, and banner publication changes should be auditable
  - destructive or high-risk actions should be explicit operations, not side effects of generic update endpoints
- Fail closed:
  - missing auth, missing admin metadata, partial Supabase failures, and ambiguous role states must deny the admin action by default
  - fallback logic must never broaden privileges

Security guardrails:

- never trust role or ownership fields from the browser
- never expose Supabase service-role operations directly to the client
- never allow an admin UI-only check to be the last gate before a mutation
- never mix self-edit and admin-edit logic into the same handler unless authorization branches are explicit and tested

## Target Domain Map

### Admin-created events

- Source of truth: `CustomEvent`
- Read model owner: one shared event-admin service that produces admin event list/detail view models
- Write controller owner: one admin custom-event controller surface
- Public calendar projection: one shared event-calendar projection used by the homepage calendar

### Admin-managed users

- Source of truth for auth identity and roles: Supabase auth user record and `app_metadata`
- Source of truth for profile details: local `Player`
- Read model owner: one shared admin-user service that joins auth user data with linked player state
- Write controller owner: one admin-user controller surface for role changes and account actions

### Landing-page information banner

- Source of truth: one persisted site-settings or banner-settings record
- Read model owner: one public settings/banner service
- Write controller owner: one admin settings controller surface

## Item 1 - Establish Admin MVC Boundaries

Status: In Progress

Goal:

- define and enforce one server-side controller and model path per admin capability before expanding the UI

Deliverables:

- inventory of all current admin pages and APIs
- identified duplicates and fragmented flows
- shared service boundaries for events, users, and banner settings
- stable API response shapes for each admin surface

Acceptance criteria:

- each admin feature has one documented source of truth
- each admin feature has one documented controller surface
- current duplicate logic hotspots are explicitly identified and assigned to one canonical owner
- no new admin UI work begins before those ownership boundaries are documented

## Item 2 - Normalize Admin Authorization

Status: In Progress

Goal:

- make all admin APIs enforce the same server-side admin authorization path

Tasks:

- review every `/api/admin/**` route for explicit or inherited admin checks
- remove any inconsistent authorization behavior between admin pages and admin APIs
- centralize role evaluation through the shared admin access utility
- keep admin page route middleware clean and minimal: navigation guard only, no business authorization duplication
- verify that all write-capable admin routes fail closed when auth/admin resolution is missing or ambiguous

Acceptance criteria:

- all admin APIs reject non-admin callers server-side
- admin role checks are not duplicated in unrelated handlers
- role evaluation uses one shared implementation only
- admin page middleware is a thin navigation guard and not a second business-logic authority layer
- admin mutation routes still reject unauthorized requests even if called directly outside the admin UI

## Item 2A - Prevent Privilege Escalation And Boundary Bleed

Status: In Progress

Goal:

- ensure admin capabilities cannot be reached through client payload tampering, reused self-service endpoints, or mixed controller responsibilities

Tasks:

- audit all admin and adjacent self-service endpoints for user-controllable authority fields
- remove or ignore any client-provided role, actor, creator, or linked-auth identifiers on protected writes
- separate admin account-action controllers from player/profile controllers
- define explicit allowlists for editable fields on admin user, player, event, and banner updates
- require target-resource authorization checks for role changes and account actions
- add audit logging or equivalent traceability for role changes and high-risk account actions

Acceptance criteria:

- no protected admin action depends on client-provided authority fields
- self-service endpoints cannot be repurposed to perform admin-only actions
- admin-only writable fields are server-owned and not accepted from arbitrary client input
- privilege escalation by request-shape manipulation is covered by focused tests
- role changes and other sensitive account actions are traceable

## Item 3 - Consolidate Event Management Around `CustomEvent`

Status: In Progress

Goal:

- provide one coherent admin event-management flow for creating, editing, viewing, and deleting local events that appear in the public calendar

Tasks:

- replace fragmented admin event entry points with one coherent local-event management surface
  - `/admin/events` now owns the shared admin event manager view; `/admin/custom-events` redirects to it for compatibility
- define one event-admin read model for list/detail/modals
- define one event-calendar projection that merges external events and custom events without duplicating transform logic
- ensure event creation/editing updates the calendar through the same projection used by the public homepage

Acceptance criteria:

- an admin-created event appears in the calendar without ad hoc frontend patching
- admin list, admin detail, and calendar views derive from shared server-side event transformation logic
- local event create/edit/delete flows use one controller family
- event-type and registration-count derivation are not duplicated across multiple pages/components

## Item 4 - Build Real Admin User Management

Status: Implemented

Goal:

- add an admin users surface that manages auth users and linked app profiles instead of only local player rows

Tasks:

- add an admin users page separate from player CRUD
- list auth users with linked player information and admin-role state
- expose a stable read model for auth user, linked player, account state, and role metadata
- keep player management focused on player-domain records, not auth-user authority

Acceptance criteria:

- admins can see auth users, not just local players
- admins can see whether a user is admin based on Supabase metadata
- linked and unlinked player state is visible without manual DB inspection
- the new user-management view does not reimplement auth/player merge logic in the page

## Item 5 - Add Role Management Controls

Status: Implemented

Goal:

- let admins grant and remove admin roles through the centralized Supabase metadata model

Tasks:

- add controller endpoints for role grant and role removal
- use one shared metadata merge/remove implementation
- surface role changes in the admin users UI
- audit and log admin-role changes where appropriate

Acceptance criteria:

- admins can grant admin status from the panel
- admins can remove admin status from the panel
- role state shown in the UI matches Supabase `app_metadata`
- role writes do not bypass the shared admin metadata service path

## Item 6 - Add Admin Account Actions

Status: In Progress

Goal:

- let admins perform account actions such as password reset and account inspection without mixing those concerns into player CRUD

Tasks:

- define which actions are supported in V1:
  - send password reset email
  - force password setup state
  - inspect account metadata
  - optionally disable/delete user if approved
- add controller endpoints for the supported actions
- document exactly which actions mutate Supabase auth state and which only affect local profile state

Acceptance criteria:

- supported admin account actions are explicit and documented
- account actions are executed through one auth-user controller surface
- password-reset behavior is not implemented as a side effect of player editing
- account actions are unavailable to non-admin users server-side

## Item 7 - Introduce Landing Banner Settings

Status: Implemented

Goal:

- move the landing-page information banner out of hardcoded frontend content into persisted settings managed by the admin panel

Tasks:

- create one persisted banner/settings model
- add admin UI to show, hide, and edit the banner
- add optional preview support
- update the homepage to render from the shared settings/banner read model

Acceptance criteria:

- the landing-page banner can be shown, hidden, and edited without code changes
- the homepage reads banner state from one persisted source of truth
- banner publication logic is not hardcoded in `pages/index.vue`
- admin editing and public rendering use one shared banner schema

## Item 8 - Rework Admin Dashboard Navigation And Information Architecture

Status: In Progress

Goal:

- make the admin panel discoverable and task-oriented instead of fragmented across unrelated pages

Tasks:

- define top-level admin sections: events, users, players, banner/settings, logs
- remove placeholder-only cards or mark them clearly as non-functional
- align dashboard quick actions with real supported workflows

Acceptance criteria:

- every admin navigation entry maps to a real maintained feature
- duplicate entry points for the same domain are reduced or removed
- dashboard cards no longer imply capabilities that do not exist

## Item 9 - Add Focused Validation Coverage

Status: In Progress

Goal:

- cover the new admin controller and model boundaries with focused tests so duplicate logic does not creep back in

Tasks:

- add focused tests for admin authorization on every new controller family
- add focused tests for event creation and calendar projection
  - controller-level event CRUD/detail coverage is implemented via `tests/unit/adminControllerRoutes.test.ts`
- add focused tests for auth-user list and role updates
  - implemented via `tests/unit/adminControllerRoutes.test.ts` and `tests/unit/adminUserService.test.ts`
- add focused tests for banner settings read/write behavior
  - implemented via `tests/unit/adminControllerRoutes.test.ts` and `tests/unit/adminBannerService.test.ts`

Acceptance criteria:

- admin event create/edit/delete is covered by focused tests
- admin user list and role changes are covered by focused tests
- banner visibility/edit flows are covered by focused tests
- tests assert the shared controller/model behavior instead of page internals only

## Recommended Execution Order

1. Establish MVC boundaries and normalize admin authorization.
2. Consolidate event management and calendar projection.
3. Build admin user management read models.
4. Add role management controls.
5. Add admin account actions.
6. Add landing banner settings and editor.
7. Rework admin dashboard navigation after the feature surfaces are real.
8. Finish with focused validation and cleanup of any leftover duplicate paths.

## Definition Of Done For This Rework

This rework is complete only when all of the following are true:

- each requested admin capability has one source of truth
- each requested admin capability has one controller surface
- duplicated business logic has been removed or centralized behind shared services
- the admin UI is a thin view over shared controller/model behavior
- admin page middleware is clean and limited to navigation protection
- admin mutation paths are protected server-side and fail closed
- privilege escalation via client payload tampering or controller overlap has been explicitly blocked
- events can be created and are visible in the public calendar
- admins can list users, manage roles, and perform approved account actions
- the landing-page banner is editable and publishable from the admin panel
