/*
  Warnings:

  - The values [audio] on the enum `MediaType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "public"."MediaType_new" AS ENUM ('image', 'video', 'hls');
ALTER TYPE "public"."MediaType" RENAME TO "MediaType_old";
ALTER TYPE "public"."MediaType_new" RENAME TO "MediaType";
DROP TYPE "public"."MediaType_old";
COMMIT;
