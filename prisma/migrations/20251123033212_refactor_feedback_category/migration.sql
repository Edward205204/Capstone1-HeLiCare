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
CREATE TYPE "public"."SpecialCareStatus" AS ENUM ('suggested', 'accepted', 'declined', 'active', 'completed');

-- CreateEnum
CREATE TYPE "public"."ActivityStatus" AS ENUM ('planned', 'participated', 'did_not_participate');

-- CreateEnum
CREATE TYPE "public"."VisitStatus" AS ENUM ('pending', 'approved', 'rejected', 'scheduled', 'checked_in', 'completed', 'cancelled');

-- CreateEnum
CREATE TYPE "public"."VisitTimeBlock" AS ENUM ('morning', 'afternoon', 'evening');

-- CreateEnum
CREATE TYPE "public"."InvitationStatus" AS ENUM ('sent', 'accepted', 'expired');

-- CreateEnum
CREATE TYPE "public"."ActivityType" AS ENUM ('physical_exercise', 'mental_activity', 'social_interaction', 'meal_time', 'medical_checkup', 'therapy', 'entertainment', 'education', 'religious_service', 'other');

-- CreateEnum
CREATE TYPE "public"."ScheduleFrequency" AS ENUM ('daily', 'weekly', 'monthly', 'one_time', 'custom');

-- CreateEnum
CREATE TYPE "public"."UserRole" AS ENUM ('PlatformSuperAdmin', 'RootAdmin', 'Admin', 'Staff', 'Family', 'Resident');

-- CreateEnum
CREATE TYPE "public"."StaffPosition" AS ENUM ('NURSE', 'CAREGIVER', 'THERAPIST', 'PHYSICIAN', 'SOCIAL_WORKER', 'ACTIVITY_COORDINATOR', 'DIETITIAN', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."CognitiveStatus" AS ENUM ('NORMAL', 'IMPAIRED', 'SEVERE');

-- CreateEnum
CREATE TYPE "public"."MobilityStatus" AS ENUM ('INDEPENDENT', 'ASSISTED', 'DEPENDENT');

-- CreateEnum
CREATE TYPE "public"."RoomType" AS ENUM ('single', 'double', 'multi');

-- CreateEnum
CREATE TYPE "public"."FamilyLinkStatus" AS ENUM ('pending', 'active', 'revoked');

-- CreateEnum
CREATE TYPE "public"."CorrectionSourceType" AS ENUM ('Assessment', 'CareLog');

-- CreateEnum
CREATE TYPE "public"."TokenType" AS ENUM ('AccessToken', 'RefreshToken', 'EmailVerifyToken', 'ForgotPasswordToken', 'StaffInviteToken', 'AdminInviteToken', 'FamilyLinkToken');

-- CreateEnum
CREATE TYPE "public"."UserStatus" AS ENUM ('active', 'inactive');

-- CreateEnum
CREATE TYPE "public"."InstitutionContractStatus" AS ENUM ('active', 'cancelled');

-- CreateEnum
CREATE TYPE "public"."Gender" AS ENUM ('male', 'female');

-- CreateEnum
CREATE TYPE "public"."ResidentAssessmentStatus" AS ENUM ('pending', 'canceled', 'completed', 'joined', 'rejected');

-- CreateEnum
CREATE TYPE "public"."DiseaseSeverity" AS ENUM ('MILD', 'MODERATE', 'SEVERE');

-- CreateEnum
CREATE TYPE "public"."DiseaseStatus" AS ENUM ('ACTIVE', 'RECOVERED');

-- CreateEnum
CREATE TYPE "public"."AllergySeverity" AS ENUM ('MILD', 'MODERATE', 'SEVERE');

-- CreateEnum
CREATE TYPE "public"."MealSlot" AS ENUM ('Breakfast', 'Lunch', 'Afternoon', 'Dinner');

-- CreateEnum
CREATE TYPE "public"."DishTexture" AS ENUM ('Regular', 'Minced', 'Pureed');

-- CreateEnum
CREATE TYPE "public"."IngredientUnit" AS ENUM ('g', 'ml', 'pcs');

-- CreateEnum
CREATE TYPE "public"."DietTagType" AS ENUM ('LowSugar', 'LowSodium', 'SoftTexture', 'HighProtein', 'LowFat', 'HighFiber', 'GlutenFree', 'LactoseFree', 'Custom');

-- CreateEnum
CREATE TYPE "public"."VideoEncodeStatus" AS ENUM ('pending', 'processing', 'success', 'failed');

-- CreateEnum
CREATE TYPE "public"."MediaType" AS ENUM ('image', 'video', 'hls');

-- CreateEnum
CREATE TYPE "public"."PostVisibility" AS ENUM ('STAFF_ONLY', 'STAFF_AND_FAMILY_OF_RESIDENTS', 'PUBLIC');

-- CreateEnum
CREATE TYPE "public"."FeedbackStatus" AS ENUM ('pending', 'in_progress', 'resolved');

-- CreateEnum
CREATE TYPE "public"."MedicationForm" AS ENUM ('tablet', 'syrup', 'injection', 'capsule', 'liquid', 'cream', 'other');

-- CreateEnum
CREATE TYPE "public"."MedicationTiming" AS ENUM ('before_meal', 'after_meal', 'with_meal', 'any_time');

-- CreateEnum
CREATE TYPE "public"."TimeSlot" AS ENUM ('morning', 'noon', 'afternoon', 'evening');

-- CreateTable
CREATE TABLE "public"."Institution" (
    "institution_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" JSONB NOT NULL,
    "contact_info" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "status" "public"."InstitutionContractStatus" NOT NULL DEFAULT 'active',

    CONSTRAINT "Institution_pkey" PRIMARY KEY ("institution_id")
);

-- CreateTable
CREATE TABLE "public"."User" (
    "user_id" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "public"."UserRole" NOT NULL,
    "status" "public"."UserStatus" NOT NULL DEFAULT 'inactive',
    "institution_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "public"."StaffProfile" (
    "user_id" TEXT NOT NULL,
    "avatar" TEXT,
    "institution_id" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "position" "public"."StaffPosition" NOT NULL,
    "hire_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StaffProfile_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "public"."FamilyProfile" (
    "profile_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "phone" TEXT,
    "address" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FamilyProfile_pkey" PRIMARY KEY ("profile_id")
);

-- CreateTable
CREATE TABLE "public"."UserToken" (
    "token_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token_string" TEXT NOT NULL,
    "token_type" "public"."TokenType" NOT NULL,
    "exp" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserToken_pkey" PRIMARY KEY ("token_id")
);

-- CreateTable
CREATE TABLE "public"."Resident" (
    "resident_id" TEXT NOT NULL,
    "user_id" TEXT,
    "institution_id" TEXT,
    "room_id" TEXT,
    "full_name" TEXT NOT NULL,
    "gender" "public"."Gender" NOT NULL,
    "date_of_birth" TIMESTAMP(3) NOT NULL,
    "height_cm" DOUBLE PRECISION,
    "weight_kg" DOUBLE PRECISION,
    "bmi" DOUBLE PRECISION,
    "notes" TEXT,
    "assigned_staff_id" TEXT,
    "admission_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Resident_pkey" PRIMARY KEY ("resident_id")
);

-- CreateTable
CREATE TABLE "public"."HealthAssessment" (
    "assessment_id" TEXT NOT NULL,
    "resident_id" TEXT NOT NULL,
    "assessed_by_id" TEXT NOT NULL,
    "cognitive_status" "public"."CognitiveStatus" NOT NULL DEFAULT 'NORMAL',
    "mobility_status" "public"."MobilityStatus" NOT NULL DEFAULT 'INDEPENDENT',
    "weight_kg" DOUBLE PRECISION,
    "height_cm" DOUBLE PRECISION,
    "bmi" DOUBLE PRECISION,
    "temperature_c" DOUBLE PRECISION,
    "blood_pressure_systolic" INTEGER,
    "blood_pressure_diastolic" INTEGER,
    "heart_rate" INTEGER,
    "respiratory_rate" INTEGER,
    "oxygen_saturation" INTEGER,
    "notes" TEXT,
    "measured_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "measurement_shift" TEXT,
    "measurement_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HealthAssessment_pkey" PRIMARY KEY ("assessment_id")
);

-- CreateTable
CREATE TABLE "public"."ChronicDisease" (
    "id" TEXT NOT NULL,
    "resident_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "diagnosed_at" TIMESTAMP(3),
    "severity" "public"."DiseaseSeverity",
    "status" "public"."DiseaseStatus" DEFAULT 'ACTIVE',
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChronicDisease_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Allergy" (
    "id" TEXT NOT NULL,
    "resident_id" TEXT NOT NULL,
    "substance" TEXT NOT NULL,
    "reaction" TEXT,
    "severity" "public"."AllergySeverity",
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Allergy_pkey" PRIMARY KEY ("id")
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

-- CreateTable
CREATE TABLE "public"."FamilyResidentLink" (
    "link_id" TEXT NOT NULL,
    "family_user_id" TEXT NOT NULL,
    "family_email" TEXT NOT NULL,
    "resident_id" TEXT NOT NULL,
    "institution_id" TEXT NOT NULL,
    "status" "public"."FamilyLinkStatus" NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FamilyResidentLink_pkey" PRIMARY KEY ("link_id")
);

-- CreateTable
CREATE TABLE "public"."ResidentApplication" (
    "application_id" TEXT NOT NULL,
    "family_user_id" TEXT,
    "resident_id" TEXT NOT NULL,
    "institution_id" TEXT NOT NULL,
    "appointment_date" TIMESTAMP(3) NOT NULL,
    "status" "public"."ResidentAssessmentStatus" NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResidentApplication_pkey" PRIMARY KEY ("application_id")
);

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

-- CreateTable
CREATE TABLE "public"."Visit" (
    "visit_id" TEXT NOT NULL,
    "family_user_id" TEXT NOT NULL,
    "resident_id" TEXT NOT NULL,
    "institution_id" TEXT NOT NULL,
    "visit_date" TIMESTAMP(3) NOT NULL,
    "visit_time" TEXT,
    "time_block" "public"."VisitTimeBlock",
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
    "max_visitors_per_time_block" INTEGER NOT NULL DEFAULT 20,
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

-- CreateTable
CREATE TABLE "public"."HealthDataCorrection" (
    "correction_id" TEXT NOT NULL,
    "source_type" "public"."CorrectionSourceType" NOT NULL,
    "source_id" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "previous_value" TEXT,
    "new_value" TEXT,
    "reason" TEXT,
    "corrected_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HealthDataCorrection_pkey" PRIMARY KEY ("correction_id")
);

-- CreateTable
CREATE TABLE "public"."VideoEncode" (
    "video_id" TEXT NOT NULL,
    "status" "public"."VideoEncodeStatus" NOT NULL DEFAULT 'pending',
    "message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VideoEncode_pkey" PRIMARY KEY ("video_id")
);

-- CreateTable
CREATE TABLE "public"."Post" (
    "post_id" TEXT NOT NULL,
    "institution_id" TEXT NOT NULL,
    "author_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "image_urls" TEXT[],
    "tags" TEXT[],
    "visibility" "public"."PostVisibility" NOT NULL DEFAULT 'PUBLIC',
    "likes_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Post_pkey" PRIMARY KEY ("post_id")
);

-- CreateTable
CREATE TABLE "public"."PostResident" (
    "post_resident_id" TEXT NOT NULL,
    "post_id" TEXT NOT NULL,
    "resident_id" TEXT NOT NULL,

    CONSTRAINT "PostResident_pkey" PRIMARY KEY ("post_resident_id")
);

-- CreateTable
CREATE TABLE "public"."PostLike" (
    "like_id" TEXT NOT NULL,
    "post_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PostLike_pkey" PRIMARY KEY ("like_id")
);

-- CreateTable
CREATE TABLE "public"."Comment" (
    "comment_id" TEXT NOT NULL,
    "post_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Comment_pkey" PRIMARY KEY ("comment_id")
);

-- CreateTable
CREATE TABLE "public"."FeedbackCategory" (
    "category_id" TEXT NOT NULL,
    "institution_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "metadata" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeedbackCategory_pkey" PRIMARY KEY ("category_id")
);

-- CreateTable
CREATE TABLE "public"."Feedback" (
    "feedback_id" TEXT NOT NULL,
    "family_user_id" TEXT NOT NULL,
    "resident_id" TEXT,
    "institution_id" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,
    "type" TEXT,
    "message" TEXT NOT NULL,
    "attachments" TEXT[],
    "status" "public"."FeedbackStatus" NOT NULL DEFAULT 'pending',
    "staff_notes" TEXT,
    "assigned_staff_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "resolved_at" TIMESTAMP(3),

    CONSTRAINT "Feedback_pkey" PRIMARY KEY ("feedback_id")
);

-- CreateTable
CREATE TABLE "public"."Dish" (
    "dish_id" TEXT NOT NULL,
    "institution_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "calories_per_100g" DOUBLE PRECISION NOT NULL,
    "texture" "public"."DishTexture" NOT NULL DEFAULT 'Regular',
    "sugar_adjustable" BOOLEAN NOT NULL DEFAULT false,
    "sodium_level" DOUBLE PRECISION,
    "dietary_flags" JSONB,
    "is_blendable" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Dish_pkey" PRIMARY KEY ("dish_id")
);

-- CreateTable
CREATE TABLE "public"."Ingredient" (
    "ingredient_id" TEXT NOT NULL,
    "institution_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "unit" "public"."IngredientUnit" NOT NULL,
    "calories_per_100g" DOUBLE PRECISION NOT NULL,
    "protein_per_100g" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fat_per_100g" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "carbs_per_100g" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fiber_per_100g" DOUBLE PRECISION DEFAULT 0,
    "sodium_per_100g" DOUBLE PRECISION DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ingredient_pkey" PRIMARY KEY ("ingredient_id")
);

-- CreateTable
CREATE TABLE "public"."DishIngredient" (
    "dish_ingredient_id" TEXT NOT NULL,
    "dish_id" TEXT NOT NULL,
    "ingredient_id" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "DishIngredient_pkey" PRIMARY KEY ("dish_ingredient_id")
);

-- CreateTable
CREATE TABLE "public"."WeeklyMenu" (
    "menu_id" TEXT NOT NULL,
    "institution_id" TEXT NOT NULL,
    "week_start_date" TIMESTAMP(3) NOT NULL,
    "week_end_date" TIMESTAMP(3) NOT NULL,
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WeeklyMenu_pkey" PRIMARY KEY ("menu_id")
);

-- CreateTable
CREATE TABLE "public"."WeeklyMenuItem" (
    "menu_item_id" TEXT NOT NULL,
    "menu_id" TEXT NOT NULL,
    "dish_id" TEXT NOT NULL,
    "meal_slot" "public"."MealSlot" NOT NULL,
    "day_of_week" INTEGER NOT NULL,
    "servings" INTEGER NOT NULL,
    "texture_variant" "public"."DishTexture",
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WeeklyMenuItem_pkey" PRIMARY KEY ("menu_item_id")
);

-- CreateTable
CREATE TABLE "public"."ResidentDietTag" (
    "tag_id" TEXT NOT NULL,
    "resident_id" TEXT NOT NULL,
    "tag_type" "public"."DietTagType" NOT NULL,
    "tag_name" TEXT NOT NULL,
    "source_type" TEXT NOT NULL,
    "source_id" TEXT,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,

    CONSTRAINT "ResidentDietTag_pkey" PRIMARY KEY ("tag_id")
);

-- CreateTable
CREATE TABLE "public"."Medication" (
    "medication_id" TEXT NOT NULL,
    "institution_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "dosage" TEXT NOT NULL,
    "form" "public"."MedicationForm" NOT NULL DEFAULT 'tablet',
    "frequency" TEXT NOT NULL,
    "timing" "public"."MedicationTiming" NOT NULL DEFAULT 'any_time',
    "instructions" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Medication_pkey" PRIMARY KEY ("medication_id")
);

-- CreateTable
CREATE TABLE "public"."MedicationCarePlanAssignment" (
    "assignment_id" TEXT NOT NULL,
    "medication_id" TEXT NOT NULL,
    "institution_id" TEXT NOT NULL,
    "resident_ids" TEXT[],
    "room_ids" TEXT[],
    "staff_ids" TEXT[],
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3),
    "time_slot" "public"."TimeSlot",
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MedicationCarePlanAssignment_pkey" PRIMARY KEY ("assignment_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "StaffProfile_user_id_key" ON "public"."StaffProfile"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "FamilyProfile_user_id_key" ON "public"."FamilyProfile"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "UserToken_token_string_key" ON "public"."UserToken"("token_string");

-- CreateIndex
CREATE INDEX "UserToken_user_id_token_type_idx" ON "public"."UserToken"("user_id", "token_type");

-- CreateIndex
CREATE UNIQUE INDEX "Resident_user_id_key" ON "public"."Resident"("user_id");

-- CreateIndex
CREATE INDEX "HealthAssessment_resident_id_idx" ON "public"."HealthAssessment"("resident_id");

-- CreateIndex
CREATE INDEX "HealthAssessment_resident_id_measured_at_idx" ON "public"."HealthAssessment"("resident_id", "measured_at");

-- CreateIndex
CREATE UNIQUE INDEX "FamilyResidentLink_family_user_id_resident_id_key" ON "public"."FamilyResidentLink"("family_user_id", "resident_id");

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

-- CreateIndex
CREATE INDEX "CareLog_start_time_idx" ON "public"."CareLog"("start_time");

-- CreateIndex
CREATE INDEX "Visit_visit_date_status_idx" ON "public"."Visit"("visit_date", "status");

-- CreateIndex
CREATE INDEX "Visit_institution_id_visit_date_idx" ON "public"."Visit"("institution_id", "visit_date");

-- CreateIndex
CREATE INDEX "Visit_institution_id_visit_date_time_block_idx" ON "public"."Visit"("institution_id", "visit_date", "time_block");

-- CreateIndex
CREATE INDEX "Visit_qr_code_data_idx" ON "public"."Visit"("qr_code_data");

-- CreateIndex
CREATE UNIQUE INDEX "Visit_family_user_id_visit_date_visit_time_key" ON "public"."Visit"("family_user_id", "visit_date", "visit_time");

-- CreateIndex
CREATE UNIQUE INDEX "Visit_family_user_id_visit_date_time_block_key" ON "public"."Visit"("family_user_id", "visit_date", "time_block");

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
CREATE INDEX "HealthDataCorrection_source_type_source_id_idx" ON "public"."HealthDataCorrection"("source_type", "source_id");

-- CreateIndex
CREATE INDEX "Post_institution_id_created_at_idx" ON "public"."Post"("institution_id", "created_at");

-- CreateIndex
CREATE INDEX "Post_author_id_idx" ON "public"."Post"("author_id");

-- CreateIndex
CREATE INDEX "Post_visibility_idx" ON "public"."Post"("visibility");

-- CreateIndex
CREATE INDEX "PostResident_post_id_idx" ON "public"."PostResident"("post_id");

-- CreateIndex
CREATE INDEX "PostResident_resident_id_idx" ON "public"."PostResident"("resident_id");

-- CreateIndex
CREATE UNIQUE INDEX "PostResident_post_id_resident_id_key" ON "public"."PostResident"("post_id", "resident_id");

-- CreateIndex
CREATE INDEX "PostLike_post_id_idx" ON "public"."PostLike"("post_id");

-- CreateIndex
CREATE INDEX "PostLike_user_id_idx" ON "public"."PostLike"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "PostLike_post_id_user_id_key" ON "public"."PostLike"("post_id", "user_id");

-- CreateIndex
CREATE INDEX "Comment_post_id_created_at_idx" ON "public"."Comment"("post_id", "created_at");

-- CreateIndex
CREATE INDEX "Comment_user_id_idx" ON "public"."Comment"("user_id");

-- CreateIndex
CREATE INDEX "FeedbackCategory_institution_id_idx" ON "public"."FeedbackCategory"("institution_id");

-- CreateIndex
CREATE INDEX "FeedbackCategory_institution_id_is_active_idx" ON "public"."FeedbackCategory"("institution_id", "is_active");

-- CreateIndex
CREATE INDEX "Feedback_family_user_id_created_at_idx" ON "public"."Feedback"("family_user_id", "created_at");

-- CreateIndex
CREATE INDEX "Feedback_institution_id_status_idx" ON "public"."Feedback"("institution_id", "status");

-- CreateIndex
CREATE INDEX "Feedback_institution_id_category_id_idx" ON "public"."Feedback"("institution_id", "category_id");

-- CreateIndex
CREATE INDEX "Feedback_resident_id_idx" ON "public"."Feedback"("resident_id");

-- CreateIndex
CREATE INDEX "Feedback_status_idx" ON "public"."Feedback"("status");

-- CreateIndex
CREATE INDEX "Feedback_category_id_idx" ON "public"."Feedback"("category_id");

-- CreateIndex
CREATE INDEX "Dish_institution_id_idx" ON "public"."Dish"("institution_id");

-- CreateIndex
CREATE INDEX "Dish_texture_idx" ON "public"."Dish"("texture");

-- CreateIndex
CREATE INDEX "Ingredient_institution_id_idx" ON "public"."Ingredient"("institution_id");

-- CreateIndex
CREATE INDEX "DishIngredient_dish_id_idx" ON "public"."DishIngredient"("dish_id");

-- CreateIndex
CREATE INDEX "DishIngredient_ingredient_id_idx" ON "public"."DishIngredient"("ingredient_id");

-- CreateIndex
CREATE UNIQUE INDEX "DishIngredient_dish_id_ingredient_id_key" ON "public"."DishIngredient"("dish_id", "ingredient_id");

-- CreateIndex
CREATE INDEX "WeeklyMenu_institution_id_week_start_date_idx" ON "public"."WeeklyMenu"("institution_id", "week_start_date");

-- CreateIndex
CREATE UNIQUE INDEX "WeeklyMenu_institution_id_week_start_date_key" ON "public"."WeeklyMenu"("institution_id", "week_start_date");

-- CreateIndex
CREATE INDEX "WeeklyMenuItem_menu_id_day_of_week_meal_slot_idx" ON "public"."WeeklyMenuItem"("menu_id", "day_of_week", "meal_slot");

-- CreateIndex
CREATE INDEX "WeeklyMenuItem_dish_id_idx" ON "public"."WeeklyMenuItem"("dish_id");

-- CreateIndex
CREATE INDEX "ResidentDietTag_resident_id_is_active_idx" ON "public"."ResidentDietTag"("resident_id", "is_active");

-- CreateIndex
CREATE INDEX "ResidentDietTag_tag_type_idx" ON "public"."ResidentDietTag"("tag_type");

-- CreateIndex
CREATE INDEX "ResidentDietTag_is_active_idx" ON "public"."ResidentDietTag"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "ResidentDietTag_resident_id_tag_type_key" ON "public"."ResidentDietTag"("resident_id", "tag_type");

-- CreateIndex
CREATE INDEX "Medication_institution_id_idx" ON "public"."Medication"("institution_id");

-- CreateIndex
CREATE INDEX "Medication_is_active_idx" ON "public"."Medication"("is_active");

-- CreateIndex
CREATE INDEX "MedicationCarePlanAssignment_medication_id_idx" ON "public"."MedicationCarePlanAssignment"("medication_id");

-- CreateIndex
CREATE INDEX "MedicationCarePlanAssignment_institution_id_idx" ON "public"."MedicationCarePlanAssignment"("institution_id");

-- CreateIndex
CREATE INDEX "MedicationCarePlanAssignment_is_active_idx" ON "public"."MedicationCarePlanAssignment"("is_active");

-- CreateIndex
CREATE INDEX "MedicationCarePlanAssignment_start_date_end_date_idx" ON "public"."MedicationCarePlanAssignment"("start_date", "end_date");

-- CreateIndex
CREATE INDEX "MedicationCarePlanAssignment_time_slot_idx" ON "public"."MedicationCarePlanAssignment"("time_slot");

-- AddForeignKey
ALTER TABLE "public"."User" ADD CONSTRAINT "User_institution_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "public"."Institution"("institution_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."StaffProfile" ADD CONSTRAINT "StaffProfile_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."User"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."StaffProfile" ADD CONSTRAINT "StaffProfile_institution_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "public"."Institution"("institution_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FamilyProfile" ADD CONSTRAINT "FamilyProfile_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."User"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserToken" ADD CONSTRAINT "UserToken_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."User"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Resident" ADD CONSTRAINT "Resident_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."User"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Resident" ADD CONSTRAINT "Resident_institution_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "public"."Institution"("institution_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Resident" ADD CONSTRAINT "Resident_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "public"."Room"("room_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Resident" ADD CONSTRAINT "Resident_assigned_staff_id_fkey" FOREIGN KEY ("assigned_staff_id") REFERENCES "public"."User"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."HealthAssessment" ADD CONSTRAINT "HealthAssessment_resident_id_fkey" FOREIGN KEY ("resident_id") REFERENCES "public"."Resident"("resident_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."HealthAssessment" ADD CONSTRAINT "HealthAssessment_assessed_by_id_fkey" FOREIGN KEY ("assessed_by_id") REFERENCES "public"."User"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ChronicDisease" ADD CONSTRAINT "ChronicDisease_resident_id_fkey" FOREIGN KEY ("resident_id") REFERENCES "public"."Resident"("resident_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Allergy" ADD CONSTRAINT "Allergy_resident_id_fkey" FOREIGN KEY ("resident_id") REFERENCES "public"."Resident"("resident_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Room" ADD CONSTRAINT "Room_institution_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "public"."Institution"("institution_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FamilyResidentLink" ADD CONSTRAINT "FamilyResidentLink_family_user_id_fkey" FOREIGN KEY ("family_user_id") REFERENCES "public"."User"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FamilyResidentLink" ADD CONSTRAINT "FamilyResidentLink_resident_id_fkey" FOREIGN KEY ("resident_id") REFERENCES "public"."Resident"("resident_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FamilyResidentLink" ADD CONSTRAINT "FamilyResidentLink_institution_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "public"."Institution"("institution_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ResidentApplication" ADD CONSTRAINT "ResidentApplication_institution_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "public"."Institution"("institution_id") ON DELETE RESTRICT ON UPDATE CASCADE;

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

-- AddForeignKey
ALTER TABLE "public"."HealthDataCorrection" ADD CONSTRAINT "HealthDataCorrection_corrected_by_id_fkey" FOREIGN KEY ("corrected_by_id") REFERENCES "public"."User"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Post" ADD CONSTRAINT "Post_institution_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "public"."Institution"("institution_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Post" ADD CONSTRAINT "Post_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "public"."User"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PostResident" ADD CONSTRAINT "PostResident_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "public"."Post"("post_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PostResident" ADD CONSTRAINT "PostResident_resident_id_fkey" FOREIGN KEY ("resident_id") REFERENCES "public"."Resident"("resident_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PostLike" ADD CONSTRAINT "PostLike_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "public"."Post"("post_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PostLike" ADD CONSTRAINT "PostLike_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."User"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Comment" ADD CONSTRAINT "Comment_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "public"."Post"("post_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Comment" ADD CONSTRAINT "Comment_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."User"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FeedbackCategory" ADD CONSTRAINT "FeedbackCategory_institution_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "public"."Institution"("institution_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Feedback" ADD CONSTRAINT "Feedback_family_user_id_fkey" FOREIGN KEY ("family_user_id") REFERENCES "public"."User"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Feedback" ADD CONSTRAINT "Feedback_resident_id_fkey" FOREIGN KEY ("resident_id") REFERENCES "public"."Resident"("resident_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Feedback" ADD CONSTRAINT "Feedback_institution_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "public"."Institution"("institution_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Feedback" ADD CONSTRAINT "Feedback_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."FeedbackCategory"("category_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Feedback" ADD CONSTRAINT "Feedback_assigned_staff_id_fkey" FOREIGN KEY ("assigned_staff_id") REFERENCES "public"."User"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Dish" ADD CONSTRAINT "Dish_institution_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "public"."Institution"("institution_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Ingredient" ADD CONSTRAINT "Ingredient_institution_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "public"."Institution"("institution_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DishIngredient" ADD CONSTRAINT "DishIngredient_dish_id_fkey" FOREIGN KEY ("dish_id") REFERENCES "public"."Dish"("dish_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DishIngredient" ADD CONSTRAINT "DishIngredient_ingredient_id_fkey" FOREIGN KEY ("ingredient_id") REFERENCES "public"."Ingredient"("ingredient_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."WeeklyMenu" ADD CONSTRAINT "WeeklyMenu_institution_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "public"."Institution"("institution_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."WeeklyMenu" ADD CONSTRAINT "WeeklyMenu_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "public"."User"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."WeeklyMenuItem" ADD CONSTRAINT "WeeklyMenuItem_menu_id_fkey" FOREIGN KEY ("menu_id") REFERENCES "public"."WeeklyMenu"("menu_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."WeeklyMenuItem" ADD CONSTRAINT "WeeklyMenuItem_dish_id_fkey" FOREIGN KEY ("dish_id") REFERENCES "public"."Dish"("dish_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ResidentDietTag" ADD CONSTRAINT "ResidentDietTag_resident_id_fkey" FOREIGN KEY ("resident_id") REFERENCES "public"."Resident"("resident_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Medication" ADD CONSTRAINT "Medication_institution_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "public"."Institution"("institution_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MedicationCarePlanAssignment" ADD CONSTRAINT "MedicationCarePlanAssignment_medication_id_fkey" FOREIGN KEY ("medication_id") REFERENCES "public"."Medication"("medication_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MedicationCarePlanAssignment" ADD CONSTRAINT "MedicationCarePlanAssignment_institution_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "public"."Institution"("institution_id") ON DELETE RESTRICT ON UPDATE CASCADE;
