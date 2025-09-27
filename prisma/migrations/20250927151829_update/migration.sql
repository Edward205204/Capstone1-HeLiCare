/*
  Warnings:

  - The values [RootAdminInviteToken] on the enum `TokenType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "public"."TokenType_new" AS ENUM ('AccessToken', 'RefreshToken', 'EmailVerifyToken', 'ForgotPasswordToken', 'StaffInviteToken', 'AdminInviteToken');
ALTER TABLE "public"."UserToken" ALTER COLUMN "token_type" TYPE "public"."TokenType_new" USING ("token_type"::text::"public"."TokenType_new");
ALTER TYPE "public"."TokenType" RENAME TO "TokenType_old";
ALTER TYPE "public"."TokenType_new" RENAME TO "TokenType";
DROP TYPE "public"."TokenType_old";
COMMIT;
