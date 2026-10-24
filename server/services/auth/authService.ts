import { serverSupabaseUser } from "#supabase/server";
import type { H3Event } from "h3";
import { createSupabaseServerClient } from "~/server/util/createSupabaseServerClient";
import { getServerSupabaseUserSafely } from "~/server/util/supabaseAuthCookies";

export type AuthServiceUser = {
  id: string;
  email?: string | null;
  app_metadata?: Record<string, unknown> | null;
  user_metadata?: Record<string, unknown> | null;
};

const getBearerToken = (event: H3Event): string | null => {
  const authorization = getHeader(event, "authorization");
  const match = authorization?.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || null;
};

/**
 * The only server-side entry point for resolving an end-user identity.
 * It accepts the normal Supabase cookie flow and explicit bearer tokens, but
 * deliberately uses the public key for token verification—not an admin key.
 */
export const resolveOptionalAuthUser = async (
  event: H3Event,
): Promise<AuthServiceUser | null> => {
  const cookieUser = await getServerSupabaseUserSafely(
    event,
    serverSupabaseUser,
  );
  if (cookieUser?.id) {
    return cookieUser as AuthServiceUser;
  }

  const accessToken = getBearerToken(event);
  if (!accessToken) return null;

  const config = useRuntimeConfig(event);
  const supabaseUrl = config.public.supabaseUrl;
  const publishableKey = config.public.supabaseAnonKey;
  if (!supabaseUrl || !publishableKey) return null;

  const client = createSupabaseServerClient(supabaseUrl, publishableKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const {
    data: { user },
    error,
  } = await client.auth.getUser(accessToken);

  return error || !user ? null : (user as AuthServiceUser);
};

export const requireAuthUser = async (
  event: H3Event,
): Promise<AuthServiceUser> => {
  const user = await resolveOptionalAuthUser(event);
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: "Unauthorized" });
  }
  return user;
};
