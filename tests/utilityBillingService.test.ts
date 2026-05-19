import assert from "node:assert/strict";
import test from "node:test";
import { UtilityBillingService } from "../src/services/utilityBillingService.js";

const BUILDING_A = "CAPTYN-BLDG-00001";
const BUILDING_B = "CAPTYN-BLDG-00002";

test("supports fixed-charge bill for house without meter", () => {
  const service = new UtilityBillingService();
  const dueDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();

  const bill = service.createBill("water", BUILDING_A, "A-12", {
    billingMonth: "2026-03",
    fixedChargeKsh: 150,
    dueDate
  });

  assert.equal(bill.meterNumber, "NO-METER");
  assert.equal(bill.amountKsh, 150);
  assert.equal(bill.unitsConsumed, 0);
});

test("requires current reading + rate for metered bill", () => {
  const service = new UtilityBillingService();
  const dueDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();

  service.upsertMeter("water", BUILDING_A, "A-12", {
    meterNumber: "WTR-001"
  });

  assert.throws(() => {
    service.createBill("water", BUILDING_A, "A-12", {
      billingMonth: "2026-03",
      fixedChargeKsh: 150,
      dueDate
    });
  }, /Current reading and rate per unit are required/);
});

test("creates monthly bill and computes units from previous reading", () => {
  const service = new UtilityBillingService();
  const dueDate = new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString();

  service.upsertMeter("electricity", BUILDING_A, "A-12", {
    meterNumber: "ELEC-0001"
  });

  service.createBill("electricity", BUILDING_A, "A-12", {
    billingMonth: "2026-02",
    currentReading: 100,
    ratePerUnitKsh: 20,
    fixedChargeKsh: 0,
    dueDate
  });

  const next = service.createBill("electricity", BUILDING_A, "A-12", {
    billingMonth: "2026-03",
    currentReading: 160,
    ratePerUnitKsh: 20,
    fixedChargeKsh: 100,
    dueDate
  });

  assert.equal(next.previousReading, 100);
  assert.equal(next.unitsConsumed, 60);
  assert.equal(next.amountKsh, 1300);
  assert.equal(next.balanceKsh, 1300);
});

test("lists the latest recorded reading for each utility in a house", () => {
  const service = new UtilityBillingService();
  const dueDate = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString();

  service.upsertMeter("water", BUILDING_A, "A-12", {
    meterNumber: "WTR-001"
  });
  service.upsertMeter("electricity", BUILDING_A, "A-12", {
    meterNumber: "ELEC-0001"
  });

  service.createBill("water", BUILDING_A, "A-12", {
    billingMonth: "2026-02",
    currentReading: 90,
    ratePerUnitKsh: 10,
    fixedChargeKsh: 0,
    dueDate
  });
  service.createBill("water", BUILDING_A, "A-12", {
    billingMonth: "2026-03",
    currentReading: 120,
    ratePerUnitKsh: 10,
    fixedChargeKsh: 0,
    dueDate
  });
  service.createBill("electricity", BUILDING_A, "A-12", {
    billingMonth: "2026-03",
    currentReading: 45,
    ratePerUnitKsh: 12,
    fixedChargeKsh: 50,
    dueDate
  });

  const readings = service.listLatestReadingsForHouse(BUILDING_A, "A-12");
  assert.equal(readings.length, 2);

  const water = readings.find((item) => item.utilityType === "water");
  const electricity = readings.find((item) => item.utilityType === "electricity");

  assert.ok(water);
  assert.equal(water.billingMonth, "2026-03");
  assert.equal(water.previousReading, 90);
  assert.equal(water.currentReading, 120);

  assert.ok(electricity);
  assert.equal(electricity.billingMonth, "2026-03");
  assert.equal(electricity.currentReading, 45);
});

test("ignores newer fixed-charge bills when selecting the latest meter reading", () => {
  const service = new UtilityBillingService();
  const dueDate = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString();
  const createdAt = new Date().toISOString();

  service.importState({
    meters: [
      {
        utilityType: "water",
        buildingId: BUILDING_B,
        houseNumber: "12",
        meterNumber: "WTR-0012",
        updatedAt: createdAt
      }
    ],
    bills: [
      {
        id: "metered-water-12-2026-01",
        utilityType: "water",
        buildingId: BUILDING_B,
        houseNumber: "12",
        billingMonth: "2026-01",
        meterNumber: "WTR-0012",
        previousReading: 50,
        currentReading: 82,
        unitsConsumed: 32,
        ratePerUnitKsh: 10,
        fixedChargeKsh: 0,
        amountKsh: 320,
        balanceKsh: 0,
        dueDate,
        createdAt,
        updatedAt: "2026-03-01T12:00:00.000Z",
        payments: [],
        status: "clear",
        daysToDue: 0
      },
      {
        id: "fixed-water-12-2026-02",
        utilityType: "water",
        buildingId: BUILDING_B,
        houseNumber: "12",
        billingMonth: "2026-02",
        meterNumber: "NO-METER",
        previousReading: 0,
        currentReading: 0,
        unitsConsumed: 0,
        ratePerUnitKsh: 0,
        fixedChargeKsh: 350,
        amountKsh: 350,
        balanceKsh: 350,
        dueDate,
        createdAt,
        updatedAt: "2026-03-15T12:00:00.000Z",
        payments: [],
        status: "due_soon",
        daysToDue: 3
      }
    ]
  } as any);

  const readings = service.listLatestReadingsForHouse(BUILDING_B, "12");
  assert.equal(readings.length, 1);
  assert.equal(readings[0].utilityType, "water");
  assert.equal(readings[0].billingMonth, "2026-01");
  assert.equal(readings[0].currentReading, 82);
});

test("removes legacy METER-UNSET placeholders from imported utility state", () => {
  const service = new UtilityBillingService();
  const dueDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString();
  const createdAt = new Date().toISOString();

  const normalized = service.importState({
    meters: [
      {
        utilityType: "water",
        buildingId: BUILDING_B,
        houseNumber: "14",
        meterNumber: "METER-UNSET",
        updatedAt: createdAt
      }
    ],
    bills: [
      {
        id: "legacy-reading-14-2026-03",
        utilityType: "electricity",
        buildingId: BUILDING_B,
        houseNumber: "14",
        billingMonth: "2026-03",
        meterNumber: "METER-UNSET",
        previousReading: 10,
        currentReading: 25,
        unitsConsumed: 15,
        ratePerUnitKsh: 12,
        fixedChargeKsh: 0,
        amountKsh: 180,
        balanceKsh: 180,
        dueDate,
        createdAt,
        updatedAt: createdAt,
        payments: [],
        status: "due_soon",
        daysToDue: 3
      }
    ]
  } as any);

  assert.equal(normalized, true);
  assert.equal(service.listMeters({ buildingId: BUILDING_B, houseNumber: "14" }).length, 0);

  const readings = service.listLatestReadingsForHouse(BUILDING_B, "14");
  assert.equal(readings.length, 1);
  assert.equal(readings[0].meterNumber, "");
  assert.equal(readings[0].currentReading, 25);
});

test("room-level combined utility override recalculates existing combined-charge overdue", () => {
  const service = new UtilityBillingService();
  const dueDate = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString();
  const createdAt = new Date().toISOString();

  service.importState({
    meters: [],
    bills: [
      {
        id: "combined-water-4-2026-03",
        utilityType: "water",
        buildingId: BUILDING_B,
        houseNumber: "4",
        billingMonth: "2026-03",
        meterNumber: "NO-METER",
        previousReading: 0,
        currentReading: 0,
        unitsConsumed: 0,
        ratePerUnitKsh: 0,
        fixedChargeKsh: 350,
        amountKsh: 350,
        balanceKsh: 350,
        dueDate,
        createdAt,
        updatedAt: "2026-03-20T12:00:00.000Z",
        payments: [],
        note: "Combined utility fee (water+electricity) for 2026-03.",
        status: "overdue",
        daysToDue: -5
      },
      {
        id: "combined-electricity-4-2026-03",
        utilityType: "electricity",
        buildingId: BUILDING_B,
        houseNumber: "4",
        billingMonth: "2026-03",
        meterNumber: "NO-METER",
        previousReading: 0,
        currentReading: 0,
        unitsConsumed: 0,
        ratePerUnitKsh: 0,
        fixedChargeKsh: 350,
        amountKsh: 350,
        balanceKsh: 350,
        dueDate,
        createdAt,
        updatedAt: "2026-03-20T12:00:00.000Z",
        payments: [],
        note: "Combined utility fee (water+electricity) for 2026-03.",
        status: "overdue",
        daysToDue: -5
      }
    ]
  } as any);

  service.setCombinedChargeBuildingIds([BUILDING_B]);
  service.setCombinedChargeRoomAmounts([
    {
      buildingId: BUILDING_B,
      houseNumber: "4",
      amountKsh: 220
    }
  ]);

  const bills = service.listBills({ buildingId: BUILDING_B, houseNumber: "4" });
  const water = bills.find((item) => item.utilityType === "water");
  const electricity = bills.find((item) => item.utilityType === "electricity");

  assert.ok(water);
  assert.equal(water.amountKsh, 220);
  assert.equal(water.balanceKsh, 220);
  assert.equal(water.fixedChargeKsh, 220);

  assert.ok(electricity);
  assert.equal(electricity.amountKsh, 0);
  assert.equal(electricity.balanceKsh, 0);
});

test("room-level combined utility override still recalculates combined-charge rooms with both meters", () => {
  const service = new UtilityBillingService();
  const dueDate = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString();
  const createdAt = new Date().toISOString();

  service.importState({
    meters: [
      {
        utilityType: "water",
        buildingId: BUILDING_B,
        houseNumber: "5",
        meterNumber: "WTR-0005",
        updatedAt: createdAt
      },
      {
        utilityType: "electricity",
        buildingId: BUILDING_B,
        houseNumber: "5",
        meterNumber: "ELEC-0005",
        updatedAt: createdAt
      }
    ],
    bills: [
      {
        id: "combined-water-5-2026-03",
        utilityType: "water",
        buildingId: BUILDING_B,
        houseNumber: "5",
        billingMonth: "2026-03",
        meterNumber: "NO-METER",
        previousReading: 0,
        currentReading: 0,
        unitsConsumed: 0,
        ratePerUnitKsh: 0,
        fixedChargeKsh: 350,
        amountKsh: 350,
        balanceKsh: 350,
        dueDate,
        createdAt,
        updatedAt: "2026-03-20T12:00:00.000Z",
        payments: [],
        note: "Combined utility fee (water+electricity) for 2026-03.",
        status: "overdue",
        daysToDue: -5
      },
      {
        id: "combined-electricity-5-2026-03",
        utilityType: "electricity",
        buildingId: BUILDING_B,
        houseNumber: "5",
        billingMonth: "2026-03",
        meterNumber: "NO-METER",
        previousReading: 0,
        currentReading: 0,
        unitsConsumed: 0,
        ratePerUnitKsh: 0,
        fixedChargeKsh: 350,
        amountKsh: 350,
        balanceKsh: 350,
        dueDate,
        createdAt,
        updatedAt: "2026-03-20T12:00:00.000Z",
        payments: [],
        note: "Combined utility fee (water+electricity) for 2026-03.",
        status: "overdue",
        daysToDue: -5
      }
    ]
  } as any);

  service.setCombinedChargeBuildingIds([BUILDING_B]);
  service.setCombinedChargeBuildingAmounts([
    {
      buildingId: BUILDING_B,
      amountKsh: 240
    }
  ]);
  service.setCombinedChargeRoomAmounts([
    {
      buildingId: BUILDING_B,
      houseNumber: "5",
      amountKsh: 180
    }
  ]);

  const bills = service.listBills({ buildingId: BUILDING_B, houseNumber: "5" });
  const water = bills.find((item) => item.utilityType === "water");
  const electricity = bills.find((item) => item.utilityType === "electricity");

  assert.ok(water);
  assert.equal(water.amountKsh, 180);
  assert.equal(water.balanceKsh, 180);
  assert.equal(water.fixedChargeKsh, 180);

  assert.ok(electricity);
  assert.equal(electricity.amountKsh, 0);
  assert.equal(electricity.balanceKsh, 0);
});

test("purges room-scoped utility state when a room is removed", () => {
  const service = new UtilityBillingService();
  const dueDate = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString();

  service.upsertMeter("water", BUILDING_B, "46", {
    meterNumber: "WTR-0046"
  });
  service.createBill("water", BUILDING_B, "46", {
    billingMonth: "2026-03",
    currentReading: 110,
    ratePerUnitKsh: 15,
    fixedChargeKsh: 0,
    dueDate
  });
  service.recordPayment("water", BUILDING_B, "46", {
    amountKsh: 200,
    provider: "cash",
    providerReference: "UTIL-46-CASH-200"
  });

  assert.equal(service.purgeHouse(BUILDING_B, "46"), true);
  assert.equal(service.listMeters({ buildingId: BUILDING_B, houseNumber: "46" }).length, 0);
  assert.equal(service.listBills({ buildingId: BUILDING_B, houseNumber: "46" }).length, 0);
  assert.equal(service.listPayments({ buildingId: BUILDING_B, houseNumber: "46" }).length, 0);
});

test("records utility payment against oldest outstanding bill", () => {
  const service = new UtilityBillingService();
  const dueDate = new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString();

  service.upsertMeter("water", BUILDING_A, "B-5", {
    meterNumber: "WTR-9288"
  });

  service.createBill("water", BUILDING_A, "B-5", {
    billingMonth: "2026-01",
    currentReading: 40,
    ratePerUnitKsh: 25,
    fixedChargeKsh: 200,
    dueDate
  });

  service.createBill("water", BUILDING_A, "B-5", {
    billingMonth: "2026-02",
    currentReading: 70,
    ratePerUnitKsh: 25,
    fixedChargeKsh: 200,
    dueDate
  });

  const paid = service.recordPayment("water", BUILDING_A, "B-5", {
    amountKsh: 500,
    provider: "mpesa",
    providerReference: "UTIL-123"
  });

  assert.equal(paid.bill.billingMonth, "2026-01");
  assert.equal(paid.bill.balanceKsh, paid.bill.amountKsh - 500);

  const payments = service.listPayments({ buildingId: BUILDING_A, houseNumber: "B-5" });
  assert.equal(payments.length, 1);
  assert.equal(payments[0].providerReference, "UTIL-123");
});

test("spreads utility payment across the selected month and the next open month", () => {
  const service = new UtilityBillingService();
  const dueDate = new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString();

  service.createBill("water", BUILDING_A, "B-7", {
    billingMonth: "2026-02",
    fixedChargeKsh: 300,
    dueDate
  });

  service.createBill("water", BUILDING_A, "B-7", {
    billingMonth: "2026-03",
    fixedChargeKsh: 400,
    dueDate
  });

  const paid = service.recordPayment("water", BUILDING_A, "B-7", {
    billingMonth: "2026-02",
    amountKsh: 500,
    provider: "cash",
    providerReference: "UTIL-SPREAD-1"
  });

  assert.equal(paid.allocations.length, 2);
  assert.deepEqual(
    paid.allocations.map((item) => item.bill.billingMonth),
    ["2026-02", "2026-03"]
  );
  assert.deepEqual(
    paid.allocations.map((item) => item.appliedAmountKsh),
    [300, 200]
  );

  const bills = service.listBills({ buildingId: BUILDING_A, houseNumber: "B-7" });
  const februaryBill = bills.find((item) => item.billingMonth === "2026-02");
  const marchBill = bills.find((item) => item.billingMonth === "2026-03");

  assert.ok(februaryBill);
  assert.equal(februaryBill.balanceKsh, 0);
  assert.ok(marchBill);
  assert.equal(marchBill.balanceKsh, 200);

  const payments = service.listPayments({ buildingId: BUILDING_A, houseNumber: "B-7" });
  assert.equal(payments.length, 2);
  assert.deepEqual(
    payments.map((item) => item.billingMonth).sort(),
    ["2026-02", "2026-03"]
  );
});

test("unrecords cash utility payments and restores allocated bill balances", () => {
  const service = new UtilityBillingService();
  const dueDate = new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString();

  service.createBill("water", BUILDING_A, "B-10", {
    billingMonth: "2026-02",
    fixedChargeKsh: 300,
    dueDate
  });

  service.createBill("water", BUILDING_A, "B-10", {
    billingMonth: "2026-03",
    fixedChargeKsh: 400,
    dueDate
  });

  const paid = service.recordPayment("water", BUILDING_A, "B-10", {
    billingMonth: "2026-02",
    amountKsh: 500,
    provider: "cash",
    providerReference: "util-spread-undo"
  });

  assert.equal(paid.allocations.length, 2);

  const unrecorded = service.unrecordCashPayment(
    "water",
    BUILDING_A,
    "b-10",
    paid.event.id
  );

  assert.ok(unrecorded);
  assert.equal(unrecorded.totalAmountKsh, 500);
  assert.equal(unrecorded.events.length, 2);
  assert.equal(service.listPayments({ buildingId: BUILDING_A, houseNumber: "B-10" }).length, 0);

  const bills = service.listBills({ buildingId: BUILDING_A, houseNumber: "B-10" });
  const februaryBill = bills.find((item) => item.billingMonth === "2026-02");
  const marchBill = bills.find((item) => item.billingMonth === "2026-03");

  assert.ok(februaryBill);
  assert.equal(februaryBill.balanceKsh, 300);
  assert.ok(marchBill);
  assert.equal(marchBill.balanceKsh, 400);
});

test("allocates entered utility payment amounts across the oldest open room balance", () => {
  const service = new UtilityBillingService();
  const dueDate = new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString();

  service.createBill("water", BUILDING_A, "B-12", {
    billingMonth: "2026-02",
    fixedChargeKsh: 200,
    dueDate
  });

  service.createBill("water", BUILDING_A, "B-12", {
    billingMonth: "2026-03",
    fixedChargeKsh: 400,
    dueDate
  });

  const paid = service.recordPayment("water", BUILDING_A, "B-12", {
    billingMonth: "2026-03",
    amountKsh: 500,
    provider: "mpesa",
    providerReference: "UTIL-ROOM-RECEIPT-500"
  });

  assert.deepEqual(
    paid.allocations.map((item) => item.bill.billingMonth),
    ["2026-02", "2026-03"]
  );
  assert.deepEqual(
    paid.allocations.map((item) => item.appliedAmountKsh),
    [200, 300]
  );

  const bills = service.listBills({ buildingId: BUILDING_A, houseNumber: "B-12" });
  const februaryBill = bills.find((item) => item.billingMonth === "2026-02");
  const marchBill = bills.find((item) => item.billingMonth === "2026-03");

  assert.ok(februaryBill);
  assert.equal(februaryBill.balanceKsh, 0);
  assert.ok(marchBill);
  assert.equal(marchBill.balanceKsh, 100);
});

test("does not unrecord non-cash utility payments", () => {
  const service = new UtilityBillingService();
  const dueDate = new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString();

  service.createBill("water", BUILDING_A, "B-11", {
    billingMonth: "2026-02",
    fixedChargeKsh: 300,
    dueDate
  });

  const paid = service.recordPayment("water", BUILDING_A, "B-11", {
    amountKsh: 200,
    provider: "mpesa",
    providerReference: "util-mpesa-undo-denied"
  });

  assert.throws(
    () => service.unrecordCashPayment("water", BUILDING_A, "B-11", paid.event.id),
    /Only manually recorded utility payments/
  );
  assert.equal(service.listBills({ buildingId: BUILDING_A, houseNumber: "B-11" })[0].balanceKsh, 100);
});

test("unrecords manually entered M-PESA utility receipts", () => {
  const service = new UtilityBillingService();
  const dueDate = new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString();

  service.createBill("water", BUILDING_A, "B-13", {
    billingMonth: "2026-02",
    fixedChargeKsh: 300,
    dueDate
  });

  const paid = service.recordPayment("water", BUILDING_A, "B-13", {
    amountKsh: 200,
    provider: "mpesa",
    providerReference: "MANUAL-MPESA-UTILITY-1",
    source: "manual"
  });

  const unrecorded = service.unrecordCashPayment(
    "water",
    BUILDING_A,
    "B-13",
    paid.event.id
  );

  assert.ok(unrecorded);
  assert.equal(unrecorded.totalAmountKsh, 200);
  assert.equal(service.listBills({ buildingId: BUILDING_A, houseNumber: "B-13" })[0].balanceKsh, 300);
});

test("previews utility payment across the selected month and later open bills", () => {
  const service = new UtilityBillingService();
  const dueDate = new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString();

  service.createBill("water", BUILDING_A, "B-7", {
    billingMonth: "2026-02",
    fixedChargeKsh: 215,
    dueDate
  });

  service.createBill("water", BUILDING_A, "B-7", {
    billingMonth: "2026-03",
    fixedChargeKsh: 350,
    dueDate
  });

  const preview = service.previewPayment("water", BUILDING_A, "B-7", {
    billingMonth: "2026-02",
    amountKsh: 500
  });

  assert.equal(preview.availableBalanceKsh, 565);
  assert.equal(preview.targetBill.billingMonth, "2026-02");
  assert.equal(preview.effectiveBill.billingMonth, "2026-02");
  assert.deepEqual(
    preview.candidateBills.map((item) => item.billingMonth),
    ["2026-02", "2026-03"]
  );
});

test("backfills the next visible recurring fixed-charge utility month", () => {
  const service = new UtilityBillingService();

  service.createBill("water", BUILDING_A, "B-8", {
    billingMonth: "2026-02",
    fixedChargeKsh: 350,
    dueDate: "2026-03-06T00:00:00.000Z"
  });

  service.createBill("water", BUILDING_A, "B-8", {
    billingMonth: "2026-03",
    fixedChargeKsh: 350,
    dueDate: "2026-04-06T00:00:00.000Z"
  });

  const created = service.backfillRecurringBills({
    buildingId: BUILDING_A,
    houseNumber: "B-8",
    utilityType: "water",
    visibleThroughDate: "2026-05-09T00:00:00.000Z"
  });

  assert.deepEqual(created.map((item) => item.billingMonth), ["2026-04"]);
  assert.deepEqual(
    service
      .listBills({ buildingId: BUILDING_A, houseNumber: "B-8", utilityType: "water", limit: 12 })
      .map((item) => item.billingMonth)
      .sort(),
    ["2026-02", "2026-03", "2026-04"]
  );
});

test("skips held utility months while continuing later recurring backfill", () => {
  const service = new UtilityBillingService();

  service.setBillingHoldPredicate((input) => input.billingMonth === "2026-04");
  service.createBill("water", BUILDING_A, "B-9", {
    billingMonth: "2026-02",
    fixedChargeKsh: 350,
    dueDate: "2026-03-06T00:00:00.000Z"
  });

  service.createBill("water", BUILDING_A, "B-9", {
    billingMonth: "2026-03",
    fixedChargeKsh: 350,
    dueDate: "2026-04-06T00:00:00.000Z"
  });

  const created = service.backfillRecurringBills({
    buildingId: BUILDING_A,
    houseNumber: "B-9",
    utilityType: "water",
    visibleThroughDate: "2026-06-09T00:00:00.000Z"
  });

  assert.deepEqual(created.map((item) => item.billingMonth), ["2026-05"]);
  assert.deepEqual(
    service
      .listBills({ buildingId: BUILDING_A, houseNumber: "B-9", utilityType: "water", limit: 12 })
      .map((item) => item.billingMonth)
      .sort(),
    ["2026-02", "2026-03", "2026-05"]
  );
});

test("writes off open utility balances without deleting bills", () => {
  const service = new UtilityBillingService();

  service.createBill("water", BUILDING_A, "B-14", {
    billingMonth: "2026-02",
    fixedChargeKsh: 300,
    dueDate: "2026-03-06T00:00:00.000Z"
  });
  service.createBill("electricity", BUILDING_A, "B-14", {
    billingMonth: "2026-02",
    fixedChargeKsh: 500,
    dueDate: "2026-03-06T00:00:00.000Z"
  });

  const result = service.writeOffHouseBalances(BUILDING_A, "B-14");
  assert.equal(result.totalWrittenOffKsh, 800);
  assert.equal(result.bills.length, 2);
  assert.equal(
    service
      .listBills({ buildingId: BUILDING_A, houseNumber: "B-14", limit: 12 })
      .reduce((sum, item) => sum + item.balanceKsh, 0),
    0
  );
});

test("does not apply the same provider reference twice", () => {
  const service = new UtilityBillingService();
  const dueDate = new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString();

  service.upsertMeter("water", BUILDING_A, "B-6", {
    meterNumber: "WTR-9299"
  });

  const bill = service.createBill("water", BUILDING_A, "B-6", {
    billingMonth: "2026-03",
    currentReading: 40,
    ratePerUnitKsh: 25,
    fixedChargeKsh: 200,
    dueDate
  });

  const first = service.recordPayment("water", BUILDING_A, "B-6", {
    amountKsh: 500,
    provider: "mpesa",
    providerReference: "util-dup-1"
  });
  const second = service.recordPayment("water", BUILDING_A, "B-6", {
    amountKsh: 500,
    provider: "mpesa",
    providerReference: "UTIL-DUP-1"
  });

  assert.equal(first.event.id, second.event.id);
  assert.equal(second.bill.balanceKsh, bill.amountKsh - 500);

  const payments = service.listPayments({ buildingId: BUILDING_A, houseNumber: "B-6" });
  assert.equal(payments.length, 1);
  assert.equal(payments[0].providerReference, "UTIL-DUP-1");
});

test("generates utility payment reminders for due balances", () => {
  const service = new UtilityBillingService();
  const dueDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  service.upsertMeter("water", BUILDING_A, "C-9", {
    meterNumber: "WTR-303"
  });

  service.createBill("water", BUILDING_A, "C-9", {
    billingMonth: "2026-03",
    currentReading: 55,
    ratePerUnitKsh: 20,
    fixedChargeKsh: 100,
    dueDate
  });

  const reminders = service.collectAutoReminders(BUILDING_A, "C-9");
  assert.ok(reminders.some((item) => item.dedupeKey.includes("utility-reminder-d1")));
});

test("keeps utility bills isolated per building for the same house number", () => {
  const service = new UtilityBillingService();
  const dueDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();

  service.createBill("water", BUILDING_A, "12", {
    billingMonth: "2026-03",
    fixedChargeKsh: 300,
    dueDate
  });

  service.createBill("water", BUILDING_B, "12", {
    billingMonth: "2026-03",
    fixedChargeKsh: 700,
    dueDate
  });

  const aBills = service.listBillsForHouse(BUILDING_A, "12", "water", 12);
  const bBills = service.listBillsForHouse(BUILDING_B, "12", "water", 12);

  assert.equal(aBills.length, 1);
  assert.equal(bBills.length, 1);
  assert.equal(aBills[0].amountKsh, 300);
  assert.equal(bBills[0].amountKsh, 700);
});

test("keeps legacy house-only utility records visible after building scoping", () => {
  const service = new UtilityBillingService();
  const dueDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();
  const createdAt = new Date().toISOString();

  service.importState({
    meters: [
      {
        utilityType: "water",
        houseNumber: "15",
        meterNumber: "WTR-LEGACY-15",
        updatedAt: createdAt
      }
    ],
    bills: [
      {
        id: "legacy-bill-1",
        utilityType: "water",
        houseNumber: "15",
        billingMonth: "2026-03",
        meterNumber: "WTR-LEGACY-15",
        previousReading: 0,
        currentReading: 20,
        unitsConsumed: 20,
        ratePerUnitKsh: 10,
        fixedChargeKsh: 100,
        amountKsh: 300,
        balanceKsh: 300,
        dueDate,
        createdAt,
        updatedAt: createdAt,
        payments: [],
        status: "due_soon",
        daysToDue: 2
      }
    ]
  } as any);

  const bills = service.listBillsForHouse(BUILDING_A, "15", "water", 12);
  assert.equal(bills.length, 1);
  assert.equal(bills[0].amountKsh, 300);
});

test("only exposes utility balances during the 7-day visibility window and after overdue", () => {
  const service = new UtilityBillingService();
  const overdueDueDate = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
  const visibleSoonDueDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString();
  const hiddenFutureDueDate = new Date(Date.now() + 12 * 24 * 60 * 60 * 1000).toISOString();

  service.createBill("water", BUILDING_B, "44", {
    billingMonth: "2026-02",
    fixedChargeKsh: 350,
    dueDate: overdueDueDate
  });

  service.createBill("water", BUILDING_B, "44", {
    billingMonth: "2026-03",
    fixedChargeKsh: 350,
    dueDate: visibleSoonDueDate
  });

  service.createBill("water", BUILDING_B, "44", {
    billingMonth: "2026-04",
    fixedChargeKsh: 350,
    dueDate: hiddenFutureDueDate
  });

  const summary = service.listVisibleRoomBalances(BUILDING_B);
  assert.equal(summary.length, 1);
  assert.equal(summary[0].houseNumber, "44");
  assert.equal(summary[0].arrearsKsh, 350);
  assert.equal(summary[0].currentDueKsh, 350);
  assert.equal(summary[0].totalOpenKsh, 700);
  assert.equal(summary[0].nextDueDate, overdueDueDate);
});

test("preserves a posted room-level combined charge below the building monthly default", () => {
  const service = new UtilityBillingService();
  const createdAt = new Date().toISOString();
  const dueDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();

  service.setCombinedChargeBuildingIds([BUILDING_B]);
  service.setCombinedChargeMonthlyAmounts([
    {
      buildingId: BUILDING_B,
      billingMonth: "2026-03",
      amountKsh: 350
    }
  ]);

  service.importState({
    meters: [],
    bills: [
      {
        id: "combined-water-26",
        utilityType: "water",
        buildingId: BUILDING_B,
        houseNumber: "26",
        billingMonth: "2026-03",
        meterNumber: "NO-METER",
        previousReading: 0,
        currentReading: 0,
        unitsConsumed: 0,
        ratePerUnitKsh: 0,
        fixedChargeKsh: 300,
        amountKsh: 300,
        balanceKsh: 300,
        dueDate,
        note: "Combined utility fee (water+electricity) for 2026-03.",
        createdAt,
        updatedAt: createdAt,
        payments: [
          {
            id: "pay-26",
            utilityType: "water",
            buildingId: BUILDING_B,
            houseNumber: "26",
            billingMonth: "2026-03",
            provider: "cash",
            providerReference: "H26-CASH-100",
            amountKsh: 100,
            paidAt: createdAt,
            createdAt
          }
        ],
        status: "due_soon",
        daysToDue: 2
      },
      {
        id: "combined-electricity-26",
        utilityType: "electricity",
        buildingId: BUILDING_B,
        houseNumber: "26",
        billingMonth: "2026-03",
        meterNumber: "NO-METER",
        previousReading: 0,
        currentReading: 0,
        unitsConsumed: 0,
        ratePerUnitKsh: 0,
        fixedChargeKsh: 300,
        amountKsh: 300,
        balanceKsh: 300,
        dueDate,
        note: "Combined utility fee (water+electricity) for 2026-03.",
        createdAt,
        updatedAt: createdAt,
        payments: [],
        status: "due_soon",
        daysToDue: 2
      }
    ]
  } as any);

  const waterBills = service.listBillsForHouse(BUILDING_B, "26", "water", 12);
  assert.equal(waterBills.length, 1);
  assert.equal(waterBills[0].amountKsh, 300);
  assert.equal(waterBills[0].balanceKsh, 200);
});

test("uses the configured building-month combined charge for empty baseline rows", () => {
  const service = new UtilityBillingService();
  const createdAt = new Date().toISOString();
  const dueDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();

  service.setCombinedChargeBuildingIds([BUILDING_B]);
  service.setCombinedChargeMonthlyAmounts([
    {
      buildingId: BUILDING_B,
      billingMonth: "2026-03",
      amountKsh: 350
    }
  ]);

  service.importState({
    meters: [],
    bills: [
      {
        id: "baseline-water-27",
        utilityType: "water",
        buildingId: BUILDING_B,
        houseNumber: "27",
        billingMonth: "2026-03",
        meterNumber: "NO-METER",
        previousReading: 0,
        currentReading: 0,
        unitsConsumed: 0,
        ratePerUnitKsh: 0,
        fixedChargeKsh: 0,
        amountKsh: 0,
        balanceKsh: 0,
        dueDate,
        note: "Baseline reading imported during cutoff.",
        createdAt,
        updatedAt: createdAt,
        payments: [],
        status: "clear",
        daysToDue: 2
      },
      {
        id: "baseline-electricity-27",
        utilityType: "electricity",
        buildingId: BUILDING_B,
        houseNumber: "27",
        billingMonth: "2026-03",
        meterNumber: "NO-METER",
        previousReading: 0,
        currentReading: 0,
        unitsConsumed: 0,
        ratePerUnitKsh: 0,
        fixedChargeKsh: 0,
        amountKsh: 0,
        balanceKsh: 0,
        dueDate,
        note: "Baseline reading imported during cutoff.",
        createdAt,
        updatedAt: createdAt,
        payments: [],
        status: "clear",
        daysToDue: 2
      }
    ]
  } as any);

  const waterBills = service.listBillsForHouse(BUILDING_B, "27", "water", 12);
  assert.equal(waterBills.length, 1);
  assert.equal(waterBills[0].amountKsh, 350);
  assert.equal(waterBills[0].balanceKsh, 350);
});

test("uses the configured building default combined charge for empty baseline rows", () => {
  const service = new UtilityBillingService();
  const createdAt = new Date().toISOString();
  const dueDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();

  service.setCombinedChargeBuildingIds([BUILDING_B]);
  service.setCombinedChargeBuildingAmounts([
    {
      buildingId: BUILDING_B,
      amountKsh: 410
    }
  ]);

  service.importState({
    meters: [],
    bills: [
      {
        id: "baseline-water-28",
        utilityType: "water",
        buildingId: BUILDING_B,
        houseNumber: "28",
        billingMonth: "2026-03",
        meterNumber: "NO-METER",
        previousReading: 0,
        currentReading: 0,
        unitsConsumed: 0,
        ratePerUnitKsh: 0,
        fixedChargeKsh: 0,
        amountKsh: 0,
        balanceKsh: 0,
        dueDate,
        note: "Baseline reading imported during cutoff.",
        createdAt,
        updatedAt: createdAt,
        payments: [],
        status: "clear",
        daysToDue: 2
      },
      {
        id: "baseline-electricity-28",
        utilityType: "electricity",
        buildingId: BUILDING_B,
        houseNumber: "28",
        billingMonth: "2026-03",
        meterNumber: "NO-METER",
        previousReading: 0,
        currentReading: 0,
        unitsConsumed: 0,
        ratePerUnitKsh: 0,
        fixedChargeKsh: 0,
        amountKsh: 0,
        balanceKsh: 0,
        dueDate,
        note: "Baseline reading imported during cutoff.",
        createdAt,
        updatedAt: createdAt,
        payments: [],
        status: "clear",
        daysToDue: 2
      }
    ]
  } as any);

  const waterBills = service.listBillsForHouse(BUILDING_B, "28", "water", 12);
  assert.equal(waterBills.length, 1);
  assert.equal(waterBills[0].amountKsh, 410);
  assert.equal(waterBills[0].balanceKsh, 410);
});

test("does not invent combined charge for empty baseline rows without configured defaults", () => {
  const service = new UtilityBillingService();
  const createdAt = new Date().toISOString();
  const dueDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();

  service.setCombinedChargeBuildingIds([BUILDING_B]);
  service.importState({
    meters: [],
    bills: [
      {
        id: "baseline-water-29",
        utilityType: "water",
        buildingId: BUILDING_B,
        houseNumber: "29",
        billingMonth: "2026-03",
        meterNumber: "NO-METER",
        previousReading: 0,
        currentReading: 0,
        unitsConsumed: 0,
        ratePerUnitKsh: 0,
        fixedChargeKsh: 0,
        amountKsh: 0,
        balanceKsh: 0,
        dueDate,
        note: "Baseline reading imported during cutoff.",
        createdAt,
        updatedAt: createdAt,
        payments: [],
        status: "clear",
        daysToDue: 2
      },
      {
        id: "baseline-electricity-29",
        utilityType: "electricity",
        buildingId: BUILDING_B,
        houseNumber: "29",
        billingMonth: "2026-03",
        meterNumber: "NO-METER",
        previousReading: 0,
        currentReading: 0,
        unitsConsumed: 0,
        ratePerUnitKsh: 0,
        fixedChargeKsh: 0,
        amountKsh: 0,
        balanceKsh: 0,
        dueDate,
        note: "Baseline reading imported during cutoff.",
        createdAt,
        updatedAt: createdAt,
        payments: [],
        status: "clear",
        daysToDue: 2
      }
    ]
  } as any);

  const bills = service.listBills({ buildingId: BUILDING_B, houseNumber: "29" });
  const water = bills.find((item) => item.utilityType === "water");
  const electricity = bills.find((item) => item.utilityType === "electricity");

  assert.ok(water);
  assert.equal(water.amountKsh, 0);
  assert.equal(water.balanceKsh, 0);

  assert.ok(electricity);
  assert.equal(electricity.amountKsh, 0);
  assert.equal(electricity.balanceKsh, 0);
});
