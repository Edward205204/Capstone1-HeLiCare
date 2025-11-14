-- CreateEnum
CREATE TYPE "public"."PostVisibility" AS ENUM ('STAFF_ONLY', 'STAFF_AND_FAMILY_OF_RESIDENTS', 'PUBLIC');

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
