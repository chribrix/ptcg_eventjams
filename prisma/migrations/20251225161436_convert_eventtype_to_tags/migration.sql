/*
Warnings:

- You are about to drop the column `event_type` on the `custom_events` table. All the data in the column will be lost.

 */
-- AlterTable: Add new columns first
ALTER TABLE "public"."custom_events"
ADD COLUMN "tag_type" TEXT NOT NULL DEFAULT 'pokemon',
ADD COLUMN "tags" JSONB;

-- AlterTable: Add new columns to external_event_overrides
ALTER TABLE "public"."external_event_overrides"
ADD COLUMN "tag_type" TEXT,
ADD COLUMN "tags" JSONB;

-- Data Migration: Convert event_type values to tags.type
-- Map: cup -> league_cup, challenge -> league_challenge, local -> local_tournament, custom -> custom
UPDATE "public"."custom_events"
SET
  tags = jsonb_build_object (
    'type',
    CASE
      WHEN event_type = 'cup' THEN 'league_cup'
      WHEN event_type = 'challenge' THEN 'league_challenge'
      WHEN event_type = 'local' THEN 'local_tournament'
      WHEN event_type = 'custom' THEN 'custom'
      ELSE 'custom'
    END,
    'game',
    'Pokemon'
  )
WHERE
  event_type IS NOT NULL;

-- Set default tags for events without event_type
UPDATE "public"."custom_events"
SET
  tags = jsonb_build_object ('game', 'Pokemon')
WHERE
  event_type IS NULL
  AND tags IS NULL;

-- AlterTable: Drop old event_type column
ALTER TABLE "public"."custom_events"
DROP COLUMN "event_type";