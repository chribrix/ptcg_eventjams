export const EVENT_BOOKMARKS_UPDATED = "event-bookmarks-updated";

export function notifyEventBookmarksUpdated() {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new CustomEvent(EVENT_BOOKMARKS_UPDATED));
}

export function onEventBookmarksUpdated(callback: () => void) {
  if (typeof window === "undefined") {
    return () => {};
  }

  const listener = () => callback();
  window.addEventListener(EVENT_BOOKMARKS_UPDATED, listener);

  return () => {
    window.removeEventListener(EVENT_BOOKMARKS_UPDATED, listener);
  };
}
