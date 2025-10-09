-- CreateTable
CREATE TABLE "public"."custom_events" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "venue" TEXT NOT NULL,
    "max_participants" INTEGER NOT NULL,
    "participation_fee" DECIMAL(10,2),
    "description" TEXT,
    "event_date" TIMESTAMP(3) NOT NULL,
    "registration_deadline" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'upcoming',
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "custom_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."players" (
    "id" TEXT NOT NULL,
    "player_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "birth_date" TIMESTAMP(3) NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "emergency_contact" TEXT,
    "emergency_phone" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "players_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."event_registrations" (
    "id" TEXT NOT NULL,
    "custom_event_id" TEXT NOT NULL,
    "player_id" TEXT NOT NULL,
    "registered_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'registered',
    "notes" TEXT,

    CONSTRAINT "event_registrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."custom_event_participants" (
    "id" TEXT NOT NULL,
    "custom_event_id" TEXT NOT NULL,
    "player_id" TEXT NOT NULL,
    "placement" INTEGER,
    "points" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "custom_event_participants_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "players_player_id_key" ON "public"."players"("player_id");

-- CreateIndex
CREATE UNIQUE INDEX "event_registrations_custom_event_id_player_id_key" ON "public"."event_registrations"("custom_event_id", "player_id");

-- CreateIndex
CREATE UNIQUE INDEX "custom_event_participants_custom_event_id_player_id_key" ON "public"."custom_event_participants"("custom_event_id", "player_id");

-- AddForeignKey
ALTER TABLE "public"."custom_events" ADD CONSTRAINT "custom_events_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."event_registrations" ADD CONSTRAINT "event_registrations_custom_event_id_fkey" FOREIGN KEY ("custom_event_id") REFERENCES "public"."custom_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."event_registrations" ADD CONSTRAINT "event_registrations_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."custom_event_participants" ADD CONSTRAINT "custom_event_participants_custom_event_id_fkey" FOREIGN KEY ("custom_event_id") REFERENCES "public"."custom_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."custom_event_participants" ADD CONSTRAINT "custom_event_participants_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
