import { z } from "zod";
import { grantTomGuestAccess } from "~/server/services/events/tomGuestAccessService";
import { getTournamentTomState, recordTournamentPlayerAccess } from "~/server/services/events/tournamentTomStateService";

const accessSchema = z.object({
  playerId: z.string().trim().regex(/^\d{4,12}$/),
  birthYear: z.coerce.number().int().min(1900).max(new Date().getFullYear()),
});

const getBirthYear = (birthDate?: string) => {
  const year = birthDate?.match(/(?:^|\/)((?:19|20)\d{2})$/)?.[1] || birthDate?.match(/^(?:19|20)\d{2}/)?.[0];
  return year ? Number.parseInt(year, 10) : null;
};

export default defineEventHandler(async (event) => {
  const eventId = getRouterParam(event, "eventId");
  if (!eventId) throw createError({ statusCode: 400, statusMessage: "Event ID is required" });

  const input = accessSchema.parse(await readBody(event));
  const state = await getTournamentTomState(eventId);
  if (!state) throw createError({ statusCode: 404, statusMessage: "No TOM state imported for this tournament" });
  if (!(state.record.metadata as { tournamentReleasedAt?: string } | null)?.tournamentReleasedAt) {
    throw createError({ statusCode: 403, statusMessage: "Die Turnieransicht wurde noch nicht freigegeben." });
  }

  const tomPlayer = state.stateView.players.find(
    (player) => player.userId === input.playerId && getBirthYear(player.birthDate) === input.birthYear,
  );
  if (!tomPlayer) {
    throw createError({ statusCode: 401, statusMessage: "Spieler-ID oder Geburtsjahr stimmen nicht mit diesem Turnier überein." });
  }

  grantTomGuestAccess(event, eventId, tomPlayer.userId);
  await recordTournamentPlayerAccess(eventId, tomPlayer.userId);
  return { success: true, player: { userId: tomPlayer.userId, displayName: tomPlayer.displayName } };
});
