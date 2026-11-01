import { getCachedChampionships } from "~/server/services/events/championshipScheduleService";

export default defineEventHandler(async (event) => {
  try {
    const events = await getCachedChampionships();
    setResponseHeader(event, "Cache-Control", "public, max-age=300");
    return { events };
  } catch {
    console.error("Official championship schedule unavailable");
    throw createError({ statusCode: 503, statusMessage: "Major events temporarily unavailable" });
  }
});
