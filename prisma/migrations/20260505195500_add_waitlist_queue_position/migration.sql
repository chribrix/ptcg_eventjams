ALTER TABLE "public"."waitlist_entries"
  ADD COLUMN "queue_position_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

DROP INDEX IF EXISTS "waitlist_entries_custom_event_id_status_created_at_idx";
DROP INDEX IF EXISTS "waitlist_entries_external_event_id_status_created_at_idx";
DROP INDEX IF EXISTS "waitlist_entries_custom_event_id_priority_created_at_idx";
DROP INDEX IF EXISTS "waitlist_entries_external_event_id_priority_created_at_idx";

CREATE INDEX "waitlist_entries_custom_event_id_status_priority_queue_position_at_idx"
  ON "public"."waitlist_entries"("custom_event_id", "status", "priority", "queue_position_at");

CREATE INDEX "waitlist_entries_external_event_id_status_priority_queue_position_at_idx"
  ON "public"."waitlist_entries"("external_event_id", "status", "priority", "queue_position_at");
