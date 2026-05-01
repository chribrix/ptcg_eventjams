-- Remove legacy auth-era tables and align defaults with current schema.
-- Idempotent guards (`IF EXISTS`) keep this safe across inconsistent dev DBs.
ALTER TABLE IF EXISTS "public"."participants" DROP CONSTRAINT IF EXISTS "participants_event_id_fkey";
ALTER TABLE IF EXISTS "public"."participants" DROP CONSTRAINT IF EXISTS "participants_user_deck_id_fkey";
ALTER TABLE IF EXISTS "public"."participants" DROP CONSTRAINT IF EXISTS "participants_user_id_fkey";
ALTER TABLE IF EXISTS "users"."user_decks" DROP CONSTRAINT IF EXISTS "user_decks_user_id_fkey";

ALTER TABLE IF EXISTS "public"."event_bookmarks" ALTER COLUMN "updated_at" DROP DEFAULT;
ALTER TABLE IF EXISTS "public"."venue_directory_entries" ALTER COLUMN "updated_at" DROP DEFAULT;

DROP TABLE IF EXISTS "public"."participants";
DROP TABLE IF EXISTS "users"."user_decks";
DROP TABLE IF EXISTS "users"."users";
