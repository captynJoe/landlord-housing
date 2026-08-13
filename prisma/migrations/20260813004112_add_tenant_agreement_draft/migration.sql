-- CreateTable
CREATE TABLE "TenantAgreementDraft" (
    "id" TEXT NOT NULL,
    "buildingId" TEXT NOT NULL,
    "houseNumber" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "identityType" "TenantIdentityType",
    "identityNumber" TEXT,
    "identityDocumentUrls" JSONB NOT NULL DEFAULT '[]',
    "leaseStartDate" TIMESTAMP(3),
    "leaseEndDate" TIMESTAMP(3),
    "occupationStatus" "TenantOccupationStatus",
    "occupationLabel" TEXT,
    "organizationName" TEXT,
    "organizationLocation" TEXT,
    "studentRegistrationNumber" TEXT,
    "sponsorName" TEXT,
    "sponsorPhone" TEXT,
    "emergencyContactName" TEXT,
    "emergencyContactPhone" TEXT,
    "specialTerms" TEXT,
    "acceptanceMethod" TEXT,
    "staffWitnessConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "acceptanceNote" TEXT,
    "note" TEXT,
    "createdByUserId" TEXT,
    "createdByName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantAgreementDraft_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TenantAgreementDraft_buildingId_houseNumber_idx" ON "TenantAgreementDraft"("buildingId", "houseNumber");

-- CreateIndex
CREATE UNIQUE INDEX "TenantAgreementDraft_buildingId_houseNumber_key" ON "TenantAgreementDraft"("buildingId", "houseNumber");

-- AddForeignKey
ALTER TABLE "TenantAgreementDraft" ADD CONSTRAINT "TenantAgreementDraft_buildingId_fkey" FOREIGN KEY ("buildingId") REFERENCES "Building"("id") ON DELETE CASCADE ON UPDATE CASCADE;
