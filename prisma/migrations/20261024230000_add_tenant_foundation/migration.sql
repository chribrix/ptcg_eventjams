-- Preserve existing single-store data under a concrete first tenant.
CREATE TABLE "public"."tenants" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'active',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "tenants_slug_key" ON "public"."tenants"("slug");

INSERT INTO "public"."tenants" ("id", "slug", "name", "status", "created_at", "updated_at")
VALUES ('crows-and-owls', 'crows-and-owls', 'Crows & Owls', 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

CREATE TABLE "public"."tenant_memberships" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "role" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "tenant_memberships_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "tenant_memberships_role_check" CHECK ("role" IN ('owner', 'admin', 'staff'))
);

CREATE UNIQUE INDEX "tenant_memberships_tenant_id_user_id_key" ON "public"."tenant_memberships"("tenant_id", "user_id");
CREATE INDEX "tenant_memberships_user_id_idx" ON "public"."tenant_memberships"("user_id");
ALTER TABLE "public"."tenant_memberships" ADD CONSTRAINT "tenant_memberships_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."custom_events" ADD COLUMN "tenant_id" TEXT NOT NULL DEFAULT 'crows-and-owls';
ALTER TABLE "public"."event_templates" ADD COLUMN "tenant_id" TEXT NOT NULL DEFAULT 'crows-and-owls';
ALTER TABLE "public"."venue_directory_entries" ADD COLUMN "tenant_id" TEXT NOT NULL DEFAULT 'crows-and-owls';
ALTER TABLE "public"."external_event_overrides" ADD COLUMN "tenant_id" TEXT NOT NULL DEFAULT 'crows-and-owls';
ALTER TABLE "public"."league_seasons" ADD COLUMN "tenant_id" TEXT NOT NULL DEFAULT 'crows-and-owls';

CREATE INDEX "custom_events_tenant_id_idx" ON "public"."custom_events"("tenant_id");
CREATE INDEX "event_templates_tenant_id_idx" ON "public"."event_templates"("tenant_id");
CREATE INDEX "venue_directory_entries_tenant_id_idx" ON "public"."venue_directory_entries"("tenant_id");
CREATE INDEX "external_event_overrides_tenant_id_idx" ON "public"."external_event_overrides"("tenant_id");
CREATE INDEX "league_seasons_tenant_id_idx" ON "public"."league_seasons"("tenant_id");

ALTER TABLE "public"."custom_events" ADD CONSTRAINT "custom_events_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "public"."event_templates" ADD CONSTRAINT "event_templates_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "public"."venue_directory_entries" ADD CONSTRAINT "venue_directory_entries_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "public"."external_event_overrides" ADD CONSTRAINT "external_event_overrides_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "public"."league_seasons" ADD CONSTRAINT "league_seasons_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
