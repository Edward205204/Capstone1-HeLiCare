-- AlterEnum
ALTER TYPE "public"."TokenType" ADD VALUE 'FamilyLinkToken';

-- CreateTable
CREATE TABLE "public"."FamilyResidentLink" (
    "link_id" TEXT NOT NULL,
    "family_user_id" TEXT NOT NULL,
    "resident_id" TEXT NOT NULL,
    "status" "public"."FamilyLinkStatus" NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FamilyResidentLink_pkey" PRIMARY KEY ("link_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FamilyResidentLink_family_user_id_resident_id_key" ON "public"."FamilyResidentLink"("family_user_id", "resident_id");

-- AddForeignKey
ALTER TABLE "public"."FamilyResidentLink" ADD CONSTRAINT "FamilyResidentLink_family_user_id_fkey" FOREIGN KEY ("family_user_id") REFERENCES "public"."User"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FamilyResidentLink" ADD CONSTRAINT "FamilyResidentLink_resident_id_fkey" FOREIGN KEY ("resident_id") REFERENCES "public"."Resident"("resident_id") ON DELETE RESTRICT ON UPDATE CASCADE;
