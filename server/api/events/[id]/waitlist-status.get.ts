import prisma from "~/lib/prisma";
import { getMyWaitlistStatus } from "~/server/services/events/waitlistService";
import { resolveAuthenticatedPlayerFactory } from "~/server/util/authenticatedPlayer";

const resolveAuthenticatedPlayer = resolveAuthenticatedPlayerFactory(prisma);

export default defineEventHandler(async (event) => {
  const eventId = getRouterParam(event, "id");
  if (!eventId) {
    throw createError({ statusCode: 400, statusMessage: "Event ID is required" });
  }

  const player = await resolveAuthenticatedPlayer(event, { allowMissing: true });
  if (!player) {
    return { status: "none" };
  }

  return getMyWaitlistStatus(eventId, player.id);
});
