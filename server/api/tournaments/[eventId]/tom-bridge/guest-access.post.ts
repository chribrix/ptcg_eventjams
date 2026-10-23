import { z } from "zod";
import { grantTomGuestAccess } from "~/server/services/events/tomGuestAccessService";
import { getTournamentTomState, recordTournamentPlayerAccess } from "~/server/services/events/tournamentTomStateService";

const accessSchema = z.object({
  playerId: z.string().trim().regex(/^\d{4,12}$/),
  birthYear: z.coerce.number().int().min(1900).max(new Date().getFullYear()),
});

const accessDeniedMessage =
  "Deine Spieler-ID und dein Geburtsjahr konnten für dieses Turnier nicht gefunden werden. Bitte melde dich beim Veranstalter.";

const getBirthYear = (birthDate?: string) => {
  const year = birthDate?.match(/(?:^|\/)((?:19|20)\d{2})$/)?.[1] || birthDate?.match(/^(?:19|20)\d{2}/)?.[0];
  return year ? Number.parseInt(year, 10) : null;
};

export default defineEventHandler(async (event) => {
  const eventId = getRouterParam(event, "eventId");
  if (!eventId) throw createError({ statusCode: 400, statusMessage: "Event ID is required" });

  const parsedInput = accessSchema.safeParse(await readBody(event));
  if (!parsedInput.success) {
    throw createError({ statusCode: 401, statusMessage: accessDeniedMessage });
  }
  const input = parsedInput.data;
  const state = await getTournamentTomState(eventId);
  if (!state) throw createError({ statusCode: 404, statusMessage: "No TOM state imported for this tournament" });
  if (!(state.record.metadata as { tournamentReleasedAt?: string } | null)?.tournamentReleasedAt) {
    throw createError({ statusCode: 403, statusMessage: "Die Turnieransicht wurde noch nicht freigegeben." });
  }

  const tomPlayer = state.stateView.players.find(
    (player) => player.userId === input.playerId && getBirthYear(player.birthDate) === input.birthYear,
  );
  if (!tomPlayer) {
    throw createError({ statusCode: 401, statusMessage: accessDeniedMessage });
  }

  grantTomGuestAccess(event, eventId, tomPlayer.userId);
  await recordTournamentPlayerAccess(eventId, tomPlayer.userId);
  return { success: true, player: { userId: tomPlayer.userId, displayName: tomPlayer.displayName } };
});
