CREATE TABLE "StaffBuildingAssignment" (
    "id" TEXT NOT NULL,
    "staffUserId" TEXT NOT NULL,
    "buildingId" TEXT NOT NULL,
    "assignedByUserId" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StaffBuildingAssignment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StaffBuildingAssignment_staffUserId_key" ON "StaffBuildingAssignment"("staffUserId");
CREATE INDEX "StaffBuildingAssignment_buildingId_idx" ON "StaffBuildingAssignment"("buildingId");
CREATE INDEX "StaffBuildingAssignment_assignedByUserId_idx" ON "StaffBuildingAssignment"("assignedByUserId");

ALTER TABLE "StaffBuildingAssignment" ADD CONSTRAINT "StaffBuildingAssignment_staffUserId_fkey"
  FOREIGN KEY ("staffUserId") REFERENCES "HousingUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StaffBuildingAssignment" ADD CONSTRAINT "StaffBuildingAssignment_buildingId_fkey"
  FOREIGN KEY ("buildingId") REFERENCES "Building"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StaffBuildingAssignment" ADD CONSTRAINT "StaffBuildingAssignment_assignedByUserId_fkey"
  FOREIGN KEY ("assignedByUserId") REFERENCES "HousingUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "StaffBuildingAssignment" ("id", "staffUserId", "buildingId", "assignedByUserId", "note", "createdAt", "updatedAt")
SELECT "HousingUser"."id" || '-building-assignment', "HousingUser"."id", first_building."id", NULL, 'Migrated existing staff assignment', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "HousingUser"
CROSS JOIN LATERAL (SELECT "Building"."id" FROM "Building" ORDER BY "Building"."createdAt" ASC LIMIT 1) AS first_building
WHERE "HousingUser"."role" = 'staff' AND "HousingUser"."status" = 'active'
ON CONFLICT ("staffUserId") DO NOTHING;

ALTER TABLE "TenantAgreement"
  ADD COLUMN "status" TEXT NOT NULL DEFAULT 'draft',
  ADD COLUMN "acceptanceMethod" TEXT,
  ADD COLUMN "acceptedAt" TIMESTAMP(3),
  ADD COLUMN "acceptedByUserId" TEXT,
  ADD COLUMN "acceptedByName" TEXT,
  ADD COLUMN "acceptanceNote" TEXT,
  ADD COLUMN "verifiedAt" TIMESTAMP(3),
  ADD COLUMN "verifiedByUserId" TEXT,
  ADD COLUMN "verifiedByName" TEXT;

UPDATE "TenantAgreement"
SET "status" = 'verified',
    "acceptanceMethod" = 'legacy',
    "acceptedAt" = "updatedAt",
    "verifiedAt" = "updatedAt",
    "acceptedByName" = 'Existing tenancy record',
    "verifiedByName" = 'Existing tenancy record';

CREATE INDEX "TenantAgreement_status_updatedAt_idx" ON "TenantAgreement"("status", "updatedAt");
