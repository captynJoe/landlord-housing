ALTER TABLE "BuildingConfiguration"
  ADD COLUMN "lateRentPenaltyEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "lateRentPenaltyAmountKsh" INTEGER NOT NULL DEFAULT 0;
