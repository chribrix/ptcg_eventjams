import prisma from "~/lib/prisma";
import { getActiveLeagueViewForPlayer } from "~/server/services/league/leagueService";
import { resolveAuthenticatedPlayerFactory } from "~/server/util/authenticatedPlayer";

const resolveAuthenticatedPlayer = resolveAuthenticatedPlayerFactory(prisma);

export default defineEventHandler(async (event) => {
  const player = await resolveAuthenticatedPlayer(event);
  const view = await getActiveLeagueViewForPlayer(player?.playerId || null);
  return {
    season: { id: view.id, name: view.name, startsOn: view.startsOn, endsOn: view.endsOn },
    viewerLeaguePlayerId: view.viewerLeaguePlayerId,
    standings: view.standings,
    events: view.events.map((leagueEvent) => ({ id: leagueEvent.id, name: leagueEvent.name, eventDate: leagueEvent.eventDate })),
    matrix: view.matrix,
  };
});