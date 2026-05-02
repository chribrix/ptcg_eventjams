import { defineAdminRoute } from "~/server/services/admin/adminRoute";
import {
  applyTournamentTomResultUpdates,
} from "~/server/services/events/tournamentTomStateService";
import type { TomResultUpdate } from "~/server/services/events/tomTdfService";

const isValidOutcome = (value: number): boolean => {
  return Number.isInteger(value) && value >= 0 && value <= 8;
};

export default defineAdminRoute(async ({ event }) => {
  const eventId = getRouterParam(event, "eventId");

  if (!eventId) {
    throw createError({
      statusCode: 400,
      statusMessage: "Event ID is required",
    });
  }

  const body = await readBody<{ updates?: TomResultUpdate[] }>(event);

  if (!Array.isArray(body?.updates) || body.updates.length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: "Missing updates payload",
    });
  }

  for (const update of body.updates) {
    if (!Number.isInteger(update.roundNumber) || !isValidOutcome(update.outcome)) {
      throw createError({
        statusCode: 400,
        statusMessage: "Invalid roundNumber or outcome in updates",
      });
    }
  }

  const result = await applyTournamentTomResultUpdates({
    customEventId: eventId,
    updates: body.updates,
  });

  return {
    success: true,
    updatedAt: result.record.updatedAt.toISOString(),
    state: result.stateView,
  };
});
