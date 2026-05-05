import prisma from "~/lib/prisma";
import { joinEventWaitlist } from "~/server/services/events/waitlistService";
import { resolveAuthenticatedPlayerFactory } from "~/server/util/authenticatedPlayer";

const resolveAuthenticatedPlayer = resolveAuthenticatedPlayerFactory(prisma);

export default defineEventHandler(async (event) => {
  if (getMethod(event) !== "POST") {
    throw createError({ statusCode: 405, statusMessage: "Method not allowed" });
  }

  const eventId = getRouterParam(event, "id");
  if (!eventId) {
    throw createError({ statusCode: 400, statusMessage: "Event ID is required" });
  }

  const player = await resolveAuthenticatedPlayer(event);
  return joinEventWaitlist(eventId, player);
});
