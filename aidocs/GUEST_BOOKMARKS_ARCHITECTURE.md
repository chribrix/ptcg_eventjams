# Guest Event Bookmarks Architecture

## Goal
Allow unauthenticated users to:
- bookmark external events,
- see bookmarked/planned events in dashboard surfaces,
- and automatically migrate those bookmarks into their account after sign-in/sign-up.

This does **not** change registration permissions. Event registration remains authenticated.

## Scope Boundaries
- Bookmarks are low-risk preference data.
- Registrations, ticket mutations, and any booking flow remain server-authenticated.
- Guest data is local-only until explicit merge on auth.

## Storage Model
### Guest (unauthenticated)
- Storage: `localStorage`
- Key: `guest_event_bookmarks_v1`
- Shape: array of bookmark records with event metadata and timestamps.
- Source of truth while logged out.

### Authenticated
- Storage: existing `event_bookmarks` table (`EventBookmark` Prisma model).
- Source of truth while logged in.

## Frontend Architecture
### Shared bookmark orchestration
- New composable: `composables/useEventBookmarks.ts`
- Responsibilities:
  - load bookmark IDs from correct source (guest local storage vs API),
  - toggle bookmark against correct backend/local target,
  - merge guest bookmarks to account after login.

### Guest storage helpers
- New utility: `utils/guestEventBookmarks.ts`
- Responsibilities:
  - parse/sanitize local storage payload,
  - upsert/remove/clear guest bookmarks,
  - emit bookmark update events via existing `notifyEventBookmarksUpdated()`.

### UI consumers
- `components/EventList.vue`
- `components/landingPageCards/calendar/EventDetailsPopover.vue`
- `pages/dashboard.vue`
- `components/landingPageCards/dashboard/EventMiniDashboardCard.vue`

All now use unified bookmark behavior:
- if logged out: local bookmarks,
- if logged in: server bookmarks.

## Merge-on-Auth Flow
### Trigger
- Plugin: `plugins/auth-monitor.client.ts`
- On Supabase `SIGNED_IN` event, call merge.

### API
- New endpoint: `POST /api/events/bookmarks/merge`
- File: `server/api/events/bookmarks/merge.post.ts`
- Input: `{ bookmarks: EventBookmarkDraft[] }`
- Behavior:
  - resolve authenticated player,
  - create missing bookmarks,
  - skip duplicates by `(playerId, externalEventId)`,
  - return `{ mergedCount, skippedCount }`.

### Post-merge
- Local guest bookmarks are cleared.
- Bookmark update event is emitted so UIs refresh.

## Idempotency & Conflict Rules
- Duplicate bookmark for same user/event is skipped (non-fatal).
- Merge is additive only.
- Invalid payload rejected via zod schema.

## Security Notes
- Guest payload is non-sensitive event metadata only.
- Merge endpoint requires authenticated user context.
- Registration/booking endpoints are unchanged and still auth-protected.

## Operational Notes
- Existing bookmark event bus (`event-bookmarks-updated`) is reused to keep UI in sync.
- Guest dashboards show bookmark planning entries only; no registration capabilities are enabled for guests.
