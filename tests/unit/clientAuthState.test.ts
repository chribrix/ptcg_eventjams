import { describe, expect, it, vi } from "vitest";
import { createClientAuthStateCleaner } from "../../utils/clientAuthState";

describe("client auth state cleaner", () => {
  it("removes only auth-related local storage keys when partial cleanup is requested", () => {
    const removedKeys: string[] = [];
    const localStorageMock = {
      length: 3,
      key: (index: number) =>
        ["supabase.auth.token", "session_start_user-1", "theme"][index] ||
        null,
      clear: vi.fn(),
      removeItem: vi.fn((key: string) => {
        removedKeys.push(key);
      }),
    };
    const sessionStorageMock = {
      clear: vi.fn(),
    };
    const expireCookie = vi.fn();

    const clearClientAuthState = createClientAuthStateCleaner({
      isClient: true,
      localStorage: localStorageMock,
      sessionStorage: sessionStorageMock,
      getCookies: () => ["sb-access-token=value", "theme=dark"],
      expireCookie,
      hostname: "localhost",
    });

    clearClientAuthState();

    expect(localStorageMock.clear).not.toHaveBeenCalled();
    expect(sessionStorageMock.clear).not.toHaveBeenCalled();
    expect(removedKeys).toEqual([
      "supabase.auth.token",
      "session_start_user-1",
    ]);
    expect(expireCookie).toHaveBeenCalledWith("sb-access-token");
    expect(expireCookie).toHaveBeenCalledWith("theme");
  });

  it("clears all storage during full cleanup", () => {
    const localStorageMock = {
      length: 0,
      key: vi.fn(),
      clear: vi.fn(),
      removeItem: vi.fn(),
    };
    const sessionStorageMock = {
      clear: vi.fn(),
    };

    const clearClientAuthState = createClientAuthStateCleaner({
      isClient: true,
      localStorage: localStorageMock,
      sessionStorage: sessionStorageMock,
      getCookies: () => [],
      expireCookie: vi.fn(),
      hostname: "localhost",
    });

    clearClientAuthState({ clearAllStorage: true });

    expect(localStorageMock.clear).toHaveBeenCalledOnce();
    expect(sessionStorageMock.clear).toHaveBeenCalledOnce();
  });
});