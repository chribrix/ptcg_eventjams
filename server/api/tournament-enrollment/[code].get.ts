import { getTournamentTomStateByEnrollmentCode } from "~/server/services/events/tournamentTomStateService";

export default defineEventHandler(async (event) => {
  const code = getRouterParam(event, "code");
  if (!code) throw createError({ statusCode: 400, statusMessage: "Enrollment-Code fehlt." });

  const tournament = await getTournamentTomStateByEnrollmentCode(code);
  if (!tournament) throw createError({ statusCode: 404, statusMessage: "Dieser Turnierzugang wurde nicht gefunden." });

  return {
    success: true,
    eventId: tournament.record.customEventId,
    tournament: { name: tournament.stateView.tournament.name || "Pokémon Turnier" },
  };
});
