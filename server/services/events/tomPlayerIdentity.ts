import type { H3Event } from "h3";
import prisma from "~/lib/prisma";
import { resolveOptionalAuthUser } from "~/server/services/auth/authService";
import { resolveTomGuestAccess } from "~/server/services/events/tomGuestAccessService";
import { resolveAuthenticatedPlayerFactory, type AuthenticatedPlayer } from "~/server/util/authenticatedPlayer";

type TomPlayer = { userId: string; birthDate?: string };

// TOM exports MM/DD/YYYY; the browser submits an ISO date from <input type="date">.
export const normalizeTomBirthDate = (value?: string | null): string | null => {
  if (!value) return null;
  const iso = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const tom = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  const [year, month, day] = iso
    ? [Number(iso[1]), Number(iso[2]), Number(iso[3])]
    : tom ? [Number(tom[3]), Number(tom[1]), Number(tom[2])] : [];
  if (!year || !month || !day || year < 1900) return null;
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() + 1 !== month || date.getUTCDate() !== day) return null;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
};

export const matchesTomPlayerBirthDate = (player: TomPlayer, birthDate: string): boolean => {
  const expected = normalizeTomBirthDate(player.birthDate);
  return expected !== null && expected === normalizeTomBirthDate(birthDate);
};

export const matchesTomPlayerBirthYear = (player: TomPlayer, birthYear: number): boolean => {
  const expected = normalizeTomBirthDate(player.birthDate);
  return expected !== null && Number(expected.slice(0, 4)) === birthYear;
};

const resolveAuthenticatedPlayer = resolveAuthenticatedPlayerFactory(prisma);

/** Resolve an event-scoped TOM identity without creating an account for QR guests. */
export const resolveTomPlayerIdentity = async (
  event: H3Event,
  eventId: string,
  players: TomPlayer[],
): Promise<{ tomUserId: string; player: AuthenticatedPlayer | null }> => {
  const guestTomUserId = resolveTomGuestAccess(event, eventId);
  if (guestTomUserId && players.some((player) => player.userId === guestTomUserId)) {
    return { tomUserId: guestTomUserId, player: null };
  }

  const authUser = await resolveOptionalAuthUser(event);
  if (!authUser) throw createError({ statusCode: 401, statusMessage: "Turnierzugang erforderlich" });
  const profile = await prisma.player.findUnique({
    where: { supabaseId: authUser.id },
    select: { id: true, playerId: true, supabaseId: true, name: true, email: true, birthYear: true },
  });
  const tomPlayer = players.find((entry) => entry.userId === profile?.playerId);
  if (profile && tomPlayer && matchesTomPlayerBirthYear(tomPlayer, profile.birthYear)) {
    return { tomUserId: tomPlayer.userId, player: profile };
  }

  // Preserve the existing account-and-registration path for older tournament links.
  const player = await resolveAuthenticatedPlayer(event);
  const registration = await prisma.eventRegistration.findFirst({
    where: { customEventId: eventId, playerId: player!.id },
    select: { id: true },
  });
  if (!registration) throw createError({ statusCode: 403, statusMessage: "You are not registered for this tournament" });
  if (!player?.playerId || !players.some((entry) => entry.userId === player.playerId)) {
    throw createError({ statusCode: 403, statusMessage: "No Pokémon Player ID is linked to this tournament" });
  }
  return { tomUserId: player.playerId, player };
};
