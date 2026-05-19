-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('tenant', 'landlord', 'admin', 'root_admin');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('active', 'disabled');

-- CreateEnum
CREATE TYPE "TenantApplicationStatus" AS ENUM ('pending', 'approved', 'rejected');

-- AlterTable
ALTER TABLE "Building" ADD COLUMN "landlordUserId" TEXT;

-- CreateTable
CREATE TABLE "HousingUser" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'tenant',
    "status" "UserStatus" NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HousingUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HouseUnit" (
    "id" TEXT NOT NULL,
    "buildingId" TEXT NOT NULL,
    "houseNumber" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HouseUnit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TenantApplication" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "buildingId" TEXT NOT NULL,
    "unitId" TEXT,
    "houseNumber" TEXT NOT NULL,
    "status" "TenantApplicationStatus" NOT NULL DEFAULT 'pending',
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "reviewedAt" TIMESTAMP(3),
    "reviewedByUserId" TEXT,

    CONSTRAINT "TenantApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tenancy" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "buildingId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),

    CONSTRAINT "Tenancy_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Building_landlordUserId_idx" ON "Building"("landlordUserId");

-- CreateIndex
CREATE UNIQUE INDEX "HousingUser_email_key" ON "HousingUser"("email");

-- CreateIndex
CREATE UNIQUE INDEX "HousingUser_phone_key" ON "HousingUser"("phone");

-- CreateIndex
CREATE INDEX "HousingUser_role_idx" ON "HousingUser"("role");

-- CreateIndex
CREATE UNIQUE INDEX "UserSession_tokenHash_key" ON "UserSession"("tokenHash");

-- CreateIndex
CREATE INDEX "UserSession_userId_expiresAt_idx" ON "UserSession"("userId", "expiresAt");

-- CreateIndex
CREATE INDEX "UserSession_expiresAt_idx" ON "UserSession"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "HouseUnit_buildingId_houseNumber_key" ON "HouseUnit"("buildingId", "houseNumber");

-- CreateIndex
CREATE INDEX "HouseUnit_buildingId_isActive_idx" ON "HouseUnit"("buildingId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "TenantApplication_userId_buildingId_houseNumber_key" ON "TenantApplication"("userId", "buildingId", "houseNumber");

-- CreateIndex
CREATE INDEX "TenantApplication_buildingId_status_idx" ON "TenantApplication"("buildingId", "status");

-- CreateIndex
CREATE INDEX "TenantApplication_userId_status_idx" ON "TenantApplication"("userId", "status");

-- CreateIndex
CREATE INDEX "Tenancy_userId_active_idx" ON "Tenancy"("userId", "active");

-- CreateIndex
CREATE INDEX "Tenancy_buildingId_active_idx" ON "Tenancy"("buildingId", "active");

-- AddForeignKey
ALTER TABLE "Building" ADD CONSTRAINT "Building_landlordUserId_fkey" FOREIGN KEY ("landlordUserId") REFERENCES "HousingUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSession" ADD CONSTRAINT "UserSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "HousingUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HouseUnit" ADD CONSTRAINT "HouseUnit_buildingId_fkey" FOREIGN KEY ("buildingId") REFERENCES "Building"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantApplication" ADD CONSTRAINT "TenantApplication_userId_fkey" FOREIGN KEY ("userId") REFERENCES "HousingUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantApplication" ADD CONSTRAINT "TenantApplication_buildingId_fkey" FOREIGN KEY ("buildingId") REFERENCES "Building"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantApplication" ADD CONSTRAINT "TenantApplication_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "HouseUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantApplication" ADD CONSTRAINT "TenantApplication_reviewedByUserId_fkey" FOREIGN KEY ("reviewedByUserId") REFERENCES "HousingUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tenancy" ADD CONSTRAINT "Tenancy_userId_fkey" FOREIGN KEY ("userId") REFERENCES "HousingUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tenancy" ADD CONSTRAINT "Tenancy_buildingId_fkey" FOREIGN KEY ("buildingId") REFERENCES "Building"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tenancy" ADD CONSTRAINT "Tenancy_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "HouseUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
