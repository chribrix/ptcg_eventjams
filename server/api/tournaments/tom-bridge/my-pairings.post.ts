import { PrismaClient } from "@prisma/client";
import { getPlayerPairings, parseTomTdf, tomOutcomeLabel } from "~/server/services/events/tomTdfService";
import { resolveAuthenticatedPlayerFactory } from "~/server/util/authenticatedPlayer";

const prisma = new PrismaClient();
const resolveAuthenticatedPlayer = resolveAuthenticatedPlayerFactory(prisma);

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody<{ xml?: string; tomUserId?: string }>(event);

    if (!body?.xml) {
      throw createError({
        statusCode: 400,
        statusMessage: "Missing xml payload",
      });
    }

    const player = await resolveAuthenticatedPlayer(event);
    const snapshot = parseTomTdf(body.xml);

    const tomUserId = body.tomUserId || player.playerId;
    const pairingState = getPlayerPairings(snapshot, tomUserId);

    return {
      player: {
        name: player.name,
        playerId: player.playerId,
        tomUserId,
      },
      tournament: {
        name: snapshot.name,
        city: snapshot.city,
      },
      currentRound: pairingState.currentRound,
      matches: pairingState.matches.map((match) => ({
        tableNumber: match.tableNumber,
        player1UserId: match.player1UserId,
        player2UserId: match.player2UserId,
        outcome: match.outcome,
        outcomeLabel: tomOutcomeLabel(match.outcome),
      })),
    };
  } finally {
    await prisma.$disconnect();
  }
});
