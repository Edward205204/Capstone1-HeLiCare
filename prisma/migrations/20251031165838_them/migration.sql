-- CreateEnum
CREATE TYPE "public"."VideoEncodeStatus" AS ENUM ('pending', 'processing', 'success', 'failed');

-- CreateTable
CREATE TABLE "public"."VideoEncode" (
    "video_id" TEXT NOT NULL,
    "status" "public"."VideoEncodeStatus" NOT NULL DEFAULT 'pending',
    "message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VideoEncode_pkey" PRIMARY KEY ("video_id")
);
