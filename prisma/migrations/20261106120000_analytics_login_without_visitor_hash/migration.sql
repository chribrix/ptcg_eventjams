ALTER TABLE "public"."analytics_events" ALTER COLUMN "visitor_hash" DROP NOT NULL;
UPDATE "public"."analytics_events" SET "visitor_hash" = NULL WHERE "event_type" = 'login_completed';
