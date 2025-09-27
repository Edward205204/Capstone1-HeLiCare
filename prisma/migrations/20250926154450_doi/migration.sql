/*
  Warnings:

  - The `address` column on the `Institution` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "public"."Institution" DROP COLUMN "address",
ADD COLUMN     "address" JSONB NOT NULL DEFAULT '{"province": "", "district": "", "ward": "", "street": "", "house_number": ""}';
