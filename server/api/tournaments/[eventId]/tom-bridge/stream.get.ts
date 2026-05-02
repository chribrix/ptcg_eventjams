import prisma from "~/lib/prisma";
import { getTournamentTomState } from "~/server/services/events/tournamentTomStateService";
import { resolveAuthenticatedPlayerFactory } from "~/server/util/authenticatedPlayer";

const resolveAuthenticatedPlayer = resolveAuthenticatedPlayerFactory(prisma);

export default defineEventHandler(async (event) => {
  const eventId = getRouterParam(event, "eventId");
  if (!eventId) {
    throw createError({ statusCode: 400, statusMessage: "Event ID is required" });
  }

  const player = await resolveAuthenticatedPlayer(event);
  const registration = await prisma.eventRegistration.findFirst({
    where: {
      customEventId: eventId,
      playerId: player.id,
    },
    select: { id: true },
  });

  if (!registration) {
    throw createError({
      statusCode: 403,
      statusMessage: "You are not registered for this tournament",
    });
  }

  setHeader(event, "Content-Type", "text/event-stream");
  setHeader(event, "Cache-Control", "no-cache");
  setHeader(event, "Connection", "keep-alive");

  const res = event.node.res;
  let lastUpdatedAt = "";

  const writeUpdate = async () => {
    const state = await getTournamentTomState(eventId);
    const current = state?.record.updatedAt?.toISOString() || "";
    if (current && current !== lastUpdatedAt) {
      lastUpdatedAt = current;
      res.write(`data: ${JSON.stringify({ updatedAt: current })}\n\n`);
    } else {
      res.write(`data: ${JSON.stringify({ heartbeat: Date.now() })}\n\n`);
    }
  };

  const timer = setInterval(writeUpdate, 5000);
  await writeUpdate();

  event.node.req.on("close", () => {
    clearInterval(timer);
    try {
      res.end();
    } catch {
      // ignore close errors
    }
  });
});
