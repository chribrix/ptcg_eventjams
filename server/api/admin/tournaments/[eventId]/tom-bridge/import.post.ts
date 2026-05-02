import { defineAdminRoute } from "~/server/services/admin/adminRoute";
import { upsertTournamentTomState } from "~/server/services/events/tournamentTomStateService";

export default defineAdminRoute(async ({ event, adminUser }) => {
  const eventId = getRouterParam(event, "eventId");

  if (!eventId) {
    throw createError({
      statusCode: 400,
      statusMessage: "Event ID is required",
    });
  }

  const body = await readBody<{ xml?: string; fileName?: string }>(event);
  if (!body?.xml) {
    throw createError({
      statusCode: 400,
      statusMessage: "Missing xml payload",
    });
  }

  const imported = await upsertTournamentTomState({
    customEventId: eventId,
    xml: body.xml,
    importedByAdminId: adminUser.id,
    sourceFileName: body.fileName,
  });

  return {
    success: true,
    importedAt: imported.record.importedAt.toISOString(),
    state: imported.stateView,
  };
});
