import { Prisma, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const RENT_LEDGER_STATE_KEY = "rent_ledger_v1";
const UTILITY_BILLING_STATE_KEY = "utility_billing_v1";
const BUILDING_EXPENDITURE_STATE_KEY = "building_expenditure_v1";

type RentPaymentEvent = {
  providerReference?: string;
  amountKsh?: number;
  paidAt?: string;
  provider?: string;
};

type RentLedgerRecord = {
  buildingId?: string;
  houseNumber?: string;
  monthlyRentKsh?: number;
  balanceKsh?: number;
  dueDate?: string;
  payments?: RentPaymentEvent[];
  updatedAt?: string;
};

type RentLedgerState = {
  records?: RentLedgerRecord[];
  pendingPayments?: RentPaymentEvent[];
};

type UtilityBillRecord = {
  buildingId?: string;
  houseNumber?: string;
  balanceKsh?: number;
};

type UtilityBillingState = {
  bills?: UtilityBillRecord[];
};

type BuildingExpenditureRecord = {
  buildingId?: string;
  houseNumber?: string;
  amountKsh?: number;
  title?: string;
  createdAt?: string;
};

type BuildingExpenditureState = {
  records?: BuildingExpenditureRecord[];
};

type AuditSummaryRow = {
  buildingId: string;
  houseNumber: string;
  monthlyRentKsh: number;
  rentBalanceKsh: number;
  utilityOutstandingKsh: number;
  expenseChargesKsh: number;
  totalOutstandingKsh: number;
  rentPayments: number;
  duplicateRentReferences: number;
  suspectedRepeatedManualEntries: number;
};

function normalizeBuildingId(value: string | undefined): string {
  return String(value ?? "").trim().toUpperCase() || "__LEGACY__";
}

function normalizeHouseNumber(value: string | undefined): string {
  return String(value ?? "").trim().toUpperCase();
}

function normalizeProviderReference(value: string | undefined): string {
  return String(value ?? "").trim().toUpperCase();
}

function amountKsh(value: unknown): number {
  return Math.max(0, Math.round(Number(value ?? 0)));
}

function paidAtMinuteKey(value: string | undefined): string {
  const raw = String(value ?? "").trim();
  if (!raw) {
    return "";
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    return raw;
  }

  return parsed.toISOString().slice(0, 16);
}

function ledgerKey(buildingId: string, houseNumber: string): string {
  return `${buildingId}:${houseNumber}`;
}

function parseFlag(name: string): string {
  const exact = process.argv.find((item) => item.startsWith(`${name}=`));
  return exact ? exact.slice(name.length + 1).trim() : "";
}

function hasFlag(name: string): boolean {
  return process.argv.includes(name);
}

function matchesFilter(value: string, filter: string): boolean {
  if (!filter) {
    return true;
  }

  return value.includes(filter);
}

async function main() {
  const buildingFilter = normalizeBuildingId(parseFlag("--building") || undefined);
  const hasBuildingFilter = Boolean(parseFlag("--building"));
  const houseFilter = normalizeHouseNumber(parseFlag("--house") || undefined);
  const applyDuplicateRentFix = hasFlag("--apply-rent-duplicates");
  const outputJson = hasFlag("--json");

  const [rentRow, utilityRow, expenditureRow] = await Promise.all([
    prisma.appState.findUnique({
      where: { key: RENT_LEDGER_STATE_KEY },
      select: { value: true }
    }),
    prisma.appState.findUnique({
      where: { key: UTILITY_BILLING_STATE_KEY },
      select: { value: true }
    }),
    prisma.appState.findUnique({
      where: { key: BUILDING_EXPENDITURE_STATE_KEY },
      select: { value: true }
    })
  ]);

  if (!rentRow) {
    throw new Error(`AppState ${RENT_LEDGER_STATE_KEY} was not found.`);
  }

  const rentState = (rentRow.value ?? {}) as RentLedgerState;
  const utilityState = ((utilityRow?.value ?? {}) as UtilityBillingState) ?? {};
  const expenditureState =
    ((expenditureRow?.value ?? {}) as BuildingExpenditureState) ?? {};

  const records = Array.isArray(rentState.records) ? rentState.records : [];
  const pendingPayments = Array.isArray(rentState.pendingPayments)
    ? rentState.pendingPayments
    : [];
  const utilityBills = Array.isArray(utilityState.bills) ? utilityState.bills : [];
  const expenditures = Array.isArray(expenditureState.records)
    ? expenditureState.records
    : [];

  const duplicateReferenceRows: Array<{
    buildingId: string;
    houseNumber: string;
    reference: string;
    duplicateCount: number;
    restoredBalanceKsh: number;
  }> = [];
  const suspectedManualRepeatRows: Array<{
    buildingId: string;
    houseNumber: string;
    fingerprint: string;
    count: number;
  }> = [];
  const crossRoomReferenceRows: Array<{
    providerReference: string;
    rooms: string[];
  }> = [];

  const nextRecords = records.map((record) => {
    const buildingId = normalizeBuildingId(record.buildingId);
    const houseNumber = normalizeHouseNumber(record.houseNumber);
    const seenReferences = new Set<string>();
    const byReference = new Map<string, number>();
    const manualFingerprints = new Map<string, number>();
    let restoredBalanceKsh = 0;

    const nextPayments = (Array.isArray(record.payments) ? record.payments : []).filter(
      (payment) => {
        const reference = normalizeProviderReference(payment.providerReference);
        const paymentAmountKsh = amountKsh(payment.amountKsh);
        const manualFingerprint = [
          String(payment.provider ?? "").trim().toLowerCase(),
          paymentAmountKsh,
          paidAtMinuteKey(payment.paidAt)
        ].join(":");

        if (manualFingerprint !== "::") {
          manualFingerprints.set(
            manualFingerprint,
            (manualFingerprints.get(manualFingerprint) ?? 0) + 1
          );
        }

        if (!reference) {
          return true;
        }

        byReference.set(reference, (byReference.get(reference) ?? 0) + 1);
        if (seenReferences.has(reference)) {
          restoredBalanceKsh += paymentAmountKsh;
          return false;
        }

        seenReferences.add(reference);
        return true;
      }
    );

    for (const [reference, count] of byReference.entries()) {
      if (count > 1) {
        duplicateReferenceRows.push({
          buildingId,
          houseNumber,
          reference,
          duplicateCount: count - 1,
          restoredBalanceKsh
        });
      }
    }

    for (const [fingerprint, count] of manualFingerprints.entries()) {
      if (count > 1) {
        suspectedManualRepeatRows.push({
          buildingId,
          houseNumber,
          fingerprint,
          count
        });
      }
    }

    return {
      ...record,
      buildingId,
      houseNumber,
      balanceKsh: amountKsh(record.balanceKsh) + restoredBalanceKsh,
      payments: nextPayments,
      updatedAt: restoredBalanceKsh > 0 ? new Date().toISOString() : record.updatedAt
    };
  });

  const referenceRooms = new Map<string, Set<string>>();
  nextRecords.forEach((record) => {
    const roomKey = ledgerKey(
      normalizeBuildingId(record.buildingId),
      normalizeHouseNumber(record.houseNumber)
    );
    (Array.isArray(record.payments) ? record.payments : []).forEach((payment) => {
      const reference = normalizeProviderReference(payment.providerReference);
      if (!reference) {
        return;
      }

      const current = referenceRooms.get(reference) ?? new Set<string>();
      current.add(roomKey);
      referenceRooms.set(reference, current);
    });
  });

  referenceRooms.forEach((rooms, providerReference) => {
    if (rooms.size > 1) {
      crossRoomReferenceRows.push({
        providerReference,
        rooms: [...rooms].sort()
      });
    }
  });

  const utilityOutstandingByRoom = new Map<string, number>();
  utilityBills.forEach((bill) => {
    const buildingId = normalizeBuildingId(bill.buildingId);
    const houseNumber = normalizeHouseNumber(bill.houseNumber);
    const key = ledgerKey(buildingId, houseNumber);
    utilityOutstandingByRoom.set(
      key,
      (utilityOutstandingByRoom.get(key) ?? 0) + amountKsh(bill.balanceKsh)
    );
  });

  const expenseChargesByRoom = new Map<string, number>();
  expenditures.forEach((item) => {
    const houseNumber = normalizeHouseNumber(item.houseNumber);
    if (!houseNumber) {
      return;
    }

    const buildingId = normalizeBuildingId(item.buildingId);
    const key = ledgerKey(buildingId, houseNumber);
    expenseChargesByRoom.set(
      key,
      (expenseChargesByRoom.get(key) ?? 0) + amountKsh(item.amountKsh)
    );
  });

  const duplicateCountByRoom = new Map<string, number>();
  duplicateReferenceRows.forEach((item) => {
    const key = ledgerKey(item.buildingId, item.houseNumber);
    duplicateCountByRoom.set(
      key,
      (duplicateCountByRoom.get(key) ?? 0) + item.duplicateCount
    );
  });

  const suspectedRepeatCountByRoom = new Map<string, number>();
  suspectedManualRepeatRows.forEach((item) => {
    const key = ledgerKey(item.buildingId, item.houseNumber);
    suspectedRepeatCountByRoom.set(
      key,
      Math.max(suspectedRepeatCountByRoom.get(key) ?? 0, item.count)
    );
  });

  const summaryRows: AuditSummaryRow[] = nextRecords
    .map((record) => {
      const buildingId = normalizeBuildingId(record.buildingId);
      const houseNumber = normalizeHouseNumber(record.houseNumber);
      const key = ledgerKey(buildingId, houseNumber);
      const rentBalanceKsh = amountKsh(record.balanceKsh);
      const utilityOutstandingKsh = utilityOutstandingByRoom.get(key) ?? 0;
      const expenseChargesKsh = expenseChargesByRoom.get(key) ?? 0;

      return {
        buildingId,
        houseNumber,
        monthlyRentKsh: amountKsh(record.monthlyRentKsh),
        rentBalanceKsh,
        utilityOutstandingKsh,
        expenseChargesKsh,
        totalOutstandingKsh: rentBalanceKsh + utilityOutstandingKsh + expenseChargesKsh,
        rentPayments: Array.isArray(record.payments) ? record.payments.length : 0,
        duplicateRentReferences: duplicateCountByRoom.get(key) ?? 0,
        suspectedRepeatedManualEntries: suspectedRepeatCountByRoom.get(key) ?? 0
      };
    })
    .filter((row) => !hasBuildingFilter || row.buildingId === buildingFilter)
    .filter((row) => matchesFilter(row.houseNumber, houseFilter))
    .sort((a, b) => {
      const totalDelta = b.totalOutstandingKsh - a.totalOutstandingKsh;
      if (totalDelta !== 0) {
        return totalDelta;
      }

      const buildingDelta = a.buildingId.localeCompare(b.buildingId);
      if (buildingDelta !== 0) {
        return buildingDelta;
      }

      return a.houseNumber.localeCompare(b.houseNumber, undefined, {
        numeric: true
      });
    });

  if (applyDuplicateRentFix && duplicateReferenceRows.length > 0) {
    const nextState: RentLedgerState = {
      records: nextRecords,
      pendingPayments
    };

    await prisma.appState.update({
      where: { key: RENT_LEDGER_STATE_KEY },
      data: {
        value: nextState as Prisma.InputJsonValue
      }
    });
  }

  if (outputJson) {
    console.log(
      JSON.stringify(
        {
          filters: {
            buildingId: hasBuildingFilter ? buildingFilter : null,
            houseNumber: houseFilter || null
          },
          appliedDuplicateRentFix: applyDuplicateRentFix && duplicateReferenceRows.length > 0,
          summaryRows,
          duplicateReferenceRows,
          suspectedManualRepeatRows,
          crossRoomReferenceRows
        },
        null,
        2
      )
    );
    return;
  }

  console.log(`Rooms audited: ${summaryRows.length}`);
  console.log(`Duplicate rent references: ${duplicateReferenceRows.length}`);
  console.log(`Suspected repeated manual rent entries: ${suspectedManualRepeatRows.length}`);
  console.log(`Cross-room rent reference collisions: ${crossRoomReferenceRows.length}`);
  if (applyDuplicateRentFix) {
    console.log(
      duplicateReferenceRows.length > 0
        ? "Applied duplicate rent reference cleanup."
        : "No duplicate rent references found to clean up."
    );
  }

  if (summaryRows.length > 0) {
    console.table(summaryRows.slice(0, 60));
  } else {
    console.log("No room balances matched the requested filters.");
  }

  if (duplicateReferenceRows.length > 0) {
    console.log("\nDuplicate rent references by room:");
    console.table(duplicateReferenceRows.slice(0, 60));
  }

  if (suspectedManualRepeatRows.length > 0) {
    console.log("\nSuspected repeated manual rent entries:");
    console.table(suspectedManualRepeatRows.slice(0, 60));
  }

  if (crossRoomReferenceRows.length > 0) {
    console.log("\nCross-room rent reference collisions:");
    console.table(crossRoomReferenceRows.slice(0, 60));
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
