ALTER TABLE "public"."waitlist_entries"
  ADD COLUMN "priority" INTEGER NOT NULL DEFAULT 0;

CREATE INDEX "waitlist_entries_custom_event_id_priority_created_at_idx"
  ON "public"."waitlist_entries"("custom_event_id", "priority", "created_at");

CREATE INDEX "waitlist_entries_external_event_id_priority_created_at_idx"
  ON "public"."waitlist_entries"("external_event_id", "priority", "created_at");
