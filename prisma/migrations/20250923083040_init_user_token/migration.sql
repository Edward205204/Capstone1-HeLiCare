/*
  Warnings:

  - You are about to drop the column `refresh_token` on the `UserToken` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[token_string]` on the table `UserToken` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `token_string` to the `UserToken` table without a default value. This is not possible if the table is not empty.
  - Added the required column `token_type` to the `UserToken` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "public"."TokenType" AS ENUM ('AccessToken', 'RefreshToken');

-- DropIndex
DROP INDEX "public"."UserToken_refresh_token_key";

-- AlterTable
ALTER TABLE "public"."UserToken" DROP COLUMN "refresh_token",
ADD COLUMN     "token_string" TEXT NOT NULL,
ADD COLUMN     "token_type" "public"."TokenType" NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "UserToken_token_string_key" ON "public"."UserToken"("token_string");
