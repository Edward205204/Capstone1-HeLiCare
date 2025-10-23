/*
  Warnings:

  - You are about to drop the column `allergies` on the `Resident` table. All the data in the column will be lost.
  - You are about to drop the column `chronic_diseases` on the `Resident` table. All the data in the column will be lost.
  - Made the column `cognitive_status` on table `Resident` required. This step will fail if there are existing NULL values in that column.
  - Made the column `mobility_status` on table `Resident` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "public"."DiseaseSeverity" AS ENUM ('MILD', 'MODERATE', 'SEVERE');

-- CreateEnum
CREATE TYPE "public"."DiseaseStatus" AS ENUM ('ACTIVE', 'RECOVERED');

-- CreateEnum
CREATE TYPE "public"."AllergySeverity" AS ENUM ('MILD', 'MODERATE', 'SEVERE');

-- AlterTable
ALTER TABLE "public"."Resident" DROP COLUMN "allergies",
DROP COLUMN "chronic_diseases",
ALTER COLUMN "cognitive_status" SET NOT NULL,
ALTER COLUMN "cognitive_status" SET DEFAULT 'NORMAL',
ALTER COLUMN "mobility_status" SET NOT NULL,
ALTER COLUMN "mobility_status" SET DEFAULT 'INDEPENDENT';

-- CreateTable
CREATE TABLE "public"."ChronicDisease" (
    "id" TEXT NOT NULL,
    "resident_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "diagnosed_at" TIMESTAMP(3),
    "severity" "public"."DiseaseSeverity",
    "status" "public"."DiseaseStatus" DEFAULT 'ACTIVE',
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChronicDisease_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Allergy" (
    "id" TEXT NOT NULL,
    "resident_id" TEXT NOT NULL,
    "substance" TEXT NOT NULL,
    "reaction" TEXT,
    "severity" "public"."AllergySeverity",
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Allergy_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."ChronicDisease" ADD CONSTRAINT "ChronicDisease_resident_id_fkey" FOREIGN KEY ("resident_id") REFERENCES "public"."Resident"("resident_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Allergy" ADD CONSTRAINT "Allergy_resident_id_fkey" FOREIGN KEY ("resident_id") REFERENCES "public"."Resident"("resident_id") ON DELETE RESTRICT ON UPDATE CASCADE;
