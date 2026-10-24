/**
 * The single client-side authority for Supabase session refreshes.
 *
 * Browser auth state cannot be safely refreshed by every component that reads
 * it: refresh-token rotation makes concurrent refreshes race. Keep the
 * orchestration in this small service and let UI composables only consume it.
 */
export type SessionUser = { id: string };

type Session<TUser> = {
  user: TUser;
  expires_at?: number;
} | null;

type SessionResult<TUser> = {
  data: { session: Session<TUser> };
  error: unknown;
};

type AuthSessionServiceDependencies<TUser extends SessionUser> = {
  getSession: () => Promise<SessionResult<TUser>>;
  refreshSession: () => Promise<SessionResult<TUser>>;
  signOut: () => Promise<unknown>;
  getCurrentUser: () => TUser | null;
  clearAuthState: () => void;
  logError: (type: string, message: string, metadata?: unknown) => Promise<void>;
  isRetryableError: (error: unknown) => boolean;
  now?: () => number;
  setInterval?: (callback: () => void, ms: number) => ReturnType<typeof setInterval>;
};

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : String(error || "Unknown auth error");

/** A 409 means another in-browser refresh/sign-out changed state while this
 * request was in flight. It is not evidence that the user's credentials died. */
export const isRefreshConflictError = (error: unknown) => {
  if (!error || typeof error !== "object") return false;
  const candidate = error as { status?: number; name?: string; message?: string };
  return (
    candidate.status === 409 &&
    (candidate.name === "AuthRefreshDiscardedError" ||
      candidate.message?.includes("session state changed mid-flight") === true)
  );
};

export const createAuthSessionService = <TUser extends SessionUser>(
  dependencies: AuthSessionServiceDependencies<TUser>,
) => {
  let validationInFlight: Promise<TUser | null> | null = null;
  let invalidationInFlight: Promise<void> | null = null;
  let monitorStarted = false;

  const preserveCurrentUser = () => dependencies.getCurrentUser();

  const invalidate = async () => {
    if (!invalidationInFlight) {
      invalidationInFlight = (async () => {
        await dependencies.signOut().catch(() => undefined);
        dependencies.clearAuthState();
      })().finally(() => {
        invalidationInFlight = null;
      });
    }

    await invalidationInFlight;
  };

  const handleError = async (
    error: unknown,
    type: string,
    metadataKey: string,
  ): Promise<TUser | null> => {
    if (isRefreshConflictError(error) || dependencies.isRetryableError(error)) {
      return preserveCurrentUser();
    }

    await dependencies.logError(type, getErrorMessage(error), { [metadataKey]: error });
    await invalidate();
    return null;
  };

  const ensureValidSession = () => {
    if (validationInFlight) return validationInFlight;

    validationInFlight = (async () => {
      try {
        const current = await dependencies.getSession();
        if (current.error) {
          return handleError(current.error, "session_check_failed", "error");
        }

        if (!current.data.session) return null;

        const expiresAt = current.data.session.expires_at;
        const expiresSoon =
          Boolean(expiresAt) &&
          (expiresAt as number) - Math.floor((dependencies.now ?? Date.now)() / 1000) <
            5 * 60;

        if (!expiresSoon) return current.data.session.user;

        const refreshed = await dependencies.refreshSession();
        if (refreshed.error) {
          return handleError(refreshed.error, "token_refresh_failed", "refreshError");
        }

        return refreshed.data.session?.user ?? preserveCurrentUser();
      } catch (error) {
        return handleError(error, "session_validation_exception", "error");
      }
    })().finally(() => {
      validationInFlight = null;
    });

    return validationInFlight;
  };

  const startMonitoring = () => {
    if (monitorStarted) return;
    monitorStarted = true;
    const schedule = dependencies.setInterval ?? setInterval;
    schedule(() => {
      if (dependencies.getCurrentUser()) {
        void ensureValidSession();
      }
    }, 5 * 60 * 1000);
  };

  return { ensureValidSession, invalidate, startMonitoring };
};
