-- Data Migration: Convert event_type values to tags.type (if event_type column still exists)
-- This script is idempotent and can be run multiple times

-- First, check if event_type column exists and migrate data
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'custom_events' 
    AND column_name = 'event_type'
  ) THEN
    -- Convert event_type values to tags.type
    UPDATE "public"."custom_events"
    SET tags = jsonb_build_object(
      'type', 
      CASE 
        WHEN event_type = 'cup' THEN 'league_cup'
        WHEN event_type = 'challenge' THEN 'league_challenge'
        WHEN event_type = 'local' THEN 'local_tournament'
        WHEN event_type = 'custom' THEN 'custom'
        ELSE 'custom'
      END,
      'game', 'Pokemon'
    )
    WHERE event_type IS NOT NULL;
    
    -- Set default tags for events without event_type
    UPDATE "public"."custom_events"
    SET tags = jsonb_build_object('game', 'Pokemon')
    WHERE event_type IS NULL AND tags IS NULL;
    
    -- Drop the event_type column
    ALTER TABLE "public"."custom_events" DROP COLUMN "event_type";
    
    RAISE NOTICE 'Successfully migrated event_type to tags';
  ELSE
    RAISE NOTICE 'event_type column does not exist, skipping migration';
  END IF;
END $$;

-- Ensure all events have at least the Pokemon game tag
UPDATE "public"."custom_events"
SET tags = jsonb_build_object('game', 'Pokemon')
WHERE tags IS NULL;
