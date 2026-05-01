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
      req: { method: "POST", url: "/api/players/check" },
      res: {},
    },
  }) as any;

describe("players/check endpoint", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    vi.stubGlobal("defineEventHandler", (handler: unknown) => handler);
    vi.stubGlobal("createError", createError);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("does not auto-link a player row by email when an auth user exists without a player link", async () => {
    vi.doMock("~/server/util/errorLogger", () => ({
      logValidationError: vi.fn().mockResolvedValue(undefined),
      logDatabaseError: vi.fn().mockResolvedValue(undefined),
    }));
    vi.stubGlobal(
      "readBody",
      vi.fn().mockResolvedValue({ email: "user@example.com" }),
    );

    const mockPrisma = {
      player: {
        findUnique: vi.fn().mockResolvedValue(null),
      },
      $queryRaw: vi.fn(),
      $disconnect: vi.fn().mockResolvedValue(undefined),
    };

    const { createCheckPlayerHandler } =
      await import("../../server/api/players/check.post");
    const handler = createCheckPlayerHandler({
      createPrismaClient: () => mockPrisma as any,
      createSupabaseAdminClient: () => ({
        auth: { admin: {} },
      }),
      getRuntimeConfig: () =>
        ({
          public: { supabaseUrl: "https://example.supabase.co" },
          supabaseServiceKey: "service-role-key",
        }) as any,
      fetchImpl: vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          users: [{ id: "auth-1", email: "user@example.com" }],
        }),
      }) as any,
    });

    await expect(handler(createEvent())).resolves.toEqual({
      exists: true,
      authExists: true,
      player: null,
      authOnly: true,
      legacyPlayerOnly: false,
    });
  });

  it("reports legacy player rows without treating them as authenticated accounts", async () => {
    vi.doMock("~/server/util/errorLogger", () => ({
      logValidationError: vi.fn().mockResolvedValue(undefined),
      logDatabaseError: vi.fn().mockResolvedValue(undefined),
    }));
    vi.stubGlobal(
      "readBody",
      vi.fn().mockResolvedValue({ email: "legacy@example.com" }),
    );
    const mockPrisma = {
      player: {
        findUnique: vi.fn().mockResolvedValue({
          id: "player-1",
          playerId: "198193",
          name: "Chris",
          email: "legacy@example.com",
        }),
      },
      $queryRaw: vi.fn(),
      $disconnect: vi.fn().mockResolvedValue(undefined),
    };

    const { createCheckPlayerHandler } =
      await import("../../server/api/players/check.post");
    const handler = createCheckPlayerHandler({
      createPrismaClient: () => mockPrisma as any,
      createSupabaseAdminClient: () => ({
        auth: { admin: {} },
      }),
      getRuntimeConfig: () =>
        ({
          public: { supabaseUrl: "https://example.supabase.co" },
          supabaseServiceKey: "service-role-key",
        }) as any,
      fetchImpl: vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ users: [] }),
      }) as any,
    });

    await expect(handler(createEvent())).resolves.toEqual({
      exists: false,
      authExists: false,
      player: null,
      authOnly: false,
      legacyPlayerOnly: true,
    });
  });
});
