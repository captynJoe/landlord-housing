CREATE TABLE "RoomBillingHold" (
    "id" TEXT NOT NULL,
    "buildingId" TEXT NOT NULL,
    "houseNumber" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "utilityType" TEXT,
    "startMonth" TEXT NOT NULL,
    "endMonth" TEXT NOT NULL,
    "reason" TEXT,
    "createdByUserId" TEXT,
    "createdByRole" TEXT,
    "createdByName" TEXT,
    "canceledAt" TIMESTAMP(3),
    "canceledByUserId" TEXT,
    "canceledByRole" TEXT,
    "canceledByName" TEXT,
    "cancelReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoomBillingHold_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "RoomBillingHold_buildingId_houseNumber_startMonth_endMonth_idx" ON "RoomBillingHold"("buildingId", "houseNumber", "startMonth", "endMonth");
CREATE INDEX "RoomBillingHold_buildingId_canceledAt_idx" ON "RoomBillingHold"("buildingId", "canceledAt");
CREATE INDEX "RoomBillingHold_createdByUserId_createdAt_idx" ON "RoomBillingHold"("createdByUserId", "createdAt");

ALTER TABLE "RoomBillingHold" ADD CONSTRAINT "RoomBillingHold_buildingId_fkey" FOREIGN KEY ("buildingId") REFERENCES "Building"("id") ON DELETE CASCADE ON UPDATE CASCADE;
