/*
  Warnings:

  - The `status` column on the `ResidentApplication` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "public"."ResidentAssessmentStatus" AS ENUM ('pending', 'done', 'rejected');

-- AlterTable
ALTER TABLE "public"."ResidentApplication" DROP COLUMN "status",
ADD COLUMN     "status" "public"."ResidentAssessmentStatus" NOT NULL DEFAULT 'pending';

-- DropEnum
DROP TYPE "public"."ResidentApplicationStatus";
