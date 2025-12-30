-- Add unique constraint on supabase_id
-- This allows upsert operations to work correctly
CREATE UNIQUE INDEX IF NOT EXISTS "players_supabase_id_key" ON "public"."players" ("supabase_id")
WHERE
    "supabase_id" IS NOT NULL;