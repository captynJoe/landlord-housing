CREATE TYPE "TenantIdentityType" AS ENUM ('national_id', 'passport', 'alien_id', 'other');

CREATE TYPE "TenantOccupationStatus" AS ENUM (
    'employed',
    'self_employed',
    'student',
    'sponsored',
    'unemployed',
    'other'
);

CREATE TABLE "TenantAgreement" (
    "id" TEXT NOT NULL,
    "tenancyId" TEXT NOT NULL,
    "buildingId" TEXT NOT NULL,
    "houseNumber" TEXT NOT NULL,
    "residentUserId" TEXT NOT NULL,
    "identityType" "TenantIdentityType",
    "identityNumber" TEXT,
    "occupationStatus" "TenantOccupationStatus",
    "occupationLabel" TEXT,
    "organizationName" TEXT,
    "organizationLocation" TEXT,
    "studentRegistrationNumber" TEXT,
    "sponsorName" TEXT,
    "sponsorPhone" TEXT,
    "emergencyContactName" TEXT,
    "emergencyContactPhone" TEXT,
    "leaseStartDate" TIMESTAMP(3),
    "leaseEndDate" TIMESTAMP(3),
    "monthlyRentKsh" INTEGER,
    "depositKsh" INTEGER,
    "paymentDueDay" INTEGER,
    "specialTerms" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantAgreement_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TenantAgreement_tenancyId_key" ON "TenantAgreement"("tenancyId");
CREATE INDEX "TenantAgreement_buildingId_houseNumber_updatedAt_idx" ON "TenantAgreement"("buildingId", "houseNumber", "updatedAt");
CREATE INDEX "TenantAgreement_residentUserId_idx" ON "TenantAgreement"("residentUserId");

ALTER TABLE "TenantAgreement" ADD CONSTRAINT "TenantAgreement_tenancyId_fkey" FOREIGN KEY ("tenancyId") REFERENCES "Tenancy"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TenantAgreement" ADD CONSTRAINT "TenantAgreement_buildingId_fkey" FOREIGN KEY ("buildingId") REFERENCES "Building"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TenantAgreement" ADD CONSTRAINT "TenantAgreement_residentUserId_fkey" FOREIGN KEY ("residentUserId") REFERENCES "HousingUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
