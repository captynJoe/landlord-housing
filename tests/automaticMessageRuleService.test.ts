import assert from "node:assert/strict";
import test from "node:test";
import { AutomaticMessageRuleService } from "../src/services/automaticMessageRuleService.js";

test("automatic message rules default to sending payment, reminder, and overdue SMS", () => {
  const service = new AutomaticMessageRuleService();

  assert.equal(service.allows("BLDG-1", "payment_receipt"), true);
  assert.equal(service.allows("BLDG-1", "rent_reminder"), true);
  assert.equal(service.allows("BLDG-1", "utility_reminder"), true);
  assert.equal(service.allows("BLDG-1", "overdue_notice"), true);
});

test("automatic message rules can disable specific SMS kinds per building", () => {
  const service = new AutomaticMessageRuleService();

  const updated = service.updateForBuilding("BLDG-1", {
    paymentReceiptsEnabled: false,
    overdueNoticesEnabled: false
  });

  assert.equal(updated.paymentReceiptsEnabled, false);
  assert.equal(service.allows("BLDG-1", "payment_receipt"), false);
  assert.equal(service.allows("BLDG-1", "rent_reminder"), true);
  assert.equal(service.allows("BLDG-1", "overdue_notice"), false);
  assert.equal(service.allows("BLDG-2", "payment_receipt"), true);
});

test("automatic message rules import and export persisted state", () => {
  const service = new AutomaticMessageRuleService();
  service.importState({
    rules: [
      {
        buildingId: "BLDG-1",
        paymentReceiptsEnabled: true,
        rentRemindersEnabled: false,
        utilityRemindersEnabled: true,
        overdueNoticesEnabled: false,
        updatedAt: "2026-05-29T10:00:00.000Z"
      }
    ]
  });

  assert.equal(service.allows("BLDG-1", "rent_reminder"), false);
  assert.equal(service.exportState().rules.length, 1);
});
