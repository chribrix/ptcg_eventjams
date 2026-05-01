# Admin Panel Rework Spec

Date: 2026-05-01
Related:

- `ADMIN_PANEL_REWORK_CHECKLIST.md`
- `AUTH_IDENTITY_IMPLEMENTATION_CHECKLIST.md`

## Purpose

This document turns the admin-panel rework checklist into a concrete build spec.

It defines:

- strict MVC ownership
- canonical sources of truth
- proposed file structure
- exact API surfaces
- proposed Prisma additions
- rollout order

## Architectural Decision

This rework uses strict MVC within the current Nuxt/Nitro repository layout.

Interpretation for this codebase:

- Model:
  - Prisma models
  - server-side domain services and model adapters
  - Supabase admin integration wrappers
- Controller:
  - `server/api/**` handlers only
  - request validation, authorization, orchestration, response shaping
- View:
  - `pages/**`
  - `components/**`
  - composables that are view-facing only and do not own business rules

## Canonical Sources Of Truth

### Admin roles

- Source of truth: Supabase `auth.users.app_metadata`
- Canonical evaluator: `server/util/adminAccess.ts`
- No other file may reinterpret admin role metadata independently.

### Auth users

- Source of truth: Supabase auth user record
- Canonical reader/writer: new admin auth-user service

### Player profiles

- Source of truth: local `Player`
- Canonical reader/writer: player-domain services and existing player APIs

### Local admin-created events

- Source of truth: local `CustomEvent`
- Canonical reader/writer: new admin event service layer behind `/api/admin/events/**`

### External event overrides

- Source of truth: local `ExternalEventOverride`
- Canonical reader/writer: existing override APIs, normalized behind a shared service

### Landing-page information banner

- Source of truth: new persisted site-settings/banner record
- Canonical reader/writer: new site-settings service layer

## Proposed File Structure

The structure below is designed to centralize model logic and avoid controller duplication.

```text
server/
  api/
    admin/
      check.get.ts
      events/
        index.get.ts
        create.post.ts
        [id]/details.get.ts
        [id]/update.patch.ts
        [id]/delete.delete.ts
      users/
        index.get.ts
        [id].get.ts
        [id]/role.patch.ts
        [id]/password-reset.post.ts
        [id]/password-setup.post.ts
        [id]/disable.patch.ts
      settings/
        banner.get.ts
        banner.patch.ts
  services/
    admin/
      eventAdminService.ts
      adminUserService.ts
      adminRoleService.ts
      adminAccountActionService.ts
      adminBannerService.ts
    projections/
      calendarEventProjection.ts
      adminEventProjection.ts
      adminUserProjection.ts
  util/
    adminAccess.ts
    supabaseAdminClient.ts
    validation/
      adminEventSchemas.ts
      adminUserSchemas.ts
      adminBannerSchemas.ts
pages/
  admin/
    index.vue
    events/
      index.vue
      [id].vue
    users/
      index.vue
      [id].vue
    players.vue
    settings/
      banner.vue
components/
  admin/
    events/
      AdminEventList.vue
      AdminEventEditor.vue
      AdminEventDetailsPanel.vue
    users/
      AdminUserList.vue
      AdminUserDetailsPanel.vue
      AdminRoleEditor.vue
      AdminAccountActions.vue
    settings/
      AdminBannerEditor.vue
      AdminBannerPreview.vue
```

## MVC Ownership Rules By Domain

### Events

- View:
  - event pages and admin event components
- Controller:
  - `/api/admin/events/**`
- Model/service:
  - `eventAdminService.ts`
  - `adminEventProjection.ts`
  - `calendarEventProjection.ts`

Rules:

- event-type derivation must not live in pages or components
- registration-count aggregation must not be recomputed differently in admin list, detail modal, and public calendar
- the public calendar and admin events list must consume shared projection logic

### Users / roles

- View:
  - admin users pages/components
- Controller:
  - `/api/admin/users/**`
- Model/service:
  - `adminUserService.ts`
  - `adminRoleService.ts`
  - `adminUserProjection.ts`

Rules:

- views must not merge Supabase auth users with local players themselves
- role writes must only happen via the shared role service
- account actions must not be embedded in the player CRUD controller

### Banner settings

- View:
  - homepage banner presenter
  - admin banner editor and preview
- Controller:
  - `/api/admin/settings/banner.patch.ts`
  - `/api/admin/settings/banner.get.ts`
  - optional public `/api/settings/banner.get.ts` if homepage should fetch via API
- Model/service:
  - `adminBannerService.ts`

Rules:

- banner text and visibility must not be hardcoded in `pages/index.vue`
- banner publication logic must not be duplicated between admin preview and homepage rendering

## Proposed API Surface

All admin routes must:

- require server-side admin authorization
- validate request payloads explicitly
- call one shared service path
- return stable response shapes

### Events

#### `GET /api/admin/events`

Purpose:

- return one normalized admin event list containing both local custom events and locally managed external events

Query params:

- `status?`
- `type?`
- `search?`
- `page?`
- `limit?`

Response:

```ts
{
  items: Array<{
    id: string;
    source: "custom" | "external-override";
    name: string;
    venue: string;
    eventDate: string;
    status: "upcoming" | "ongoing" | "completed" | "cancelled";
    maxParticipants: number | null;
    registrationCount: number;
    requiresDecklist: boolean;
    tags: Record<string, unknown> | null;
    tagType: string | null;
    createdBy: {
      id: string;
      name: string | null;
      email: string | null;
    } | null;
  }>;
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}
```

#### `POST /api/admin/events/create`

Purpose:

- create a local `CustomEvent`

Request body:

```ts
{
  name: string;
  venue: string;
  eventDate: string;
  registrationDeadline?: string | null;
  maxParticipants: number;
  participationFee?: number | null;
  description?: string | null;
  requiresDecklist: boolean;
  tagType: "pokemon" | "riftbound" | "generic";
  tags?: Record<string, unknown> | null;
}
```

Response:

```ts
{
  item: {
    id: string;
    source: "custom";
  };
}
```

#### `GET /api/admin/events/[id]/details`

Purpose:

- return a fully normalized admin event detail view model

Response includes:

- event detail
- normalized registration summary
- ticket summary
- source discriminator (`custom` vs `external-override`)

#### `PATCH /api/admin/events/[id]/update`

Purpose:

- update an existing event through the same model/service path used for create

#### `DELETE /api/admin/events/[id]/delete`

Purpose:

- delete a local custom event
- external override deletion remains on the external-override controller family

### Users

#### `GET /api/admin/users`

Purpose:

- list Supabase auth users enriched with linked-player and admin-role state

Query params:

- `search?`
- `role?` where values are `admin`, `user`, `unlinked`
- `page?`
- `limit?`

Response:

```ts
{
  items: Array<{
    id: string;
    email: string | null;
    createdAt: string | null;
    lastSignInAt: string | null;
    isAdmin: boolean;
    hasPassword: boolean;
    provider: string | null;
    linkedPlayer: {
      id: string;
      playerId: string;
      name: string;
      email: string | null;
    } | null;
  }>;
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}
```

#### `GET /api/admin/users/[id]`

Purpose:

- return a single auth user with linked player and editable account state

#### `PATCH /api/admin/users/[id]/role`

Purpose:

- grant or remove admin role via one shared role service

Request body:

```ts
{
  isAdmin: boolean;
}
```

#### `POST /api/admin/users/[id]/password-reset`

Purpose:

- trigger a Supabase password reset email for the selected auth user

Request body:

```ts
{
  redirectTo?: string;
}
```

#### `POST /api/admin/users/[id]/password-setup`

Purpose:

- optional admin-only action to force a password-setup state if product-approved

Note:

- this action should exist only if the product decision is explicit; otherwise omit it from V1

#### `PATCH /api/admin/users/[id]/disable`

Purpose:

- optional admin-only account disabling action if the product approves this for V1

### Banner settings

#### `GET /api/admin/settings/banner`

Purpose:

- return the editable admin banner configuration

Response:

```ts
{
  banner: {
    enabled: boolean;
    severity: "info" | "warning" | "success" | "error";
    title: string | null;
    body: string | null;
    ctaLabel: string | null;
    ctaHref: string | null;
    startsAt: string | null;
    endsAt: string | null;
    updatedAt: string;
    updatedBy: string | null;
  };
}
```

#### `PATCH /api/admin/settings/banner`

Purpose:

- update the landing-page banner configuration

Request body:

```ts
{
  enabled: boolean;
  severity: "info" | "warning" | "success" | "error";
  title?: string | null;
  body?: string | null;
  ctaLabel?: string | null;
  ctaHref?: string | null;
  startsAt?: string | null;
  endsAt?: string | null;
}
```

#### Optional public read route: `GET /api/settings/banner`

Purpose:

- return the published banner only if it is currently active

This route is optional if the homepage instead reads the banner server-side directly from a service.

## Proposed Prisma Additions

There is currently no persisted banner/settings model.

### Recommended new model: `SiteSetting`

Reason:

- keeps the first settings surface small
- avoids creating multiple one-off tables too early
- still allows expansion to more admin-controlled settings later

Proposed Prisma model:

```prisma
model SiteSetting {
  id        String   @id @default(cuid())
  key       String   @unique
  value     Json     @db.JsonB
  updatedBy String?  @map("updated_by")
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  @@map("site_settings")
  @@schema("public")
}
```

Initial key usage:

- `landing_banner`

Initial JSON shape for `landing_banner`:

```ts
{
  enabled: boolean;
  severity: "info" | "warning" | "success" | "error";
  title: string | null;
  body: string | null;
  ctaLabel: string | null;
  ctaHref: string | null;
  startsAt: string | null;
  endsAt: string | null;
}
```

### Optional new model: `AdminActionLog`

Reason:

- role changes and account actions are administrative domain actions, not generic runtime errors
- using `ErrorLog` for admin auditing would blur operational errors and intentional admin actions

Proposed Prisma model:

```prisma
model AdminActionLog {
  id           String   @id @default(cuid())
  actorUserId  String   @map("actor_user_id")
  targetUserId String?  @map("target_user_id")
  actionType   String   @map("action_type")
  metadata     Json?    @db.JsonB
  createdAt    DateTime @default(now()) @map("created_at")

  @@index([actorUserId])
  @@index([targetUserId])
  @@index([actionType])
  @@map("admin_action_logs")
  @@schema("public")
}
```

If you want to minimize schema churn in V1, this model can be deferred and existing structured logs can be used temporarily.

## Controller And Service Responsibilities

### `eventAdminService.ts`

Owns:

- CRUD operations for `CustomEvent`
- normalized event aggregation for admin use
- delegation to the shared calendar projection

Must not own:

- role evaluation
- direct component-facing formatting strings

### `calendarEventProjection.ts`

Owns:

- converting `CustomEvent` and external-event inputs into one public calendar shape
- event-type derivation
- participant count derivation
- visibility filtering rules

Must be reused by:

- homepage calendar read path
- admin event list where calendar-facing summaries are shown

### `adminUserService.ts`

Owns:

- listing auth users
- joining auth users to linked player rows
- normalizing account state for admin UI

Must not own:

- role metadata mutation itself if split into a dedicated role service

### `adminRoleService.ts`

Owns:

- grant/remove admin role
- metadata merge/remove rules
- optional audit logging for role changes

### `adminAccountActionService.ts`

Owns:

- supported admin account actions like password reset and optional disable actions

Must not own:

- player CRUD
- role grant/remove

### `adminBannerService.ts`

Owns:

- read/write of `landing_banner` settings
- active-banner evaluation based on time window
- normalization between stored JSON and view model

## Proposed UI Page Map

### `/admin/events`

Purpose:

- canonical admin event list

Contains:

- search/filter toolbar
- create event button
- unified list for custom events and managed external events
- edit/delete/view actions

### `/admin/events/[id]`

Purpose:

- canonical event detail view

Contains:

- event detail summary
- registrations/tickets summary
- decklist/admin actions
- edit action

### `/admin/users`

Purpose:

- canonical auth-user management screen

Contains:

- user list
- role indicators
- linked-player summary
- open details action

### `/admin/users/[id]`

Purpose:

- canonical user detail/action view

Contains:

- auth metadata summary
- linked player summary
- role editor
- account actions panel

### `/admin/settings/banner`

Purpose:

- canonical landing-banner editor

Contains:

- show/hide toggle
- severity selector
- editable title/body/CTA
- optional schedule window
- preview panel

## Rollout Order

### Phase 1 - Architecture groundwork

Build first:

- service skeletons
- validation schemas
- admin auth normalization

Exit criteria:

- controller ownership is clear
- no new admin feature is being added directly into page logic

### Phase 2 - Events

Build:

- shared event admin service
- shared calendar projection
- unified admin events list/detail pages

Exit criteria:

- created custom events appear in the public calendar through the shared projection

### Phase 3 - Users and roles

Build:

- admin-user read model
- admin users list/detail pages
- role management endpoints and UI

Exit criteria:

- admins can list users and change admin role state without direct Supabase dashboard usage

### Phase 4 - Account actions

Build:

- approved admin account actions

Exit criteria:

- supported actions are clearly separated from player CRUD

### Phase 5 - Banner settings

Build:

- Prisma migration for settings
- banner service
- admin editor
- homepage integration

Exit criteria:

- banner is fully data-driven and editable from the admin panel

## Validation Plan

Recommended validation slices:

```bash
npx vitest run tests/unit/adminAuthorization.test.ts
npx vitest run tests/unit/adminEventsController.test.ts
npx vitest run tests/unit/calendarEventProjection.test.ts
npx vitest run tests/unit/adminUsersController.test.ts
npx vitest run tests/unit/adminRoleService.test.ts
npx vitest run tests/unit/adminBannerService.test.ts
```

If E2E coverage is added later, preferred end-to-end journeys are:

1. create custom event -> event appears in public calendar
2. grant admin role -> user appears as admin in admin users UI
3. update landing banner -> homepage reflects published banner state

## Open Product Decisions

These decisions should be made before implementation starts on their corresponding phase:

1. Should admin account actions include disabling users in V1?
2. Should admin account actions include forced password setup in V1, or only reset email dispatch?
3. Should the landing banner support rich text, or plain text plus CTA only?
4. Should external-event management remain a separate admin page or be folded into the unified events page?