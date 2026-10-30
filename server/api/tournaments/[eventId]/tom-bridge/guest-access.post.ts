import { z } from "zod";
import { assertTomGuestAccessAttemptsAvailable, clearTomGuestAccessFailures, grantTomGuestAccess, recordTomGuestAccessFailure } from "~/server/services/events/tomGuestAccessService";
import { matchesTomPlayerBirthDate, normalizeTomBirthDate } from "~/server/services/events/tomPlayerIdentity";
import { getTournamentTomState, recordTournamentPlayerAccess } from "~/server/services/events/tournamentTomStateService";

const accessSchema = z.object({
  playerId: z.string().trim().regex(/^\d{4,12}$/),
  birthDate: z.string().trim().refine((value) => {
    const date = normalizeTomBirthDate(value);
    return date !== null && date <= new Date().toISOString().slice(0, 10);
  }),
});

const accessDeniedMessage =
  "Deine Spieler-ID und dein Geburtsdatum konnten für dieses Turnier nicht gefunden werden. Bitte melde dich beim Veranstalter.";

export default defineEventHandler(async (event) => {
  const eventId = getRouterParam(event, "eventId");
  if (!eventId) throw createError({ statusCode: 400, statusMessage: "Event ID is required" });

  const parsedInput = accessSchema.safeParse(await readBody(event));
  if (!parsedInput.success) {
    throw createError({ statusCode: 401, statusMessage: accessDeniedMessage });
  }
  const input = parsedInput.data;
  const attemptKey = assertTomGuestAccessAttemptsAvailable(event, eventId, input.playerId);
  const state = await getTournamentTomState(eventId);
  if (!state) throw createError({ statusCode: 404, statusMessage: "No TOM state imported for this tournament" });
  if (!(state.record.metadata as { tournamentReleasedAt?: string } | null)?.tournamentReleasedAt) {
    throw createError({ statusCode: 403, statusMessage: "Die Turnieransicht wurde noch nicht freigegeben." });
  }

  const tomPlayer = state.stateView.players.find(
    (player) => player.userId === input.playerId && matchesTomPlayerBirthDate(player, input.birthDate),
  );
  if (!tomPlayer) {
    recordTomGuestAccessFailure(attemptKey);
    throw createError({ statusCode: 401, statusMessage: accessDeniedMessage });
  }

  clearTomGuestAccessFailures(attemptKey);
  grantTomGuestAccess(event, eventId, tomPlayer.userId);
  await recordTournamentPlayerAccess(eventId, tomPlayer.userId);
  return { success: true, player: { userId: tomPlayer.userId, displayName: tomPlayer.displayName } };
});
