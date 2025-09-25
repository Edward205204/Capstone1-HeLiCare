/*
  Warnings:

  - You are about to drop the column `expires_at` on the `UserToken` table. All the data in the column will be lost.
  - Added the required column `exp` to the `UserToken` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
ALTER TYPE "public"."TokenType" ADD VALUE 'EmailVerifyToken';

-- AlterTable
ALTER TABLE "public"."UserToken" DROP COLUMN "expires_at",
ADD COLUMN     "exp" TIMESTAMP(3) NOT NULL;
