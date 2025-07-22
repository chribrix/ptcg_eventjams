-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "conversions";

-- CreateEnum
CREATE TYPE "public"."CardType" AS ENUM ('ENERGY', 'TRAINER', 'POKEMON');

-- CreateTable
CREATE TABLE "public"."cards" (
    "id" TEXT NOT NULL,
    "printed_id" TEXT NOT NULL,
    "name" JSONB NOT NULL,
    "set_code" TEXT NOT NULL,
    "rarity" TEXT NOT NULL,
    "type" "public"."CardType" NOT NULL,
    "legal" JSONB NOT NULL,
    "card_number" INTEGER,
    "image_url" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "api_updated_at" TIMESTAMP(3) NOT NULL,
    "trainer" JSONB,
    "energy" JSONB,
    "pokemon" JSONB,

    CONSTRAINT "cards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."card_set" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "series" TEXT NOT NULL,
    "release_date" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "card_set_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversions"."energy_type_map_en" (
    "energy_type" TEXT NOT NULL,
    "full_text" TEXT NOT NULL,

    CONSTRAINT "energy_type_map_en_pkey" PRIMARY KEY ("energy_type")
);

-- CreateTable
CREATE TABLE "conversions"."energy_abbrv_map" (
    "ptcgl_export" TEXT NOT NULL,
    "full_text" TEXT NOT NULL,

    CONSTRAINT "energy_abbrv_map_pkey" PRIMARY KEY ("ptcgl_export")
);

-- CreateTable
CREATE TABLE "conversions"."energy_alias_map" (
    "alias" TEXT NOT NULL,
    "canonical" TEXT NOT NULL,

    CONSTRAINT "energy_alias_map_pkey" PRIMARY KEY ("alias")
);

-- CreateTable
CREATE TABLE "conversions"."set_codes_en" (
    "intl_code" TEXT NOT NULL,
    "japanese_code" TEXT NOT NULL,
    "intl_name" TEXT NOT NULL,
    "japanese_name" TEXT,

    CONSTRAINT "set_codes_en_pkey" PRIMARY KEY ("intl_code")
);

-- CreateTable
CREATE TABLE "public"."meta_state" (
    "id" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "info" JSONB,

    CONSTRAINT "meta_state_pkey" PRIMARY KEY ("id")
);
