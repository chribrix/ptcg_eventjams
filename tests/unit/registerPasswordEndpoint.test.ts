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
      req: { method: "POST", url: "/api/auth/register-password" },
      res: {},
    },
  }) as any;

describe("register-password endpoint", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("provisions the player synchronously after creating the auth user", async () => {
    vi.stubGlobal("defineEventHandler", (handler: unknown) => handler);
    vi.stubGlobal("createError", createError);
    vi.stubGlobal(
      "readBody",
      vi.fn().mockResolvedValue({
        email: "new@example.com",
        password: "password123",
        name: "New User",
        playerId: "1001",
      }),
    );

    const ensurePlayerForAuthUser = vi
      .fn()
      .mockResolvedValue({ id: "player-1" });
    const deleteUser = vi.fn().mockResolvedValue({ error: null });
    const createUser = vi.fn().mockResolvedValue({
      data: { user: { id: "auth-1" } },
      error: null,
    });

    const { createRegisterPasswordHandler } =
      await import("../../server/api/auth/register-password.post");

    const handler = createRegisterPasswordHandler({
      getRuntimeConfig: () =>
        ({
          public: { supabaseUrl: "https://example.supabase.co" },
          supabaseServiceKey: "service-key",
          passwordPepper: "pepper",
        }) as any,
      createPrismaClient: () =>
        ({
          $disconnect: vi.fn().mockResolvedValue(undefined),
        }) as any,
      createSupabaseAdminClient: () => ({
        auth: {
          admin: {
            createUser,
            deleteUser,
          },
        },
      }),
      provisionPlayer: ensurePlayerForAuthUser as any,
    });
    const result = await handler(createEvent());

    expect(createUser).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "new@example.com",
        email_confirm: true,
      }),
    );
    expect(ensurePlayerForAuthUser).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        supabaseId: "auth-1",
        email: "new@example.com",
        playerId: "1001",
        preferredLoginMethod: "password",
      }),
    );
    expect(deleteUser).not.toHaveBeenCalled();
    expect(result).toEqual({
      success: true,
      requiresEmailConfirmation: false,
    });
  });

  it("deletes the auth user again if local player provisioning fails", async () => {
    vi.stubGlobal("defineEventHandler", (handler: unknown) => handler);
    vi.stubGlobal("createError", createError);
    vi.stubGlobal(
      "readBody",
      vi.fn().mockResolvedValue({
        email: "new@example.com",
        password: "password123",
        name: "New User",
        playerId: "1001",
      }),
    );

    const provisioningError = createError({
      statusCode: 409,
      statusMessage: "Player ID already exists",
    });
    const ensurePlayerForAuthUser = vi
      .fn()
      .mockRejectedValue(provisioningError);
    const deleteUser = vi.fn().mockResolvedValue({ error: null });
    const createUser = vi.fn().mockResolvedValue({
      data: { user: { id: "auth-1" } },
      error: null,
    });

    const { createRegisterPasswordHandler } =
      await import("../../server/api/auth/register-password.post");

    const handler = createRegisterPasswordHandler({
      getRuntimeConfig: () =>
        ({
          public: { supabaseUrl: "https://example.supabase.co" },
          supabaseServiceKey: "service-key",
          passwordPepper: "pepper",
        }) as any,
      createPrismaClient: () =>
        ({
          $disconnect: vi.fn().mockResolvedValue(undefined),
        }) as any,
      createSupabaseAdminClient: () => ({
        auth: {
          admin: {
            createUser,
            deleteUser,
          },
        },
      }),
      provisionPlayer: ensurePlayerForAuthUser as any,
    });

    await expect(handler(createEvent())).rejects.toMatchObject({
      statusCode: 409,
      statusMessage: "Player ID already exists",
    });

    expect(deleteUser).toHaveBeenCalledWith("auth-1");
  });

  it("allows registration without playerId", async () => {
    vi.stubGlobal("defineEventHandler", (handler: unknown) => handler);
    vi.stubGlobal("createError", createError);
    vi.stubGlobal(
      "readBody",
      vi.fn().mockResolvedValue({
        email: "new@example.com",
        password: "password123",
        name: "New User",
      }),
    );

    const ensurePlayerForAuthUser = vi
      .fn()
      .mockResolvedValue({ id: "player-1" });
    const deleteUser = vi.fn().mockResolvedValue({ error: null });
    const createUser = vi.fn().mockResolvedValue({
      data: { user: { id: "auth-1" } },
      error: null,
    });

    const { createRegisterPasswordHandler } =
      await import("../../server/api/auth/register-password.post");

    const handler = createRegisterPasswordHandler({
      getRuntimeConfig: () =>
        ({
          public: { supabaseUrl: "https://example.supabase.co" },
          supabaseServiceKey: "service-key",
          passwordPepper: "pepper",
        }) as any,
      createPrismaClient: () =>
        ({
          $disconnect: vi.fn().mockResolvedValue(undefined),
        }) as any,
      createSupabaseAdminClient: () => ({
        auth: {
          admin: {
            createUser,
            deleteUser,
          },
        },
      }),
      provisionPlayer: ensurePlayerForAuthUser as any,
    });

    await expect(handler(createEvent())).resolves.toEqual({
      success: true,
      requiresEmailConfirmation: false,
    });

    expect(createUser).toHaveBeenCalledWith(
      expect.objectContaining({
        user_metadata: { name: "New User" },
      }),
    );
    expect(ensurePlayerForAuthUser).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        playerId: null,
      }),
    );
  });
});
