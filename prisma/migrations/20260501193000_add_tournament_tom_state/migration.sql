CREATE TABLE "public"."tournament_tom_states" (
  "id" TEXT NOT NULL,
  "custom_event_id" TEXT NOT NULL,
  "source_xml" TEXT NOT NULL,
  "current_xml" TEXT NOT NULL,
  "imported_by_admin_id" TEXT NOT NULL,
  "imported_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "metadata" JSONB,

  CONSTRAINT "tournament_tom_states_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "tournament_tom_states_custom_event_id_key"
ON "public"."tournament_tom_states"("custom_event_id");

ALTER TABLE "public"."tournament_tom_states"
ADD CONSTRAINT "tournament_tom_states_custom_event_id_fkey"
FOREIGN KEY ("custom_event_id") REFERENCES "public"."custom_events"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
