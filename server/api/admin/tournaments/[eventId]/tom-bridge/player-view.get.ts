import { defineAdminRoute } from "~/server/services/admin/adminRoute";
import { getPlayerTournamentRun } from "~/server/services/events/tournamentTomStateService";
import { resolveTomViewerToken } from "~/server/services/events/tomViewerTokenService";

export default defineAdminRoute(async ({ event }) => {
  const eventId = getRouterParam(event, "eventId");
  if (!eventId) {
    throw createError({
      statusCode: 400,
      statusMessage: "Event ID is required",
    });
  }

  const query = getQuery(event);
  const viewerToken = String(query.viewer || "").trim();
  const directPlayerUserId = String(query.playerUserId || "").trim();
  const playerUserId = viewerToken
    ? await resolveTomViewerToken(eventId, viewerToken)
    : directPlayerUserId;

  if (!playerUserId) {
    throw createError({
      statusCode: 400,
      statusMessage: "valid viewer or playerUserId query parameter is required",
    });
  }

  const run = await getPlayerTournamentRun({
    customEventId: eventId,
    playerUserId,
  });

  return {
    success: true,
    playerUserId,
    run,
  };
});
