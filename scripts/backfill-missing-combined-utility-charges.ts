import "dotenv/config";
import { Prisma, PrismaClient } from "@prisma/client";
import {
  UtilityBillingService,
  type UtilityBillSnapshot,
  type UtilityBillingPersistedState
} from "../src/services/utilityBillingService.js";

const prisma = new PrismaClient();

const UTILITY_BILLING_STATE_KEY = "utility_billing_v1";
const RUNTIME_QUEUES_STATE_KEY = "runtime_queues_v1";

type RuntimeQueuesPersistedState = {
  utilityChargeDefaults?: Array<{
    buildingId?: string;
    houseNumber?: string;
    combinedUtilityChargeKsh?: number;
  }>;
  monthlyCombinedUtilityCharges?: Array<{
    buildingId?: string;
    billingMonth?: string;
    amountKsh?: number;
  }>;
};

type BuildingDirectoryRow = {
  id: string;
  name: string;
};

type BuildingRepairRow = {
  buildingId: string;
  buildingName: string;
  houseNumber: string;
  billingMonth: string;
  resolvedChargeKsh: number;
  resolvedChargeSource:
    | "room_custom_combined"
    | "monthly_override_combined"
    | "building_default_combined"
    | "disabled"
    | "unconfigured";
  action:
    | "missing_create"
    | "missing_update_zero_water_bill"
    | "already_billed"
    | "skipped_disabled"
    | "skipped_unconfigured";
  dueDate?: string;
  existingPositiveBillAmountKsh: number;
  existingPositiveBillCount: number;
};

type PendingZeroWaterBillUpdate = {
  billId: string;
  buildingId: string;
  houseNumber: string;
  billingMonth: string;
  amountKsh: number;
  dueDate: string;
  note: string;
};

function parseFlag(name: string): string {
  const exact = process.argv.find((item) => item.startsWith(`${name}=`));
  return exact ? exact.slice(name.length + 1).trim() : "";
}

function hasFlag(name: string): boolean {
  return process.argv.includes(name);
}

function normalizeBuildingId(value: string | undefined): string {
  return String(value ?? "").trim().toUpperCase();
}

function normalizeHouseNumber(value: string | undefined): string {
  return String(value ?? "").trim().toUpperCase();
}

function toBillingMonth(value: string | undefined): string {
  const raw = String(value ?? "").trim();
  if (!raw) {
    return "";
  }

  const match = raw.match(/^(\d{4})-(\d{2})$/);
  return match ? `${match[1]}-${match[2]}` : "";
}

function addBillingMonths(billingMonth: string, delta: number): string {
  const normalized = toBillingMonth(billingMonth);
  if (!normalized) {
    return "";
  }

  const [yearRaw, monthRaw] = normalized.split("-");
  const year = Number(yearRaw);
  const monthIndex = Number(monthRaw) - 1;
  if (!Number.isFinite(year) || !Number.isFinite(monthIndex)) {
    return "";
  }

  const next = new Date(Date.UTC(year, monthIndex + delta, 1));
  return `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, "0")}`;
}

function previousVisibleBillingMonth(now: Date = new Date()): string {
  return addBillingMonths(
    `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`,
    -1
  );
}

function billingMonthDelta(target: string, source: string): number | null {
  const normalizedTarget = toBillingMonth(target);
  const normalizedSource = toBillingMonth(source);
  if (!normalizedTarget || !normalizedSource) {
    return null;
  }

  const [targetYearRaw, targetMonthRaw] = normalizedTarget.split("-");
  const [sourceYearRaw, sourceMonthRaw] = normalizedSource.split("-");
  const targetYear = Number(targetYearRaw);
  const targetMonth = Number(targetMonthRaw);
  const sourceYear = Number(sourceYearRaw);
  const sourceMonth = Number(sourceMonthRaw);
  if (
    !Number.isFinite(targetYear) ||
    !Number.isFinite(targetMonth) ||
    !Number.isFinite(sourceYear) ||
    !Number.isFinite(sourceMonth)
  ) {
    return null;
  }

  return (targetYear - sourceYear) * 12 + (targetMonth - sourceMonth);
}

function shiftIsoDateByMonths(value: string, offset: number): string | null {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  const targetMonthIndex = parsed.getUTCMonth() + offset;
  const lastDayOfTargetMonth = new Date(
    Date.UTC(parsed.getUTCFullYear(), targetMonthIndex + 1, 0, 0, 0, 0, 0)
  ).getUTCDate();
  const targetDay = Math.min(parsed.getUTCDate(), lastDayOfTargetMonth);

  return new Date(
    Date.UTC(
      parsed.getUTCFullYear(),
      targetMonthIndex,
      targetDay,
      parsed.getUTCHours(),
      parsed.getUTCMinutes(),
      parsed.getUTCSeconds(),
      parsed.getUTCMilliseconds()
    )
  ).toISOString();
}

function defaultDueDateForBillingMonth(billingMonth: string): string {
  const normalized = toBillingMonth(billingMonth);
  if (!normalized) {
    return new Date().toISOString();
  }

  const [yearRaw, monthRaw] = normalized.split("-");
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  return new Date(Date.UTC(year, month, 6, 0, 0, 0, 0)).toISOString();
}

function compareHouseNumbers(left: string, right: string): number {
  return String(left ?? "").localeCompare(String(right ?? ""), undefined, {
    numeric: true,
    sensitivity: "base"
  });
}

function formatCurrency(value: number): string {
  return `KSh ${Math.round(value).toLocaleString("en-US")}`;
}

function buildCombinedUtilityNote(billingMonth: string): string {
  return `Combined utility fee (water+electricity) for ${billingMonth}.`;
}

function memberKey(buildingId: string, houseNumber: string): string {
  return `${normalizeBuildingId(buildingId)}::${normalizeHouseNumber(houseNumber)}`;
}

function combinedMonthKey(buildingId: string, billingMonth: string): string {
  return `${normalizeBuildingId(buildingId)}::${toBillingMonth(billingMonth)}`;
}

function resolveBuildingRows(
  buildings: BuildingDirectoryRow[],
  filter: string,
  requireScopedApply: boolean
): BuildingDirectoryRow[] {
  if (!filter) {
    if (requireScopedApply) {
      throw new Error(
        "Re-run with --building=<id or name> or --all-buildings when using --apply."
      );
    }

    return [...buildings].sort((a, b) => a.name.localeCompare(b.name));
  }

  const exactId = buildings.find(
    (item) => normalizeBuildingId(item.id) === normalizeBuildingId(filter)
  );
  if (exactId) {
    return [exactId];
  }

  const normalizedFilter = filter.trim().toLowerCase();
  const matches = buildings.filter(
    (item) =>
      item.name.trim().toLowerCase().includes(normalizedFilter) ||
      item.id.trim().toLowerCase().includes(normalizedFilter)
  );

  if (matches.length === 1) {
    return matches;
  }

  if (matches.length === 0) {
    throw new Error(`Could not resolve building "${filter}".`);
  }

  throw new Error(
    `Building filter "${filter}" matched multiple buildings: ${matches
      .map((item) => `${item.name} (${item.id})`)
      .join(", ")}`
  );
}

function resolveCombinedCharge(input: {
  buildingId: string;
  houseNumber: string;
  billingMonth: string;
  utilityBillingMode?: string | null;
  defaultCombinedUtilityChargeKsh?: number | null;
  roomCombinedChargesByUnit: Map<string, number>;
  monthlyCombinedChargesByMonth: Map<string, number>;
}) {
  if (String(input.utilityBillingMode ?? "").trim() === "disabled") {
    return {
      amountKsh: 0,
      source: "disabled" as const
    };
  }

  const roomAmount = Math.max(
    0,
    Number(
      input.roomCombinedChargesByUnit.get(
        memberKey(input.buildingId, input.houseNumber)
      ) ?? 0
    )
  );
  if (roomAmount > 0) {
    return {
      amountKsh: roomAmount,
      source: "room_custom_combined" as const
    };
  }

  const monthlyAmount = Math.max(
    0,
    Number(
      input.monthlyCombinedChargesByMonth.get(
        combinedMonthKey(input.buildingId, input.billingMonth)
      ) ?? 0
    )
  );
  if (monthlyAmount > 0) {
    return {
      amountKsh: monthlyAmount,
      source: "monthly_override_combined" as const
    };
  }

  const buildingAmount = Math.max(
    0,
    Math.round(Number(input.defaultCombinedUtilityChargeKsh ?? 0))
  );
  if (buildingAmount > 0) {
    return {
      amountKsh: buildingAmount,
      source: "building_default_combined" as const
    };
  }

  return {
    amountKsh: 0,
    source: "unconfigured" as const
  };
}

function resolveDueDateForBackfill(
  billingMonth: string,
  houseBills: UtilityBillSnapshot[]
): string {
  const sameMonthDueDate = houseBills
    .filter((item) => item.billingMonth === billingMonth)
    .map((item) => String(item.dueDate ?? "").trim())
    .find(Boolean);
  if (sameMonthDueDate) {
    return sameMonthDueDate;
  }

  const shiftedMatch = [...houseBills]
    .filter((item) => toBillingMonth(item.billingMonth) && String(item.dueDate ?? "").trim())
    .sort((left, right) => {
      const leftDelta = Math.abs(billingMonthDelta(billingMonth, left.billingMonth) ?? 9999);
      const rightDelta = Math.abs(billingMonthDelta(billingMonth, right.billingMonth) ?? 9999);
      if (leftDelta !== rightDelta) {
        return leftDelta - rightDelta;
      }

      return right.updatedAt.localeCompare(left.updatedAt);
    })
    .map((item) => {
      const delta = billingMonthDelta(billingMonth, item.billingMonth);
      if (delta == null) {
        return "";
      }

      return shiftIsoDateByMonths(item.dueDate, delta) ?? "";
    })
    .find(Boolean);

  return shiftedMatch || defaultDueDateForBillingMonth(billingMonth);
}

function applyPendingZeroWaterBillUpdates(
  state: UtilityBillingPersistedState,
  updates: PendingZeroWaterBillUpdate[]
): UtilityBillingPersistedState {
  if (updates.length === 0) {
    return state;
  }

  const updatesById = new Map(updates.map((item) => [item.billId, item]));
  const now = new Date().toISOString();
  let appliedCount = 0;

  const bills = Array.isArray(state.bills) ? state.bills : [];
  const nextBills = bills.map((bill) => {
    const update = updatesById.get(String(bill.id ?? ""));
    if (!update) {
      return bill;
    }

    appliedCount += 1;
    return {
      ...bill,
      utilityType: "water" as const,
      buildingId: update.buildingId,
      houseNumber: update.houseNumber,
      billingMonth: update.billingMonth,
      meterNumber: "NO-METER",
      previousReading: 0,
      currentReading: 0,
      unitsConsumed: 0,
      ratePerUnitKsh: 0,
      fixedChargeKsh: update.amountKsh,
      amountKsh: update.amountKsh,
      balanceKsh: update.amountKsh,
      dueDate: update.dueDate,
      note: update.note,
      updatedAt: now,
      payments: Array.isArray(bill.payments) ? bill.payments : []
    };
  });

  if (appliedCount !== updates.length) {
    throw new Error(
      `Only updated ${appliedCount} of ${updates.length} expected zero-value water bills.`
    );
  }

  return {
    meters: Array.isArray(state.meters) ? state.meters : [],
    bills: nextBills
  };
}

function toJsonValue(value: UtilityBillingPersistedState): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

async function main() {
  const buildingFilter = parseFlag("--building");
  const houseFilter = normalizeHouseNumber(parseFlag("--house"));
  const requestedBillingMonth = toBillingMonth(parseFlag("--month"));
  const apply = hasFlag("--apply");
  const allBuildings = hasFlag("--all-buildings");
  const outputJson = hasFlag("--json");
  const billingMonth = requestedBillingMonth || previousVisibleBillingMonth();

  if (apply && !requestedBillingMonth) {
    throw new Error(
      "Re-run with --month=YYYY-MM when using --apply so the repair targets an explicit billing month."
    );
  }

  const [utilityStateRow, runtimeQueuesStateRow, buildingDirectory] = await Promise.all([
    prisma.appState.findUnique({
      where: { key: UTILITY_BILLING_STATE_KEY },
      select: { value: true }
    }),
    prisma.appState.findUnique({
      where: { key: RUNTIME_QUEUES_STATE_KEY },
      select: { value: true }
    }),
    prisma.building.findMany({
      select: {
        id: true,
        name: true
      },
      orderBy: { name: "asc" }
    })
  ]);

  if (!utilityStateRow) {
    throw new Error(`AppState ${UTILITY_BILLING_STATE_KEY} was not found.`);
  }

  const selectedBuildings = resolveBuildingRows(
    buildingDirectory,
    buildingFilter,
    apply && !allBuildings
  );

  const buildings = await prisma.building.findMany({
    where: {
      id: {
        in: selectedBuildings.map((item) => item.id)
      }
    },
    select: {
      id: true,
      name: true,
      configuration: {
        select: {
          utilityBillingMode: true,
          defaultCombinedUtilityChargeKsh: true
        }
      },
      houseUnits: {
        where: houseFilter ? { isActive: true, houseNumber: houseFilter } : { isActive: true },
        select: {
          houseNumber: true,
          tenancies: {
            where: { active: true },
            select: { id: true }
          }
        }
      }
    },
    orderBy: { name: "asc" }
  });

  const runtimeQueuesState =
    ((runtimeQueuesStateRow?.value ?? {}) as RuntimeQueuesPersistedState) ?? {};
  const roomCombinedChargesByUnit = new Map<string, number>();
  const monthlyCombinedChargesByMonth = new Map<string, number>();

  if (Array.isArray(runtimeQueuesState.utilityChargeDefaults)) {
    for (const item of runtimeQueuesState.utilityChargeDefaults) {
      if (!item?.buildingId || !item?.houseNumber) {
        continue;
      }

      const amountKsh = Math.max(0, Math.round(Number(item.combinedUtilityChargeKsh ?? 0)));
      if (amountKsh <= 0) {
        continue;
      }

      roomCombinedChargesByUnit.set(
        memberKey(item.buildingId, item.houseNumber),
        amountKsh
      );
    }
  }

  if (Array.isArray(runtimeQueuesState.monthlyCombinedUtilityCharges)) {
    for (const item of runtimeQueuesState.monthlyCombinedUtilityCharges) {
      if (!item?.buildingId || !item?.billingMonth) {
        continue;
      }

      const amountKsh = Math.max(0, Math.round(Number(item.amountKsh ?? 0)));
      if (amountKsh <= 0) {
        continue;
      }

      monthlyCombinedChargesByMonth.set(
        combinedMonthKey(item.buildingId, item.billingMonth),
        amountKsh
      );
    }
  }

  const utilityBillingService = new UtilityBillingService();
  utilityBillingService.importState(
    ((utilityStateRow.value ?? {}) as unknown as UtilityBillingPersistedState) ?? {
      meters: [],
      bills: []
    }
  );

  const rows: BuildingRepairRow[] = [];
  const pendingZeroWaterBillUpdates: PendingZeroWaterBillUpdate[] = [];
  let createCount = 0;
  let updateCount = 0;

  for (const building of buildings) {
    const activeUnits = [...building.houseUnits]
      .filter((unit) => unit.tenancies.length > 0)
      .sort((left, right) => compareHouseNumbers(left.houseNumber, right.houseNumber));

    for (const unit of activeUnits) {
      const houseNumber = normalizeHouseNumber(unit.houseNumber);
      const resolvedCharge = resolveCombinedCharge({
        buildingId: building.id,
        houseNumber,
        billingMonth,
        utilityBillingMode: building.configuration?.utilityBillingMode,
        defaultCombinedUtilityChargeKsh:
          building.configuration?.defaultCombinedUtilityChargeKsh,
        roomCombinedChargesByUnit,
        monthlyCombinedChargesByMonth
      });

      if (resolvedCharge.source === "disabled") {
        rows.push({
          buildingId: building.id,
          buildingName: building.name,
          houseNumber,
          billingMonth,
          resolvedChargeKsh: 0,
          resolvedChargeSource: "disabled",
          action: "skipped_disabled",
          existingPositiveBillAmountKsh: 0,
          existingPositiveBillCount: 0
        });
        continue;
      }

      if (resolvedCharge.amountKsh <= 0) {
        rows.push({
          buildingId: building.id,
          buildingName: building.name,
          houseNumber,
          billingMonth,
          resolvedChargeKsh: 0,
          resolvedChargeSource: "unconfigured",
          action: "skipped_unconfigured",
          existingPositiveBillAmountKsh: 0,
          existingPositiveBillCount: 0
        });
        continue;
      }

      const houseBills = utilityBillingService.listBills({
        buildingId: building.id,
        houseNumber,
        limit: 240
      });
      const targetMonthBills = houseBills.filter((item) => item.billingMonth === billingMonth);
      const positiveTargetBills = targetMonthBills.filter(
        (item) => Math.max(0, Number(item.amountKsh ?? 0)) > 0
      );
      const existingPositiveBillAmountKsh = positiveTargetBills.reduce(
        (sum, item) => sum + Math.max(0, Number(item.amountKsh ?? 0)),
        0
      );

      if (positiveTargetBills.length > 0) {
        rows.push({
          buildingId: building.id,
          buildingName: building.name,
          houseNumber,
          billingMonth,
          resolvedChargeKsh: resolvedCharge.amountKsh,
          resolvedChargeSource: resolvedCharge.source,
          action: "already_billed",
          existingPositiveBillAmountKsh,
          existingPositiveBillCount: positiveTargetBills.length
        });
        continue;
      }

      const dueDate = resolveDueDateForBackfill(billingMonth, houseBills);
      const note = buildCombinedUtilityNote(billingMonth);
      const zeroWaterBill = targetMonthBills.find(
        (item) =>
          item.utilityType === "water" &&
          Math.max(0, Number(item.amountKsh ?? 0)) <= 0 &&
          Math.max(0, Number(item.balanceKsh ?? 0)) <= 0 &&
          (item.payments?.length ?? 0) === 0
      );

      if (zeroWaterBill) {
        if (apply) {
          pendingZeroWaterBillUpdates.push({
            billId: zeroWaterBill.id,
            buildingId: building.id,
            houseNumber,
            billingMonth,
            amountKsh: resolvedCharge.amountKsh,
            dueDate,
            note
          });
        }
        updateCount += 1;
        rows.push({
          buildingId: building.id,
          buildingName: building.name,
          houseNumber,
          billingMonth,
          resolvedChargeKsh: resolvedCharge.amountKsh,
          resolvedChargeSource: resolvedCharge.source,
          action: "missing_update_zero_water_bill",
          dueDate,
          existingPositiveBillAmountKsh: 0,
          existingPositiveBillCount: 0
        });
        continue;
      }

      if (apply) {
        utilityBillingService.createBill("water", building.id, houseNumber, {
          billingMonth,
          fixedChargeKsh: resolvedCharge.amountKsh,
          dueDate,
          note
        });
      }
      createCount += 1;
      rows.push({
        buildingId: building.id,
        buildingName: building.name,
        houseNumber,
        billingMonth,
        resolvedChargeKsh: resolvedCharge.amountKsh,
        resolvedChargeSource: resolvedCharge.source,
        action: "missing_create",
        dueDate,
        existingPositiveBillAmountKsh: 0,
        existingPositiveBillCount: 0
      });
    }
  }

  if (apply && (createCount > 0 || updateCount > 0)) {
    let nextState = utilityBillingService.exportState();
    nextState = applyPendingZeroWaterBillUpdates(nextState, pendingZeroWaterBillUpdates);

    const normalizedService = new UtilityBillingService();
    normalizedService.importState(nextState);
    const normalizedState = normalizedService.exportState();

    await prisma.appState.update({
      where: { key: UTILITY_BILLING_STATE_KEY },
      data: {
        value: toJsonValue(normalizedState)
      }
    });
  }

  const grouped = new Map<
    string,
    {
      buildingId: string;
      buildingName: string;
      activeRoomsChecked: number;
      missingCreateCount: number;
      missingUpdateCount: number;
      alreadyBilledCount: number;
      skippedDisabledCount: number;
      skippedUnconfiguredCount: number;
      missingRows: BuildingRepairRow[];
    }
  >();

  for (const row of rows) {
    const key = normalizeBuildingId(row.buildingId);
    const current =
      grouped.get(key) ??
      {
        buildingId: row.buildingId,
        buildingName: row.buildingName,
        activeRoomsChecked: 0,
        missingCreateCount: 0,
        missingUpdateCount: 0,
        alreadyBilledCount: 0,
        skippedDisabledCount: 0,
        skippedUnconfiguredCount: 0,
        missingRows: []
      };

    current.activeRoomsChecked += 1;
    if (row.action === "missing_create") {
      current.missingCreateCount += 1;
      current.missingRows.push(row);
    } else if (row.action === "missing_update_zero_water_bill") {
      current.missingUpdateCount += 1;
      current.missingRows.push(row);
    } else if (row.action === "already_billed") {
      current.alreadyBilledCount += 1;
    } else if (row.action === "skipped_disabled") {
      current.skippedDisabledCount += 1;
    } else if (row.action === "skipped_unconfigured") {
      current.skippedUnconfiguredCount += 1;
    }

    grouped.set(key, current);
  }

  const summary = [...grouped.values()].sort((left, right) =>
    left.buildingName.localeCompare(right.buildingName)
  );
  const missingRows = rows.filter(
    (row) =>
      row.action === "missing_create" ||
      row.action === "missing_update_zero_water_bill"
  );

  if (outputJson) {
    console.log(
      JSON.stringify(
        {
          billingMonth,
          mode: apply ? "apply" : "dry_run",
          generatedAt: new Date().toISOString(),
          createCount,
          updateCount,
          matchedBuildingCount: buildings.length,
          summary,
          rows
        },
        null,
        2
      )
    );
    return;
  }

  console.log(`Billing month: ${billingMonth}`);
  console.log(`Mode: ${apply ? "apply" : "dry-run"}`);
  console.log(`Matched buildings: ${buildings.length}`);
  console.log(`Missing combined charges found: ${missingRows.length}`);

  if (!requestedBillingMonth) {
    console.log(
      `Defaulted billing month from current UTC date ${new Date().toISOString().slice(0, 10)}.`
    );
  }

  if (summary.length === 0) {
    console.log("No active tenant rooms matched the current filters.");
    return;
  }

  for (const buildingSummary of summary) {
    console.log("");
    console.log(`${buildingSummary.buildingName} (${buildingSummary.buildingId})`);
    console.log(`  Active tenant rooms checked: ${buildingSummary.activeRoomsChecked}`);
    console.log(
      `  Missing combined charge rows: ${buildingSummary.missingCreateCount + buildingSummary.missingUpdateCount}`
    );
    console.log(
      `  ${apply ? "Created new water bills" : "Would create bills"}: ${buildingSummary.missingCreateCount}`
    );
    console.log(
      `  ${apply ? "Updated zero water bills" : "Would update zero water bills"}: ${buildingSummary.missingUpdateCount}`
    );
    console.log(`  Already billed: ${buildingSummary.alreadyBilledCount}`);
    console.log(`  Skipped disabled: ${buildingSummary.skippedDisabledCount}`);
    console.log(`  Skipped unconfigured: ${buildingSummary.skippedUnconfiguredCount}`);

    for (const row of buildingSummary.missingRows) {
      const actionLabel =
        row.action === "missing_update_zero_water_bill"
          ? "update existing zero water bill"
          : "create new water bill";
      console.log(
        `    ${row.houseNumber}: ${formatCurrency(row.resolvedChargeKsh)} from ${row.resolvedChargeSource} -> ${actionLabel} (due ${row.dueDate})`
      );
    }
  }

  if (!apply) {
    console.log("");
    console.log(
      "Dry run only. Re-run with --month=YYYY-MM and either --building=<id or name> or --all-buildings plus --apply to persist repairs."
    );
  } else if (createCount > 0 || updateCount > 0) {
    console.log("");
    console.log(
      `Applied ${createCount} new combined-charge bills and updated ${updateCount} zero-value water bills for ${billingMonth}.`
    );
  } else {
    console.log("");
    console.log(`No combined-charge repairs were needed for ${billingMonth}.`);
  }
}

void main()
  .catch((error) => {
    console.error(
      error instanceof Error ? error.message : "Failed to backfill combined utility charges."
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
