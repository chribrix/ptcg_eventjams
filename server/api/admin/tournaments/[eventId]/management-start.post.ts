import { defineAdminRoute } from "~/server/services/admin/adminRoute";
import { startTournamentManagement } from "~/server/services/events/tournamentManagementService";

export default defineAdminRoute(async ({ event }) => {
  const eventId = getRouterParam(event, "eventId");
  if (!eventId) throw createError({ statusCode: 400, statusMessage: "Event ID is required" });
  return startTournamentManagement(eventId);
});
