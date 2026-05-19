CREATE TABLE "ResidentMoveOutSettlement" (
    "id" TEXT NOT NULL,
    "buildingId" TEXT NOT NULL,
    "houseNumber" TEXT NOT NULL,
    "residentUserId" TEXT NOT NULL,
    "tenancyId" TEXT,
    "action" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'recorded',
    "amountKsh" INTEGER NOT NULL,
    "rentKsh" INTEGER NOT NULL DEFAULT 0,
    "utilityKsh" INTEGER NOT NULL DEFAULT 0,
    "roomChargesKsh" INTEGER NOT NULL DEFAULT 0,
    "reason" TEXT,
    "metadata" JSONB,
    "createdByUserId" TEXT,
    "createdByRole" TEXT,
    "createdByName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResidentMoveOutSettlement_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ResidentMoveOutSettlement_buildingId_houseNumber_createdAt_idx" ON "ResidentMoveOutSettlement"("buildingId", "houseNumber", "createdAt");
CREATE INDEX "ResidentMoveOutSettlement_residentUserId_createdAt_idx" ON "ResidentMoveOutSettlement"("residentUserId", "createdAt");
CREATE INDEX "ResidentMoveOutSettlement_tenancyId_createdAt_idx" ON "ResidentMoveOutSettlement"("tenancyId", "createdAt");
CREATE INDEX "ResidentMoveOutSettlement_action_createdAt_idx" ON "ResidentMoveOutSettlement"("action", "createdAt");

ALTER TABLE "ResidentMoveOutSettlement" ADD CONSTRAINT "ResidentMoveOutSettlement_buildingId_fkey" FOREIGN KEY ("buildingId") REFERENCES "Building"("id") ON DELETE CASCADE ON UPDATE CASCADE;
