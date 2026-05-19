-- CreateTable
CREATE TABLE "HouseholdMemberRegistry" (
    "id" TEXT NOT NULL,
    "buildingId" TEXT NOT NULL,
    "houseNumber" TEXT NOT NULL,
    "members" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HouseholdMemberRegistry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "HouseholdMemberRegistry_buildingId_houseNumber_key" ON "HouseholdMemberRegistry"("buildingId", "houseNumber");

-- CreateIndex
CREATE INDEX "HouseholdMemberRegistry_buildingId_updatedAt_idx" ON "HouseholdMemberRegistry"("buildingId", "updatedAt");

-- AddForeignKey
ALTER TABLE "HouseholdMemberRegistry" ADD CONSTRAINT "HouseholdMemberRegistry_buildingId_fkey" FOREIGN KEY ("buildingId") REFERENCES "Building"("id") ON DELETE CASCADE ON UPDATE CASCADE;
