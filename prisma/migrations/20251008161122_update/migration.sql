/*
  Warnings:

  - You are about to drop the column `cognitive_status` on the `Resident` table. All the data in the column will be lost.
  - You are about to drop the column `mobility_status` on the `Resident` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."Resident" DROP COLUMN "cognitive_status",
DROP COLUMN "mobility_status";

-- CreateTable
CREATE TABLE "public"."HealthAssessment" (
    "assessment_id" TEXT NOT NULL,
    "resident_id" TEXT NOT NULL,
    "assessed_by_id" TEXT NOT NULL,
    "cognitive_status" "public"."CognitiveStatus" NOT NULL DEFAULT 'NORMAL',
    "mobility_status" "public"."MobilityStatus" NOT NULL DEFAULT 'INDEPENDENT',
    "weight_kg" DOUBLE PRECISION,
    "height_cm" DOUBLE PRECISION,
    "bmi" DOUBLE PRECISION,
    "temperature_c" DOUBLE PRECISION,
    "blood_pressure_systolic" INTEGER,
    "blood_pressure_diastolic" INTEGER,
    "heart_rate" INTEGER,
    "respiratory_rate" INTEGER,
    "oxygen_saturation" INTEGER,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HealthAssessment_pkey" PRIMARY KEY ("assessment_id")
);

-- CreateIndex
CREATE INDEX "HealthAssessment_resident_id_idx" ON "public"."HealthAssessment"("resident_id");

-- AddForeignKey
ALTER TABLE "public"."HealthAssessment" ADD CONSTRAINT "HealthAssessment_resident_id_fkey" FOREIGN KEY ("resident_id") REFERENCES "public"."Resident"("resident_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."HealthAssessment" ADD CONSTRAINT "HealthAssessment_assessed_by_id_fkey" FOREIGN KEY ("assessed_by_id") REFERENCES "public"."User"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;
