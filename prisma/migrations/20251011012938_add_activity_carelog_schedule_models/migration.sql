-- CreateEnum
CREATE TYPE "public"."CareLogType" AS ENUM ('meal', 'exercise', 'hygiene', 'medication', 'custom');

-- CreateEnum
CREATE TYPE "public"."CareTaskStatus" AS ENUM ('pending', 'in_progress', 'completed');

-- CreateEnum
CREATE TYPE "public"."MedicationStatus" AS ENUM ('scheduled', 'administered', 'skipped');

-- CreateEnum
CREATE TYPE "public"."AlertType" AS ENUM ('SOS', 'HealthAnomaly', 'OverduePayment', 'LowStock', 'FullRoom');

-- CreateEnum
CREATE TYPE "public"."NotificationType" AS ENUM ('Alert', 'ServiceSuggestion', 'PaymentReminder', 'VisitReminder');

-- CreateEnum
CREATE TYPE "public"."ServiceType" AS ENUM ('base', 'add_on', 'special');

-- CreateEnum
CREATE TYPE "public"."ContractStatus" AS ENUM ('active', 'expired', 'cancelled');

-- CreateEnum
CREATE TYPE "public"."ContractServiceStatus" AS ENUM ('active', 'expired', 'cancelled');

-- CreateEnum
CREATE TYPE "public"."PaymentFrequency" AS ENUM ('monthly', 'annually');

-- CreateEnum
CREATE TYPE "public"."PaymentStatus" AS ENUM ('paid', 'overdue', 'pending');

-- CreateEnum
CREATE TYPE "public"."SpecialCareStatus" AS ENUM ('suggested', 'accepted', 'declined', 'active', 'completed');

-- CreateEnum
CREATE TYPE "public"."ActivityStatus" AS ENUM ('planned', 'participated', 'did_not_participate');

-- CreateEnum
CREATE TYPE "public"."VisitStatus" AS ENUM ('pending', 'approved', 'rejected', 'completed');

-- CreateEnum
CREATE TYPE "public"."InvitationStatus" AS ENUM ('sent', 'accepted', 'expired');

-- CreateEnum
CREATE TYPE "public"."ActivityType" AS ENUM ('physical_exercise', 'mental_activity', 'social_interaction', 'meal_time', 'medical_checkup', 'therapy', 'entertainment', 'education', 'religious_service', 'other');

-- CreateEnum
CREATE TYPE "public"."ScheduleFrequency" AS ENUM ('daily', 'weekly', 'monthly', 'one_time', 'custom');

-- CreateTable
CREATE TABLE "public"."Activity" (
    "activity_id" TEXT NOT NULL,
    "institution_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "public"."ActivityType" NOT NULL,
    "duration_minutes" INTEGER,
    "max_participants" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Activity_pkey" PRIMARY KEY ("activity_id")
);

-- CreateTable
CREATE TABLE "public"."Schedule" (
    "schedule_id" TEXT NOT NULL,
    "activity_id" TEXT NOT NULL,
    "institution_id" TEXT NOT NULL,
    "resident_id" TEXT,
    "staff_id" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "start_time" TIMESTAMP(3) NOT NULL,
    "end_time" TIMESTAMP(3) NOT NULL,
    "frequency" "public"."ScheduleFrequency" NOT NULL DEFAULT 'one_time',
    "is_recurring" BOOLEAN NOT NULL DEFAULT false,
    "recurring_until" TIMESTAMP(3),
    "status" "public"."ActivityStatus" NOT NULL DEFAULT 'planned',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Schedule_pkey" PRIMARY KEY ("schedule_id")
);

-- CreateTable
CREATE TABLE "public"."CareLog" (
    "care_log_id" TEXT NOT NULL,
    "resident_id" TEXT NOT NULL,
    "staff_id" TEXT NOT NULL,
    "activity_id" TEXT,
    "schedule_id" TEXT,
    "institution_id" TEXT NOT NULL,
    "type" "public"."CareLogType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "start_time" TIMESTAMP(3) NOT NULL,
    "end_time" TIMESTAMP(3),
    "status" "public"."CareTaskStatus" NOT NULL DEFAULT 'pending',
    "medication_name" TEXT,
    "dosage" TEXT,
    "medication_status" "public"."MedicationStatus",
    "meal_type" TEXT,
    "food_items" TEXT,
    "quantity" TEXT,
    "exercise_type" TEXT,
    "duration_minutes" INTEGER,
    "intensity" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CareLog_pkey" PRIMARY KEY ("care_log_id")
);

-- CreateIndex
CREATE INDEX "Activity_institution_id_idx" ON "public"."Activity"("institution_id");

-- CreateIndex
CREATE INDEX "Schedule_institution_id_start_time_idx" ON "public"."Schedule"("institution_id", "start_time");

-- CreateIndex
CREATE INDEX "Schedule_resident_id_idx" ON "public"."Schedule"("resident_id");

-- CreateIndex
CREATE INDEX "CareLog_resident_id_start_time_idx" ON "public"."CareLog"("resident_id", "start_time");

-- CreateIndex
CREATE INDEX "CareLog_staff_id_idx" ON "public"."CareLog"("staff_id");

-- CreateIndex
CREATE INDEX "CareLog_institution_id_idx" ON "public"."CareLog"("institution_id");

-- AddForeignKey
ALTER TABLE "public"."Activity" ADD CONSTRAINT "Activity_institution_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "public"."Institution"("institution_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Schedule" ADD CONSTRAINT "Schedule_activity_id_fkey" FOREIGN KEY ("activity_id") REFERENCES "public"."Activity"("activity_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Schedule" ADD CONSTRAINT "Schedule_institution_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "public"."Institution"("institution_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Schedule" ADD CONSTRAINT "Schedule_resident_id_fkey" FOREIGN KEY ("resident_id") REFERENCES "public"."Resident"("resident_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Schedule" ADD CONSTRAINT "Schedule_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "public"."User"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CareLog" ADD CONSTRAINT "CareLog_resident_id_fkey" FOREIGN KEY ("resident_id") REFERENCES "public"."Resident"("resident_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CareLog" ADD CONSTRAINT "CareLog_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "public"."User"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CareLog" ADD CONSTRAINT "CareLog_activity_id_fkey" FOREIGN KEY ("activity_id") REFERENCES "public"."Activity"("activity_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CareLog" ADD CONSTRAINT "CareLog_schedule_id_fkey" FOREIGN KEY ("schedule_id") REFERENCES "public"."Schedule"("schedule_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CareLog" ADD CONSTRAINT "CareLog_institution_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "public"."Institution"("institution_id") ON DELETE RESTRICT ON UPDATE CASCADE;
