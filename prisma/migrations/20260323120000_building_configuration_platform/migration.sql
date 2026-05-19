CREATE TYPE "UtilityBillingMode" AS ENUM (
    'metered',
    'fixed_charge',
    'combined_charge',
    'disabled'
);

CREATE TYPE "WifiAccessMode" AS ENUM (
    'disabled',
    'voucher_packages'
);

CREATE TABLE "BuildingConfiguration" (
    "id" TEXT NOT NULL,
    "buildingId" TEXT NOT NULL,
    "rentEnabled" BOOLEAN NOT NULL DEFAULT true,
    "waterEnabled" BOOLEAN NOT NULL DEFAULT true,
    "electricityEnabled" BOOLEAN NOT NULL DEFAULT true,
    "wifiEnabled" BOOLEAN NOT NULL DEFAULT false,
    "tenantApplicationsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "tenantAgreementsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "incidentsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "maintenanceEnabled" BOOLEAN NOT NULL DEFAULT true,
    "caretakerEnabled" BOOLEAN NOT NULL DEFAULT false,
    "expenditureTrackingEnabled" BOOLEAN NOT NULL DEFAULT false,
    "utilityBillingMode" "UtilityBillingMode" NOT NULL DEFAULT 'metered',
    "utilityBalanceVisibleDays" INTEGER NOT NULL DEFAULT 7,
    "rentGraceDays" INTEGER NOT NULL DEFAULT 0,
    "allowManualRentPosting" BOOLEAN NOT NULL DEFAULT true,
    "allowManualUtilityPosting" BOOLEAN NOT NULL DEFAULT true,
    "wifiAccessMode" "WifiAccessMode" NOT NULL DEFAULT 'disabled',
    "reminderPolicy" JSONB,
    "onboardingPolicy" JSONB,
    "agreementPolicy" JSONB,
    "metadata" JSONB,
    "updatedByRole" TEXT,
    "updatedByUserId" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BuildingConfiguration_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BuildingWifiPackage" (
    "id" TEXT NOT NULL,
    "buildingId" TEXT NOT NULL,
    "packageCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "hours" INTEGER NOT NULL,
    "priceKsh" INTEGER NOT NULL,
    "profile" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BuildingWifiPackage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BuildingConfiguration_buildingId_key" ON "BuildingConfiguration"("buildingId");
CREATE INDEX "BuildingConfiguration_utilityBillingMode_idx" ON "BuildingConfiguration"("utilityBillingMode");
CREATE INDEX "BuildingConfiguration_updatedAt_idx" ON "BuildingConfiguration"("updatedAt");
CREATE UNIQUE INDEX "BuildingWifiPackage_buildingId_packageCode_key" ON "BuildingWifiPackage"("buildingId", "packageCode");
CREATE INDEX "BuildingWifiPackage_buildingId_enabled_idx" ON "BuildingWifiPackage"("buildingId", "enabled");

ALTER TABLE "BuildingConfiguration" ADD CONSTRAINT "BuildingConfiguration_buildingId_fkey" FOREIGN KEY ("buildingId") REFERENCES "Building"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BuildingWifiPackage" ADD CONSTRAINT "BuildingWifiPackage_buildingId_fkey" FOREIGN KEY ("buildingId") REFERENCES "Building"("id") ON DELETE CASCADE ON UPDATE CASCADE;
