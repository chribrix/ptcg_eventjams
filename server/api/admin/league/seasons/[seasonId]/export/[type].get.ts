import { defineAdminRoute } from "~/server/services/admin/adminRoute";
import { getLeagueSeasonView } from "~/server/services/league/leagueService";

const csvCell = (value: unknown) => `"${String(value ?? "").replaceAll('"', '""')}"`;
const csv = (rows: unknown[][]) => rows.map((row) => row.map(csvCell).join(",")).join("\r\n");

export default defineAdminRoute(async ({ event }) => {
  const seasonId = getRouterParam(event, "seasonId");
  const type = getRouterParam(event, "type");
  if (!seasonId || !["leaderboard", "events", "matrix", "backup"].includes(type || "")) {
    throw createError({ statusCode: 404, statusMessage: "Export nicht gefunden" });
  }
  const view = await getLeagueSeasonView(seasonId);
  if (type === "backup") {
    setHeader(event, "Content-Type", "application/json; charset=utf-8");
    setHeader(event, "Content-Disposition", `attachment; filename="league-backup-${view.slug}.json"`);
    return JSON.stringify({ format: "chrispyjams-league-backup", version: 1, exportedAt: new Date().toISOString(), season: view }, null, 2);
  }
  let rows: unknown[][];
  if (type === "leaderboard") {
    rows = [
      ["Platz", "Spieler", "Pokémon-Spieler-ID", "Punkte", "Platzierungen 1-2", "Punkte-Teilnahmen", "Längste Serie"],
      ...view.standings.map((player) => [player.rank, player.displayName, player.pokemonPlayerId, player.points, player.topTwoFinishes, player.scoringParticipations, player.longestStreak]),
    ];
  } else if (type === "events") {
    rows = [
      ["Datum", "Event", "Teilnehmer", "Beitrag (Cent)", "Preispool (Cent)"],
      ...view.events.map((leagueEvent) => [leagueEvent.eventDate.toISOString().slice(0, 10), leagueEvent.name, leagueEvent.participantCount, leagueEvent.prizePoolContributionCents, leagueEvent.participantCount * leagueEvent.prizePoolContributionCents]),
    ];
  } else {
    rows = [
      ["Spieler", ...view.events.map((leagueEvent) => leagueEvent.eventDate.toISOString().slice(0, 10)), "Gesamtpunkte"],
      ...view.matrix.map((row) => [row.displayName, ...row.points, row.totalPoints]),
    ];
  }
  setHeader(event, "Content-Type", "text/csv; charset=utf-8");
  setHeader(event, "Content-Disposition", `attachment; filename="${type}-${view.slug}.csv"`);
  return `\uFEFF${csv(rows)}`;
});