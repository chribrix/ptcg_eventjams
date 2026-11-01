import { getRoadDistances, roadDistanceRetryAfterSeconds, validRoadPoint } from "~/server/services/geo/roadDistanceService";

export default defineEventHandler(async (event) => {
  const body = await readBody(event) as { origin?: unknown; destinations?: unknown };
  if (!validRoadPoint(body?.origin) || !Array.isArray(body?.destinations) || body.destinations.length > 40 ||
      !body.destinations.every(validRoadPoint)) {
    throw createError({ statusCode: 400, statusMessage: "Invalid routing coordinates" });
  }
  setResponseHeader(event, "Cache-Control", "no-store");
  const meters = await getRoadDistances(body.origin, body.destinations);
  return { meters, retryAfterSeconds: roadDistanceRetryAfterSeconds() };
});
