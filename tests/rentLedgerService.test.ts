import assert from "node:assert/strict";
import test from "node:test";
import {
  RENT_LEGACY_BUILDING_ID,
  RentLedgerService
} from "../src/services/rentLedgerService.js";

const BUILDING_A = "CAPTYN001";
const BUILDING_B = "CAPTYN002";

test("returns null for unconfigured building and house number", () => {
  const service = new RentLedgerService();
  assert.equal(service.getRentDue(BUILDING_A, "A-1"), null);
});

test("upserts rent profile and normalizes building plus house scope", () => {
  const service = new RentLedgerService();

  const dueDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const saved = service.upsertRentDue(BUILDING_A.toLowerCase(), "a-1", {
    monthlyRentKsh: 12000,
    balanceKsh: 4500,
    dueDate,
    note: "Partial payment pending"
  });

  assert.equal(saved.buildingId, BUILDING_A);
  assert.equal(saved.houseNumber, "A-1");
  assert.equal(saved.status, "due_soon");

  const fetched = service.getRentDue(BUILDING_A, "A-1");
  assert.ok(fetched);
  assert.equal(fetched.balanceKsh, 4500);
});

test("keeps duplicate house numbers isolated per building", () => {
  const service = new RentLedgerService();
  const dueDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();

  service.upsertRentDue(BUILDING_A, "B-2", {
    monthlyRentKsh: 10000,
    balanceKsh: 4000,
    dueDate
  });
  service.upsertRentDue(BUILDING_B, "B-2", {
    monthlyRentKsh: 14000,
    balanceKsh: 9000,
    dueDate
  });

  const outcome = service.recordMpesaPayment({
    buildingId: BUILDING_A,
    houseNumber: "b-2",
    amountKsh: 1500,
    providerReference: "QWE123",
    phoneNumber: "0712345678"
  });

  assert.equal(outcome.applied, true);
  assert.ok(outcome.snapshot);
  assert.equal(outcome.snapshot.buildingId, BUILDING_A);
  assert.equal(outcome.snapshot.balanceKsh, 2500);

  const otherBuilding = service.getRentDue(BUILDING_B, "B-2");
  assert.ok(otherBuilding);
  assert.equal(otherBuilding.balanceKsh, 9000);
});

test("keeps unmatched callback as pending until building-scoped rent profile exists", () => {
  const service = new RentLedgerService();

  const pending = service.recordMpesaPayment({
    buildingId: BUILDING_A,
    houseNumber: "C-4",
    amountKsh: 1000,
    providerReference: "PEND123"
  });

  assert.equal(pending.applied, false);

  const dueDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString();
  const snapshot = service.upsertRentDue(BUILDING_A, "c-4", {
    monthlyRentKsh: 9000,
    balanceKsh: 4000,
    dueDate
  });

  assert.equal(snapshot.balanceKsh, 3000);
  assert.equal(snapshot.payments.length, 1);
  assert.equal(snapshot.payments[0].buildingId, BUILDING_A);
});

test("records admin rent payments with provider metadata against an existing profile", () => {
  const service = new RentLedgerService();
  const dueDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString();

  service.upsertRentDue(BUILDING_A, "M-2", {
    monthlyRentKsh: 12000,
    balanceKsh: 6000,
    dueDate
  });

  const outcome = service.recordPayment({
    buildingId: BUILDING_A,
    houseNumber: "m-2",
    amountKsh: 1500,
    provider: "cash",
    providerReference: "cash-001",
    paidAt: dueDate
  });

  assert.equal(outcome.applied, true);
  assert.ok(outcome.snapshot);
  assert.equal(outcome.snapshot.balanceKsh, 4500);
  assert.equal(outcome.event.provider, "cash");
  assert.equal(outcome.event.providerReference, "CASH-001");
  assert.equal(outcome.snapshot.currentMonthPaidKsh, 7500);
  assert.equal(outcome.snapshot.currentMonthOutstandingKsh, 4500);
  assert.equal(outcome.snapshot.arrearsKsh, 0);
  assert.equal(service.listPayments({ buildingId: BUILDING_A, houseNumber: "M-2" })[0].provider, "cash");
  assert.equal(service.listCollectionStatus(10, BUILDING_A)[0]?.totalPaidKsh, 1500);
});

test("unrecords cash rent payments and restores the room balance", () => {
  const service = new RentLedgerService();
  const dueDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString();

  service.upsertRentDue(BUILDING_A, "M-3", {
    monthlyRentKsh: 12000,
    balanceKsh: 6000,
    dueDate
  });

  const payment = service.recordPayment({
    buildingId: BUILDING_A,
    houseNumber: "M-3",
    amountKsh: 1500,
    provider: "cash",
    providerReference: "cash-undo-001",
    paidAt: dueDate
  });

  assert.equal(payment.snapshot?.balanceKsh, 4500);

  const unrecorded = service.unrecordCashPayment({
    buildingId: BUILDING_A,
    houseNumber: "m-3",
    paymentId: payment.event.id
  });

  assert.ok(unrecorded);
  assert.equal(unrecorded.applied, true);
  assert.equal(unrecorded.event.providerReference, "CASH-UNDO-001");
  assert.equal(unrecorded.snapshot?.balanceKsh, 6000);
  assert.equal(service.listPayments({ buildingId: BUILDING_A, houseNumber: "M-3" }).length, 0);
  assert.equal(service.listCollectionStatus(10, BUILDING_A)[0]?.totalPaidKsh, 0);
});

test("does not unrecord non-cash rent payments", () => {
  const service = new RentLedgerService();
  const dueDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString();

  service.upsertRentDue(BUILDING_A, "M-4", {
    monthlyRentKsh: 12000,
    balanceKsh: 6000,
    dueDate
  });

  const payment = service.recordPayment({
    buildingId: BUILDING_A,
    houseNumber: "M-4",
    amountKsh: 1500,
    provider: "mpesa",
    providerReference: "mpesa-undo-denied",
    paidAt: dueDate
  });

  assert.throws(
    () =>
      service.unrecordCashPayment({
        buildingId: BUILDING_A,
        houseNumber: "M-4",
        paymentId: payment.event.id
      }),
    /Only manually recorded rent payments/
  );
  assert.equal(service.getRentDue(BUILDING_A, "M-4")?.balanceKsh, 4500);
});

test("unrecords manually entered M-PESA rent receipts", () => {
  const service = new RentLedgerService();
  const dueDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString();

  service.upsertRentDue(BUILDING_A, "M-5", {
    monthlyRentKsh: 12000,
    balanceKsh: 6000,
    dueDate
  });

  const payment = service.recordPayment({
    buildingId: BUILDING_A,
    houseNumber: "M-5",
    amountKsh: 1500,
    provider: "mpesa",
    providerReference: "manual-mpesa-rent-1",
    paidAt: dueDate,
    source: "manual"
  });

  const unrecorded = service.unrecordCashPayment({
    buildingId: BUILDING_A,
    houseNumber: "M-5",
    paymentId: payment.event.id
  });

  assert.ok(unrecorded);
  assert.equal(unrecorded.snapshot?.balanceKsh, 6000);
});

test("exposes current-month paid, current-month outstanding, and arrears separately", () => {
  const service = new RentLedgerService();
  const dueDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();

  service.upsertRentDue(BUILDING_A, "AR-1", {
    monthlyRentKsh: 10000,
    balanceKsh: 18000,
    dueDate
  });

  const snapshot = service.getRentDue(BUILDING_A, "AR-1");
  assert.ok(snapshot);
  assert.equal(snapshot.currentBillingMonth, dueDate.slice(0, 7));
  assert.equal(snapshot.currentMonthPaidKsh, 0);
  assert.equal(snapshot.currentMonthOutstandingKsh, 10000);
  assert.equal(snapshot.arrearsKsh, 8000);
  assert.equal(snapshot.totalPaidKsh, 0);
});

test("keeps unmatched admin payment pending until rent profile exists", () => {
  const service = new RentLedgerService();

  const pending = service.recordPayment({
    buildingId: BUILDING_A,
    houseNumber: "P-7",
    amountKsh: 2000,
    provider: "bank",
    providerReference: "bank-777"
  });

  assert.equal(pending.applied, false);
  assert.equal(pending.event.provider, "bank");

  const dueDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();
  const snapshot = service.upsertRentDue(BUILDING_A, "P-7", {
    monthlyRentKsh: 9000,
    balanceKsh: 9000,
    dueDate
  });

  assert.equal(snapshot.balanceKsh, 7000);
  assert.equal(snapshot.payments.length, 1);
  assert.equal(snapshot.payments[0].provider, "bank");
  assert.equal(snapshot.payments[0].providerReference, "BANK-777");
});

test("purges room-scoped rent state when a room is removed", () => {
  const service = new RentLedgerService();
  const dueDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();

  service.upsertRentDue(BUILDING_A, "Z-9", {
    monthlyRentKsh: 9000,
    balanceKsh: 9000,
    dueDate
  });
  service.recordPayment({
    buildingId: BUILDING_A,
    houseNumber: "Z-9",
    amountKsh: 1200,
    provider: "cash",
    providerReference: "z9-cash-001"
  });

  assert.equal(service.purgeHouse(BUILDING_A, "z-9"), true);
  assert.equal(service.getRentDue(BUILDING_A, "Z-9"), null);
  assert.equal(service.listPayments({ buildingId: BUILDING_A, houseNumber: "Z-9" }).length, 0);
});

test("does not add next month rent before the rollover window opens", () => {
  const service = new RentLedgerService();
  const dueDate = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();

  service.upsertRentDue(BUILDING_A, "R-1", {
    monthlyRentKsh: 350,
    balanceKsh: 350,
    dueDate
  });

  const snapshot = service.getRentDue(BUILDING_A, "R-1");
  assert.ok(snapshot);
  assert.equal(snapshot.balanceKsh, 350);
  assert.equal(snapshot.dueDate, dueDate);
});

test("rolls a cleared room into the next month with one month rent, not two", () => {
  const service = new RentLedgerService();
  const dueDate = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString();

  service.upsertRentDue(BUILDING_A, "R-2", {
    monthlyRentKsh: 350,
    balanceKsh: 0,
    dueDate
  });

  const snapshot = service.getRentDue(BUILDING_A, "R-2");
  assert.ok(snapshot);
  assert.equal(snapshot.balanceKsh, 350);
  assert.notEqual(snapshot.dueDate, dueDate);
});

test("skips automatic rent balance increases while a billing hold matches", () => {
  const service = new RentLedgerService();
  const dueDate = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString();

  service.setBillingHoldPredicate((input) => input.houseNumber === "R-3");
  service.upsertRentDue(BUILDING_A, "R-3", {
    monthlyRentKsh: 350,
    balanceKsh: 0,
    dueDate
  });

  const snapshot = service.getRentDue(BUILDING_A, "R-3");
  assert.ok(snapshot);
  assert.equal(snapshot.balanceKsh, 0);
  assert.notEqual(snapshot.dueDate, dueDate);
});

test("writes off room rent balance without deleting payment history", () => {
  const service = new RentLedgerService();
  const dueDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();

  service.upsertRentDue(BUILDING_A, "W-1", {
    monthlyRentKsh: 1000,
    balanceKsh: 700,
    dueDate
  });
  service.recordPayment({
    buildingId: BUILDING_A,
    houseNumber: "W-1",
    amountKsh: 300,
    provider: "cash",
    providerReference: "writeoff-history-1"
  });

  const result = service.writeOffHouseBalance(BUILDING_A, "W-1");
  assert.ok(result);
  assert.equal(result.previousBalanceKsh, 400);
  assert.equal(result.snapshot.balanceKsh, 0);
  assert.equal(result.snapshot.payments.length, 1);
});

test("generates D-3 reminder once per due cycle per building and house", () => {
  const service = new RentLedgerService();

  const dueDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
  service.upsertRentDue(BUILDING_A, "D-8", {
    monthlyRentKsh: 10000,
    balanceKsh: 10000,
    dueDate
  });

  const first = service.collectAutoReminders(BUILDING_A, "d-8");
  const second = service.collectAutoReminders(BUILDING_A, "D-8");

  assert.equal(first.length, 1);
  assert.equal(first[0].buildingId, BUILDING_A);
  assert.equal(first[0].title, "Rent Reminder (D-3)");
  assert.equal(second.length, 0);
});

test("keeps legacy house-only rent records visible after building scoping", () => {
  const service = new RentLedgerService();
  const dueDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  service.importState({
    records: [
      {
        buildingId: RENT_LEGACY_BUILDING_ID,
        houseNumber: "L-1",
        monthlyRentKsh: 8000,
        balanceKsh: 3000,
        dueDate,
        updatedAt: dueDate,
        payments: [],
        reminderState: {}
      }
    ],
    pendingPayments: []
  });

  const fetched = service.getRentDue(BUILDING_A, "L-1");
  assert.ok(fetched);
  assert.equal(fetched.buildingId, RENT_LEGACY_BUILDING_ID);
  assert.equal(fetched.balanceKsh, 3000);
});
