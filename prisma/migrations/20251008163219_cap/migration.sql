/*
  Warnings:

  - Added the required column `institution_id` to the `ResidentApplication` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."ResidentApplication" ADD COLUMN     "institution_id" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "public"."ResidentApplication" ADD CONSTRAINT "ResidentApplication_institution_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "public"."Institution"("institution_id") ON DELETE RESTRICT ON UPDATE CASCADE;
