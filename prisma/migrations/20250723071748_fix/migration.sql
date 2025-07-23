/*
  Warnings:

  - Added the required column `legal` to the `card_set` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."card_set" ADD COLUMN     "abbreviation" TEXT,
ADD COLUMN     "legal" JSONB NOT NULL;
