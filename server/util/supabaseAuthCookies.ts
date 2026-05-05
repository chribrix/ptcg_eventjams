import type { H3Event } from "h3";

type ServerUserResolver<TUser> = (event: H3Event) => Promise<TUser | null>;

const LEGACY_SUPABASE_COOKIE_NAMES = new Set([
  "sb-access-token",
  "sb-refresh-token",
  "sb-provider-token",
  "sb-provider-refresh-token",
]);

const AUTH_ERROR_PATTERNS = [
  "auth session missing",
  "invalid jwt",
  "bad jwt",
  "jwt expired",
  "invalid claim",
  "invalid refresh token",
  "refresh token",
  "session_not_found",
  "refresh_token_not_found",
];

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message || "";
  }

  if (error && typeof error === "object") {
    const record = error as Record<string, unknown>;
    return String(
      record.statusMessage || record.message || record.statusText || "",
    );
  }

  return String(error || "");
};

export const isSupabaseAuthSessionError = (error: unknown): boolean => {
  if (error && typeof error === "object") {
    const statusCode = (error as Record<string, unknown>).statusCode;
    if (statusCode === 401) {
      return true;
    }
  }

  const message = getErrorMessage(error).toLowerCase();
  return AUTH_ERROR_PATTERNS.some((pattern) => message.includes(pattern));
};

const getActiveSupabaseCookiePrefix = (event: H3Event): string | null => {
  const config = useRuntimeConfig(event);
  const configuredPrefix = config.public?.supabase?.cookiePrefix;

  if (typeof configuredPrefix === "string" && configuredPrefix) {
    return configuredPrefix;
  }

  const supabaseUrl =
    config.public?.supabase?.url || config.public?.supabaseUrl || "";

  if (typeof supabaseUrl !== "string" || !supabaseUrl) {
    return null;
  }

  try {
    const projectRef = new URL(supabaseUrl).hostname.split(".")[0];
    return projectRef ? `sb-${projectRef}-auth-token` : null;
  } catch {
    return null;
  }
};

const getCookieNames = (event: H3Event): string[] => {
  const header = getHeader(event, "cookie") || "";

  return header
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const separatorIndex = part.indexOf("=");
      return separatorIndex >= 0 ? part.slice(0, separatorIndex) : part;
    })
    .filter(Boolean);
};

export const clearSupabaseAuthCookies = (event: H3Event): void => {
  const activePrefix = getActiveSupabaseCookiePrefix(event);

  for (const name of getCookieNames(event)) {
    const isActiveChunk =
      activePrefix &&
      (name === activePrefix || name.startsWith(`${activePrefix}.`));
    const isSupabaseAuthCookie =
      /^sb-[a-z0-9_-]+-auth-token(?:\.\d+)?$/i.test(name);

    if (
      !isActiveChunk &&
      !isSupabaseAuthCookie &&
      !LEGACY_SUPABASE_COOKIE_NAMES.has(name)
    ) {
      continue;
    }

    deleteCookie(event, name, {
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
  }
};

export const getServerSupabaseUserSafely = async <TUser>(
  event: H3Event,
  getServerUser: ServerUserResolver<TUser>,
): Promise<TUser | null> => {
  try {
    return await getServerUser(event);
  } catch (error) {
    if (!isSupabaseAuthSessionError(error)) {
      throw error;
    }

    clearSupabaseAuthCookies(event);
    return null;
  }
};
