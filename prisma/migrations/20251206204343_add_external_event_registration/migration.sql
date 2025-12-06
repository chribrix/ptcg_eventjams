/*
  Warnings:

  - A unique constraint covering the columns `[external_event_id,player_id]` on the table `event_registrations` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "public"."event_registrations" ADD COLUMN     "external_event_id" TEXT,
ALTER COLUMN "custom_event_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "public"."external_event_overrides" ADD COLUMN     "description" TEXT,
ADD COLUMN     "handle_registration_locally" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "max_participants" INTEGER,
ADD COLUMN     "participation_fee" DECIMAL(10,2),
ADD COLUMN     "registration_deadline" TIMESTAMP(3),
ADD COLUMN     "requires_decklist" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE UNIQUE INDEX "event_registrations_external_event_id_player_id_key" ON "public"."event_registrations"("external_event_id", "player_id");

-- AddForeignKey
ALTER TABLE "public"."event_registrations" ADD CONSTRAINT "event_registrations_external_event_id_fkey" FOREIGN KEY ("external_event_id") REFERENCES "public"."external_event_overrides"("id") ON DELETE CASCADE ON UPDATE CASCADE;
