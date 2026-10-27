import { sendAnalyticsEvent } from "~/composables/useAnalytics";

export default defineNuxtPlugin((nuxtApp) => {
  const route = useRoute();
  let lastTrackedPath = "";

  nuxtApp.hook("page:finish", () => {
    const path = route.path;
    const applicationPath = path.replace(/^\/(?:de|en)(?=\/|$)/, "") || "/";
    if (path === lastTrackedPath || applicationPath.startsWith("/admin")) return;
    lastTrackedPath = path;
    sendAnalyticsEvent("page_view", { path });
  });

  const trackedInteractionPages = new Set<string>();
  document.addEventListener("click", (event) => {
    if (!event.isTrusted) return;
    const path = window.location.pathname;
    const applicationPath = path.replace(/^\/(?:de|en)(?=\/|$)/, "") || "/";
    if (applicationPath.startsWith("/admin")) return;

    const day = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Europe/Berlin",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
    const key = `${day}|${path}`;
    if (trackedInteractionPages.has(key)) return;
    trackedInteractionPages.add(key);
    sendAnalyticsEvent("interaction_click", { path });
  }, { capture: true });
});
