/*
  Warnings:

  - You are about to drop the column `business_id` on the `StaffProfile` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "public"."StaffProfile_business_id_key";

-- AlterTable
ALTER TABLE "public"."StaffProfile" DROP COLUMN "business_id";
