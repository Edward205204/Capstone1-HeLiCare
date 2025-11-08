-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "public"."VisitStatus" ADD VALUE 'scheduled';
ALTER TYPE "public"."VisitStatus" ADD VALUE 'checked_in';
ALTER TYPE "public"."VisitStatus" ADD VALUE 'cancelled';

-- CreateTable
CREATE TABLE "public"."Visit" (
    "visit_id" TEXT NOT NULL,
    "family_user_id" TEXT NOT NULL,
    "resident_id" TEXT NOT NULL,
    "institution_id" TEXT NOT NULL,
    "visit_date" TIMESTAMP(3) NOT NULL,
    "visit_time" TEXT NOT NULL,
    "duration" INTEGER NOT NULL,
    "purpose" TEXT,
    "notes" TEXT,
    "status" "public"."VisitStatus" NOT NULL DEFAULT 'pending',
    "approved_by" TEXT,
    "approved_at" TIMESTAMP(3),
    "checked_in_at" TIMESTAMP(3),
    "checked_out_at" TIMESTAMP(3),
    "qr_code_data" TEXT,
    "qr_expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Visit_pkey" PRIMARY KEY ("visit_id")
);

-- CreateTable
CREATE TABLE "public"."VisitConfiguration" (
    "config_id" TEXT NOT NULL,
    "institution_id" TEXT NOT NULL,
    "max_visitors_per_day" INTEGER NOT NULL DEFAULT 100,
    "max_visitors_per_slot" INTEGER NOT NULL DEFAULT 50,
    "max_visitors_per_resident_per_slot" INTEGER NOT NULL DEFAULT 3,
    "advance_booking_days" INTEGER NOT NULL DEFAULT 14,
    "cancellation_hours" INTEGER NOT NULL DEFAULT 2,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VisitConfiguration_pkey" PRIMARY KEY ("config_id")
);

-- CreateTable
CREATE TABLE "public"."VisitTimeSlot" (
    "slot_id" TEXT NOT NULL,
    "institution_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "start_time" TEXT NOT NULL,
    "end_time" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VisitTimeSlot_pkey" PRIMARY KEY ("slot_id")
);

-- CreateTable
CREATE TABLE "public"."VisitSlot" (
    "visit_slot_id" TEXT NOT NULL,
    "visit_id" TEXT NOT NULL,
    "slot_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VisitSlot_pkey" PRIMARY KEY ("visit_slot_id")
);

-- CreateTable
CREATE TABLE "public"."VisitDailyStats" (
    "stats_id" TEXT NOT NULL,
    "institution_id" TEXT NOT NULL,
    "visit_date" TIMESTAMP(3) NOT NULL,
    "total_visitors" INTEGER NOT NULL DEFAULT 0,
    "visitors_by_slot" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VisitDailyStats_pkey" PRIMARY KEY ("stats_id")
);

-- CreateIndex
CREATE INDEX "Visit_visit_date_status_idx" ON "public"."Visit"("visit_date", "status");

-- CreateIndex
CREATE INDEX "Visit_institution_id_visit_date_idx" ON "public"."Visit"("institution_id", "visit_date");

-- CreateIndex
CREATE INDEX "Visit_qr_code_data_idx" ON "public"."Visit"("qr_code_data");

-- CreateIndex
CREATE UNIQUE INDEX "Visit_family_user_id_visit_date_visit_time_key" ON "public"."Visit"("family_user_id", "visit_date", "visit_time");

-- CreateIndex
CREATE UNIQUE INDEX "VisitConfiguration_institution_id_key" ON "public"."VisitConfiguration"("institution_id");

-- CreateIndex
CREATE INDEX "VisitTimeSlot_institution_id_idx" ON "public"."VisitTimeSlot"("institution_id");

-- CreateIndex
CREATE UNIQUE INDEX "VisitSlot_visit_id_key" ON "public"."VisitSlot"("visit_id");

-- CreateIndex
CREATE INDEX "VisitDailyStats_institution_id_visit_date_idx" ON "public"."VisitDailyStats"("institution_id", "visit_date");

-- CreateIndex
CREATE UNIQUE INDEX "VisitDailyStats_institution_id_visit_date_key" ON "public"."VisitDailyStats"("institution_id", "visit_date");

-- CreateIndex
CREATE INDEX "CareLog_start_time_idx" ON "public"."CareLog"("start_time");

-- AddForeignKey
ALTER TABLE "public"."Visit" ADD CONSTRAINT "Visit_family_user_id_fkey" FOREIGN KEY ("family_user_id") REFERENCES "public"."User"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Visit" ADD CONSTRAINT "Visit_resident_id_fkey" FOREIGN KEY ("resident_id") REFERENCES "public"."Resident"("resident_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Visit" ADD CONSTRAINT "Visit_institution_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "public"."Institution"("institution_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Visit" ADD CONSTRAINT "Visit_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "public"."User"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."VisitConfiguration" ADD CONSTRAINT "VisitConfiguration_institution_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "public"."Institution"("institution_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."VisitTimeSlot" ADD CONSTRAINT "VisitTimeSlot_institution_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "public"."Institution"("institution_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."VisitSlot" ADD CONSTRAINT "VisitSlot_visit_id_fkey" FOREIGN KEY ("visit_id") REFERENCES "public"."Visit"("visit_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."VisitSlot" ADD CONSTRAINT "VisitSlot_slot_id_fkey" FOREIGN KEY ("slot_id") REFERENCES "public"."VisitTimeSlot"("slot_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."VisitDailyStats" ADD CONSTRAINT "VisitDailyStats_institution_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "public"."Institution"("institution_id") ON DELETE RESTRICT ON UPDATE CASCADE;
