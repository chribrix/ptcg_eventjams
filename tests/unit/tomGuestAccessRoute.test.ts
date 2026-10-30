// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const { getState, grantAccess, recordAccess, checkAttempts, recordFailure, clearFailures } = vi.hoisted(() => ({
  getState: vi.fn(),
  grantAccess: vi.fn(),
  recordAccess: vi.fn(),
  checkAttempts: vi.fn(() => "attempt-key"),
  recordFailure: vi.fn(),
  clearFailures: vi.fn(),
}));

vi.mock("~/server/services/events/tournamentTomStateService", () => ({
  getTournamentTomState: getState,
  recordTournamentPlayerAccess: recordAccess,
}));
vi.mock("~/server/services/events/tomGuestAccessService", () => ({
  grantTomGuestAccess: grantAccess,
  assertTomGuestAccessAttemptsAvailable: checkAttempts,
  recordTomGuestAccessFailure: recordFailure,
  clearTomGuestAccessFailures: clearFailures,
}));
vi.mock("~/server/services/auth/authService", () => ({ resolveOptionalAuthUser: vi.fn() }));
vi.mock("~/lib/prisma", () => ({ default: {} }));
vi.mock("~/server/util/authenticatedPlayer", () => ({ resolveAuthenticatedPlayerFactory: () => vi.fn() }));

vi.stubGlobal("defineEventHandler", (handler: unknown) => handler);
const { default: handler } = await import("~/server/api/tournaments/[eventId]/tom-bridge/guest-access.post");

const event = { context: { params: { eventId: "event-1" } }, node: { req: { method: "POST" } } } as any;

describe("public TOM guest access", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getState.mockResolvedValue({
      record: { metadata: { tournamentReleasedAt: "2026-10-30T00:00:00Z" } },
      stateView: { players: [{ userId: "1234567", birthDate: "02/27/1996", displayName: "Player" }] },
    });
  });

  it("grants an account-free cookie for the matching birth year", async () => {
    vi.stubGlobal("getRouterParam", vi.fn(() => "event-1"));
    vi.stubGlobal("readBody", vi.fn().mockResolvedValue({ playerId: "1234567", birthYear: 1996 }));
    const result = await handler(event);
    expect(result).toMatchObject({ success: true, player: { userId: "1234567" } });
    expect(grantAccess).toHaveBeenCalledWith(event, "event-1", "1234567");
    expect(clearFailures).toHaveBeenCalledWith("attempt-key");
    expect(recordAccess).toHaveBeenCalledWith("event-1", "1234567");
  });

  it("rejects a wrong birth year without granting access", async () => {
    vi.stubGlobal("getRouterParam", vi.fn(() => "event-1"));
    vi.stubGlobal("readBody", vi.fn().mockResolvedValue({ playerId: "1234567", birthYear: 1995 }));
    await expect(handler(event)).rejects.toMatchObject({ statusCode: 401 });
    expect(grantAccess).not.toHaveBeenCalled();
    expect(recordFailure).toHaveBeenCalledWith("attempt-key");
  });

  it("accepts the previous full-date request from an already-open tab", async () => {
    vi.stubGlobal("getRouterParam", vi.fn(() => "event-1"));
    vi.stubGlobal("readBody", vi.fn().mockResolvedValue({ playerId: "1234567", birthDate: "1996-02-27" }));
    await expect(handler(event)).resolves.toMatchObject({ success: true });
    expect(grantAccess).toHaveBeenCalledWith(event, "event-1", "1234567");
  });

  it("keeps unreleased tournaments inaccessible", async () => {
    getState.mockResolvedValue({ record: { metadata: {} }, stateView: { players: [] } });
    vi.stubGlobal("getRouterParam", vi.fn(() => "event-1"));
    vi.stubGlobal("readBody", vi.fn().mockResolvedValue({ playerId: "1234567", birthYear: 1996 }));
    await expect(handler(event)).rejects.toMatchObject({ statusCode: 403 });
    expect(grantAccess).not.toHaveBeenCalled();
  });
});
