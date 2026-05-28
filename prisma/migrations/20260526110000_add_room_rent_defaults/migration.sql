-- AlterTable
ALTER TABLE "BuildingConfiguration"
ADD COLUMN "defaultMonthlyRentKsh" INTEGER,
ADD COLUMN "defaultRentDueDay" INTEGER;

-- CreateTable
CREATE TABLE "RoomRentDefault" (
    "id" TEXT NOT NULL,
    "buildingId" TEXT NOT NULL,
    "houseNumber" TEXT NOT NULL,
    "monthlyRentKsh" INTEGER,
    "paymentDueDay" INTEGER,
    "graceDays" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "note" TEXT,
    "updatedByRole" TEXT,
    "updatedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoomRentDefault_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RoomRentDefault_buildingId_houseNumber_key" ON "RoomRentDefault"("buildingId", "houseNumber");

-- CreateIndex
CREATE INDEX "RoomRentDefault_buildingId_active_idx" ON "RoomRentDefault"("buildingId", "active");

-- CreateIndex
CREATE INDEX "RoomRentDefault_updatedAt_idx" ON "RoomRentDefault"("updatedAt");

-- AddForeignKey
ALTER TABLE "RoomRentDefault" ADD CONSTRAINT "RoomRentDefault_buildingId_fkey" FOREIGN KEY ("buildingId") REFERENCES "Building"("id") ON DELETE CASCADE ON UPDATE CASCADE;
