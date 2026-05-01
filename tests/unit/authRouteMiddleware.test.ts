import { beforeEach, describe, expect, it, vi } from "vitest";

describe("auth route middleware", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
  });

  it("builds a login redirect from the full requested path", async () => {
    const { buildLoginRedirectPath } = await import("../../utils/loginRedirect");

    expect(
      buildLoginRedirectPath({
        path: "/booking/abc",
        fullPath: "/booking/abc?tab=tickets",
      }),
    ).toBe("/login?redirect=%2Fbooking%2Fabc%3Ftab%3Dtickets");
  });

  it("redirects unauthenticated client users to login with the requested path", async () => {
    const navigate = vi.fn();
    const delay = vi.fn().mockResolvedValue(undefined);
    const user = { value: null };

    const { createAuthRouteGuard } = await import(
      "../../middleware/auth.global"
    );

    const guard = createAuthRouteGuard({
      getAuth: () => ({
        user,
        ensureValidSession: vi.fn(),
      }),
      getSupabaseClient: () => ({ auth: { signOut: vi.fn() } }),
      navigate,
      delay,
      isClient: true,
    } as any);

    await guard({
      path: "/dashboard",
      fullPath: "/dashboard?filter=active",
    });

    expect(delay).toHaveBeenCalledWith(50);
    expect(navigate).toHaveBeenCalledWith(
      "/login?redirect=%2Fdashboard%3Ffilter%3Dactive",
    );
  });

  it("redirects invalid client sessions to login with the requested path", async () => {
    const navigate = vi.fn();
    const signOut = vi.fn().mockResolvedValue(undefined);
    const ensureValidSession = vi.fn().mockResolvedValue(null);

    vi.stubGlobal("localStorage", { clear: vi.fn() });
    vi.stubGlobal("sessionStorage", { clear: vi.fn() });

    const { createAuthRouteGuard } = await import(
      "../../middleware/auth.global"
    );

    const guard = createAuthRouteGuard({
      getAuth: () => ({
        user: { value: { id: "supabase-user-1" } },
        ensureValidSession,
      }),
      getSupabaseClient: () => ({ auth: { signOut } }),
      navigate,
      isClient: true,
    } as any);

    await guard({
      path: "/profile",
      fullPath: "/profile",
    });

    expect(ensureValidSession).toHaveBeenCalled();
    expect(signOut).toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith("/login?redirect=%2Fprofile");
  });

  it("redirects unauthenticated server requests to login with the requested path", async () => {
    const navigate = vi.fn();

    const { createAuthRouteGuard } = await import(
      "../../middleware/auth.global"
    );

    const guard = createAuthRouteGuard({
      getAuth: () => ({
        user: { value: null },
        ensureValidSession: vi.fn(),
      }),
      getSupabaseClient: () => ({ auth: { signOut: vi.fn() } }),
      navigate,
      isClient: false,
    } as any);

    await guard({
      path: "/booking/abc",
      fullPath: "/booking/abc",
    });

    expect(navigate).toHaveBeenCalledWith(
      "/login?redirect=%2Fbooking%2Fabc",
    );
  });
});