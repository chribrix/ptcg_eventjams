-- AlterTable
ALTER TABLE "public"."custom_events" ADD COLUMN     "requires_decklist" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "public"."event_registrations" ADD COLUMN     "decklist" TEXT;
