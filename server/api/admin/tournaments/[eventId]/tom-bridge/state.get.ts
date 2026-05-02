import { defineAdminRoute } from "~/server/services/admin/adminRoute";
import { getTournamentTomState } from "~/server/services/events/tournamentTomStateService";

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
    state: state.stateView,
  };
});
