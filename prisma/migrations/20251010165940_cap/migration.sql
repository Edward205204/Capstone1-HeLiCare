/*
  Warnings:

  - Added the required column `appointment_date` to the `ResidentApplication` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."ResidentApplication" ADD COLUMN     "appointment_date" TIMESTAMP(3) NOT NULL;
