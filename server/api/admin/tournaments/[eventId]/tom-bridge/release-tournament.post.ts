import { defineAdminRoute } from "~/server/services/admin/adminRoute";
import { releaseTournamentForPlayers } from "~/server/services/events/tournamentTomStateService";

export default defineAdminRoute(async ({ event }) => {
  const eventId = getRouterParam(event, "eventId");
  if (!eventId) throw createError({ statusCode: 400, statusMessage: "Event ID is required" });
  await releaseTournamentForPlayers(eventId);
  return { success: true };
});
