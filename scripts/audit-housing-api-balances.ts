type BuildingRecord = {
  id?: string;
  name?: string;
  houseNumbers?: string[];
};

type ResidentDirectoryRow = {
  buildingId?: string;
  buildingName?: string;
  houseNumber?: string;
  residentName?: string;
  hasActiveResident?: boolean;
  roomBalanceKsh?: number;
  utilityBalanceKsh?: number;
};

type UtilityPaymentRecord = {
  buildingId?: string;
  houseNumber?: string;
  utilityType?: string;
  billingMonth?: string;
  amountKsh?: number;
  provider?: string;
  providerReference?: string;
  paidAt?: string;
};

type UtilityBillRecord = {
  buildingId?: string;
  houseNumber?: string;
  utilityType?: string;
  billingMonth?: string;
  amountKsh?: number;
  balanceKsh?: number;
  fixedChargeKsh?: number;
  createdAt?: string;
  updatedAt?: string;
  dueDate?: string;
  payments?: UtilityPaymentRecord[];
};

type ExpenditureRecord = {
  id?: string;
  buildingId?: string;
  houseNumber?: string;
  title?: string;
  category?: string;
  amountKsh?: number;
  createdAt?: string;
};

type AuditRow = {
  houseNumber: string;
  residentName: string | null;
  displayedOutstandingKsh: number;
  utilityOutstandingKsh: number;
  expenseChargesKsh: number;
  possibleMissingBillingMonths: string[];
  estimatedRecurringMonthlyChargeKsh: number;
  estimatedRecurringBackfillKsh: number;
  projectedOutstandingKsh: number;
  latestPostedBillingMonth: string | null;
  latestPostedMonthlyChargeKsh: number;
};

type OverappliedBillRow = {
  houseNumber: string;
  utilityType: string;
  billingMonth: string;
  amountKsh: number;
  balanceKsh: number;
  paidKsh: number;
  paymentCount: number;
};

type JsonEnvelope<T> = {
  data?: T;
  error?: string;
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

function amountKsh(value: unknown): number {
  return Math.max(0, Math.round(Number(value ?? 0)));
}

function formatCurrency(value: number): string {
  return `KSh ${Math.round(value).toLocaleString("en-US")}`;
}

function toBillingMonth(value: string | undefined): string {
  const raw = String(value ?? "").trim();
  if (!raw) {
    return "";
  }

  const match = raw.match(/^(\d{4})-(\d{2})/);
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

function listMissingBillingMonths(existingMonths: string[], visibleThroughMonth: string): string[] {
  const normalizedMonths = [...new Set(existingMonths.map((item) => toBillingMonth(item)).filter(Boolean))]
    .sort();
  if (normalizedMonths.length === 0) {
    return [];
  }

  const latestMonth = normalizedMonths[normalizedMonths.length - 1];
  if (!latestMonth || !visibleThroughMonth || latestMonth >= visibleThroughMonth) {
    return [];
  }

  const monthSet = new Set(normalizedMonths);
  const results: string[] = [];
  let cursor = addBillingMonths(latestMonth, 1);
  while (cursor && cursor <= visibleThroughMonth) {
    if (!monthSet.has(cursor)) {
      results.push(cursor);
    }
    cursor = addBillingMonths(cursor, 1);
  }

  return results;
}

async function requestJson<T>(baseUrl: string, path: string, cookie: string): Promise<T> {
  const response = await fetch(new URL(path, baseUrl), {
    headers: cookie ? { cookie } : undefined
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Request failed ${response.status} ${response.statusText}: ${text}`);
  }

  const payload = (await response.json()) as JsonEnvelope<T>;
  if (payload.error) {
    throw new Error(payload.error);
  }

  return (payload.data ?? []) as T;
}

async function login(baseUrl: string, accessToken: string): Promise<string> {
  const response = await fetch(new URL("/api/auth/admin/login", baseUrl), {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify({ accessToken })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Admin login failed ${response.status} ${response.statusText}: ${text}`);
  }

  const setCookie = response.headers.get("set-cookie");
  if (!setCookie) {
    throw new Error("Admin login succeeded but no session cookie was returned.");
  }

  return setCookie.split(",").map((item) => item.split(";")[0]?.trim()).filter(Boolean).join("; ");
}

function resolveBuilding(buildings: BuildingRecord[], filter: string): BuildingRecord {
  if (!Array.isArray(buildings) || buildings.length === 0) {
    throw new Error("No housing buildings were returned by the admin API.");
  }

  if (!filter) {
    if (buildings.length === 1) {
      return buildings[0];
    }

    throw new Error(
      `Multiple buildings are available. Re-run with --building=<id or name>. Options: ${buildings
        .map((item) => `${item.name ?? item.id} (${item.id})`)
        .join(", ")}`
    );
  }

  const normalizedFilter = filter.trim().toLowerCase();
  const exactId = buildings.find(
    (item) => normalizeBuildingId(item.id) === normalizeBuildingId(filter)
  );
  if (exactId) {
    return exactId;
  }

  const nameMatches = buildings.filter((item) =>
    String(item.name ?? "").trim().toLowerCase().includes(normalizedFilter)
  );
  if (nameMatches.length === 1) {
    return nameMatches[0];
  }

  throw new Error(
    `Could not uniquely resolve building "${filter}". Matches: ${nameMatches
      .map((item) => `${item.name ?? item.id} (${item.id})`)
      .join(", ") || "none"}`
  );
}

async function main() {
  const baseUrl = parseFlag("--base-url") || process.env.HOUSING_BASE_URL || "http://10.8.0.1:4100";
  const accessToken =
    parseFlag("--access-token") || process.env.HOUSING_ADMIN_ACCESS_TOKEN || "dev-admin-token";
  const buildingFilter = parseFlag("--building");
  const houseFilter = normalizeHouseNumber(parseFlag("--house"));
  const outputJson = hasFlag("--json");

  const cookie = await login(baseUrl, accessToken);
  const buildings = await requestJson<BuildingRecord[]>(baseUrl, "/api/admin/buildings", cookie);
  const building = resolveBuilding(buildings, buildingFilter);
  const buildingId = String(building.id ?? "").trim();
  if (!buildingId) {
    throw new Error("Selected building has no ID.");
  }

  const query = new URLSearchParams({ buildingId });
  const [residentDirectory, bills, payments, expenditures] = await Promise.all([
    requestJson<ResidentDirectoryRow[]>(
      baseUrl,
      `/api/landlord/resident-directory?${query.toString()}`,
      cookie
    ),
    requestJson<UtilityBillRecord[]>(
      baseUrl,
      `/api/landlord/utilities/bills?${new URLSearchParams({
        buildingId,
        limit: "2000"
      }).toString()}`,
      cookie
    ),
    requestJson<UtilityPaymentRecord[]>(
      baseUrl,
      `/api/landlord/utilities/payments?${new URLSearchParams({
        buildingId,
        limit: "2000"
      }).toString()}`,
      cookie
    ),
    requestJson<ExpenditureRecord[]>(
      baseUrl,
      `/api/landlord/expenditures?${query.toString()}`,
      cookie
    )
  ]);

  const knownHouses = new Set(
    (Array.isArray(building.houseNumbers) ? building.houseNumbers : [])
      .map((item) => normalizeHouseNumber(item))
      .filter(Boolean)
  );
  const visibleThroughMonth = previousVisibleBillingMonth();
  const residentByHouse = new Map<string, ResidentDirectoryRow>();
  const dataHouses = new Set<string>();

  for (const row of residentDirectory) {
    const houseNumber = normalizeHouseNumber(row.houseNumber);
    if (!houseNumber) {
      continue;
    }

    residentByHouse.set(houseNumber, row);
    dataHouses.add(houseNumber);
  }

  const billsByHouse = new Map<string, UtilityBillRecord[]>();
  for (const bill of bills) {
    const houseNumber = normalizeHouseNumber(bill.houseNumber);
    if (!houseNumber) {
      continue;
    }

    const list = billsByHouse.get(houseNumber) ?? [];
    list.push(bill);
    billsByHouse.set(houseNumber, list);
    dataHouses.add(houseNumber);
  }

  const paymentsByHouse = new Map<string, UtilityPaymentRecord[]>();
  for (const payment of payments) {
    const houseNumber = normalizeHouseNumber(payment.houseNumber);
    if (!houseNumber) {
      continue;
    }

    const list = paymentsByHouse.get(houseNumber) ?? [];
    list.push(payment);
    paymentsByHouse.set(houseNumber, list);
    dataHouses.add(houseNumber);
  }

  const expendituresByHouse = new Map<string, ExpenditureRecord[]>();
  for (const item of expenditures) {
    const houseNumber = normalizeHouseNumber(item.houseNumber);
    if (!houseNumber) {
      continue;
    }

    const list = expendituresByHouse.get(houseNumber) ?? [];
    list.push(item);
    expendituresByHouse.set(houseNumber, list);
    dataHouses.add(houseNumber);
  }

  const targetHouses = [...new Set([...knownHouses, ...dataHouses])]
    .filter((houseNumber) => (!houseFilter ? true : houseNumber === houseFilter))
    .sort((left, right) =>
      left.localeCompare(right, undefined, { numeric: true, sensitivity: "base" })
    );

  const rows: AuditRow[] = [];
  const overappliedBills: OverappliedBillRow[] = [];
  const orphanHouses: Array<{
    houseNumber: string;
    utilityOutstandingKsh: number;
    displayedOutstandingKsh: number;
    knownToBuilding: boolean;
  }> = [];

  for (const houseNumber of targetHouses) {
    const resident = residentByHouse.get(houseNumber) ?? null;
    const houseBills = billsByHouse.get(houseNumber) ?? [];
    const housePayments = paymentsByHouse.get(houseNumber) ?? [];
    const houseExpenditures = expendituresByHouse.get(houseNumber) ?? [];
    const displayedOutstandingKsh = amountKsh(resident?.roomBalanceKsh);
    const utilityOutstandingKsh = houseBills.reduce(
      (sum, item) => sum + amountKsh(item.balanceKsh),
      0
    );
    const expenseChargesKsh = houseExpenditures.reduce(
      (sum, item) => sum + amountKsh(item.amountKsh),
      0
    );
    const positiveBills = houseBills.filter((item) => amountKsh(item.amountKsh) > 0);
    const monthChargeTotals = new Map<string, number>();
    for (const bill of positiveBills) {
      const billingMonth = toBillingMonth(bill.billingMonth);
      if (!billingMonth) {
        continue;
      }

      monthChargeTotals.set(
        billingMonth,
        (monthChargeTotals.get(billingMonth) ?? 0) + amountKsh(bill.amountKsh)
      );
    }

    const orderedMonths = [...monthChargeTotals.keys()].sort();
    const latestPostedBillingMonth =
      orderedMonths.length > 0 ? orderedMonths[orderedMonths.length - 1] : null;
    const latestPostedMonthlyChargeKsh = latestPostedBillingMonth
      ? monthChargeTotals.get(latestPostedBillingMonth) ?? 0
      : 0;
    const possibleMissingBillingMonths = listMissingBillingMonths(
      orderedMonths,
      visibleThroughMonth
    );
    const estimatedRecurringMonthlyChargeKsh = latestPostedMonthlyChargeKsh;
    const estimatedRecurringBackfillKsh =
      possibleMissingBillingMonths.length * estimatedRecurringMonthlyChargeKsh;
    const projectedOutstandingKsh =
      displayedOutstandingKsh + expenseChargesKsh + estimatedRecurringBackfillKsh;

    rows.push({
      houseNumber,
      residentName: resident?.residentName ?? null,
      displayedOutstandingKsh,
      utilityOutstandingKsh,
      expenseChargesKsh,
      possibleMissingBillingMonths,
      estimatedRecurringMonthlyChargeKsh,
      estimatedRecurringBackfillKsh,
      projectedOutstandingKsh,
      latestPostedBillingMonth,
      latestPostedMonthlyChargeKsh
    });

    for (const bill of houseBills) {
      const billAmountKsh = amountKsh(bill.amountKsh);
      const paidKsh = (Array.isArray(bill.payments) ? bill.payments : []).reduce(
        (sum, payment) => sum + amountKsh(payment.amountKsh),
        0
      );

      if (paidKsh > billAmountKsh && billAmountKsh >= 0) {
        overappliedBills.push({
          houseNumber,
          utilityType: String(bill.utilityType ?? "unknown"),
          billingMonth: toBillingMonth(bill.billingMonth),
          amountKsh: billAmountKsh,
          balanceKsh: amountKsh(bill.balanceKsh),
          paidKsh,
          paymentCount: Array.isArray(bill.payments) ? bill.payments.length : 0
        });
      }
    }

    if (!knownHouses.has(houseNumber)) {
      orphanHouses.push({
        houseNumber,
        utilityOutstandingKsh,
        displayedOutstandingKsh,
        knownToBuilding: false
      });
    }

    void housePayments;
  }

  const totals = rows.reduce(
    (summary, row) => {
      summary.displayedOutstandingKsh += row.displayedOutstandingKsh;
      summary.utilityOutstandingKsh += row.utilityOutstandingKsh;
      summary.expenseChargesKsh += row.expenseChargesKsh;
      summary.estimatedRecurringBackfillKsh += row.estimatedRecurringBackfillKsh;
      summary.projectedOutstandingKsh += row.projectedOutstandingKsh;
      return summary;
    },
    {
      displayedOutstandingKsh: 0,
      utilityOutstandingKsh: 0,
      expenseChargesKsh: 0,
      estimatedRecurringBackfillKsh: 0,
      projectedOutstandingKsh: 0
    }
  );

  const flaggedRooms = rows.filter(
    (row) =>
      row.expenseChargesKsh > 0 ||
      row.possibleMissingBillingMonths.length > 0 ||
      row.projectedOutstandingKsh !== row.displayedOutstandingKsh
  );

  const payload = {
    building: {
      id: buildingId,
      name: building.name ?? buildingId
    },
    visibleThroughMonth,
    totals: {
      ...totals,
      understatedByKsh: totals.projectedOutstandingKsh - totals.displayedOutstandingKsh
    },
    flaggedRooms,
    overappliedBills,
    orphanHouses
  };

  if (outputJson) {
    console.log(JSON.stringify(payload, null, 2));
    return;
  }

  console.log(`${payload.building.name} (${payload.building.id})`);
  console.log(`Visible through billing month: ${visibleThroughMonth}`);
  console.log(
    `Displayed outstanding ${formatCurrency(
      totals.displayedOutstandingKsh
    )} -> projected ${formatCurrency(payload.totals.projectedOutstandingKsh)}`
  );
  console.log(
    `Utility ${formatCurrency(totals.utilityOutstandingKsh)} • room charges ${formatCurrency(
      totals.expenseChargesKsh
    )} • estimated recurring backfill ${formatCurrency(
      totals.estimatedRecurringBackfillKsh
    )} • understated by ${formatCurrency(payload.totals.understatedByKsh)}`
  );
  console.log("");
  console.log("Flagged rooms:");

  if (flaggedRooms.length === 0) {
    console.log("  none");
  } else {
    for (const row of flaggedRooms) {
      const missingMonthsLabel =
        row.possibleMissingBillingMonths.length > 0
          ? row.possibleMissingBillingMonths.join(", ")
          : "-";
      console.log(
        `  ${row.houseNumber}: shown ${formatCurrency(
          row.displayedOutstandingKsh
        )}, projected ${formatCurrency(row.projectedOutstandingKsh)}, latest ${
          row.latestPostedBillingMonth ?? "-"
        }, missing ${missingMonthsLabel}, charges ${formatCurrency(row.expenseChargesKsh)}`
      );
    }
  }

  console.log("");
  console.log("Over-applied bills:");
  if (overappliedBills.length === 0) {
    console.log("  none");
  } else {
    for (const item of overappliedBills) {
      console.log(
        `  ${item.houseNumber} ${item.utilityType} ${item.billingMonth}: amount ${formatCurrency(
          item.amountKsh
        )}, paid ${formatCurrency(item.paidKsh)}, balance ${formatCurrency(
          item.balanceKsh
        )}, payments ${item.paymentCount}`
      );
    }
  }

  console.log("");
  console.log("Orphan room data:");
  if (orphanHouses.length === 0) {
    console.log("  none");
  } else {
    for (const item of orphanHouses) {
      console.log(
        `  ${item.houseNumber}: shown ${formatCurrency(
          item.displayedOutstandingKsh
        )}, utility ${formatCurrency(item.utilityOutstandingKsh)}`
      );
    }
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
});
