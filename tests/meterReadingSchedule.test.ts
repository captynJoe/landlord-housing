import assert from "node:assert/strict";
import test from "node:test";
import {
  addCalendarMonths,
  getMeterReadingDueInfo
} from "../src/services/meterReadingSchedule.js";
import { UtilityBillingService } from "../src/services/utilityBillingService.js";

const BUILDING_A = "CAPTYN-BLDG-00001";
const BUILDING_B = "CAPTYN-BLDG-00002";

test("adds calendar months and clamps to the end of shorter months", () => {
  assert.equal(
    addCalendarMonths(new Date("2026-09-02T08:00:00.000Z"), 1).toISOString(),
    "2026-10-02T08:00:00.000Z"
  );
  assert.equal(
    addCalendarMonths(new Date("2026-01-31T08:00:00.000Z"), 1).toISOString(),
    "2026-02-28T08:00:00.000Z"
  );
  assert.equal(
    addCalendarMonths(new Date("2026-12-15T08:00:00.000Z"), 1).toISOString(),
    "2027-01-15T08:00:00.000Z"
  );
});

test("meter reading falls due one month after it was recorded", () => {
  const recordedAt = "2026-09-02T08:00:00.000Z";

  assert.deepEqual(getMeterReadingDueInfo(undefined, new Date("2026-09-20T00:00:00Z")), {
    status: "no_reading"
  });

  const early = getMeterReadingDueInfo(recordedAt, new Date("2026-09-20T12:00:00Z"));
  assert.equal(early.status, "ok");
  assert.equal(early.daysUntilDue, 12);
  assert.equal(early.nextDueAt, "2026-10-02T08:00:00.000Z");

  assert.equal(getMeterReadingDueInfo(recordedAt, new Date("2026-09-28T23:00:00Z")).status, "ok");
  assert.equal(
    getMeterReadingDueInfo(recordedAt, new Date("2026-09-29T01:00:00Z")).status,
    "due_soon"
  );
  assert.equal(
    getMeterReadingDueInfo(recordedAt, new Date("2026-10-02T20:00:00Z")).status,
    "due_soon"
  );

  const late = getMeterReadingDueInfo(recordedAt, new Date("2026-10-05T09:00:00Z"));
  assert.equal(late.status, "overdue");
  assert.equal(late.daysUntilDue, -3);
});

test("lists the latest metered reading per room and utility for a building", () => {
  const service = new UtilityBillingService();
  const dueDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();

  service.createBill("water", BUILDING_A, "A-1", {
    billingMonth: "2026-08",
    meterNumber: "W-1",
    previousReading: 100,
    currentReading: 110,
    ratePerUnitKsh: 150,
    fixedChargeKsh: 0,
    dueDate
  });
  service.createBill("water", BUILDING_A, "A-1", {
    billingMonth: "2026-09",
    currentReading: 118,
    ratePerUnitKsh: 150,
    fixedChargeKsh: 0,
    dueDate
  });
  service.createBill("electricity", BUILDING_A, "A-2", {
    billingMonth: "2026-09",
    fixedChargeKsh: 500,
    dueDate
  });
  service.createBill("water", BUILDING_B, "B-1", {
    billingMonth: "2026-09",
    meterNumber: "W-9",
    previousReading: 1,
    currentReading: 2,
    ratePerUnitKsh: 150,
    fixedChargeKsh: 0,
    dueDate
  });

  const readings = service.listLatestMeterReadings(BUILDING_A);
  assert.equal(readings.length, 1);
  assert.equal(readings[0].houseNumber, "A-1");
  assert.equal(readings[0].billingMonth, "2026-09");
  assert.equal(readings[0].currentReading, 118);
  assert.equal(readings[0].unitsConsumed, 8);
});

test("a new reading bills the current month, or the next free month", () => {
  const service = new UtilityBillingService();
  const dueDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
  const now = new Date("2026-10-02T09:00:00Z");

  assert.equal(service.resolveReadingBillMonth("water", BUILDING_A, "A-1", now), "2026-10");

  service.createBill("water", BUILDING_A, "A-1", {
    billingMonth: "2026-09",
    meterNumber: "W-1",
    previousReading: 0,
    currentReading: 10,
    ratePerUnitKsh: 150,
    fixedChargeKsh: 0,
    dueDate
  });
  assert.equal(service.resolveReadingBillMonth("water", BUILDING_A, "A-1", now), "2026-10");

  service.createBill("water", BUILDING_A, "A-1", {
    billingMonth: "2026-10",
    currentReading: 20,
    ratePerUnitKsh: 150,
    fixedChargeKsh: 0,
    dueDate
  });
  assert.equal(service.resolveReadingBillMonth("water", BUILDING_A, "A-1", now), "2026-11");
});

test("usage above the allowance is charged on top of the flat bill", () => {
  const service = new UtilityBillingService();
  const dueDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
  service.createBill("water", BUILDING_A, "A-1", {
    billingMonth: "2026-10",
    fixedChargeKsh: 500,
    dueDate,
    note: "Combined utility fee (water+electricity) for 2026-10."
  });

  const { bill, charge } = service.recordUsageReading({
    utilityType: "water",
    billUtilityType: "water",
    buildingId: BUILDING_A,
    houseNumber: "A-1",
    billingMonth: "2026-10",
    previousReading: 100,
    currentReading: 104,
    includedUnits: 2.5,
    ratePerUnitKsh: 150
  });
  assert.equal(charge.extraUnits, 1.5);
  assert.equal(charge.amountKsh, 225);
  assert.equal(bill.fixedChargeKsh, 500);
  assert.equal(bill.amountKsh, 725);
  assert.equal(bill.balanceKsh, 725);

  // Electricity within its allowance adds nothing; correcting water replaces the line.
  service.recordUsageReading({
    utilityType: "electricity",
    billUtilityType: "water",
    buildingId: BUILDING_A,
    houseNumber: "A-1",
    billingMonth: "2026-10",
    previousReading: 10,
    currentReading: 15,
    includedUnits: 10,
    ratePerUnitKsh: 30
  });
  const corrected = service.recordUsageReading({
    utilityType: "water",
    billUtilityType: "water",
    buildingId: BUILDING_A,
    houseNumber: "A-1",
    billingMonth: "2026-10",
    previousReading: 100,
    currentReading: 102,
    includedUnits: 2.5,
    ratePerUnitKsh: 150
  });
  assert.equal(corrected.bill.amountKsh, 500);
  assert.equal(corrected.bill.usageCharges?.length, 2);

  const readings = service.listLatestMeterReadings(BUILDING_A);
  assert.deepEqual(
    readings.map((item) => [item.utilityType, item.currentReading]).sort(),
    [["electricity", 15], ["water", 102]]
  );
});

test("usage charges survive export/import and combined normalisation", () => {
  const service = new UtilityBillingService();
  const dueDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
  service.createBill("water", BUILDING_A, "A-1", {
    billingMonth: "2026-10",
    fixedChargeKsh: 500,
    dueDate,
    note: "Combined utility fee (water+electricity) for 2026-10."
  });
  service.recordUsageReading({
    utilityType: "water",
    billUtilityType: "water",
    buildingId: BUILDING_A,
    houseNumber: "A-1",
    billingMonth: "2026-10",
    previousReading: 0,
    currentReading: 5,
    includedUnits: 2.5,
    ratePerUnitKsh: 150
  });

  const restored = new UtilityBillingService();
  restored.importState(service.exportState());
  restored.setCombinedChargeBuildingIds([BUILDING_A]);
  restored.setCombinedChargeBuildingAmounts([{ buildingId: BUILDING_A, amountKsh: 500 }]);
  const bill = restored.listBills({ buildingId: BUILDING_A })[0];
  assert.equal(bill.amountKsh, 875);
  assert.equal(bill.usageCharges?.[0].amountKsh, 375);
});

test("next month's flat bill uses the room amount, else the building default", () => {
  const service = new UtilityBillingService();
  service.setCombinedChargeBuildingIds([BUILDING_A]);
  service.setCombinedChargeBuildingAmounts([{ buildingId: BUILDING_A, amountKsh: 500 }]);
  service.setCombinedChargeRoomAmounts([
    { buildingId: BUILDING_A, houseNumber: "A-2", amountKsh: 800 }
  ]);
  const lastMonthDue = new Date(Date.now() - 20 * 24 * 60 * 60 * 1000);
  const month = `${lastMonthDue.getUTCFullYear()}-${String(lastMonthDue.getUTCMonth() + 1).padStart(2, "0")}`;
  for (const house of ["A-1", "A-2"]) {
    service.createBill("water", BUILDING_A, house, {
      billingMonth: month,
      fixedChargeKsh: 350,
      dueDate: lastMonthDue.toISOString(),
      note: `Combined utility fee (water+electricity) for ${month}.`
    });
  }

  const created = service.backfillRecurringBills({
    buildingId: BUILDING_A,
    visibleThroughDate: new Date(Date.now() + 40 * 24 * 60 * 60 * 1000)
  });
  const byHouse = new Map(created.map((item) => [item.houseNumber, item.amountKsh]));
  assert.equal(byHouse.get("A-1"), 500);
  assert.equal(byHouse.get("A-2"), 800);
});

test("baseline readings count as the latest reading, survive export/import and purge", () => {
  const service = new UtilityBillingService();
  service.recordBaselineReading({
    utilityType: "water",
    buildingId: BUILDING_A,
    houseNumber: "V-1",
    reading: 20.99,
    recordedAt: "2026-10-04T08:00:00.000Z"
  });

  let latest = service.listLatestMeterReadings(BUILDING_A);
  assert.equal(latest.length, 1);
  assert.equal(latest[0].currentReading, 20.99);
  assert.equal(latest[0].unitsConsumed, 0);
  assert.equal(service.listBills({ buildingId: BUILDING_A }).length, 0);

  const restored = new UtilityBillingService();
  restored.importState(service.exportState());
  latest = restored.listLatestMeterReadings(BUILDING_A);
  assert.equal(latest[0].currentReading, 20.99);

  restored.purgeHouse(BUILDING_A, "V-1");
  assert.equal(restored.listLatestMeterReadings(BUILDING_A).length, 0);
});

test("a charged reading after a baseline is measured from the baseline", () => {
  const service = new UtilityBillingService();
  service.recordBaselineReading({
    utilityType: "water",
    buildingId: BUILDING_A,
    houseNumber: "V-2",
    reading: 100,
    recordedAt: "2026-09-10T08:00:00.000Z"
  });
  service.createBill("water", BUILDING_A, "V-2", {
    billingMonth: "2026-10",
    fixedChargeKsh: 500,
    dueDate: new Date(Date.now() + 3 * 864e5).toISOString(),
    note: "Combined utility fee (water, electricity & trash) for 2026-10."
  });
  const start = service
    .listLatestMeterReadings(BUILDING_A)
    .find((item) => item.utilityType === "water")!;
  const { charge } = service.recordUsageReading({
    utilityType: "water",
    billUtilityType: "water",
    buildingId: BUILDING_A,
    houseNumber: "V-2",
    billingMonth: "2026-10",
    previousReading: start.currentReading,
    currentReading: 104,
    includedUnits: 2.5,
    ratePerUnitKsh: 150
  });
  assert.equal(charge.unitsConsumed, 4);
  assert.equal(charge.amountKsh, 225);
  assert.equal(service.listLatestMeterReadings(BUILDING_A)[0].currentReading, 104);
});
