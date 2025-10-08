-- CreateEnum
CREATE TYPE "public"."InstitutionContractStatus" AS ENUM ('active', 'cancelled');

-- AlterTable
ALTER TABLE "public"."Institution" ADD COLUMN     "status" "public"."InstitutionContractStatus" NOT NULL DEFAULT 'active';
