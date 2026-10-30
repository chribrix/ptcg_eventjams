import { getPlayerTournamentRun, getTournamentTomState, recordTournamentPlayerAccess } from "~/server/services/events/tournamentTomStateService";
import { resolveTomPlayerIdentity } from "~/server/services/events/tomPlayerIdentity";

export default defineEventHandler(async (event) => {
  const eventId = getRouterParam(event, "eventId");
  if (!eventId) {
    throw createError({
      statusCode: 400,
      statusMessage: "Event ID is required",
    });
  }
  const tournamentState = await getTournamentTomState(eventId);
  if (!tournamentState || !(tournamentState.record.metadata as { tournamentReleasedAt?: string } | null)?.tournamentReleasedAt) {
    throw createError({ statusCode: 403, statusMessage: "Die Turnieransicht wurde noch nicht freigegeben." });
  }

  const { tomUserId, player } = await resolveTomPlayerIdentity(event, eventId, tournamentState.stateView.players);
  await recordTournamentPlayerAccess(eventId, tomUserId);

  const run = await getPlayerTournamentRun({
    customEventId: eventId,
    playerUserId: tomUserId,
  });

  return {
    success: true,
    player: {
      appPlayerId: player?.playerId || null,
      tomUserId,
      name: player?.name || "Gastspieler",
    },
    run,
  };
});
