/*
  Warnings:

  - The values [momo] on the enum `PaymentMethod` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `paid_date` on the `Payment` table. All the data in the column will be lost.
  - You are about to drop the column `payment_method` on the `Payment` table. All the data in the column will be lost.
  - You are about to drop the column `payment_period_end` on the `Payment` table. All the data in the column will be lost.
  - You are about to drop the column `payment_period_start` on the `Payment` table. All the data in the column will be lost.
  - You are about to drop the `PaymentTransaction` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[payment_number]` on the table `Payment` will be added. If there are existing duplicate values, this will fail.
*/
-- Step 1: Drop PaymentTransaction table FIRST (before renaming enum, as it depends on PaymentMethod enum)
-- Drop foreign key constraint first
ALTER TABLE "public"."PaymentTransaction" DROP CONSTRAINT IF EXISTS "PaymentTransaction_payment_id_fkey";
-- Drop the table
DROP TABLE IF EXISTS "public"."PaymentTransaction";

-- Step 2: Drop PaymentTransactionStatus enum (no longer needed)
DROP TYPE IF EXISTS "public"."PaymentTransactionStatus";

-- Step 3: Remove 'momo' and fix 'Paypal' (uppercase) to 'paypal' (lowercase) in PaymentMethod enum
-- Safe after cleanup and dropping PaymentTransaction
BEGIN;
CREATE TYPE "public"."PaymentMethod_new" AS ENUM ('COD', 'paypal', 'bank_transfer', 'visa');
-- Update existing payment_method values to new enum:
-- - Convert 'momo' to 'COD' (should already be deleted by cleanup script, but handle just in case)
-- - Convert 'Paypal' (uppercase) to 'paypal' (lowercase) for consistency
-- - Keep other valid values as is
ALTER TABLE "public"."Payment" ALTER COLUMN "payment_method" TYPE "public"."PaymentMethod_new" USING (
  CASE 
    WHEN LOWER("payment_method"::text) = 'momo' THEN 'COD'::text::"public"."PaymentMethod_new"
    WHEN LOWER("payment_method"::text) = 'paypal' THEN 'paypal'::text::"public"."PaymentMethod_new"
    WHEN "payment_method"::text = 'COD' THEN 'COD'::text::"public"."PaymentMethod_new"
    WHEN "payment_method"::text = 'bank_transfer' THEN 'bank_transfer'::text::"public"."PaymentMethod_new"
    WHEN "payment_method"::text = 'visa' THEN 'visa'::text::"public"."PaymentMethod_new"
    ELSE 'COD'::text::"public"."PaymentMethod_new" -- Default fallback for any unexpected values
  END
);
ALTER TYPE "public"."PaymentMethod" RENAME TO "PaymentMethod_old";
ALTER TYPE "public"."PaymentMethod_new" RENAME TO "PaymentMethod";
DROP TYPE "public"."PaymentMethod_old";
COMMIT;

-- Step 4: Add 'processing' status to PaymentStatus enum
ALTER TYPE "public"."PaymentStatus" ADD VALUE IF NOT EXISTS 'processing';

-- Step 5: Add new columns to Payment table (with temporary defaults for existing data)
ALTER TABLE "public"."Payment" 
  ADD COLUMN IF NOT EXISTS "failure_reason" TEXT,
  ADD COLUMN IF NOT EXISTS "metadata" JSONB,
  ADD COLUMN IF NOT EXISTS "paid_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "payment_reference" TEXT;

-- Step 6: Add method column (nullable first, then populate from payment_method, then set NOT NULL)
ALTER TABLE "public"."Payment" 
  ADD COLUMN IF NOT EXISTS "method" "public"."PaymentMethod";

-- Copy data from payment_method to method for existing records
UPDATE "public"."Payment" 
SET "method" = "payment_method"::text::"public"."PaymentMethod"
WHERE "method" IS NULL AND "payment_method" IS NOT NULL;

-- Set default for any remaining NULL values (shouldn't happen after cleanup, but just in case)
UPDATE "public"."Payment" 
SET "method" = 'COD'::"public"."PaymentMethod"
WHERE "method" IS NULL;

-- Now set NOT NULL constraint
ALTER TABLE "public"."Payment" 
  ALTER COLUMN "method" SET NOT NULL;

-- Step 7: Add payment_number column (nullable first, then generate values, then set NOT NULL)
ALTER TABLE "public"."Payment" 
  ADD COLUMN IF NOT EXISTS "payment_number" TEXT;

-- Generate unique payment numbers for existing records using payment_id to ensure uniqueness
UPDATE "public"."Payment" 
SET "payment_number" = 'PAY-' || EXTRACT(EPOCH FROM COALESCE("created_at", NOW()))::BIGINT || '-' || UPPER(SUBSTRING(REPLACE("payment_id"::text, '-', ''), 1, 8))
WHERE "payment_number" IS NULL;

-- Verify uniqueness before creating unique index (check for duplicates)
DO $$
DECLARE
  duplicate_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO duplicate_count
  FROM (
    SELECT "payment_number", COUNT(*) as cnt
    FROM "public"."Payment"
    WHERE "payment_number" IS NOT NULL
    GROUP BY "payment_number"
    HAVING COUNT(*) > 1
  ) duplicates;
  
  IF duplicate_count > 0 THEN
    RAISE EXCEPTION 'Found duplicate payment_number values. Please check data before proceeding.';
  END IF;
END $$;

-- Now set NOT NULL constraint
ALTER TABLE "public"."Payment" 
  ALTER COLUMN "payment_number" SET NOT NULL;

-- Step 8: Drop old columns
ALTER TABLE "public"."Payment" 
  DROP COLUMN IF EXISTS "paid_date",
  DROP COLUMN IF EXISTS "payment_method",
  DROP COLUMN IF EXISTS "payment_period_end",
  DROP COLUMN IF EXISTS "payment_period_start";

-- Step 9: Create PaymentItem table (drop if exists to avoid conflicts)
DROP TABLE IF EXISTS "public"."PaymentItem";

CREATE TABLE "public"."PaymentItem" (
    "payment_item_id" TEXT NOT NULL,
    "payment_id" TEXT NOT NULL,
    "package_id" TEXT NOT NULL,
    "contract_service_id" TEXT,
    "item_name" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unit_price" DOUBLE PRECISION NOT NULL,
    "total_price" DOUBLE PRECISION NOT NULL,
    "period_start" TIMESTAMP(3) NOT NULL,
    "period_end" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentItem_pkey" PRIMARY KEY ("payment_item_id")
);

-- Step 10: Create indexes for payment_number
-- Drop existing indexes if they exist
DROP INDEX IF EXISTS "public"."Payment_payment_number_key";
DROP INDEX IF EXISTS "public"."Payment_payment_number_idx";

-- Create unique index
CREATE UNIQUE INDEX "Payment_payment_number_key" ON "public"."Payment"("payment_number");

-- Create regular index
CREATE INDEX "Payment_payment_number_idx" ON "public"."Payment"("payment_number");

-- AddForeignKey
ALTER TABLE "public"."PaymentItem" ADD CONSTRAINT "PaymentItem_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "public"."Payment"("payment_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PaymentItem" ADD CONSTRAINT "PaymentItem_package_id_fkey" FOREIGN KEY ("package_id") REFERENCES "public"."ServicePackage"("package_id") ON DELETE RESTRICT ON UPDATE CASCADE;
