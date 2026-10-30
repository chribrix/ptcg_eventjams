// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const { playerFindUnique, registrationFindFirst, optionalAuth, guestAccess, legacyPlayer } = vi.hoisted(() => ({
  playerFindUnique: vi.fn(),
  registrationFindFirst: vi.fn(),
  optionalAuth: vi.fn(),
  guestAccess: vi.fn(),
  legacyPlayer: vi.fn(),
}));

vi.mock("~/lib/prisma", () => ({ default: {
  player: { findUnique: playerFindUnique },
  eventRegistration: { findFirst: registrationFindFirst },
} }));
vi.mock("~/server/services/auth/authService", () => ({ resolveOptionalAuthUser: optionalAuth }));
vi.mock("~/server/services/events/tomGuestAccessService", () => ({ resolveTomGuestAccess: guestAccess }));
vi.mock("~/server/util/authenticatedPlayer", () => ({ resolveAuthenticatedPlayerFactory: () => legacyPlayer }));

import { matchesTomPlayerBirthDate, normalizeTomBirthDate, resolveTomPlayerIdentity } from "~/server/services/events/tomPlayerIdentity";

const players = [{ userId: "1234567", birthDate: "02/27/1996" }];

describe("TOM player identity", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    guestAccess.mockReturnValue(null);
    optionalAuth.mockResolvedValue(null);
    playerFindUnique.mockResolvedValue(null);
  });

  it("compares the complete calendar date, including TOM's US date format", () => {
    expect(normalizeTomBirthDate("02/27/1996")).toBe("1996-02-27");
    expect(matchesTomPlayerBirthDate(players[0], "1996-02-27")).toBe(true);
    expect(matchesTomPlayerBirthDate(players[0], "1996-02-28")).toBe(false);
    expect(normalizeTomBirthDate("02/30/1996")).toBeNull();
    expect(normalizeTomBirthDate("1996-02-30")).toBeNull();
  });

  it("accepts an event-scoped guest cookie without an account", async () => {
    guestAccess.mockReturnValue("1234567");
    expect(await resolveTomPlayerIdentity({} as any, "event-1", players)).toEqual({ tomUserId: "1234567", player: null });
    expect(optionalAuth).not.toHaveBeenCalled();
  });

  it("accepts a matching signed-in profile without requiring an event registration", async () => {
    optionalAuth.mockResolvedValue({ id: "auth-1" });
    const profile = { id: "profile-1", playerId: "1234567", birthYear: 1996, name: "Player", email: null, supabaseId: "auth-1" };
    playerFindUnique.mockResolvedValue(profile);
    expect(await resolveTomPlayerIdentity({} as any, "event-1", players)).toEqual({ tomUserId: "1234567", player: profile });
    expect(registrationFindFirst).not.toHaveBeenCalled();
    expect(legacyPlayer).not.toHaveBeenCalled();
  });

  it("does not auto-accept an account with a different birth year", async () => {
    optionalAuth.mockResolvedValue({ id: "auth-1" });
    playerFindUnique.mockResolvedValue({ id: "profile-1", playerId: "1234567", birthYear: 1995 });
    legacyPlayer.mockResolvedValue({ id: "profile-1", playerId: "1234567" });
    registrationFindFirst.mockResolvedValue(null);
    await expect(resolveTomPlayerIdentity({} as any, "event-1", players)).rejects.toMatchObject({ statusCode: 403 });
  });
});
