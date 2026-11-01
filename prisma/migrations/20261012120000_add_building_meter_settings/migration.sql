ALTER TABLE "BuildingConfiguration"
ADD COLUMN "meterReadingDay" INTEGER,
ADD COLUMN "includedWaterUnits" DOUBLE PRECISION,
ADD COLUMN "includedElectricityUnits" DOUBLE PRECISION;
