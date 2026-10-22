export type ClientAnalyticsEvent =
  | "registration_completed"
  | "waitlist_joined"
  | "waitlist_confirmed"
  | "event_bookmarked";

export function sendAnalyticsEvent(
  eventType: "page_view" | ClientAnalyticsEvent,
  options: { path?: string; eventId?: string | null } = {},
) {
  if (!import.meta.client || navigator.doNotTrack === "1") return;

  const payload = JSON.stringify({
    eventType,
    path: options.path || window.location.pathname,
    eventId: options.eventId || null,
  });

  if (navigator.sendBeacon) {
    navigator.sendBeacon(
      "/api/analytics/track",
      new Blob([payload], { type: "application/json" }),
    );
    return;
  }

  void fetch("/api/analytics/track", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: payload,
    keepalive: true,
  }).catch(() => undefined);
}

export function useAnalytics() {
  return {
    track: (eventType: ClientAnalyticsEvent, eventId?: string | null) =>
      sendAnalyticsEvent(eventType, { eventId }),
  };
}
