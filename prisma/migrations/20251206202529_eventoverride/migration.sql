-- DropIndex
DROP INDEX "users"."admin_users_email_key";

-- CreateTable
CREATE TABLE "public"."external_event_overrides" (
    "id" TEXT NOT NULL,
    "event_name" TEXT NOT NULL,
    "event_date" TIMESTAMP(3) NOT NULL,
    "event_location" TEXT,
    "overrides" JSONB NOT NULL,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,

    CONSTRAINT "external_event_overrides_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "external_event_overrides_event_name_event_date_key" ON "public"."external_event_overrides"("event_name", "event_date");

-- AddForeignKey
ALTER TABLE "public"."external_event_overrides" ADD CONSTRAINT "external_event_overrides_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"."admin_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
