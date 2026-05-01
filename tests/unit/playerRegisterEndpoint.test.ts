// @vitest-environment node

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const createError = (error: { statusCode: number; statusMessage: string }) => {
  const err = new Error(error.statusMessage) as Error & {
    statusCode: number;
    statusMessage: string;
  };
  err.statusCode = error.statusCode;
  err.statusMessage = error.statusMessage;
  return err;
};

const createEvent = () =>
  ({
    context: {},
    node: {
      req: { method: "POST", url: "/api/players/register" },
      res: {},
    },
  }) as any;

describe("players/register endpoint", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    vi.stubGlobal("defineEventHandler", (handler: unknown) => handler);
    vi.stubGlobal("createError", createError);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("provisions a player for the authenticated user and ignores legacy identity fields", async () => {
    const provisionPlayer = vi.fn().mockResolvedValue({
      id: "player-1",
      playerId: "198193",
      name: "Chris",
      email: "real@example.com",
    });

    vi.doMock("@prisma/client", () => ({
      PrismaClient: vi.fn(() => ({
        $disconnect: vi.fn().mockResolvedValue(undefined),
      })),
    }));
    vi.doMock("#supabase/server", () => ({
      serverSupabaseUser: vi.fn().mockResolvedValue({
        id: "auth-user-1",
        email: "real@example.com",
      }),
    }));
    vi.doMock("~/server/util/errorLogger", () => ({
      logValidationError: vi.fn().mockResolvedValue(undefined),
      logDatabaseError: vi.fn().mockResolvedValue(undefined),
    }));
    vi.doMock("~/server/util/playerProvisioning", () => ({
      ensurePlayerForAuthUser: provisionPlayer,
    }));

    vi.stubGlobal(
      "readBody",
      vi.fn().mockResolvedValue({
        playerId: "198193",
        name: "Chris",
        email: "forged@example.com",
        supabaseId: "forged-auth-id",
        userId: "legacy-user-id",
      }),
    );

    const handler = (await import("../../server/api/players/register.post"))
      .default;

    await expect(handler(createEvent())).resolves.toEqual({
      success: true,
      player: {
        id: "player-1",
        playerId: "198193",
        name: "Chris",
        email: "real@example.com",
      },
    });

    expect(provisionPlayer).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        supabaseId: "auth-user-1",
        email: "real@example.com",
        playerId: "198193",
        name: "Chris",
      }),
    );
  });

  it("rejects unauthenticated requests", async () => {
    vi.doMock("@prisma/client", () => ({
      PrismaClient: vi.fn(() => ({
        $disconnect: vi.fn().mockResolvedValue(undefined),
      })),
    }));
    vi.doMock("#supabase/server", () => ({
      serverSupabaseUser: vi.fn().mockResolvedValue(null),
    }));
    vi.doMock("~/server/util/errorLogger", () => ({
      logValidationError: vi.fn().mockResolvedValue(undefined),
      logDatabaseError: vi.fn().mockResolvedValue(undefined),
    }));
    vi.doMock("~/server/util/playerProvisioning", () => ({
      ensurePlayerForAuthUser: vi.fn(),
    }));
    vi.stubGlobal("readBody", vi.fn().mockResolvedValue({}));

    const handler = (await import("../../server/api/players/register.post"))
      .default;

    await expect(handler(createEvent())).rejects.toMatchObject({
      statusCode: 401,
      statusMessage: "Unauthorized",
    });
  });
});
