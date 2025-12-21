/*
  Warnings:

  - You are about to drop the column `bringing_decklist_onsite` on the `event_registrations` table. All the data in the column will be lost.
  - You are about to drop the column `decklist` on the `event_registrations` table. All the data in the column will be lost.
  - You are about to drop the column `is_anonymous` on the `event_registrations` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `event_registrations` table. All the data in the column will be lost.
  - You are about to drop the `custom_event_participants` table. If the table is not empty, all the data it contains will be lost.

*/

-- Step 1: Create the new registration_tickets table
CREATE TABLE "public"."registration_tickets" (
    "id" TEXT NOT NULL,
    "registration_id" TEXT NOT NULL,
    "participant_name" TEXT NOT NULL,
    "participant_player_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'registered',
    "is_anonymous" BOOLEAN NOT NULL DEFAULT false,
    "decklist" TEXT,
    "bringing_decklist_onsite" BOOLEAN DEFAULT false,
    "placement" INTEGER,
    "points" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "registration_tickets_pkey" PRIMARY KEY ("id")
);

-- Step 2: Migrate existing event_registrations data to tickets
-- Each existing registration becomes one ticket
INSERT INTO "public"."registration_tickets" (
    "id",
    "registration_id",
    "participant_name",
    "participant_player_id",
    "status",
    "is_anonymous",
    "decklist",
    "bringing_decklist_onsite",
    "placement",
    "points",
    "created_at",
    "updated_at"
)
SELECT
    gen_random_uuid()::text,                    -- Generate new ID for ticket
    er.id,                                       -- registration_id
    p.name,                                      -- participant_name from player
    p.player_id,                                 -- participant_player_id
    COALESCE(er.status, 'registered'),          -- status (with fallback)
    COALESCE(er.is_anonymous, false),           -- is_anonymous (with fallback)
    er.decklist,                                 -- decklist
    COALESCE(er.bringing_decklist_onsite, false), -- bringing_decklist_onsite
    NULL,                                        -- placement (not in old schema)
    NULL,                                        -- points (not in old schema)
    er.registered_at,                            -- created_at = registered_at
    er.registered_at                             -- updated_at = registered_at
FROM "public"."event_registrations" er
JOIN "public"."players" p ON er.player_id = p.id;

-- Step 3: Migrate custom_event_participants data
-- Create additional tickets for participants with placement/points data
INSERT INTO "public"."registration_tickets" (
    "id",
    "registration_id",
    "participant_name",
    "participant_player_id",
    "status",
    "is_anonymous",
    "decklist",
    "bringing_decklist_onsite",
    "placement",
    "points",
    "created_at",
    "updated_at"
)
SELECT
    gen_random_uuid()::text,
    er.id,
    p.name,
    p.player_id,
    'attended',                                  -- If they have placement, they attended
    false,                                       -- Not anonymous by default
    NULL,
    false,
    cep.placement,
    cep.points,
    cep.created_at,
    cep.created_at
FROM "public"."custom_event_participants" cep
JOIN "public"."players" p ON cep.player_id = p.id
JOIN "public"."event_registrations" er ON er.custom_event_id = cep.custom_event_id 
    AND er.player_id = p.id
WHERE cep.placement IS NOT NULL OR cep.points IS NOT NULL
-- Only add if this player doesn't already have a ticket from step 2
AND NOT EXISTS (
    SELECT 1 FROM "public"."registration_tickets" rt
    WHERE rt.registration_id = er.id
);

-- Step 4: Add foreign key constraint
ALTER TABLE "public"."registration_tickets" 
ADD CONSTRAINT "registration_tickets_registration_id_fkey" 
FOREIGN KEY ("registration_id") REFERENCES "public"."event_registrations"("id") 
ON DELETE CASCADE ON UPDATE CASCADE;

-- Step 5: Drop old columns from event_registrations
ALTER TABLE "public"."event_registrations" 
DROP COLUMN IF EXISTS "bringing_decklist_onsite",
DROP COLUMN IF EXISTS "decklist",
DROP COLUMN IF EXISTS "is_anonymous",
DROP COLUMN IF EXISTS "status";

-- Step 6: Drop foreign keys and custom_event_participants table
ALTER TABLE "public"."custom_event_participants" DROP CONSTRAINT IF EXISTS "custom_event_participants_custom_event_id_fkey";
ALTER TABLE "public"."custom_event_participants" DROP CONSTRAINT IF EXISTS "custom_event_participants_player_id_fkey";
DROP TABLE IF EXISTS "public"."custom_event_participants";
