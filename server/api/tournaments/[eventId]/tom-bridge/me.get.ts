import prisma from "~/lib/prisma";
import { getPlayerTournamentRun, getTournamentTomState, recordTournamentPlayerAccess } from "~/server/services/events/tournamentTomStateService";
import { resolveTomGuestAccess } from "~/server/services/events/tomGuestAccessService";
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
  const tournamentState = await getTournamentTomState(eventId);
  if (!tournamentState || !(tournamentState.record.metadata as { tournamentReleasedAt?: string } | null)?.tournamentReleasedAt) {
    throw createError({ statusCode: 403, statusMessage: "Die Turnieransicht wurde noch nicht freigegeben." });
  }

  const guestTomUserId = resolveTomGuestAccess(event, eventId);
  const player = guestTomUserId ? null : await resolveAuthenticatedPlayer(event);
  const tomUserId = guestTomUserId || player?.playerId;

  if (!guestTomUserId) {
    const registration = await prisma.eventRegistration.findFirst({
      where: { customEventId: eventId, playerId: player!.id },
      select: { id: true },
    });
    if (!registration) throw createError({ statusCode: 403, statusMessage: "You are not registered for this tournament" });
  }
  if (!tomUserId) throw createError({ statusCode: 403, statusMessage: "No Pokémon Player ID is linked to this account" });
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
