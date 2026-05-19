-- AlterTable
ALTER TABLE "UserSession" ADD COLUMN "residentTenancyId" TEXT;

-- CreateIndex
CREATE INDEX "UserSession_residentTenancyId_idx" ON "UserSession"("residentTenancyId");

-- AddForeignKey
ALTER TABLE "UserSession" ADD CONSTRAINT "UserSession_residentTenancyId_fkey" FOREIGN KEY ("residentTenancyId") REFERENCES "Tenancy"("id") ON DELETE SET NULL ON UPDATE CASCADE;
