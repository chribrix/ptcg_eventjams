import { createClient } from "@supabase/supabase-js";
import ws from "ws";

export function createSupabaseServerClient(
  supabaseUrl: string,
  supabaseKey: string,
  options: any = {},
) {
  return createClient(supabaseUrl, supabaseKey, {
    ...options,
    realtime: {
      ...(options.realtime || {}),
      transport: ws,
    },
  });
}
