CREATE TABLE "public"."tournament_management_sessions" (
  "custom_event_id" TEXT NOT NULL,
  "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "tournament_management_sessions_pkey" PRIMARY KEY ("custom_event_id")
);

ALTER TABLE "public"."tournament_management_sessions"
  ADD CONSTRAINT "tournament_management_sessions_custom_event_id_fkey"
  FOREIGN KEY ("custom_event_id") REFERENCES "public"."custom_events"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
