CREATE TABLE "public"."waitlist_entries" (
  "id" TEXT NOT NULL,
  "event_key" TEXT NOT NULL,
  "custom_event_id" TEXT,
  "external_event_id" TEXT,
  "player_id" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'waiting',
  "notified_at" TIMESTAMP(3),
  "claim_expires_at" TIMESTAMP(3),
  "confirmed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "waitlist_entries_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "waitlist_entries_event_key_player_id_key"
  ON "public"."waitlist_entries"("event_key", "player_id");

CREATE INDEX "waitlist_entries_custom_event_id_status_created_at_idx"
  ON "public"."waitlist_entries"("custom_event_id", "status", "created_at");

CREATE INDEX "waitlist_entries_external_event_id_status_created_at_idx"
  ON "public"."waitlist_entries"("external_event_id", "status", "created_at");

ALTER TABLE "public"."waitlist_entries"
  ADD CONSTRAINT "waitlist_entries_custom_event_id_fkey"
  FOREIGN KEY ("custom_event_id") REFERENCES "public"."custom_events"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."waitlist_entries"
  ADD CONSTRAINT "waitlist_entries_external_event_id_fkey"
  FOREIGN KEY ("external_event_id") REFERENCES "public"."external_event_overrides"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."waitlist_entries"
  ADD CONSTRAINT "waitlist_entries_player_id_fkey"
  FOREIGN KEY ("player_id") REFERENCES "public"."players"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
