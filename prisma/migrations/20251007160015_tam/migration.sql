/*
  Warnings:

  - You are about to drop the `ResidentApplication` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."ResidentApplication" DROP CONSTRAINT "ResidentApplication_family_user_id_fkey";

-- DropTable
DROP TABLE "public"."ResidentApplication";
