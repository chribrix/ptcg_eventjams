import { getAnalyticsOverview } from "~/server/services/analytics/analyticsService";
import { defineAdminRoute } from "~/server/services/admin/adminRoute";

export default defineAdminRoute(async ({ event }) => {
  const query = getQuery(event);
  const days = Number(query.days || 30);
  return getAnalyticsOverview(days);
});
