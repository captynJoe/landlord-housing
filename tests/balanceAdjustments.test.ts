import assert from "node:assert/strict";
import test from "node:test";
import { UtilityBillingService } from "../src/services/utilityBillingService.js";

const BUILDING = "CAPTYN-BLDG-00001";
const pastDue = (daysAgo: number) =>
  new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString();

function seed() {
  const service = new UtilityBillingService();
  service.createBill("water", BUILDING, "A-1", {
    billingMonth: "2026-08",
    fixedChargeKsh: 500,
    dueDate: pastDue(40),
    note: "Combined utility fee (water+electricity) for 2026-08."
  });
  service.createBill("water", BUILDING, "A-1", {
    billingMonth: "2026-09",
    fixedChargeKsh: 500,
    dueDate: pastDue(10),
    note: "Combined utility fee (water+electricity) for 2026-09."
  });
  return service;
}

test("lowering a room's utility balance clears the oldest bills first", () => {
  const service = seed();
  assert.deepEqual(service.getVisibleOpenBalanceForHouse(BUILDING, "A-1"), {
    water: 1000,
    electricity: 0,
    total: 1000
  });

  assert.deepEqual(service.setVisibleOpenBalanceForHouse(BUILDING, "A-1", 300), {
    previousKsh: 1000,
    newKsh: 300
  });
  const bills = service.listBills({ buildingId: BUILDING }).sort((a, b) =>
    a.billingMonth.localeCompare(b.billingMonth)
  );
  assert.equal(bills[0].balanceKsh, 0);
  assert.equal(bills[0].adjustmentKsh, -500);
  assert.equal(bills[1].balanceKsh, 300);
  assert.equal(bills[1].adjustmentKsh, -200);
  assert.equal(bills[1].amountKsh, 500);
});

test("raising a room's utility balance adds to the newest open bill", () => {
  const service = seed();
  service.setVisibleOpenBalanceForHouse(BUILDING, "A-1", 1250);
  const latest = service.listBills({ buildingId: BUILDING, billingMonth: "2026-09" })[0];
  assert.equal(latest.balanceKsh, 750);
  assert.equal(latest.adjustmentKsh, 250);
});

test("adjustments survive export/import and flat-fee normalisation", () => {
  const service = seed();
  service.setVisibleOpenBalanceForHouse(BUILDING, "A-1", 300);

  const restored = new UtilityBillingService();
  restored.importState(service.exportState());
  restored.setCombinedChargeBuildingIds([BUILDING]);
  restored.setCombinedChargeBuildingAmounts([{ buildingId: BUILDING, amountKsh: 500 }]);
  assert.equal(restored.getVisibleOpenBalanceForHouse(BUILDING, "A-1").total, 300);
});

test("a room with no bills cannot have a balance added", () => {
  const service = new UtilityBillingService();
  assert.throws(() => service.setVisibleOpenBalanceForHouse(BUILDING, "B-9", 200), /no utility bill/);
  assert.deepEqual(service.setVisibleOpenBalanceForHouse(BUILDING, "B-9", 0), {
    previousKsh: 0,
    newKsh: 0
  });
});
