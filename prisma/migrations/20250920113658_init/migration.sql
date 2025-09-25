-- CreateEnum
CREATE TYPE "public"."UserRole" AS ENUM ('PlatformSuperAdmin', 'RootAdmin', 'Admin', 'MedicalStaff', 'CareStaff', 'ReceptionStaff', 'Family', 'Resident');

-- CreateEnum
CREATE TYPE "public"."CognitiveStatus" AS ENUM ('NORMAL', 'IMPAIRED', 'SEVERE');

-- CreateEnum
CREATE TYPE "public"."MobilityStatus" AS ENUM ('INDEPENDENT', 'ASSISTED', 'DEPENDENT');

-- CreateEnum
CREATE TYPE "public"."MedicationStatus" AS ENUM ('scheduled', 'administered', 'skipped');

-- CreateEnum
CREATE TYPE "public"."CareLogType" AS ENUM ('meal', 'exercise', 'hygiene', 'medication', 'custom');

-- CreateEnum
CREATE TYPE "public"."CareTaskStatus" AS ENUM ('pending', 'in_progress', 'completed');

-- CreateEnum
CREATE TYPE "public"."AlertType" AS ENUM ('SOS', 'HealthAnomaly', 'OverduePayment', 'LowStock', 'FullRoom');

-- CreateEnum
CREATE TYPE "public"."NotificationType" AS ENUM ('Alert', 'ServiceSuggestion', 'PaymentReminder', 'VisitReminder');

-- CreateEnum
CREATE TYPE "public"."RoomType" AS ENUM ('single', 'double', 'multi');

-- CreateEnum
CREATE TYPE "public"."ServiceType" AS ENUM ('base', 'add_on', 'special');

-- CreateEnum
CREATE TYPE "public"."ContractStatus" AS ENUM ('active', 'expired', 'cancelled');

-- CreateEnum
CREATE TYPE "public"."ContractServiceStatus" AS ENUM ('active', 'expired', 'cancelled');

-- CreateEnum
CREATE TYPE "public"."PaymentFrequency" AS ENUM ('monthly', 'annually');

-- CreateEnum
CREATE TYPE "public"."PaymentMethod" AS ENUM ('paypal');

-- CreateEnum
CREATE TYPE "public"."PaymentStatus" AS ENUM ('paid', 'overdue', 'pending');

-- CreateEnum
CREATE TYPE "public"."SpecialCareStatus" AS ENUM ('suggested', 'accepted', 'declined', 'active', 'completed');

-- CreateEnum
CREATE TYPE "public"."ActivityStatus" AS ENUM ('planned', 'participated', 'did_not_participate');

-- CreateEnum
CREATE TYPE "public"."VisitStatus" AS ENUM ('pending', 'approved', 'rejected', 'completed');

-- CreateEnum
CREATE TYPE "public"."FamilyLinkStatus" AS ENUM ('pending', 'active', 'revoked');

-- CreateEnum
CREATE TYPE "public"."InvitationStatus" AS ENUM ('sent', 'accepted', 'expired');

-- CreateTable
CREATE TABLE "public"."Institution" (
    "institution_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "contact_info" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Institution_pkey" PRIMARY KEY ("institution_id")
);

-- CreateTable
CREATE TABLE "public"."User" (
    "user_id" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "public"."UserRole" NOT NULL,
    "institution_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "public"."FamilyProfile" (
    "profile_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "relation" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FamilyProfile_pkey" PRIMARY KEY ("profile_id")
);

-- CreateTable
CREATE TABLE "public"."UserToken" (
    "token_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "refresh_token" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserToken_pkey" PRIMARY KEY ("token_id")
);

-- CreateTable
CREATE TABLE "public"."ResidentApplication" (
    "application_id" TEXT NOT NULL,
    "family_user_id" TEXT NOT NULL,
    "resident_name" TEXT NOT NULL,
    "date_of_birth" TIMESTAMP(3) NOT NULL,
    "preliminary_health" JSONB NOT NULL,
    "preferences" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResidentApplication_pkey" PRIMARY KEY ("application_id")
);

-- CreateTable
CREATE TABLE "public"."Resident" (
    "resident_id" TEXT NOT NULL,
    "user_id" TEXT,
    "institution_id" TEXT NOT NULL,
    "room_id" TEXT,
    "name" TEXT NOT NULL,
    "date_of_birth" TIMESTAMP(3) NOT NULL,
    "cognitive_status" "public"."CognitiveStatus" NOT NULL,
    "mobility_status" "public"."MobilityStatus" NOT NULL,
    "chronic_diseases" JSONB NOT NULL,
    "allergies" JSONB NOT NULL,
    "notes" TEXT,
    "assigned_staff_id" TEXT,
    "admission_date" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Resident_pkey" PRIMARY KEY ("resident_id")
);

-- CreateTable
CREATE TABLE "public"."Room" (
    "room_id" TEXT NOT NULL,
    "institution_id" TEXT NOT NULL,
    "room_number" TEXT NOT NULL,
    "type" "public"."RoomType" NOT NULL,
    "capacity" INTEGER NOT NULL,
    "is_available" BOOLEAN NOT NULL,
    "current_occupancy" INTEGER NOT NULL,
    "notes" TEXT,

    CONSTRAINT "Room_pkey" PRIMARY KEY ("room_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "FamilyProfile_user_id_key" ON "public"."FamilyProfile"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "UserToken_refresh_token_key" ON "public"."UserToken"("refresh_token");

-- CreateIndex
CREATE UNIQUE INDEX "Resident_user_id_key" ON "public"."Resident"("user_id");

-- AddForeignKey
ALTER TABLE "public"."User" ADD CONSTRAINT "User_institution_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "public"."Institution"("institution_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FamilyProfile" ADD CONSTRAINT "FamilyProfile_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."User"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserToken" ADD CONSTRAINT "UserToken_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."User"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ResidentApplication" ADD CONSTRAINT "ResidentApplication_family_user_id_fkey" FOREIGN KEY ("family_user_id") REFERENCES "public"."User"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Resident" ADD CONSTRAINT "Resident_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."User"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Resident" ADD CONSTRAINT "Resident_institution_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "public"."Institution"("institution_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Resident" ADD CONSTRAINT "Resident_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "public"."Room"("room_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Resident" ADD CONSTRAINT "Resident_assigned_staff_id_fkey" FOREIGN KEY ("assigned_staff_id") REFERENCES "public"."User"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Room" ADD CONSTRAINT "Room_institution_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "public"."Institution"("institution_id") ON DELETE RESTRICT ON UPDATE CASCADE;
