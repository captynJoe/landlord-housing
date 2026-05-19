import assert from "node:assert/strict";
import test from "node:test";
import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { PaymentAccessService } from "../src/services/paymentAccessService.js";

test("removes deleted building payment access records from exported state", () => {
  const tempDir = mkdtempSync(path.join(os.tmpdir(), "payment-access-service-"));

  try {
    const service = new PaymentAccessService(
      path.join(tempDir, "payment-access-controls.json")
    );

    service.updateForBuilding("CAPTYN-BLDG-00002", {
      rentEnabled: true,
      waterEnabled: true,
      electricityEnabled: false
    });
    service.updateForBuilding("CAPTYN-BLDG-00003", {
      rentEnabled: false,
      waterEnabled: true,
      electricityEnabled: true
    });

    assert.equal(service.removeBuilding("CAPTYN-BLDG-00002"), true);
    assert.equal(service.removeBuilding("CAPTYN-BLDG-00002"), false);

    const exported = service.exportState();
    assert.deepEqual(
      exported.records.map((item) => item.buildingId),
      ["CAPTYN-BLDG-00003"]
    );
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});
