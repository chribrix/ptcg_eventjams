import { ensureTournamentEnrollmentCode, getTournamentTomState } from "~/server/services/events/tournamentTomStateService";

export default defineEventHandler(async (event) => {
  const eventId = getRouterParam(event, "eventId");
  if (!eventId) throw createError({ statusCode: 400, statusMessage: "Event ID is required" });

  const state = await getTournamentTomState(eventId);
  if (!state) throw createError({ statusCode: 404, statusMessage: "Für dieses Turnier wurde noch keine TOM-Datei importiert." });

  const enrollmentCode = await ensureTournamentEnrollmentCode(eventId);
  return {
    success: true,
    tournament: {
      name: state.stateView.tournament.name || "Pokémon Turnier",
      startDate: state.stateView.tournament.startDate || null,
      enrollmentCode,
    },
  };
});
