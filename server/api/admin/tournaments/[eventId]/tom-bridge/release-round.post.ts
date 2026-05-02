import { defineAdminRoute } from "~/server/services/admin/adminRoute";
import { releaseCurrentRoundForPlayers } from "~/server/services/events/tournamentTomStateService";

export default defineAdminRoute(async ({ event }) => {
  const eventId = getRouterParam(event, "eventId");

  if (!eventId) {
    throw createError({
      statusCode: 400,
      statusMessage: "Event ID is required",
    });
  }

  const released = await releaseCurrentRoundForPlayers(eventId);

  return {
    success: true,
    releasedRound: released.releasedRound,
    updatedAt: released.record.updatedAt.toISOString(),
    state: released.stateView,
  };
});
