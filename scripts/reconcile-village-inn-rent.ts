import { Prisma, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const RENT_LEDGER_STATE_KEY = "rent_ledger_v1";
const VILLAGE_INN_BUILDING_ID = "CAPTYN-BLDG-00002";
const STALE_VILLAGE_INN_NOTE = "Village Inn March 2026 baseline seed on 2026-03-21.";

type RentLedgerRecord = {
  buildingId?: string;
  houseNumber?: string;
  note?: string;
  balanceKsh?: number;
  payments?: unknown[];
};

type RentLedgerState = {
  records?: RentLedgerRecord[];
  pendingPayments?: unknown[];
};

function isStaleVillageInnRentSeed(record: RentLedgerRecord): boolean {
  return (
    String(record.buildingId ?? "").trim().toUpperCase() === VILLAGE_INN_BUILDING_ID &&
    String(record.note ?? "").trim() === STALE_VILLAGE_INN_NOTE &&
    Math.round(Number(record.balanceKsh ?? 0)) === 350 &&
    (!Array.isArray(record.payments) || record.payments.length === 0)
  );
}

async function main() {
  const apply = process.argv.includes("--apply");
  const stateRow = await prisma.appState.findUnique({
    where: { key: RENT_LEDGER_STATE_KEY },
    select: { value: true }
  });

  if (!stateRow) {
    throw new Error(`AppState ${RENT_LEDGER_STATE_KEY} was not found.`);
  }

  const state = (stateRow.value ?? {}) as RentLedgerState;
  const records = Array.isArray(state.records) ? state.records : [];
  const staleRecords = records.filter(isStaleVillageInnRentSeed);
  const staleRooms = staleRecords
    .map((record) => String(record.houseNumber ?? "").trim().toUpperCase())
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  console.log(`Village Inn stale seeded rent rows: ${staleRooms.length}`);
  console.log(`Rooms: ${staleRooms.join(", ") || "(none)"}`);

  if (!apply) {
    console.log("Dry run only. Re-run with --apply to remove these rows.");
    return;
  }

  if (staleRooms.length === 0) {
    console.log("No stale Village Inn rent rows found. Nothing to change.");
    return;
  }

  const nextState: RentLedgerState = {
    records: records.filter((record) => !isStaleVillageInnRentSeed(record)),
    pendingPayments: Array.isArray(state.pendingPayments) ? state.pendingPayments : []
  };

  await prisma.appState.update({
    where: { key: RENT_LEDGER_STATE_KEY },
    data: {
      value: nextState as Prisma.InputJsonValue
    }
  });

  console.log(`Removed ${staleRooms.length} Village Inn rent rows from ${RENT_LEDGER_STATE_KEY}.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
