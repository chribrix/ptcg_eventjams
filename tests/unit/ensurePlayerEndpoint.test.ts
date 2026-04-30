// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

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
      req: { method: "POST", url: "/api/auth/ensure-player" },
      res: {},
    },
  }) as any;

describe("ensure-player endpoint", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("defineEventHandler", (handler: unknown) => handler);
    vi.stubGlobal("createError", createError);
  });

  it("provisions the authenticated player from auth metadata", async () => {
    vi.resetModules();
    vi.doMock("#supabase/server", () => ({
      serverSupabaseUser: vi.fn(),
    }));
    const { createEnsurePlayerHandler } = await import(
      "../../server/api/auth/ensure-player.post"
    );

    vi.stubGlobal(
      "readBody",
      vi.fn().mockResolvedValue({ preferredLoginMethod: "magiclink" }),
    );

    const provisionPlayer = vi.fn().mockResolvedValue({
      id: "player-1",
      playerId: "1001",
      email: "new@example.com",
    });

    const handler = createEnsurePlayerHandler({
      getRuntimeConfig: () =>
        ({
          public: { supabaseUrl: "https://example.supabase.co" },
          supabaseServiceKey: "service-key",
        }) as any,
      createPrismaClient: () => ({}) as any,
      createSupabaseAdminClient: () => ({ auth: { getUser: vi.fn() } }) as any,
      getServerSupabaseUser: vi.fn().mockResolvedValue({
        id: "auth-1",
        email: "new@example.com",
        user_metadata: {
          name: "New User",
          playerId: "1001",
        },
      }) as any,
      provisionPlayer: provisionPlayer as any,
    });

    await expect(handler(createEvent())).resolves.toEqual({
      success: true,
      player: {
        id: "player-1",
        playerId: "1001",
        email: "new@example.com",
      },
    });

    expect(provisionPlayer).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        supabaseId: "auth-1",
        email: "new@example.com",
        playerId: "1001",
        preferredLoginMethod: "magiclink",
      }),
    );
  });

  it("rejects provisioning when auth metadata is missing", async () => {
    vi.resetModules();
    vi.doMock("#supabase/server", () => ({
      serverSupabaseUser: vi.fn(),
    }));
    const { createEnsurePlayerHandler } = await import(
      "../../server/api/auth/ensure-player.post"
    );

    vi.stubGlobal("readBody", vi.fn().mockResolvedValue({}));

    const handler = createEnsurePlayerHandler({
      getRuntimeConfig: () =>
        ({
          public: { supabaseUrl: "https://example.supabase.co" },
          supabaseServiceKey: "service-key",
        }) as any,
      createPrismaClient: () => ({}) as any,
      createSupabaseAdminClient: () => ({ auth: { getUser: vi.fn() } }) as any,
      getServerSupabaseUser: vi.fn().mockResolvedValue({
        id: "auth-1",
        email: "new@example.com",
        user_metadata: {},
      }) as any,
      provisionPlayer: vi.fn() as any,
    });

    await expect(handler(createEvent())).rejects.toMatchObject({
      statusCode: 400,
      statusMessage: "No registration metadata available for player provisioning",
    });
  });
});