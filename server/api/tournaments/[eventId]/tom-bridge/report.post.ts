import prisma from "~/lib/prisma";
import { z } from "zod";
import { getTournamentTomState, submitPlayerMatchReport } from "~/server/services/events/tournamentTomStateService";
import { resolveTomGuestAccess } from "~/server/services/events/tomGuestAccessService";
import { resolveAuthenticatedPlayerFactory } from "~/server/util/authenticatedPlayer";

const resolveAuthenticatedPlayer = resolveAuthenticatedPlayerFactory(prisma);

const reportSchema = z.object({
  roundNumber: z.number().int().positive(),
  divisionCategory: z.string().optional(),
  tableNumber: z.number().int().positive().optional(),
  player1UserId: z.string().optional(),
  player2UserId: z.string().optional(),
  result: z.enum(["win", "loss", "tie"]),
});

export default defineEventHandler(async (event) => {
  const eventId = getRouterParam(event, "eventId");
  if (!eventId) {
    throw createError({
      statusCode: 400,
      statusMessage: "Event ID is required",
    });
  }

  const guestTomUserId = resolveTomGuestAccess(event, eventId);
  const player = guestTomUserId ? null : await resolveAuthenticatedPlayer(event);
  const payload = reportSchema.parse(await readBody(event));
  const tournamentState = await getTournamentTomState(eventId);
  if (!tournamentState || !(tournamentState.record.metadata as { tournamentReleasedAt?: string } | null)?.tournamentReleasedAt) {
    throw createError({ statusCode: 403, statusMessage: "Die Turnieransicht wurde noch nicht freigegeben." });
  }

  if (!guestTomUserId) {
    const registration = await prisma.eventRegistration.findFirst({
      where: { customEventId: eventId, playerId: player!.id },
      select: { id: true },
    });
    if (!registration) throw createError({ statusCode: 403, statusMessage: "You are not registered for this tournament" });
  }

  const customEvent = await prisma.customEvent.findUnique({
    where: { id: eventId },
    select: { status: true },
  });
  if (customEvent && (customEvent.status === "completed" || customEvent.status === "cancelled")) {
    throw createError({
      statusCode: 403,
      statusMessage: "Tournament is closed for player result submissions",
    });
  }

  const report = await submitPlayerMatchReport({
    customEventId: eventId,
    reporterUserId: guestTomUserId || player?.playerId || "",
    roundNumber: payload.roundNumber,
    divisionCategory: payload.divisionCategory,
    tableNumber: payload.tableNumber,
    player1UserId: payload.player1UserId,
    player2UserId: payload.player2UserId,
    result: payload.result,
  });

  return {
    success: true,
    report: report.report,
    state: report.stateView,
  };
});
