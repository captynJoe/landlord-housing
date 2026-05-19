-- CreateTable
CREATE TABLE "RoomAccountAuditEvent" (
    "id" TEXT NOT NULL,
    "buildingId" TEXT NOT NULL,
    "houseNumber" TEXT NOT NULL,
    "tenancyId" TEXT,
    "actorUserId" TEXT,
    "actorRole" TEXT,
    "actorName" TEXT,
    "action" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RoomAccountAuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RoomAccountAuditEvent_buildingId_houseNumber_createdAt_idx" ON "RoomAccountAuditEvent"("buildingId", "houseNumber", "createdAt");

-- CreateIndex
CREATE INDEX "RoomAccountAuditEvent_tenancyId_createdAt_idx" ON "RoomAccountAuditEvent"("tenancyId", "createdAt");

-- CreateIndex
CREATE INDEX "RoomAccountAuditEvent_actorUserId_createdAt_idx" ON "RoomAccountAuditEvent"("actorUserId", "createdAt");

-- AddForeignKey
ALTER TABLE "RoomAccountAuditEvent" ADD CONSTRAINT "RoomAccountAuditEvent_buildingId_fkey" FOREIGN KEY ("buildingId") REFERENCES "Building"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomAccountAuditEvent" ADD CONSTRAINT "RoomAccountAuditEvent_tenancyId_fkey" FOREIGN KEY ("tenancyId") REFERENCES "Tenancy"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomAccountAuditEvent" ADD CONSTRAINT "RoomAccountAuditEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "HousingUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
