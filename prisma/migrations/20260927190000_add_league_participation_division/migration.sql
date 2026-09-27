ALTER TABLE "public"."league_participations"
ADD COLUMN "division" TEXT;

ALTER TABLE "public"."league_participations"
ADD CONSTRAINT "league_participations_division_check"
CHECK ("division" IN ('junior', 'senior', 'master', 'unknown'));

CREATE INDEX "league_participations_division_idx"
ON "public"."league_participations"("division");

WITH tdf_divisions AS (
    SELECT
        event.id AS event_id,
        standings.pokemon_player_id,
        CASE standings.category
            WHEN '0' THEN 'junior'
            WHEN '1' THEN 'senior'
            WHEN '2' THEN 'master'
        END AS division
    FROM "public"."league_events" event
    CROSS JOIN LATERAL XMLTABLE(
        '/tournament/standings/pod[@type="finished" or @type="dnf"]/player'
        PASSING XMLPARSE(DOCUMENT event."source_xml")
        COLUMNS
            category TEXT PATH '../@category',
            pokemon_player_id TEXT PATH '@id'
    ) AS standings
    WHERE event."source_xml" IS NOT NULL
)
UPDATE "public"."league_participations" participation
SET "division" = tdf_divisions.division
FROM tdf_divisions
JOIN "public"."league_events" event ON event.id = tdf_divisions.event_id
JOIN "public"."league_player_external_ids" external_id
    ON external_id."season_id" = event."season_id"
    AND external_id."pokemon_player_id" = tdf_divisions.pokemon_player_id
WHERE participation."event_id" = tdf_divisions.event_id
  AND participation."league_player_id" = external_id."league_player_id"
  AND tdf_divisions.division IS NOT NULL;

UPDATE "public"."league_participations"
SET "division" = 'unknown'
WHERE "division" IS NULL;

ALTER TABLE "public"."league_participations"
ALTER COLUMN "division" SET NOT NULL;