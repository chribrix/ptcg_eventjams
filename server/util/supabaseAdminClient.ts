import { createSupabaseServerClient } from "~/server/util/createSupabaseServerClient";

/** Server-only Supabase admin client. Never return its key or client to a route response. */
export function createSupabaseAdminClient() {
  const config = useRuntimeConfig();
  if (!config.public.supabaseUrl || !config.supabaseServiceKey) {
    throw createError({ statusCode: 500, statusMessage: "Supabase admin configuration missing" });
  }
  return createSupabaseServerClient(config.public.supabaseUrl, config.supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
