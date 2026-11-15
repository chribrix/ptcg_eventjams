import { deleteExpiredAnalytics } from "~/server/services/analytics/analyticsRetentionService";

export default defineTask({
  meta: { name: "analytics:retention", description: "Delete analytics events older than 30 days" },
  async run() {
    const result = await deleteExpiredAnalytics();
    return { result: { deleted: result.deleted } };
  },
});
