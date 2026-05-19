import { Prisma, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const VILLAGE_INN_BUILDING_ID = "CAPTYN-BLDG-00002";
const ROOM_CAP = 52;
const UTILITY_BILLING_STATE_KEY = "utility_billing_v1";
const RENT_LEDGER_STATE_KEY = "rent_ledger_v1";

type UtilityBillRecord = {
  buildingId?: string;
  houseNumber?: string;
};

type UtilityBillingState = {
  bills?: UtilityBillRecord[];
  meters?: unknown[];
};

type RentLedgerRecord = {
  buildingId?: string;
  houseNumber?: string;
};

type RentLedgerState = {
  records?: RentLedgerRecord[];
  pendingPayments?: unknown[];
};

function toRoomNumber(value: string | null | undefined): number | null {
  const normalized = String(value ?? "").trim();
  if (!/^\d+$/.test(normalized)) {
    return null;
  }

  const roomNumber = Number(normalized);
  return Number.isInteger(roomNumber) ? roomNumber : null;
}

function isAboveCap(value: string | null | undefined): boolean {
  const roomNumber = toRoomNumber(value);
  return roomNumber !== null && roomNumber > ROOM_CAP;
}

async function main() {
  const apply = process.argv.includes("--apply");

  const [building, units, registryRows, agreements, applications, tenancies] =
    await Promise.all([
      prisma.building.findUnique({
        where: { id: VILLAGE_INN_BUILDING_ID },
        select: { id: true, name: true, units: true }
      }),
      prisma.houseUnit.findMany({
        where: { buildingId: VILLAGE_INN_BUILDING_ID, isActive: true },
        select: { id: true, houseNumber: true }
      }),
      prisma.householdMemberRegistry.findMany({
        where: { buildingId: VILLAGE_INN_BUILDING_ID },
        select: { id: true, houseNumber: true, members: true }
      }),
      prisma.tenantAgreement.findMany({
        where: { buildingId: VILLAGE_INN_BUILDING_ID },
        select: { id: true, houseNumber: true }
      }),
      prisma.tenantApplication.findMany({
        where: { buildingId: VILLAGE_INN_BUILDING_ID },
        select: { id: true, houseNumber: true, status: true }
      }),
      prisma.tenancy.findMany({
        where: { buildingId: VILLAGE_INN_BUILDING_ID, active: true },
        select: {
          id: true,
          unit: {
            select: { houseNumber: true }
          }
        }
      })
    ]);

  if (!building) {
    throw new Error(`Building ${VILLAGE_INN_BUILDING_ID} was not found.`);
  }

  const unitsAboveCap = units.filter((item) => isAboveCap(item.houseNumber));
  const unitHouseNumbersAboveCap = new Set(unitsAboveCap.map((item) => item.houseNumber.trim()));
  const registryAboveCap = registryRows.filter((item) => isAboveCap(item.houseNumber));
  const agreementsAboveCap = agreements.filter((item) => isAboveCap(item.houseNumber));
  const applicationsAboveCap = applications.filter((item) => isAboveCap(item.houseNumber));
  const tenanciesAboveCap = tenancies.filter((item) => isAboveCap(item.unit.houseNumber));

  const nonZeroRegistryAboveCap = registryAboveCap.filter((item) => Number(item.members) > 0);

  if (tenanciesAboveCap.length > 0) {
    throw new Error(
      `Active tenancies exist above room ${ROOM_CAP}: ${tenanciesAboveCap
        .map((item) => item.unit.houseNumber)
        .join(", ")}`
    );
  }

  if (agreementsAboveCap.length > 0) {
    throw new Error(
      `Tenant agreements exist above room ${ROOM_CAP}: ${agreementsAboveCap
        .map((item) => item.houseNumber)
        .join(", ")}`
    );
  }

  if (applicationsAboveCap.length > 0) {
    throw new Error(
      `Tenant applications exist above room ${ROOM_CAP}: ${applicationsAboveCap
        .map((item) => item.houseNumber)
        .join(", ")}`
    );
  }

  if (nonZeroRegistryAboveCap.length > 0) {
    throw new Error(
      `Household registry rows above room ${ROOM_CAP} have nonzero members: ${nonZeroRegistryAboveCap
        .map((item) => `${item.houseNumber}=${item.members}`)
        .join(", ")}`
    );
  }

  const utilityStateRow = await prisma.appState.findUnique({
    where: { key: UTILITY_BILLING_STATE_KEY },
    select: { value: true }
  });
  if (!utilityStateRow) {
    throw new Error(`AppState ${UTILITY_BILLING_STATE_KEY} was not found.`);
  }

  const rentStateRow = await prisma.appState.findUnique({
    where: { key: RENT_LEDGER_STATE_KEY },
    select: { value: true }
  });

  const utilityState = (utilityStateRow.value ?? {}) as UtilityBillingState;
  const utilityBills = Array.isArray(utilityState.bills) ? utilityState.bills : [];
  const utilityBillsAboveCap = utilityBills.filter(
    (item) =>
      String(item.buildingId ?? "").trim().toUpperCase() === VILLAGE_INN_BUILDING_ID &&
      isAboveCap(item.houseNumber)
  );

  const rentState = (rentStateRow?.value ?? {}) as RentLedgerState;
  const rentRecords = Array.isArray(rentState.records) ? rentState.records : [];
  const rentRecordsAboveCap = rentRecords.filter(
    (item) =>
      String(item.buildingId ?? "").trim().toUpperCase() === VILLAGE_INN_BUILDING_ID &&
      isAboveCap(item.houseNumber)
  );

  const unitRooms = unitsAboveCap
    .map((item) => item.houseNumber.trim())
    .sort((a, b) => Number(a) - Number(b));
  const registryRooms = registryAboveCap
    .map((item) => item.houseNumber.trim())
    .sort((a, b) => Number(a) - Number(b));
  const utilityRooms = [...new Set(
    utilityBillsAboveCap.map((item) => String(item.houseNumber ?? "").trim())
  )].sort((a, b) => Number(a) - Number(b));
  const rentRooms = [...new Set(
    rentRecordsAboveCap.map((item) => String(item.houseNumber ?? "").trim())
  )].sort((a, b) => Number(a) - Number(b));

  console.log(`Village Inn current unit count: ${building.units ?? 0}`);
  console.log(`Target unit count: ${ROOM_CAP}`);
  console.log(`Active units above cap: ${unitRooms.join(", ") || "(none)"}`);
  console.log(`Registry rows above cap: ${registryRooms.join(", ") || "(none)"}`);
  console.log(`Utility-billed rooms above cap: ${utilityRooms.join(", ") || "(none)"}`);
  console.log(`Rent-ledger rooms above cap: ${rentRooms.join(", ") || "(none)"}`);

  if (!apply) {
    console.log("Dry run only. Re-run with --apply to enforce the 52-room cap.");
    return;
  }

  const nextUtilityState: UtilityBillingState = {
    meters: Array.isArray(utilityState.meters) ? utilityState.meters : [],
    bills: utilityBills.filter(
      (item) =>
        !(
          String(item.buildingId ?? "").trim().toUpperCase() === VILLAGE_INN_BUILDING_ID &&
          isAboveCap(item.houseNumber)
        )
    )
  };

  const nextRentState: RentLedgerState = {
    records: rentRecords.filter(
      (item) =>
        !(
          String(item.buildingId ?? "").trim().toUpperCase() === VILLAGE_INN_BUILDING_ID &&
          isAboveCap(item.houseNumber)
        )
    ),
    pendingPayments: Array.isArray(rentState.pendingPayments)
      ? rentState.pendingPayments
      : []
  };

  await prisma.$transaction(async (tx) => {
    await tx.building.update({
      where: { id: VILLAGE_INN_BUILDING_ID },
      data: { units: ROOM_CAP }
    });

    if (unitsAboveCap.length > 0) {
      await tx.houseUnit.updateMany({
        where: {
          id: { in: unitsAboveCap.map((item) => item.id) }
        },
        data: { isActive: false }
      });
    }

    if (registryAboveCap.length > 0) {
      await tx.householdMemberRegistry.deleteMany({
        where: {
          id: { in: registryAboveCap.map((item) => item.id) }
        }
      });
    }

    await tx.appState.update({
      where: { key: UTILITY_BILLING_STATE_KEY },
      data: { value: nextUtilityState as Prisma.InputJsonValue }
    });

    await tx.appState.update({
      where: { key: RENT_LEDGER_STATE_KEY },
      data: { value: nextRentState as Prisma.InputJsonValue }
    });
  });

  console.log(
    `Applied Village Inn room cap ${ROOM_CAP}. Deactivated ${unitHouseNumbersAboveCap.size} units and removed ${utilityBillsAboveCap.length} utility bill rows above the cap.`
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
