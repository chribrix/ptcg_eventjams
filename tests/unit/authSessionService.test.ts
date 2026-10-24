import { describe, expect, it, vi } from "vitest";
import {
  createAuthSessionService,
  isRefreshConflictError,
} from "../../services/authSessionService";

const user = { id: "user-1", email: "chrisbrinker@pm.me" };

const createDependencies = (overrides = {}) => ({
  getSession: vi.fn().mockResolvedValue({
    data: { session: { user, expires_at: 1_001 } },
    error: null,
  }),
  refreshSession: vi.fn().mockResolvedValue({
    data: { session: { user, expires_at: 9_999 } },
    error: null,
  }),
  signOut: vi.fn().mockResolvedValue(undefined),
  getCurrentUser: vi.fn(() => user),
  clearAuthState: vi.fn(),
  logError: vi.fn().mockResolvedValue(undefined),
  isRetryableError: vi.fn(() => false),
  now: () => 1_000_000,
  setInterval: vi.fn(),
  ...overrides,
});

describe("auth session service", () => {
  it("serializes simultaneous refresh requests into one refresh", async () => {
    let resolveRefresh: (value: any) => void;
    const refreshSession = vi.fn(
      () =>
        new Promise((resolve) => {
          resolveRefresh = resolve;
        }),
    );
    const dependencies = createDependencies({ refreshSession });
    const service = createAuthSessionService(dependencies);

    const first = service.ensureValidSession();
    const second = service.ensureValidSession();
    expect(first).toBe(second);
    await Promise.resolve();
    expect(refreshSession).toHaveBeenCalledOnce();

    resolveRefresh!({ data: { session: { user, expires_at: 9_999 } }, error: null });
    await expect(first).resolves.toEqual(user);
  });

  it("keeps the existing user on a discarded refresh conflict", async () => {
    const conflict = Object.assign(
      new Error("Refresh result discarded: session state changed mid-flight"),
      { name: "AuthRefreshDiscardedError", status: 409 },
    );
    const dependencies = createDependencies({
      refreshSession: vi.fn().mockResolvedValue({
        data: { session: null },
        error: conflict,
      }),
    });
    const service = createAuthSessionService(dependencies);

    await expect(service.ensureValidSession()).resolves.toEqual(user);
    expect(dependencies.signOut).not.toHaveBeenCalled();
    expect(dependencies.clearAuthState).not.toHaveBeenCalled();
    expect(dependencies.logError).not.toHaveBeenCalled();
  });

  it("invalidates only once for an actual non-retryable auth error", async () => {
    const dependencies = createDependencies({
      getSession: vi.fn().mockResolvedValue({
        data: { session: null },
        error: new Error("invalid refresh token"),
      }),
    });
    const service = createAuthSessionService(dependencies);

    await Promise.all([service.ensureValidSession(), service.ensureValidSession()]);
    expect(dependencies.signOut).toHaveBeenCalledOnce();
    expect(dependencies.clearAuthState).toHaveBeenCalledOnce();
  });

  it("recognizes the Supabase discarded-refresh response", () => {
    expect(
      isRefreshConflictError({
        name: "AuthRefreshDiscardedError",
        status: 409,
        message: "Refresh result discarded: session state changed mid-flight",
      }),
    ).toBe(true);
  });
});
