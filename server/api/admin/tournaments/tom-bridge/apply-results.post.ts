import { defineAdminRoute } from "~/server/services/admin/adminRoute";
import {
  applyTomResultUpdates,
  parseTomTdf,
  tomOutcomeLabel,
  type TomResultUpdate,
} from "~/server/services/events/tomTdfService";

const isValidOutcome = (value: number): boolean => {
  return Number.isInteger(value) && value >= 0 && value <= 8;
};

export default defineAdminRoute(async ({ event }) => {
  const body = await readBody<{
    xml?: string;
    updates?: TomResultUpdate[];
  }>(event);

  if (!body?.xml || !Array.isArray(body.updates)) {
    throw createError({
      statusCode: 400,
      statusMessage: "Missing xml or updates payload",
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

  const updatedXml = applyTomResultUpdates(body.xml, body.updates);
  const parsed = parseTomTdf(updatedXml);

  return {
    updatesApplied: body.updates.length,
    outcomes: body.updates.map((update) => ({
      roundNumber: update.roundNumber,
      tableNumber: update.tableNumber,
      player1UserId: update.player1UserId,
      player2UserId: update.player2UserId,
      outcome: update.outcome,
      outcomeLabel: tomOutcomeLabel(update.outcome),
    })),
    updatedXml,
    roundCount: parsed.rounds.length,
  };
});
