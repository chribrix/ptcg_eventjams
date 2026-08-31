-- CreateTable
CREATE TABLE "public"."event_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "venue" TEXT NOT NULL,
    "max_participants" INTEGER NOT NULL,
    "participation_fee" DECIMAL(10,2),
    "description" TEXT,
    "requires_decklist" BOOLEAN NOT NULL DEFAULT false,
    "tag_type" TEXT NOT NULL DEFAULT 'pokemon',
    "tags" JSONB,
    "weekday" INTEGER NOT NULL,
    "event_time" TEXT NOT NULL,
    "registration_deadline_minutes_before" INTEGER,
    "time_zone" TEXT NOT NULL DEFAULT 'Europe/Vienna',
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "event_templates_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."event_templates" ADD CONSTRAINT "event_templates_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"."admin_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
