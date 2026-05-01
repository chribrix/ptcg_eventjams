CREATE TABLE "public"."event_bookmarks" (
    "id" TEXT NOT NULL,
    "player_id" TEXT NOT NULL,
    "external_event_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "event_type" TEXT,
    "venue" TEXT NOT NULL,
    "location" TEXT,
    "country" TEXT,
    "event_date" TIMESTAMP(3) NOT NULL,
    "registration_url" TEXT,
    "cost" TEXT,
    "street_address" TEXT,
    "icon" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_bookmarks_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "event_bookmarks_player_id_external_event_id_key"
ON "public"."event_bookmarks"("player_id", "external_event_id");

ALTER TABLE "public"."event_bookmarks"
ADD CONSTRAINT "event_bookmarks_player_id_fkey"
FOREIGN KEY ("player_id") REFERENCES "public"."players"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
