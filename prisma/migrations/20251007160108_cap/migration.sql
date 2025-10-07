-- AlterTable
ALTER TABLE "public"."Resident" ALTER COLUMN "cognitive_status" DROP NOT NULL,
ALTER COLUMN "mobility_status" DROP NOT NULL,
ALTER COLUMN "chronic_diseases" DROP NOT NULL,
ALTER COLUMN "allergies" DROP NOT NULL;
