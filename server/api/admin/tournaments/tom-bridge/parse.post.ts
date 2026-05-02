import { defineAdminRoute } from "~/server/services/admin/adminRoute";
import { getCurrentRound, parseTomTdf, tomOutcomeLabel } from "~/server/services/events/tomTdfService";

export default defineAdminRoute(async ({ event }) => {
  const body = await readBody<{ xml?: string }>(event);

  if (!body?.xml) {
    throw createError({
      statusCode: 400,
      statusMessage: "Missing xml payload",
    });
  }

  const snapshot = parseTomTdf(body.xml);
  const currentRound = getCurrentRound(snapshot);

  return {
    tournament: {
      name: snapshot.name,
      city: snapshot.city,
      country: snapshot.country,
      stage: snapshot.stage,
      gameType: snapshot.gameType,
      mode: snapshot.mode,
      startDate: snapshot.startDate,
    },
    playerCount: snapshot.players.length,
    rounds: snapshot.rounds.map((round) => ({
      number: round.number,
      stage: round.stage,
      type: round.type,
      matchCount: round.matches.length,
    })),
    currentRound: currentRound
      ? {
          number: currentRound.number,
          stage: currentRound.stage,
          matches: currentRound.matches.map((match) => ({
            tableNumber: match.tableNumber,
            player1UserId: match.player1UserId,
            player2UserId: match.player2UserId,
            outcome: match.outcome,
            outcomeLabel: tomOutcomeLabel(match.outcome),
          })),
        }
      : null,
  };
});
