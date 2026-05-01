-- Normalize players.supabase_id unique index to a full unique index (non-partial).
-- This removes drift caused by older partial unique index definitions.
DROP INDEX IF EXISTS "public"."players_supabase_id_key";
CREATE UNIQUE INDEX "players_supabase_id_key" ON "public"."players"("supabase_id");
