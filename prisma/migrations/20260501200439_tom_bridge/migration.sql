-- Intentionally kept as a no-op migration.
-- Reason:
-- A previously auto-generated migration attempted destructive table drops
-- and re-created an already-existing index (`players_supabase_id_key`).
-- We keep this migration ID to recover Prisma migrate history safely
-- without resetting or altering existing production-like data.
SELECT 1;
