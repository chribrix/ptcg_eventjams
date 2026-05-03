import {
  clearGuestEventBookmarks,
  getGuestBookmarkedEventIds,
  getGuestEventBookmarks,
  removeGuestEventBookmark,
  type EventBookmarkDraft,
  upsertGuestEventBookmark,
} from "~/utils/guestEventBookmarks";

export const useEventBookmarks = () => {
  const loadBookmarkedEventIds = async (isAuthenticated: boolean) => {
    if (!isAuthenticated) {
      return getGuestBookmarkedEventIds();
    }

    const response = await $fetch<{
      data: Array<{ externalEventId: string }>;
    }>("/api/events/bookmarks");

    return new Set((response.data || []).map((bookmark) => bookmark.externalEventId));
  };

  const toggleBookmark = async (params: {
    isAuthenticated: boolean;
    isBookmarked: boolean;
    bookmark: EventBookmarkDraft;
  }) => {
    const { isAuthenticated, isBookmarked, bookmark } = params;

    if (isAuthenticated) {
      if (isBookmarked) {
        await $fetch(`/api/events/bookmarks/${bookmark.externalEventId}`, {
          method: "DELETE",
        });
      } else {
        await $fetch("/api/events/bookmarks", {
          method: "POST",
          body: bookmark,
        });
      }
      return;
    }

    if (isBookmarked) {
      removeGuestEventBookmark(bookmark.externalEventId);
      return;
    }

    upsertGuestEventBookmark(bookmark);
  };

  const mergeGuestBookmarksIntoAccount = async () => {
    const guestBookmarks = getGuestEventBookmarks();
    if (!guestBookmarks.length) {
      return { mergedCount: 0, skippedCount: 0 };
    }

    const payload = guestBookmarks.map((bookmark) => ({
      externalEventId: bookmark.externalEventId,
      title: bookmark.title,
      eventType: bookmark.eventType || null,
      venue: bookmark.venue,
      location: bookmark.location || null,
      country: bookmark.country || null,
      eventDate: bookmark.eventDate,
      registrationUrl: bookmark.registrationUrl || null,
      cost: bookmark.cost || null,
      streetAddress: bookmark.streetAddress || null,
      icon: bookmark.icon || null,
    }));

    const result = await $fetch<{ mergedCount: number; skippedCount: number }>(
      "/api/events/bookmarks/merge",
      {
        method: "POST",
        body: { bookmarks: payload },
      },
    );

    clearGuestEventBookmarks();
    return result;
  };

  return {
    loadBookmarkedEventIds,
    toggleBookmark,
    mergeGuestBookmarksIntoAccount,
    getGuestEventBookmarks,
  };
};
