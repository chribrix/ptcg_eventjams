// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";
import crypto from "crypto";

const createError = (error: { statusCode: number; statusMessage: string }) => {
  const err = new Error(error.statusMessage) as Error & {
    statusCode: number;
    statusMessage: string;
  };
  err.statusCode = error.statusCode;
  err.statusMessage = error.statusMessage;
  return err;
};

const encryptValue = (value: string, secret: string) => {
  const key = crypto.createHash("sha256").update(secret).digest();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([
    cipher.update(value, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return {
    ciphertext: encrypted.toString("base64"),
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
  };
};

describe("finalize-password-setup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("defineEventHandler", (handler: unknown) => handler);
    vi.stubGlobal("createError", createError);
  });

  it("provisions the player after password activation succeeds", async () => {
    vi.resetModules();
    const encrypted = encryptValue("peppered-password", "pepper");
    vi.doMock("#supabase/server", () => ({
      serverSupabaseUser: vi.fn(),
    }));
    vi.stubGlobal("getHeader", vi.fn().mockReturnValue(undefined));
    vi.stubGlobal(
      "fetch",
      vi.fn()
        .mockResolvedValueOnce({ ok: true, json: vi.fn().mockResolvedValue({}) })
        .mockResolvedValueOnce({ ok: true, json: vi.fn().mockResolvedValue({}) }),
    );

    const { createFinalizePasswordSetupHandler } = await import(
      "../../server/api/auth/finalize-password-setup.post"
    );
    const ensurePlayerForAuthUser = vi.fn().mockResolvedValue({ id: "player-1" });

    const getUserById = vi.fn().mockResolvedValue({
      data: {
        user: {
          id: "auth-1",
          email: "new@example.com",
          app_metadata: {
            has_password: false,
            pending_password_setup: {
              ...encrypted,
              expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
            },
          },
          user_metadata: { name: "New User", playerId: "1001" },
        },
      },
      error: null,
    });

    const handler = createFinalizePasswordSetupHandler({
      getRuntimeConfig: () => ({
        public: { supabaseUrl: "https://example.supabase.co" },
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
            getUserById,
          },
          getUser: vi.fn(),
        },
      }),
      getServerSupabaseUser: vi.fn().mockResolvedValue({
        id: "auth-1",
        email: "new@example.com",
      }) as any,
      provisionPlayer: ensurePlayerForAuthUser as any,
    });

    await expect(handler({} as any)).resolves.toEqual({ success: true });

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