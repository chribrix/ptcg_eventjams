import { z } from "zod";
import { defineAdminRoute } from "~/server/services/admin/adminRoute";
import { submitPlayerMatchReport } from "~/server/services/events/tournamentTomStateService";
import { resolveTomViewerToken } from "~/server/services/events/tomViewerTokenService";

const payloadSchema = z.object({
  viewer: z.string().min(1),
  roundNumber: z.number().int().positive(),
  divisionCategory: z.string().optional(),
  tableNumber: z.number().int().positive().optional(),
  player1UserId: z.string().optional(),
  player2UserId: z.string().optional(),
  result: z.enum(["win", "loss", "tie"]),
});

// An authenticated admin may exercise the same player-report workflow in the
// impersonation preview. The signed viewer token fixes the reporter identity.
export default defineAdminRoute(async ({ event }) => {
  const eventId = getRouterParam(event, "eventId");
  if (!eventId) throw createError({ statusCode: 400, statusMessage: "Event ID is required" });

  const input = payloadSchema.parse(await readBody(event));
  const playerUserId = await resolveTomViewerToken(eventId, input.viewer);
  if (!playerUserId) throw createError({ statusCode: 403, statusMessage: "Invalid player preview token" });

  const report = await submitPlayerMatchReport({
    customEventId: eventId,
    reporterUserId: playerUserId,
    roundNumber: input.roundNumber,
    divisionCategory: input.divisionCategory,
    tableNumber: input.tableNumber,
    player1UserId: input.player1UserId,
    player2UserId: input.player2UserId,
    result: input.result,
  });

  return { success: true, report: report.report, state: report.stateView };
});
