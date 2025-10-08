-- CreateEnum
CREATE TYPE "public"."ResidentApplicationStatus" AS ENUM ('pending', 'approved', 'rejected');

-- CreateTable
CREATE TABLE "public"."ResidentApplication" (
    "application_id" TEXT NOT NULL,
    "family_user_id" TEXT,
    "resident_id" TEXT NOT NULL,
    "status" "public"."ResidentApplicationStatus" NOT NULL DEFAULT 'pending',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResidentApplication_pkey" PRIMARY KEY ("application_id")
);
