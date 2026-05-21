import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { PaymentInstructionService } from "../src/services/paymentInstructionService.js";

function tempStatePath(): string {
  return path.join(
    mkdtempSync(path.join(tmpdir(), "payment-instructions-")),
    "state.json"
  );
}

test("defaults buildings to M-PESA payment instructions", () => {
  const service = new PaymentInstructionService(tempStatePath());
  const record = service.getForBuilding("BLDG-A");

  assert.equal(record.buildingId, "BLDG-A");
  assert.equal(record.primaryMethod, "mpesa");
  assert.equal(record.mpesaBusinessNumber, undefined);
});

test("stores bank payment details without leaking across buildings", () => {
  const service = new PaymentInstructionService(tempStatePath());
  const updated = service.updateForBuilding("BLDG-B", {
    primaryMethod: "bank",
    bankName: "Estate Bank",
    bankAccountName: "Building B Rent",
    bankAccountNumber: "123456789",
    instructions: "Use house number as narration."
  });

  assert.equal(updated.primaryMethod, "bank");
  assert.equal(updated.bankName, "Estate Bank");
  assert.equal(updated.bankAccountNumber, "123456789");
  assert.equal(service.getForBuilding("BLDG-C").bankName, undefined);
});

test("imports and exports normalized instruction records", () => {
  const service = new PaymentInstructionService(tempStatePath());
  service.updateForBuilding("BLDG-C", {
    primaryMethod: "cash",
    cashLocation: "Manager office",
    proofInstructions: "Keep the signed receipt."
  });

  const restored = new PaymentInstructionService(tempStatePath());
  restored.importState(service.exportState());
  const record = restored.getForBuilding("BLDG-C");

  assert.equal(record.primaryMethod, "cash");
  assert.equal(record.cashLocation, "Manager office");
  assert.equal(record.proofInstructions, "Keep the signed receipt.");
});
