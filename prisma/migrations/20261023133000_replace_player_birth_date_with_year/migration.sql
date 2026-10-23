-- Store only the year of birth. Full dates are no longer retained for player profiles.
ALTER TABLE "public"."players" ADD COLUMN "birth_year" INTEGER;

UPDATE "public"."players"
SET "birth_year" = EXTRACT(YEAR FROM "birth_date")::INTEGER
WHERE "birth_year" IS NULL;

ALTER TABLE "public"."players"
  ALTER COLUMN "birth_year" SET NOT NULL,
  DROP COLUMN "birth_date";
