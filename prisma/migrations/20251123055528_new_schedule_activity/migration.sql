-- CreateEnum
CREATE TYPE "public"."EventType" AS ENUM ('Care', 'Entertainment', 'Other');

-- CreateEnum
CREATE TYPE "public"."EventStatus" AS ENUM ('Upcoming', 'Cancelled', 'Ongoing', 'Ended');

-- CreateEnum
CREATE TYPE "public"."CareSubType" AS ENUM ('VitalCheck', 'Therapy', 'MedicationAdmin', 'Hygiene', 'Meal', 'Other');

-- CreateEnum
CREATE TYPE "public"."EventFrequency" AS ENUM ('Daily', 'Weekly', 'Monthly', 'OneTime');

-- CreateTable
CREATE TABLE "public"."Event" (
    "event_id" TEXT NOT NULL,
    "institution_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "public"."EventType" NOT NULL,
    "status" "public"."EventStatus" NOT NULL DEFAULT 'Upcoming',
    "start_time" TIMESTAMP(3) NOT NULL,
    "end_time" TIMESTAMP(3) NOT NULL,
    "location" TEXT NOT NULL,
    "room_ids" TEXT[],
    "care_configuration" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("event_id")
);

-- CreateIndex
CREATE INDEX "Event_institution_id_idx" ON "public"."Event"("institution_id");

-- CreateIndex
CREATE INDEX "Event_institution_id_start_time_idx" ON "public"."Event"("institution_id", "start_time");

-- CreateIndex
CREATE INDEX "Event_status_idx" ON "public"."Event"("status");

-- CreateIndex
CREATE INDEX "Event_type_idx" ON "public"."Event"("type");

-- AddForeignKey
ALTER TABLE "public"."Event" ADD CONSTRAINT "Event_institution_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "public"."Institution"("institution_id") ON DELETE RESTRICT ON UPDATE CASCADE;
