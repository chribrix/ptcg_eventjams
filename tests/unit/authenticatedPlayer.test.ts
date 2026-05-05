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
  const logError = vi.fn().mockResolvedValue(undefined);
  vi.doMock("#supabase/server", () => ({
    serverSupabaseUser: vi.fn(),
  }));
  vi.doMock("~/server/util/errorLogger", () => ({
    logError,
  }));

  const mod = await import("../../server/util/authenticatedPlayer");

  return {
    ...mod,
    logError,
  };
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
    const resolveAuthenticatedIdentity = resolveAuthenticatedIdentityFactory(
      vi.fn().mockResolvedValue(null),
    );

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
    const { resolveAuthenticatedPlayerFactory, logError } =
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

    expect(logError).not.toHaveBeenCalled();
  });

  it("auto-provisions a supabase identity by re-linking existing player via email", async () => {
    const { resolveAuthenticatedPlayerFactory, logError } =
      await loadAuthenticatedPlayerModule();
    const prisma = {
      player: {
        findUnique: vi.fn().mockResolvedValue(null),
        findFirst: vi.fn().mockResolvedValue({
          id: "player-db-id",
          playerId: null,
          supabaseId: null,
          name: "Legacy Player",
          email: "missing@example.com",
        }),
        update: vi.fn().mockResolvedValue({
          id: "player-db-id",
          playerId: null,
          supabaseId: "supabase-user-1",
          name: "Legacy Player",
          email: "missing@example.com",
        }),
        create: vi.fn(),
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

    await expect(resolveAuthenticatedPlayer(createMockEvent())).resolves.toEqual({
      id: "player-db-id",
      playerId: null,
      supabaseId: "supabase-user-1",
      name: "Legacy Player",
      email: "missing@example.com",
    });

    expect(prisma.player.update).toHaveBeenCalledWith({
      where: { id: "player-db-id" },
      data: {
        supabaseId: "supabase-user-1",
        email: "missing@example.com",
      },
      select: expect.any(Object),
    });
    expect(logError).not.toHaveBeenCalled();
  });

  it("auto-creates a minimal player when no link and no email match exist", async () => {
    const { resolveAuthenticatedPlayerFactory, logError } =
      await loadAuthenticatedPlayerModule();
    const prisma = {
      player: {
        findUnique: vi.fn().mockResolvedValue(null),
        findFirst: vi.fn().mockResolvedValue(null),
        update: vi.fn(),
        create: vi.fn().mockResolvedValue({
          id: "created-player-id",
          playerId: null,
          supabaseId: "supabase-user-1",
          name: "missing",
          email: "missing@example.com",
        }),
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

    await expect(resolveAuthenticatedPlayer(createMockEvent())).resolves.toEqual({
      id: "created-player-id",
      playerId: null,
      supabaseId: "supabase-user-1",
      name: "missing",
      email: "missing@example.com",
    });

    expect(prisma.player.create).toHaveBeenCalledWith({
      data: {
        supabaseId: "supabase-user-1",
        email: "missing@example.com",
        name: "missing",
        playerId: null,
        birthDate: new Date("2000-01-01T00:00:00.000Z"),
      },
      select: expect.any(Object),
    });
    expect(logError).not.toHaveBeenCalled();
  });

  it("logs missing impersonated players with the impersonated playerId", async () => {
    const { resolveAuthenticatedPlayerFactory, logError } =
      await loadAuthenticatedPlayerModule();
    const prisma = {
      player: {
        findUnique: vi.fn().mockResolvedValue(null),
      },
    };

    const resolveAuthenticatedPlayer = resolveAuthenticatedPlayerFactory(
      prisma as any,
      vi.fn().mockResolvedValue({
        source: "impersonation",
        playerId: "PLAYER-404",
      }),
    );

    await expect(
      resolveAuthenticatedPlayer(createMockEvent(), { allowMissing: true }),
    ).resolves.toBeNull();

    expect(logError).toHaveBeenCalledWith(
      expect.any(Object),
      expect.any(Error),
      "auth_identity_missing_player_link",
      expect.objectContaining({
        identitySource: "impersonation",
        impersonatedPlayerId: "PLAYER-404",
      }),
    );
  });
});
