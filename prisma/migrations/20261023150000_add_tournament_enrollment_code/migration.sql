ALTER TABLE "public"."tournament_tom_states"
  ADD COLUMN "enrollment_code" TEXT;

CREATE UNIQUE INDEX "tournament_tom_states_enrollment_code_key"
  ON "public"."tournament_tom_states"("enrollment_code");
