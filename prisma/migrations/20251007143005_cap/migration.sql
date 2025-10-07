/*
  Warnings:

  - You are about to drop the column `name` on the `Resident` table. All the data in the column will be lost.
  - Added the required column `full_name` to the `Resident` table without a default value. This is not possible if the table is not empty.
  - Added the required column `gender` to the `Resident` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "public"."Gender" AS ENUM ('male', 'female');

-- AlterTable
ALTER TABLE "public"."Resident" DROP COLUMN "name",
ADD COLUMN     "full_name" TEXT NOT NULL,
ADD COLUMN     "gender" "public"."Gender" NOT NULL;
