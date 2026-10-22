import { defineAdminRoute } from "~/server/services/admin/adminRoute";
import { releaseCurrentRoundForPlayers } from "~/server/services/events/tournamentTomStateService";
import { z } from "zod";

export default defineAdminRoute(async ({ event }) => {
  const eventId = getRouterParam(event, "eventId");

  if (!eventId) {
    throw createError({
      statusCode: 400,
      statusMessage: "Event ID is required",
    });
  }

  const body = z.object({ divisionCategory: z.string().min(1).optional() }).parse(await readBody(event));
  const released = await releaseCurrentRoundForPlayers(eventId, body.divisionCategory);

  return {
    success: true,
    releasedRound: released.releasedRound,
    updatedAt: released.record.updatedAt.toISOString(),
    state: released.stateView,
  };
});
