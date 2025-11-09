/*
  Warnings:

  - The values [scheduled,checked_in,cancelled] on the enum `VisitStatus` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `checked_in_at` on the `Visit` table. All the data in the column will be lost.
  - You are about to drop the column `checked_out_at` on the `Visit` table. All the data in the column will be lost.
  - You are about to drop the column `qr_code_data` on the `Visit` table. All the data in the column will be lost.
  - You are about to drop the column `qr_expires_at` on the `Visit` table. All the data in the column will be lost.
  - You are about to drop the `VideoEncode` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `VisitConfiguration` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `VisitDailyStats` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `VisitSlot` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `VisitTimeSlot` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "public"."PaymentTransactionStatus" AS ENUM ('pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "public"."PaymentMethod" ADD VALUE 'COD';
ALTER TYPE "public"."PaymentMethod" ADD VALUE 'momo';
ALTER TYPE "public"."PaymentMethod" ADD VALUE 'bank_transfer';
ALTER TYPE "public"."PaymentMethod" ADD VALUE 'visa';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "public"."PaymentStatus" ADD VALUE 'failed';
ALTER TYPE "public"."PaymentStatus" ADD VALUE 'cancelled';
ALTER TYPE "public"."PaymentStatus" ADD VALUE 'refunded';

-- AlterEnum
BEGIN;
CREATE TYPE "public"."VisitStatus_new" AS ENUM ('pending', 'approved', 'rejected', 'completed');
ALTER TABLE "public"."Visit" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "public"."Visit" ALTER COLUMN "status" TYPE "public"."VisitStatus_new" USING ("status"::text::"public"."VisitStatus_new");
ALTER TYPE "public"."VisitStatus" RENAME TO "VisitStatus_old";
ALTER TYPE "public"."VisitStatus_new" RENAME TO "VisitStatus";
DROP TYPE "public"."VisitStatus_old";
ALTER TABLE "public"."Visit" ALTER COLUMN "status" SET DEFAULT 'pending';
COMMIT;

-- DropForeignKey
ALTER TABLE "public"."VisitConfiguration" DROP CONSTRAINT "VisitConfiguration_institution_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."VisitDailyStats" DROP CONSTRAINT "VisitDailyStats_institution_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."VisitSlot" DROP CONSTRAINT "VisitSlot_slot_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."VisitSlot" DROP CONSTRAINT "VisitSlot_visit_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."VisitTimeSlot" DROP CONSTRAINT "VisitTimeSlot_institution_id_fkey";

-- DropIndex
DROP INDEX "public"."Visit_qr_code_data_idx";

-- AlterTable
ALTER TABLE "public"."Visit" DROP COLUMN "checked_in_at",
DROP COLUMN "checked_out_at",
DROP COLUMN "qr_code_data",
DROP COLUMN "qr_expires_at";

-- DropTable
DROP TABLE "public"."VideoEncode";

-- DropTable
DROP TABLE "public"."VisitConfiguration";

-- DropTable
DROP TABLE "public"."VisitDailyStats";

-- DropTable
DROP TABLE "public"."VisitSlot";

-- DropTable
DROP TABLE "public"."VisitTimeSlot";

-- DropEnum
DROP TYPE "public"."MediaType";

-- DropEnum
DROP TYPE "public"."VideoEncodeStatus";

-- CreateTable
CREATE TABLE "public"."Payment" (
    "payment_id" TEXT NOT NULL,
    "contract_id" TEXT NOT NULL,
    "family_user_id" TEXT NOT NULL,
    "institution_id" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "payment_method" "public"."PaymentMethod" NOT NULL,
    "status" "public"."PaymentStatus" NOT NULL DEFAULT 'pending',
    "due_date" TIMESTAMP(3) NOT NULL,
    "paid_date" TIMESTAMP(3),
    "payment_period_start" TIMESTAMP(3) NOT NULL,
    "payment_period_end" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("payment_id")
);

-- CreateTable
CREATE TABLE "public"."PaymentTransaction" (
    "transaction_id" TEXT NOT NULL,
    "payment_id" TEXT NOT NULL,
    "transaction_code" TEXT,
    "payment_method" "public"."PaymentMethod" NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "status" "public"."PaymentTransactionStatus" NOT NULL DEFAULT 'pending',
    "gateway_response" JSONB,
    "gateway_transaction_id" TEXT,
    "error_message" TEXT,
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentTransaction_pkey" PRIMARY KEY ("transaction_id")
);

-- CreateIndex
CREATE INDEX "Payment_contract_id_idx" ON "public"."Payment"("contract_id");

-- CreateIndex
CREATE INDEX "Payment_family_user_id_idx" ON "public"."Payment"("family_user_id");

-- CreateIndex
CREATE INDEX "Payment_status_idx" ON "public"."Payment"("status");

-- CreateIndex
CREATE INDEX "Payment_due_date_idx" ON "public"."Payment"("due_date");

-- CreateIndex
CREATE INDEX "Payment_institution_id_idx" ON "public"."Payment"("institution_id");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentTransaction_transaction_code_key" ON "public"."PaymentTransaction"("transaction_code");

-- CreateIndex
CREATE INDEX "PaymentTransaction_payment_id_idx" ON "public"."PaymentTransaction"("payment_id");

-- CreateIndex
CREATE INDEX "PaymentTransaction_status_idx" ON "public"."PaymentTransaction"("status");

-- CreateIndex
CREATE INDEX "PaymentTransaction_transaction_code_idx" ON "public"."PaymentTransaction"("transaction_code");

-- CreateIndex
CREATE INDEX "PaymentTransaction_gateway_transaction_id_idx" ON "public"."PaymentTransaction"("gateway_transaction_id");

-- AddForeignKey
ALTER TABLE "public"."Payment" ADD CONSTRAINT "Payment_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "public"."Contract"("contract_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Payment" ADD CONSTRAINT "Payment_family_user_id_fkey" FOREIGN KEY ("family_user_id") REFERENCES "public"."User"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Payment" ADD CONSTRAINT "Payment_institution_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "public"."Institution"("institution_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PaymentTransaction" ADD CONSTRAINT "PaymentTransaction_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "public"."Payment"("payment_id") ON DELETE RESTRICT ON UPDATE CASCADE;
