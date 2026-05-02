import { defineAdminRoute } from "~/server/services/admin/adminRoute";
import { resolveTournamentTomConflict } from "~/server/services/events/tournamentTomStateService";
import type { TomResultUpdate } from "~/server/services/events/tomTdfService";

export default defineAdminRoute(async ({ event }) => {
  const eventId = getRouterParam(event, "eventId");
  if (!eventId) {
    throw createError({
      statusCode: 400,
      statusMessage: "Event ID is required",
    });
  }

  const body = await readBody<{ update?: TomResultUpdate }>(event);
  if (!body?.update || !Number.isInteger(body.update.roundNumber) || !Number.isInteger(body.update.outcome)) {
    throw createError({
      statusCode: 400,
      statusMessage: "Invalid conflict resolution payload",
    });
  }

  const result = await resolveTournamentTomConflict({
    customEventId: eventId,
    update: body.update,
  });

  return {
    success: true,
    updatedAt: result.record.updatedAt.toISOString(),
    state: result.stateView,
  };
});
