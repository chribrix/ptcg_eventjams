import { beforeEach, describe, expect, it, vi } from "vitest";

describe("admin page guard", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    vi.stubGlobal(
      "createError",
      (input: { statusCode: number; statusMessage: string }) => {
        const error = new Error(input.statusMessage) as Error & {
          statusCode: number;
          statusMessage: string;
        };
        error.statusCode = input.statusCode;
        error.statusMessage = input.statusMessage;
        return error;
      },
    );
  });

  it("redirects unauthenticated admin routes to login with the requested path", async () => {
    const fetchAdminCheck = vi.fn().mockRejectedValue({ statusCode: 401 });

    const { createAdminPageGuard } = await import("../../utils/adminPageGuard");
    const middleware = createAdminPageGuard({ fetchAdminCheck });

    const result = await middleware({ path: "/admin", fullPath: "/admin" });

    expect(result).toBe("/login?redirect=%2Fadmin");
  });

  it("protects locale-prefixed admin routes", async () => {
    const fetchAdminCheck = vi.fn().mockRejectedValue({ statusCode: 401 });

    const { createAdminPageGuard } = await import("../../utils/adminPageGuard");
    const middleware = createAdminPageGuard({ fetchAdminCheck });

    const result = await middleware({
      path: "/en/admin",
      fullPath: "/en/admin?tab=events",
    });

    expect(fetchAdminCheck).toHaveBeenCalledWith("/api/admin/check");
    expect(result).toBe("/login?redirect=%2Fen%2Fadmin%3Ftab%3Devents");
  });

  it("redirects unexpected admin auth failures to login with the requested path", async () => {
    const fetchAdminCheck = vi.fn().mockRejectedValue({ statusCode: 500 });

    const { createAdminPageGuard } = await import("../../utils/adminPageGuard");
    const middleware = createAdminPageGuard({ fetchAdminCheck });

    const result = await middleware({
      path: "/admin/users",
      fullPath: "/admin/users?page=2",
    });

    expect(result).toBe("/login?redirect=%2Fadmin%2Fusers%3Fpage%3D2");
  });

  it("keeps the existing service-unavailable redirect for backend outages", async () => {
    const fetchAdminCheck = vi.fn().mockRejectedValue({ statusCode: 503 });

    const { createAdminPageGuard } = await import("../../utils/adminPageGuard");
    const middleware = createAdminPageGuard({ fetchAdminCheck });

    const result = await middleware({
      path: "/admin/logs",
      fullPath: "/admin/logs",
    });

    expect(result).toBe("/?error=service-unavailable");
  });
});
