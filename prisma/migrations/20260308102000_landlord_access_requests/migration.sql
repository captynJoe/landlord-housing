-- CreateEnum
CREATE TYPE "LandlordAccessRequestStatus" AS ENUM ('pending', 'approved', 'rejected');

-- CreateTable
CREATE TABLE "LandlordAccessRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "LandlordAccessRequestStatus" NOT NULL DEFAULT 'pending',
    "reason" TEXT,
    "reviewerNote" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "reviewedByUserId" TEXT,

    CONSTRAINT "LandlordAccessRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LandlordAccessRequest_status_requestedAt_idx" ON "LandlordAccessRequest"("status", "requestedAt");

-- CreateIndex
CREATE INDEX "LandlordAccessRequest_userId_status_idx" ON "LandlordAccessRequest"("userId", "status");

-- AddForeignKey
ALTER TABLE "LandlordAccessRequest" ADD CONSTRAINT "LandlordAccessRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "HousingUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LandlordAccessRequest" ADD CONSTRAINT "LandlordAccessRequest_reviewedByUserId_fkey" FOREIGN KEY ("reviewedByUserId") REFERENCES "HousingUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
