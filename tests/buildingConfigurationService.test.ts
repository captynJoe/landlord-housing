import assert from "node:assert/strict";
import test from "node:test";
import type { PrismaClient } from "@prisma/client";
import { BuildingConfigurationService } from "../src/services/buildingConfigurationService.js";

test("syncLegacyPaymentAccess skips orphaned building records", async () => {
  const upsertCalls: string[] = [];
  const prisma = {
    building: {
      findMany: async () => [{ id: "CAPTYN-BLDG-00002" }]
    },
    buildingConfiguration: {
      upsert: (input: { where: { buildingId: string } }) => {
        upsertCalls.push(input.where.buildingId);
        return Promise.resolve({
          buildingId: input.where.buildingId
        });
      }
    },
    $transaction: async <T>(operations: Promise<T>[]) => Promise.all(operations)
  } as unknown as PrismaClient;

  const service = new BuildingConfigurationService(prisma);
  await service.syncLegacyPaymentAccess([
    {
      buildingId: "CAPTYN-BLDG-00002",
      rentEnabled: true,
      waterEnabled: true,
      electricityEnabled: true,
      updatedAt: "2026-05-10T00:00:00.000Z"
    },
    {
      buildingId: "CAPTYN-BLDG-99999",
      rentEnabled: false,
      waterEnabled: false,
      electricityEnabled: false,
      updatedAt: "2026-05-10T00:00:00.000Z"
    }
  ]);

  assert.deepEqual(upsertCalls, ["CAPTYN-BLDG-00002"]);
});
