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

describe("request-password-setup direct path", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("defineEventHandler", (handler: unknown) => handler);
    vi.stubGlobal("createError", createError);
  });

  it("provisions the player when the direct password setup path completes", async () => {
    vi.resetModules();
    vi.stubGlobal(
      "readBody",
      vi.fn().mockResolvedValue({
        email: "new@example.com",
        password: "password123",
      }),
    );
    vi.stubGlobal(
      "fetch",
      vi.fn()
        .mockResolvedValueOnce({ ok: true, json: vi.fn().mockResolvedValue({}) })
        .mockResolvedValueOnce({ ok: true, json: vi.fn().mockResolvedValue({}) })
        .mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({
            access_token: "access",
            refresh_token: "refresh",
            expires_in: 3600,
            token_type: "bearer",
          }),
        }),
    );

      const { createRequestPasswordSetupHandler } = await import(
        "../../server/api/auth/request-password-setup.post"
      );

      const ensurePlayerForAuthUser = vi.fn().mockResolvedValue({ id: "player-1" });

    const updateUserById = vi.fn();
    const getUserByEmail = vi.fn().mockResolvedValue({
      data: {
        user: {
          id: "auth-1",
          email: "new@example.com",
          email_confirmed_at: null,
          app_metadata: { has_password: false, pending_password_setup: null },
          user_metadata: { name: "New User", playerId: "1001" },
        },
      },
      error: null,
    });

    const handler = createRequestPasswordSetupHandler({
      getRuntimeConfig: () => ({
        public: {
          supabaseUrl: "https://example.supabase.co",
          supabaseAnonKey: "anon-key",
          appBaseUrl: "https://app.example.com",
        },
        supabaseServiceKey: "service-key",
        passwordPepper: "pepper",
      }) as any,
      createPrismaClient: () =>
        ({
          $executeRaw: vi.fn().mockResolvedValue(undefined),
          $disconnect: vi.fn().mockResolvedValue(undefined),
        }) as any,
      createSupabaseAdminClient: () => ({
        auth: {
          admin: {
            getUserByEmail,
            updateUserById,
          },
        },
      }),
      provisionPlayer: ensurePlayerForAuthUser as any,
    });

    await handler({} as any);

    expect(ensurePlayerForAuthUser).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        supabaseId: "auth-1",
        email: "new@example.com",
        playerId: "1001",
        preferredLoginMethod: "password",
      }),
    );
  });
});