// @vitest-environment node

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("browser diagnostic ingress", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubGlobal("defineEventHandler", (handler: unknown) => handler);
  });

  afterEach(() => vi.unstubAllGlobals());

  it("persists only an allowlisted code and the authenticated user id", async () => {
    const create = vi.fn().mockResolvedValue({ id: "log-1" });
    vi.doMock("@prisma/client", () => ({
      PrismaClient: vi.fn(() => ({ errorLog: { create }, $disconnect: vi.fn() })),
    }));
    vi.doMock("~/server/services/auth/authService", () => ({
      resolveOptionalAuthUser: vi.fn().mockResolvedValue({ id: "auth-user-1" }),
    }));
    vi.stubGlobal("readBody", vi.fn().mockResolvedValue({
      errorType: "registration_failed",
      errorMessage: "password=secret-password",
      cookies: { session: "secret-cookie" },
      url: "/login?access_token=secret-token",
      metadata: { refreshToken: "secret-refresh" },
      userId: "forged-user",
    }));

    const handler = (await import("~/server/api/admin/error-logs/create.post")).default;
    await expect(handler({ method: "POST" } as never)).resolves.toEqual({ success: true, id: "log-1" });

    expect(create).toHaveBeenCalledWith({
      data: {
        errorType: "registration_failed",
        errorMessage: "Diagnostic registration_failed",
        userId: "auth-user-1",
        metadata: { method: "POST" },
      },
    });
    const persisted = JSON.stringify(create.mock.calls);
    for (const secret of ["secret-password", "secret-cookie", "secret-token", "secret-refresh", "forged-user"]) {
      expect(persisted).not.toContain(secret);
    }
  });
});
