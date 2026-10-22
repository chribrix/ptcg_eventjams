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
});
