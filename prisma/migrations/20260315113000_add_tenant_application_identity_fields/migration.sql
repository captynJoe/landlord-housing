ALTER TABLE "TenantApplication"
ADD COLUMN "identityType" "TenantIdentityType",
ADD COLUMN "identityNumber" TEXT,
ADD COLUMN "occupationStatus" "TenantOccupationStatus",
ADD COLUMN "occupationLabel" TEXT;
