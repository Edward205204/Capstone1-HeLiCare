-- DropForeignKey
ALTER TABLE "public"."Resident" DROP CONSTRAINT "Resident_institution_id_fkey";

-- AlterTable
ALTER TABLE "public"."Resident" ALTER COLUMN "institution_id" DROP NOT NULL,
ALTER COLUMN "admission_date" DROP NOT NULL;

-- DropEnum
DROP TYPE "public"."ActivityStatus";

-- DropEnum
DROP TYPE "public"."AlertType";

-- DropEnum
DROP TYPE "public"."CareLogType";

-- DropEnum
DROP TYPE "public"."CareTaskStatus";

-- DropEnum
DROP TYPE "public"."ContractServiceStatus";

-- DropEnum
DROP TYPE "public"."ContractStatus";

-- DropEnum
DROP TYPE "public"."InvitationStatus";

-- DropEnum
DROP TYPE "public"."MedicationStatus";

-- DropEnum
DROP TYPE "public"."NotificationType";

-- DropEnum
DROP TYPE "public"."PaymentFrequency";

-- DropEnum
DROP TYPE "public"."PaymentStatus";

-- DropEnum
DROP TYPE "public"."ServiceType";

-- DropEnum
DROP TYPE "public"."SpecialCareStatus";

-- DropEnum
DROP TYPE "public"."VisitStatus";

-- AddForeignKey
ALTER TABLE "public"."Resident" ADD CONSTRAINT "Resident_institution_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "public"."Institution"("institution_id") ON DELETE SET NULL ON UPDATE CASCADE;
