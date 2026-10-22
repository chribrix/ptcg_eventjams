import { z } from "zod";
import {
  ANALYTICS_EVENT_TYPES,
  recordAnalyticsEvent,
} from "~/server/services/analytics/analyticsService";

const bodySchema = z.object({
  eventType: z.enum(ANALYTICS_EVENT_TYPES),
  path: z.string().min(1).max(500),
  eventId: z.string().min(1).max(100).nullable().optional(),
});

export default defineEventHandler(async (event) => {
  const parsed = bodySchema.safeParse(await readBody(event));
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: "Invalid analytics event" });
  }

  try {
    return await recordAnalyticsEvent(event, parsed.data);
  } catch (error) {
    console.error("Analytics event could not be recorded", error);
    return { tracked: false };
  }
});
