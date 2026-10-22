CREATE TABLE "public"."analytics_events" (
    "id" TEXT NOT NULL,
    "occurred_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "event_type" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "visitor_hash" CHAR(64) NOT NULL,
    "event_id" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "analytics_events_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "analytics_events_type_check" CHECK (
        "event_type" IN (
            'page_view',
            'registration_completed',
            'waitlist_joined',
            'waitlist_confirmed',
            'event_bookmarked'
        )
    )
);

CREATE INDEX "analytics_events_occurred_at_idx"
ON "public"."analytics_events"("occurred_at");

CREATE INDEX "analytics_events_type_occurred_at_idx"
ON "public"."analytics_events"("event_type", "occurred_at");

CREATE INDEX "analytics_events_visitor_occurred_at_idx"
ON "public"."analytics_events"("visitor_hash", "occurred_at");
