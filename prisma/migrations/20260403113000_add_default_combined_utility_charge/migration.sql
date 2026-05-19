ALTER TABLE "BuildingConfiguration"
ADD COLUMN "defaultCombinedUtilityChargeKsh" INTEGER;

UPDATE "BuildingConfiguration"
SET "defaultCombinedUtilityChargeKsh" = 350
WHERE "utilityBillingMode" = 'combined_charge'
  AND "defaultCombinedUtilityChargeKsh" IS NULL;
