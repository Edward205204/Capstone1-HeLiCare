/*
  Warnings:

  - Added the required column `position` to the `StaffProfile` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "public"."StaffPosition" AS ENUM ('NURSE', 'CAREGIVER', 'THERAPIST', 'PHYSICIAN', 'SOCIAL_WORKER', 'ACTIVITY_COORDINATOR', 'DIETITIAN', 'OTHER');

-- AlterTable
ALTER TABLE "public"."StaffProfile" ADD COLUMN     "position" "public"."StaffPosition" NOT NULL;
