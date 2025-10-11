/*
  Warnings:

  - The values [done] on the enum `ResidentAssessmentStatus` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `notes` on the `ResidentApplication` table. All the data in the column will be lost.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "public"."ResidentAssessmentStatus_new" AS ENUM ('pending', 'canceled', 'completed', 'rejected');
ALTER TABLE "public"."ResidentApplication" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "public"."ResidentApplication" ALTER COLUMN "status" TYPE "public"."ResidentAssessmentStatus_new" USING ("status"::text::"public"."ResidentAssessmentStatus_new");
ALTER TYPE "public"."ResidentAssessmentStatus" RENAME TO "ResidentAssessmentStatus_old";
ALTER TYPE "public"."ResidentAssessmentStatus_new" RENAME TO "ResidentAssessmentStatus";
DROP TYPE "public"."ResidentAssessmentStatus_old";
ALTER TABLE "public"."ResidentApplication" ALTER COLUMN "status" SET DEFAULT 'pending';
COMMIT;

-- AlterTable
ALTER TABLE "public"."ResidentApplication" DROP COLUMN "notes";
