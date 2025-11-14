/*
  Warnings:

  - Added the required column `family_email` to the `FamilyResidentLink` table without a default value. This is not possible if the table is not empty.

*/
-- Step 1: Add column with temporary default
ALTER TABLE "public"."FamilyResidentLink" ADD COLUMN "family_email" TEXT NOT NULL DEFAULT '';

-- Step 2: Update existing rows with email from User table
UPDATE "public"."FamilyResidentLink" frl
SET "family_email" = u.email
FROM "public"."User" u
WHERE frl.family_user_id = u.user_id;

-- Step 3: Remove default value (for new inserts must provide email)
ALTER TABLE "public"."FamilyResidentLink" ALTER COLUMN "family_email" DROP DEFAULT;
