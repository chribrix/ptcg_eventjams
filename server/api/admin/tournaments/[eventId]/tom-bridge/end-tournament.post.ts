import { defineAdminRoute } from "~/server/services/admin/adminRoute";
import { endTournamentForPlayers } from "~/server/services/events/tournamentTomStateService";

export default defineAdminRoute(async ({ event }) => {
  const eventId = getRouterParam(event, "eventId");
  if (!eventId) throw createError({ statusCode: 400, statusMessage: "Event ID is required" });

  const ended = await endTournamentForPlayers(eventId);
  return {
    success: true,
    endedAt: (ended.record.metadata as { tournamentEndedAt?: string } | null)?.tournamentEndedAt,
    updatedAt: ended.record.updatedAt.toISOString(),
  };
});
