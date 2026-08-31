CREATE TABLE "public"."league_seasons" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "starts_on" DATE NOT NULL,
    "ends_on" DATE NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "league_seasons_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "league_seasons_date_range_check" CHECK ("starts_on" <= "ends_on")
);

CREATE TABLE "public"."league_players" (
    "id" TEXT NOT NULL,
    "season_id" TEXT NOT NULL,
    "legacy_id" INTEGER,
    "canonical_player_id" TEXT,
    "display_name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "league_players_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "league_players_status_check" CHECK ("status" IN ('active', 'inactive'))
);

CREATE TABLE "public"."league_player_aliases" (
    "id" TEXT NOT NULL,
    "league_player_id" TEXT NOT NULL,
    "alias" TEXT NOT NULL,
    CONSTRAINT "league_player_aliases_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "public"."league_player_external_ids" (
    "id" TEXT NOT NULL,
    "season_id" TEXT NOT NULL,
    "league_player_id" TEXT NOT NULL,
    "pokemon_player_id" TEXT NOT NULL,
    CONSTRAINT "league_player_external_ids_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "public"."league_point_rules" (
    "id" TEXT NOT NULL,
    "season_id" TEXT NOT NULL,
    "position_from" INTEGER NOT NULL,
    "position_to" INTEGER,
    "points" INTEGER NOT NULL,
    CONSTRAINT "league_point_rules_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "league_point_rules_values_check" CHECK (
        "position_from" > 0 AND
        ("position_to" IS NULL OR "position_to" >= "position_from") AND
        "points" >= 0
    )
);

CREATE TABLE "public"."league_events" (
    "id" TEXT NOT NULL,
    "season_id" TEXT NOT NULL,
    "legacy_id" INTEGER,
    "official_tournament_id" TEXT,
    "import_content_hash" TEXT,
    "name" TEXT NOT NULL,
    "event_date" DATE NOT NULL,
    "participant_count" INTEGER NOT NULL DEFAULT 0,
    "prize_pool_contribution_cents" INTEGER NOT NULL DEFAULT 100,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "source_xml" TEXT,
    "notes" TEXT,
    "imported_by_admin_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "league_events_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "league_events_counts_check" CHECK (
        "participant_count" >= 0 AND "prize_pool_contribution_cents" >= 0
    )
);

CREATE TABLE "public"."league_participations" (
    "id" TEXT NOT NULL,
    "legacy_id" INTEGER,
    "event_id" TEXT NOT NULL,
    "league_player_id" TEXT NOT NULL,
    "placement" INTEGER,
    "points" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'pending_review',
    "correction_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "league_participations_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "league_participations_values_check" CHECK (
        ("placement" IS NULL OR "placement" > 0) AND
        "points" >= 0 AND
        "status" IN ('confirmed', 'dnf', 'disqualified', 'pending_review')
    )
);

CREATE TABLE "public"."league_change_log" (
    "id" TEXT NOT NULL,
    "season_id" TEXT NOT NULL,
    "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT,
    "reason" TEXT,
    "details" JSONB NOT NULL DEFAULT '{}',
    CONSTRAINT "league_change_log_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "league_seasons_slug_key" ON "public"."league_seasons"("slug");
CREATE INDEX "league_seasons_is_active_idx" ON "public"."league_seasons"("is_active");
CREATE UNIQUE INDEX "league_players_season_id_legacy_id_key" ON "public"."league_players"("season_id", "legacy_id");
CREATE UNIQUE INDEX "league_players_season_id_canonical_player_id_key" ON "public"."league_players"("season_id", "canonical_player_id");
CREATE INDEX "league_players_season_id_status_idx" ON "public"."league_players"("season_id", "status");
CREATE UNIQUE INDEX "league_player_aliases_league_player_id_alias_key" ON "public"."league_player_aliases"("league_player_id", "alias");
CREATE UNIQUE INDEX "league_player_external_ids_season_id_pokemon_player_id_key" ON "public"."league_player_external_ids"("season_id", "pokemon_player_id");
CREATE INDEX "league_player_external_ids_league_player_id_idx" ON "public"."league_player_external_ids"("league_player_id");
CREATE UNIQUE INDEX "league_point_rules_season_id_position_from_key" ON "public"."league_point_rules"("season_id", "position_from");
CREATE UNIQUE INDEX "league_events_season_id_legacy_id_key" ON "public"."league_events"("season_id", "legacy_id");
CREATE UNIQUE INDEX "league_events_season_id_official_tournament_id_key" ON "public"."league_events"("season_id", "official_tournament_id");
CREATE UNIQUE INDEX "league_events_season_id_import_content_hash_key" ON "public"."league_events"("season_id", "import_content_hash");
CREATE INDEX "league_events_season_id_event_date_idx" ON "public"."league_events"("season_id", "event_date");
CREATE UNIQUE INDEX "league_participations_event_id_league_player_id_key" ON "public"."league_participations"("event_id", "league_player_id");
CREATE INDEX "league_participations_league_player_id_idx" ON "public"."league_participations"("league_player_id");
CREATE INDEX "league_change_log_season_id_occurred_at_idx" ON "public"."league_change_log"("season_id", "occurred_at");

ALTER TABLE "public"."league_players" ADD CONSTRAINT "league_players_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "public"."league_seasons"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."league_player_aliases" ADD CONSTRAINT "league_player_aliases_league_player_id_fkey" FOREIGN KEY ("league_player_id") REFERENCES "public"."league_players"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."league_player_external_ids" ADD CONSTRAINT "league_player_external_ids_league_player_id_fkey" FOREIGN KEY ("league_player_id") REFERENCES "public"."league_players"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."league_point_rules" ADD CONSTRAINT "league_point_rules_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "public"."league_seasons"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."league_events" ADD CONSTRAINT "league_events_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "public"."league_seasons"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."league_participations" ADD CONSTRAINT "league_participations_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."league_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."league_participations" ADD CONSTRAINT "league_participations_league_player_id_fkey" FOREIGN KEY ("league_player_id") REFERENCES "public"."league_players"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."league_change_log" ADD CONSTRAINT "league_change_log_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "public"."league_seasons"("id") ON DELETE CASCADE ON UPDATE CASCADE;