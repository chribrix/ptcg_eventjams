import { describe, expect, it, vi } from "vitest";
import { createClientAuthStateCleaner } from "../../utils/clientAuthState";
import { EVENT_LOCATION_STORAGE_KEY } from "../../utils/eventLocationPreference";

describe("client auth state cleaner", () => {
  it("removes only auth-related local storage keys when partial cleanup is requested", () => {
    const removedKeys: string[] = [];
    const localStorageMock = {
      length: 3,
      key: (index: number) =>
        ["supabase.auth.token", "session_start_user-1", "theme"][index] || null,
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

  it("preserves the event location choice across logout cleanup", () => {
    const entries = new Map([["supabase.auth.token", "secret"], [EVENT_LOCATION_STORAGE_KEY, '{"mode":"default"}']]);
    const localStorageMock = {
      get length() { return entries.size; },
      key: (index: number) => [...entries.keys()][index] || null,
      getItem: (key: string) => entries.get(key) || null,
      setItem: (key: string, value: string) => { entries.set(key, value); },
      clear: () => entries.clear(),
      removeItem: (key: string) => { entries.delete(key); },
    };
    createClientAuthStateCleaner({
      isClient: true,
      localStorage: localStorageMock,
      sessionStorage: { clear: vi.fn() },
      getCookies: () => [],
    })({ clearAllStorage: true });
    expect(entries.get(EVENT_LOCATION_STORAGE_KEY)).toBe('{"mode":"default"}');
    expect(entries.has("supabase.auth.token")).toBe(false);
  });
});
