import { notifyEventBookmarksUpdated } from "~/utils/eventBookmarks";

export const GUEST_EVENT_BOOKMARKS_KEY = "guest_event_bookmarks_v1";

export type EventBookmarkDraft = {
  externalEventId: string;
  title: string;
  eventType?: string | null;
  venue: string;
  location?: string | null;
  country?: string | null;
  eventDate: string;
  registrationUrl?: string | null;
  cost?: string | null;
  streetAddress?: string | null;
  icon?: string | null;
};

export type GuestEventBookmark = EventBookmarkDraft & {
  createdAt: string;
  updatedAt: string;
};

function parseGuestBookmarks(raw: string | null): GuestEventBookmark[] {
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    const normalized: GuestEventBookmark[] = [];
    for (const item of parsed) {
      if (!item || typeof item !== "object") {
        continue;
      }

        const record = item as Record<string, unknown>;
        const externalEventId = typeof record.externalEventId === "string" ? record.externalEventId : "";
        if (!externalEventId) {
          continue;
        }

        normalized.push({
          externalEventId,
          title: typeof record.title === "string" ? record.title : "Untitled Event",
          eventType: typeof record.eventType === "string" ? record.eventType : null,
          venue: typeof record.venue === "string" ? record.venue : "Venue TBA",
          location: typeof record.location === "string" ? record.location : null,
          country: typeof record.country === "string" ? record.country : null,
          eventDate: typeof record.eventDate === "string" ? record.eventDate : new Date().toISOString(),
          registrationUrl: typeof record.registrationUrl === "string" ? record.registrationUrl : null,
          cost: typeof record.cost === "string" ? record.cost : null,
          streetAddress: typeof record.streetAddress === "string" ? record.streetAddress : null,
          icon: typeof record.icon === "string" ? record.icon : null,
          createdAt: typeof record.createdAt === "string" ? record.createdAt : new Date().toISOString(),
          updatedAt: typeof record.updatedAt === "string" ? record.updatedAt : new Date().toISOString(),
        });
    }

    return normalized;
  } catch {
    return [];
  }
}

function writeGuestBookmarks(bookmarks: GuestEventBookmark[]) {
  if (!import.meta.client) return;
  localStorage.setItem(GUEST_EVENT_BOOKMARKS_KEY, JSON.stringify(bookmarks));
  notifyEventBookmarksUpdated();
}

export function getGuestEventBookmarks(): GuestEventBookmark[] {
  if (!import.meta.client) return [];
  return parseGuestBookmarks(localStorage.getItem(GUEST_EVENT_BOOKMARKS_KEY));
}

export function getGuestBookmarkedEventIds(): Set<string> {
  return new Set(getGuestEventBookmarks().map((bookmark) => bookmark.externalEventId));
}

export function upsertGuestEventBookmark(bookmark: EventBookmarkDraft) {
  if (!import.meta.client) return;

  const now = new Date().toISOString();
  const existing = getGuestEventBookmarks();
  const index = existing.findIndex((entry) => entry.externalEventId === bookmark.externalEventId);

  if (index >= 0) {
    existing[index] = {
      ...existing[index],
      ...bookmark,
      updatedAt: now,
    };
  } else {
    existing.unshift({
      ...bookmark,
      createdAt: now,
      updatedAt: now,
    });
  }

  writeGuestBookmarks(existing);
}

export function removeGuestEventBookmark(externalEventId: string) {
  if (!import.meta.client) return;
  const next = getGuestEventBookmarks().filter((entry) => entry.externalEventId !== externalEventId);
  writeGuestBookmarks(next);
}

export function clearGuestEventBookmarks() {
  if (!import.meta.client) return;
  localStorage.removeItem(GUEST_EVENT_BOOKMARKS_KEY);
  notifyEventBookmarksUpdated();
}
