// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

const createMockEvent = (overrides: Record<string, unknown> = {}) =>
  ({
    context: {},
    node: {
      req: {},
      res: {},
    },
    ...overrides,
  }) as any;

const loadAuthenticatedPlayerModule = async () => {
  vi.resetModules();
  vi.doMock("#supabase/server", () => ({
    serverSupabaseUser: vi.fn(),
  }));

  return import("../../server/util/authenticatedPlayer");
};

describe("authenticatedPlayer utility", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("resolves the authenticated Supabase identity without using email as the join key", async () => {
    const { resolveAuthenticatedIdentityFactory } =
      await loadAuthenticatedPlayerModule();
    const getSupabaseUser = vi.fn().mockResolvedValue({
      id: "supabase-user-1",
      email: "changed@example.com",
    });

    const resolveAuthenticatedIdentity =
      resolveAuthenticatedIdentityFactory(getSupabaseUser);

    await expect(
      resolveAuthenticatedIdentity(createMockEvent()),
    ).resolves.toEqual({
      source: "supabase",
      supabaseUserId: "supabase-user-1",
      email: "changed@example.com",
    });
  });

  it("prefers impersonation identity and skips Supabase auth when impersonating", async () => {
    const { resolveAuthenticatedIdentityFactory } =
      await loadAuthenticatedPlayerModule();
    const getSupabaseUser = vi.fn();
    const resolveAuthenticatedIdentity =
      resolveAuthenticatedIdentityFactory(getSupabaseUser);

    await expect(
      resolveAuthenticatedIdentity(
        createMockEvent({
          context: {
            impersonatedUserId: "PLAYER-123",
          },
        }),
      ),
    ).resolves.toEqual({
      source: "impersonation",
      playerId: "PLAYER-123",
    });

    expect(getSupabaseUser).not.toHaveBeenCalled();
  });

  it("throws unauthorized when there is no authenticated identity", async () => {
    const { resolveAuthenticatedIdentityFactory } =
      await loadAuthenticatedPlayerModule();
    const resolveAuthenticatedIdentity =
      resolveAuthenticatedIdentityFactory(vi.fn().mockResolvedValue(null));

    await expect(
      resolveAuthenticatedIdentity(createMockEvent()),
    ).rejects.toMatchObject({
      statusCode: 401,
      statusMessage: "Unauthorized",
    });
  });

  it("looks up impersonated players by playerId", async () => {
    const { findPlayerForAuthenticatedIdentity, playerIdentitySelect } =
      await loadAuthenticatedPlayerModule();
    const prisma = {
      player: {
        findUnique: vi.fn().mockResolvedValue({
          id: "player-db-id",
          playerId: "PLAYER-123",
          supabaseId: "supabase-user-1",
          name: "Test Player",
          email: "player@example.com",
        }),
      },
    };

    await findPlayerForAuthenticatedIdentity(prisma as any, {
      source: "impersonation",
      playerId: "PLAYER-123",
    });

    expect(prisma.player.findUnique).toHaveBeenCalledWith({
      where: { playerId: "PLAYER-123" },
      select: playerIdentitySelect,
    });
  });

  it("looks up authenticated players by supabaseId", async () => {
    const { findPlayerForAuthenticatedIdentity, playerIdentitySelect } =
      await loadAuthenticatedPlayerModule();
    const prisma = {
      player: {
        findUnique: vi.fn().mockResolvedValue({
          id: "player-db-id",
          playerId: "PLAYER-123",
          supabaseId: "supabase-user-1",
          name: "Test Player",
          email: "player@example.com",
        }),
      },
    };

    await findPlayerForAuthenticatedIdentity(prisma as any, {
      source: "supabase",
      supabaseUserId: "supabase-user-1",
      email: "changed@example.com",
    });

    expect(prisma.player.findUnique).toHaveBeenCalledWith({
      where: { supabaseId: "supabase-user-1" },
      select: playerIdentitySelect,
    });
  });

  it("allows endpoints to opt into a missing-player result", async () => {
    const { resolveAuthenticatedPlayerFactory } =
      await loadAuthenticatedPlayerModule();
    const prisma = {
      player: {
        findUnique: vi.fn().mockResolvedValue(null),
      },
    };

    const resolveAuthenticatedPlayer = resolveAuthenticatedPlayerFactory(
      prisma as any,
      vi.fn().mockResolvedValue({
        source: "supabase",
        supabaseUserId: "supabase-user-1",
        email: "missing@example.com",
      }),
    );

    await expect(
      resolveAuthenticatedPlayer(createMockEvent(), { allowMissing: true }),
    ).resolves.toBeNull();
  });

  it("throws a player-not-found error when a strict lookup has no linked player", async () => {
    const { resolveAuthenticatedPlayerFactory } =
      await loadAuthenticatedPlayerModule();
    const prisma = {
      player: {
        findUnique: vi.fn().mockResolvedValue(null),
      },
    };

    const resolveAuthenticatedPlayer = resolveAuthenticatedPlayerFactory(
      prisma as any,
      vi.fn().mockResolvedValue({
        source: "supabase",
        supabaseUserId: "supabase-user-1",
        email: "missing@example.com",
      }),
    );

    await expect(
      resolveAuthenticatedPlayer(createMockEvent()),
    ).rejects.toMatchObject({
      statusCode: 404,
      statusMessage: "Player not found",
    });
  });
});