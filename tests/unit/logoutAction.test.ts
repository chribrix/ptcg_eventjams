import { describe, expect, it, vi } from "vitest";
import { createLogoutAction } from "../../composables/useAuth";

describe("logout action", () => {
  it("logs out, clears client auth state, and redirects to login", async () => {
    const logError = vi.fn().mockResolvedValue(undefined);
    const signOut = vi.fn().mockResolvedValue(undefined);
    const clearClientAuthState = vi.fn();
    const assignLocation = vi.fn();

    const logout = createLogoutAction({
      logError,
      signOut,
      clearClientAuthState,
      assignLocation,
      isClient: true,
      getMetadata: () => ({ userName: "Linked Player" }),
    });

    await logout();

    expect(logError).toHaveBeenCalledWith(
      "info_user_logout",
      "User initiated logout",
      { userName: "Linked Player" },
    );
    expect(signOut).toHaveBeenCalled();
    expect(clearClientAuthState).toHaveBeenCalledWith(true);
    expect(assignLocation).toHaveBeenCalledWith("/login");
  });

  it("still clears state and redirects when signOut fails", async () => {
    const logError = vi.fn().mockResolvedValue(undefined);
    const signOut = vi.fn().mockRejectedValue(new Error("network failed"));
    const clearClientAuthState = vi.fn();
    const assignLocation = vi.fn();

    const logout = createLogoutAction({
      logError,
      signOut,
      clearClientAuthState,
      assignLocation,
      isClient: true,
    });

    await logout("/goodbye");

    expect(logError).toHaveBeenCalledTimes(1);
    expect(clearClientAuthState).toHaveBeenCalledWith(true);
    expect(assignLocation).toHaveBeenCalledWith("/goodbye");
  });
});