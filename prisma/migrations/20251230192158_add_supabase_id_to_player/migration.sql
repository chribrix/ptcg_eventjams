-- Migration: Add supabaseId to Player table
-- This links Player records to Supabase Auth users
-- Generated: 2025-12-29

-- Add supabaseId column (nullable initially for existing records)
ALTER TABLE "public"."players" 
ADD COLUMN IF NOT EXISTS "supabase_id" TEXT;

-- Create unique index on supabaseId
CREATE UNIQUE INDEX IF NOT EXISTS "players_supabase_id_key" 
ON "public"."players"("supabase_id") 
WHERE "supabase_id" IS NOT NULL;

-- Add comment explaining the field
COMMENT ON COLUMN "public"."players"."supabase_id" IS 'Links to Supabase auth.users.id - the authenticated user ID';

-- Optional: Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS "players_email_idx" 
ON "public"."players"("email") 
WHERE "email" IS NOT NULL;
