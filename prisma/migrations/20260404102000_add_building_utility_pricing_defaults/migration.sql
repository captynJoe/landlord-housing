ALTER TABLE "BuildingConfiguration"
ADD COLUMN "defaultWaterRatePerUnitKsh" DOUBLE PRECISION,
ADD COLUMN "defaultElectricityRatePerUnitKsh" DOUBLE PRECISION,
ADD COLUMN "defaultWaterFixedChargeKsh" DOUBLE PRECISION,
ADD COLUMN "defaultElectricityFixedChargeKsh" DOUBLE PRECISION;

UPDATE "BuildingConfiguration"
SET "defaultWaterRatePerUnitKsh" = 150
WHERE "defaultWaterRatePerUnitKsh" IS NULL;
