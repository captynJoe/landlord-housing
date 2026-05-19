-- CreateEnum
CREATE TYPE "CCTVStatus" AS ENUM ('none', 'partial', 'verified');

-- CreateEnum
CREATE TYPE "IncidentSeverity" AS ENUM ('low', 'medium', 'high');

-- CreateEnum
CREATE TYPE "IncidentStatus" AS ENUM ('open', 'resolved');

-- CreateTable
CREATE TABLE "Building" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "county" TEXT NOT NULL,
    "cctvStatus" "CCTVStatus" NOT NULL,
    "units" INTEGER,
    "mediaImageUrls" JSONB NOT NULL,
    "mediaVideoUrls" JSONB NOT NULL,
    "mediaFloorPlanUrl" TEXT,
    "mediaNeighborhoodNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Building_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Incident" (
    "id" TEXT NOT NULL,
    "buildingId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "details" TEXT NOT NULL,
    "severity" "IncidentSeverity" NOT NULL,
    "status" "IncidentStatus" NOT NULL DEFAULT 'open',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "resolutionNotes" TEXT,

    CONSTRAINT "Incident_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaintenanceRecord" (
    "id" TEXT NOT NULL,
    "buildingId" TEXT NOT NULL,
    "details" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "MaintenanceRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VacancySnapshot" (
    "id" TEXT NOT NULL,
    "buildingId" TEXT NOT NULL,
    "movedOutAt" TIMESTAMP(3) NOT NULL,
    "beforeImageUrls" JSONB NOT NULL,
    "afterImageUrls" JSONB NOT NULL,
    "videoUrls" JSONB NOT NULL,
    "structuralChanges" JSONB NOT NULL,
    "damages" JSONB NOT NULL,
    "repairs" JSONB NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VacancySnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Incident_buildingId_status_idx" ON "Incident"("buildingId", "status");

-- CreateIndex
CREATE INDEX "MaintenanceRecord_buildingId_idx" ON "MaintenanceRecord"("buildingId");

-- CreateIndex
CREATE INDEX "VacancySnapshot_buildingId_movedOutAt_idx" ON "VacancySnapshot"("buildingId", "movedOutAt");

-- AddForeignKey
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_buildingId_fkey" FOREIGN KEY ("buildingId") REFERENCES "Building"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceRecord" ADD CONSTRAINT "MaintenanceRecord_buildingId_fkey" FOREIGN KEY ("buildingId") REFERENCES "Building"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VacancySnapshot" ADD CONSTRAINT "VacancySnapshot_buildingId_fkey" FOREIGN KEY ("buildingId") REFERENCES "Building"("id") ON DELETE CASCADE ON UPDATE CASCADE;
