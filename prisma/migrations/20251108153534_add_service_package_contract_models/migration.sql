-- CreateTable
CREATE TABLE "public"."ServicePackage" (
    "package_id" TEXT NOT NULL,
    "institution_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "public"."ServiceType" NOT NULL DEFAULT 'base',
    "price_monthly" DOUBLE PRECISION NOT NULL,
    "price_annually" DOUBLE PRECISION,
    "room_type" "public"."RoomType",
    "includes_room" BOOLEAN NOT NULL DEFAULT false,
    "features" JSONB,
    "max_residents" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServicePackage_pkey" PRIMARY KEY ("package_id")
);

-- CreateTable
CREATE TABLE "public"."Contract" (
    "contract_id" TEXT NOT NULL,
    "institution_id" TEXT NOT NULL,
    "resident_id" TEXT NOT NULL,
    "family_user_id" TEXT,
    "contract_number" TEXT NOT NULL,
    "status" "public"."ContractStatus" NOT NULL DEFAULT 'active',
    "payment_frequency" "public"."PaymentFrequency" NOT NULL,
    "total_amount" DOUBLE PRECISION NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3),
    "signed_date" TIMESTAMP(3),
    "room_id" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contract_pkey" PRIMARY KEY ("contract_id")
);

-- CreateTable
CREATE TABLE "public"."ContractService" (
    "contract_service_id" TEXT NOT NULL,
    "contract_id" TEXT NOT NULL,
    "package_id" TEXT NOT NULL,
    "status" "public"."ContractServiceStatus" NOT NULL DEFAULT 'active',
    "price_at_signing" DOUBLE PRECISION NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContractService_pkey" PRIMARY KEY ("contract_service_id")
);

-- CreateIndex
CREATE INDEX "ServicePackage_institution_id_type_idx" ON "public"."ServicePackage"("institution_id", "type");

-- CreateIndex
CREATE INDEX "ServicePackage_is_active_idx" ON "public"."ServicePackage"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "Contract_contract_number_key" ON "public"."Contract"("contract_number");

-- CreateIndex
CREATE INDEX "Contract_institution_id_status_idx" ON "public"."Contract"("institution_id", "status");

-- CreateIndex
CREATE INDEX "Contract_resident_id_idx" ON "public"."Contract"("resident_id");

-- CreateIndex
CREATE INDEX "Contract_contract_number_idx" ON "public"."Contract"("contract_number");

-- CreateIndex
CREATE INDEX "ContractService_contract_id_idx" ON "public"."ContractService"("contract_id");

-- CreateIndex
CREATE INDEX "ContractService_package_id_idx" ON "public"."ContractService"("package_id");

-- CreateIndex
CREATE INDEX "ContractService_status_idx" ON "public"."ContractService"("status");

-- AddForeignKey
ALTER TABLE "public"."ServicePackage" ADD CONSTRAINT "ServicePackage_institution_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "public"."Institution"("institution_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Contract" ADD CONSTRAINT "Contract_institution_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "public"."Institution"("institution_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Contract" ADD CONSTRAINT "Contract_resident_id_fkey" FOREIGN KEY ("resident_id") REFERENCES "public"."Resident"("resident_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Contract" ADD CONSTRAINT "Contract_family_user_id_fkey" FOREIGN KEY ("family_user_id") REFERENCES "public"."User"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Contract" ADD CONSTRAINT "Contract_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "public"."Room"("room_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ContractService" ADD CONSTRAINT "ContractService_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "public"."Contract"("contract_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ContractService" ADD CONSTRAINT "ContractService_package_id_fkey" FOREIGN KEY ("package_id") REFERENCES "public"."ServicePackage"("package_id") ON DELETE RESTRICT ON UPDATE CASCADE;
