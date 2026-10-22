import { defineAdminRoute } from "~/server/services/admin/adminRoute";
import { getTournamentTomState } from "~/server/services/events/tournamentTomStateService";
import prisma from "~/lib/prisma";

export default defineAdminRoute(async ({ event }) => {
  const eventId = getRouterParam(event, "eventId");

  if (!eventId) {
    throw createError({
      statusCode: 400,
      statusMessage: "Event ID is required",
    });
  }

  const state = await getTournamentTomState(eventId);

  if (!state) {
    return {
      success: true,
      hasTomState: false,
    };
  }

  const registrations = await prisma.eventRegistration.findMany({
    where: { customEventId: eventId },
    include: { player: { select: { playerId: true } }, tickets: { select: { decklist: true, participantPlayerId: true } } },
  });
  const decklistByTomId = new Map<string, string>();
  for (const registration of registrations) {
    if (registration.player.playerId && registration.tickets.some((ticket) => !!ticket.decklist)) {
      decklistByTomId.set(registration.player.playerId, registration.tickets.find((ticket) => !!ticket.decklist)?.decklist || "");
    }
    for (const ticket of registration.tickets) if (ticket.participantPlayerId && ticket.decklist) decklistByTomId.set(ticket.participantPlayerId, ticket.decklist);
  }
  const accessed = new Set(((state.record.metadata as any)?.playerAccessedUserIds || []) as string[]);
  const registeredTomIds = new Set(registrations.map((registration) => registration.player.playerId).filter(Boolean));

  return {
    // Do not expose archived raw XML blobs to the frontend state payload.
    // Frontend only needs descriptors for snapshot export actions.
    metadata: {
      ...((state.record.metadata as Record<string, unknown>) || {}),
      snapshotArchive: Array.isArray((state.record.metadata as any)?.snapshotArchive)
        ? (state.record.metadata as any).snapshotArchive.map((entry: any) => ({
            id: entry.id,
            fileName: entry.fileName,
            importedAt: entry.importedAt,
            importedByAdminId: entry.importedByAdminId,
            snapshotKind: entry.snapshotKind,
            roundNumber: entry.roundNumber,
          }))
        : [],
    },
    success: true,
    hasTomState: true,
    importedAt: state.record.importedAt.toISOString(),
    updatedAt: state.record.updatedAt.toISOString(),
    state: {
      ...state.stateView,
      players: state.stateView.players.map((player) => ({
        ...player,
        hasOpenedTournament: accessed.has(player.userId) || registeredTomIds.has(player.userId),
        decklist: decklistByTomId.get(player.userId) || null,
      })),
    },
  };
});
