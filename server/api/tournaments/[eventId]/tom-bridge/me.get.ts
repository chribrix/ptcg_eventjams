import prisma from "~/lib/prisma";
import { getPlayerTournamentRun } from "~/server/services/events/tournamentTomStateService";
import { resolveAuthenticatedPlayerFactory } from "~/server/util/authenticatedPlayer";

const resolveAuthenticatedPlayer = resolveAuthenticatedPlayerFactory(prisma);

export default defineEventHandler(async (event) => {
  const eventId = getRouterParam(event, "eventId");
  if (!eventId) {
    throw createError({
      statusCode: 400,
      statusMessage: "Event ID is required",
    });
  }

  const player = await resolveAuthenticatedPlayer(event);
  const tomUserId = player.playerId;

  const registration = await prisma.eventRegistration.findFirst({
    where: {
      customEventId: eventId,
      playerId: player.id,
    },
    select: { id: true },
  });

  if (!registration) {
    throw createError({
      statusCode: 403,
      statusMessage: "You are not registered for this tournament",
    });
  }

  const run = await getPlayerTournamentRun({
    customEventId: eventId,
    playerUserId: tomUserId,
  });

  return {
    success: true,
    player: {
      appPlayerId: player.playerId,
      tomUserId,
      name: player.name,
    },
    run,
  };
});
