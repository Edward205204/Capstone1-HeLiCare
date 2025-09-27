/*
  Warnings:

  - The primary key for the `StaffProfile` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `staff_id` on the `StaffProfile` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."StaffProfile" DROP CONSTRAINT "StaffProfile_pkey",
DROP COLUMN "staff_id",
ADD CONSTRAINT "StaffProfile_pkey" PRIMARY KEY ("user_id");
