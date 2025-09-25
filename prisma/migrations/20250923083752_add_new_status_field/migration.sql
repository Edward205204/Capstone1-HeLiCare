/*
  Warnings:

  - Added the required column `status` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "public"."UserStatus" AS ENUM ('active', 'inactive');

-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "status" "public"."UserStatus" NOT NULL;
