import { beforeEach, describe, expect, it, vi } from "vitest";

const loadModule = async () => {
  vi.resetModules();
  vi.doMock("#supabase/server", () => ({
    serverSupabaseUser: vi.fn(),
  }));

  return import("../../server/util/supabaseAuthCookies");
};

describe("supabase auth cookie helpers", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it("turns invalid Supabase sessions into null and expires auth cookies", async () => {
    const deletedCookies: Array<{ name: string; options: Record<string, any> }> =
      [];

    vi.stubGlobal("useRuntimeConfig", () => ({
      public: {
        supabase: {
          cookiePrefix: "sb-active-ref-auth-token",
        },
      },
    }));
    vi.stubGlobal(
      "getHeader",
      vi.fn(
        () =>
          "sb-active-ref-auth-token.0=old; sb-active-ref-auth-token.1=old; i18n_redirected=de",
      ),
    );
    vi.stubGlobal(
      "deleteCookie",
      vi.fn((event, name, options) => {
        deletedCookies.push({ name, options });
      }),
    );

    const { getServerSupabaseUserSafely } = await loadModule();
    const getServerUser = vi
      .fn()
      .mockRejectedValue(new Error("Auth session missing!"));

    await expect(
      getServerSupabaseUserSafely({} as any, getServerUser),
    ).resolves.toBeNull();

    expect(deletedCookies.map((cookie) => cookie.name)).toEqual([
      "sb-active-ref-auth-token.0",
      "sb-active-ref-auth-token.1",
    ]);
    expect(deletedCookies[0]?.options).toMatchObject({
      path: "/",
      sameSite: "lax",
    });
  });

  it("rethrows non-auth Supabase errors", async () => {
    vi.stubGlobal("useRuntimeConfig", () => ({ public: {} }));
    vi.stubGlobal("getHeader", vi.fn(() => ""));
    vi.stubGlobal("deleteCookie", vi.fn());

    const { getServerSupabaseUserSafely } = await loadModule();
    const error = new Error("network failed");

    await expect(
      getServerSupabaseUserSafely({} as any, vi.fn().mockRejectedValue(error)),
    ).rejects.toBe(error);
  });
});
