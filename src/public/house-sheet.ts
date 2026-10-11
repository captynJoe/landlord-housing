// Excel (.xlsx) and CSV import/export for a building's houses, tenants and rent.
// No dependencies: .xlsx files are written as stored (uncompressed) zips and read with
// the browser's DecompressionStream, so this runs in the landlord page and in tests.

export type SheetCell = string | number | null | undefined;

export type HouseSheetRow = {
  line: number;
  houseNumber: string;
  fullName: string;
  phoneNumber: string;
  identityNumber: string;
  monthlyRentKsh: number | null;
  depositKsh: number | null;
  waterMeterNumber: string;
  electricityMeterNumber: string;
  moveInDate: string;
};

export type HouseSheetExportRow = {
  houseNumber: string;
  residentName?: string | null;
  residentPhone?: string | null;
  identityNumber?: string | null;
  monthlyRentKsh?: number | null;
  depositKsh?: number | null;
  waterMeterNumber?: string | null;
  electricityMeterNumber?: string | null;
  balanceKsh?: number | null;
};

export const HOUSE_SHEET_HEADERS = [
  "House No.",
  "Tenant",
  "Phone",
  "ID No.",
  "Monthly Rent",
  "Deposit",
  "Water Meter",
  "Electricity Meter",
  "Move-in Date",
  "Balance"
];

type Field = Exclude<keyof HouseSheetRow, "line"> | "balance";

const HEADER_ALIASES: Record<Field, string[]> = {
  houseNumber: [
    "houseno", "house", "housenumber", "hseno", "hse", "room", "roomno", "roomnumber",
    "unit", "unitno", "unitnumber", "door", "doorno", "apartment", "flat", "flatno"
  ],
  fullName: ["tenant", "tenantname", "name", "fullname", "resident", "residentname", "occupant"],
  phoneNumber: [
    "phone", "phoneno", "phonenumber", "mobile", "mobileno", "tel", "telephone", "contact",
    "tenantphone"
  ],
  identityNumber: ["idno", "id", "idnumber", "nationalid", "nationalidno", "passport", "passportno"],
  monthlyRentKsh: ["monthlyrent", "rent", "rentksh", "monthlyrentksh", "rentamount", "rentpermonth"],
  depositKsh: ["deposit", "depositksh", "depositamount"],
  waterMeterNumber: ["watermeter", "watermeterno", "watermeternumber", "water"],
  electricityMeterNumber: [
    "electricitymeter", "electricitymeterno", "electricitymeternumber", "electricity", "kplc",
    "kplcmeter", "kplcmeterno", "power", "powermeter", "tokenmeter"
  ],
  moveInDate: [
    "moveindate", "movein", "leasestart", "leasestartdate", "startdate", "billingstart",
    "billingstartdate", "datemovedin"
  ],
  balance: ["balance", "balanceksh", "arrears"]
};

const headerKey = (value: SheetCell) =>
  String(value ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");

function fieldForHeader(value: SheetCell): Field | null {
  const key = headerKey(value);
  if (!key) {
    return null;
  }
  for (const [field, aliases] of Object.entries(HEADER_ALIASES) as [Field, string[]][]) {
    if (aliases.includes(key)) {
      return field;
    }
  }
  return null;
}

const cellText = (value: SheetCell) =>
  value == null ? "" : String(value).replace(/\s+/g, " ").trim();

export function normalizeSheetHouse(value: SheetCell): string {
  return cellText(value).toUpperCase();
}

export function parseSheetAmount(value: SheetCell): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? Math.round(value) : null;
  }
  const text = cellText(value).replace(/ksh\.?|kes|\/=|,|\s/gi, "");
  if (!text || text === "-") {
    return null;
  }
  const amount = Number(text);
  return Number.isFinite(amount) ? Math.round(amount) : null;
}

// Excel drops the leading 0 of numbers typed as 0712345678.
export function normalizeSheetPhone(value: SheetCell): string {
  const digits = cellText(value).replace(/[^\d]/g, "");
  if (/^[71]\d{8}$/.test(digits)) {
    return `0${digits}`;
  }
  if (/^0[71]\d{8}$/.test(digits)) {
    return digits;
  }
  if (/^254[71]\d{8}$/.test(digits)) {
    return `0${digits.slice(3)}`;
  }
  return cellText(value);
}

export function isKenyanPhone(value: string): boolean {
  return /^(?:\+254|254|0)(?:7\d{8}|1\d{8})$/.test(value);
}

const pad = (value: number) => String(value).padStart(2, "0");

// Excel dates arrive as serial day numbers; typed dates as day/month/year text.
export function parseSheetDate(value: SheetCell): string {
  if (typeof value === "number" && value > 20000 && value < 80000) {
    const date = new Date(Math.round((value - 25569) * 86400000));
    return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
  }
  const text = cellText(value);
  if (/^\d{4}-\d{2}-\d{2}/.test(text)) {
    return text.slice(0, 10);
  }
  const dmy = text.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  if (dmy) {
    return `${dmy[3]}-${pad(Number(dmy[2]))}-${pad(Number(dmy[1]))}`;
  }
  if (/^\d{5}(\.\d+)?$/.test(text)) {
    return parseSheetDate(Number(text));
  }
  return "";
}

const sheetIdentity = (value: SheetCell) =>
  typeof value === "number" ? String(Math.round(value)) : cellText(value);

export function parseHouseSheet(table: SheetCell[][]): {
  rows: HouseSheetRow[];
  errors: string[];
} {
  const headerIndex = table
    .slice(0, 10)
    .findIndex((row) => row.some((cell) => fieldForHeader(cell) === "houseNumber"));
  if (headerIndex < 0) {
    return { rows: [], errors: ["No House No. column found."] };
  }

  const columns = new Map<Field, number>();
  table[headerIndex].forEach((cell, index) => {
    const field = fieldForHeader(cell);
    if (field && !columns.has(field)) {
      columns.set(field, index);
    }
  });
  const read = (row: SheetCell[], field: Field): SheetCell => {
    const index = columns.get(field);
    return index == null ? null : row[index];
  };

  const rows: HouseSheetRow[] = [];
  const errors: string[] = [];
  const seen = new Set<string>();
  table.slice(headerIndex + 1).forEach((row, offset) => {
    const line = headerIndex + offset + 2;
    const houseNumber = normalizeSheetHouse(read(row, "houseNumber"));
    if (!houseNumber) {
      if (row.some((cell) => cellText(cell))) {
        errors.push(`Row ${line}: no house number.`);
      }
      return;
    }
    if (houseNumber.length > 24) {
      errors.push(`Row ${line}: house number ${houseNumber} is too long.`);
      return;
    }
    if (seen.has(houseNumber)) {
      errors.push(`Row ${line}: house ${houseNumber} is listed twice.`);
      return;
    }
    seen.add(houseNumber);
    rows.push({
      line,
      houseNumber,
      fullName: cellText(read(row, "fullName")),
      phoneNumber: normalizeSheetPhone(read(row, "phoneNumber")),
      identityNumber: sheetIdentity(read(row, "identityNumber")),
      monthlyRentKsh: parseSheetAmount(read(row, "monthlyRentKsh")),
      depositKsh: parseSheetAmount(read(row, "depositKsh")),
      waterMeterNumber: sheetIdentity(read(row, "waterMeterNumber")),
      electricityMeterNumber: sheetIdentity(read(row, "electricityMeterNumber")),
      moveInDate: parseSheetDate(read(row, "moveInDate"))
    });
  });
  return { rows, errors };
}

export type HouseSheetCurrent = {
  houseNumbers: string[];
  occupiedHouseNumbers: string[];
};

export type HouseSheetTenant = {
  line: number;
  houseNumber: string;
  fullName: string;
  phoneNumber: string;
  identityNumber: string;
  moveInDate: string;
  monthlyRentKsh: number | null;
  depositKsh: number | null;
};

export type HouseSheetPlan = {
  newHouseNumbers: string[];
  rent: Array<{ houseNumber: string; monthlyRentKsh: number | null; depositKsh: number | null }>;
  meters: Array<{ houseNumber: string; waterMeterNumber?: string; electricityMeterNumber?: string }>;
  tenants: HouseSheetTenant[];
  skipped: string[];
};

export function planHouseSheetImport(
  rows: HouseSheetRow[],
  current: HouseSheetCurrent,
  options: { requireIdentityNumber: boolean }
): HouseSheetPlan {
  const existing = new Set(current.houseNumbers.map(normalizeSheetHouse));
  const occupied = new Set(current.occupiedHouseNumbers.map(normalizeSheetHouse));
  const plan: HouseSheetPlan = { newHouseNumbers: [], rent: [], meters: [], tenants: [], skipped: [] };

  for (const row of rows) {
    if (!existing.has(row.houseNumber)) {
      plan.newHouseNumbers.push(row.houseNumber);
    }
    if (row.monthlyRentKsh != null || row.depositKsh != null) {
      plan.rent.push({
        houseNumber: row.houseNumber,
        monthlyRentKsh: row.monthlyRentKsh,
        depositKsh: row.depositKsh
      });
    }
    if (row.waterMeterNumber || row.electricityMeterNumber) {
      plan.meters.push({
        houseNumber: row.houseNumber,
        ...(row.waterMeterNumber ? { waterMeterNumber: row.waterMeterNumber } : {}),
        ...(row.electricityMeterNumber ? { electricityMeterNumber: row.electricityMeterNumber } : {})
      });
    }

    const hasTenant = Boolean(row.fullName || row.phoneNumber || row.identityNumber);
    if (!hasTenant || occupied.has(row.houseNumber)) {
      continue;
    }
    const missing = [
      row.fullName ? "" : "name",
      isKenyanPhone(row.phoneNumber) ? "" : row.phoneNumber ? "valid phone" : "phone",
      !options.requireIdentityNumber || row.identityNumber.length >= 4 ? "" : "ID number"
    ].filter(Boolean);
    if (missing.length > 0) {
      plan.skipped.push(`House ${row.houseNumber}: tenant needs ${missing.join(", ")}.`);
      continue;
    }
    plan.tenants.push({
      line: row.line,
      houseNumber: row.houseNumber,
      fullName: row.fullName,
      phoneNumber: row.phoneNumber,
      identityNumber: row.identityNumber,
      moveInDate: row.moveInDate,
      monthlyRentKsh: row.monthlyRentKsh,
      depositKsh: row.depositKsh
    });
  }
  return plan;
}

export function describeHouseSheetPlan(plan: HouseSheetPlan): string[] {
  const count = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;
  return [
    plan.newHouseNumbers.length ? `Add ${count(plan.newHouseNumbers.length, "house")}` : "",
    plan.rent.length ? `Set rent on ${count(plan.rent.length, "house")}` : "",
    plan.meters.length ? `Set meters on ${count(plan.meters.length, "house")}` : "",
    plan.tenants.length ? `Add ${count(plan.tenants.length, "tenant")}` : ""
  ].filter(Boolean);
}

export function houseSheetTable(rows: HouseSheetExportRow[]): SheetCell[][] {
  const amount = (value: number | null | undefined) =>
    value == null || !Number.isFinite(Number(value)) ? null : Math.round(Number(value));
  return [
    HOUSE_SHEET_HEADERS,
    ...rows.map((row) => [
      row.houseNumber,
      row.residentName ?? "",
      row.residentPhone ?? "",
      row.identityNumber ?? "",
      amount(row.monthlyRentKsh),
      amount(row.depositKsh),
      row.waterMeterNumber ?? "",
      row.electricityMeterNumber ?? "",
      "",
      amount(row.balanceKsh)
    ])
  ];
}

// ---- talking to the landlord API ------------------------------------------------

type ApiRecord = Record<string, unknown>;
export type HouseSheetApi = (
  path: string,
  init?: { method: string; body: unknown }
) => Promise<{ data?: unknown } & ApiRecord>;
export type TenantMode = "direct" | "draft";

const optionalWhole = (value: unknown): number | null => {
  if (value == null || value === "") {
    return null;
  }
  const number = Number(value);
  return Number.isFinite(number) ? Math.round(number) : null;
};

const UNSET_METERS = /^(NO-METER|METER-UNSET)$/i;
const meterText = (value: unknown) => {
  const text = String(value ?? "").trim();
  return UNSET_METERS.test(text) ? "" : text;
};

export function houseSheetRowsFromRegistry(rows: ApiRecord[]): HouseSheetExportRow[] {
  return rows.map((row) => ({
    houseNumber: String(row.houseNumber ?? ""),
    residentName: row.hasActiveResident ? String(row.residentName ?? "") : "",
    residentPhone: row.hasActiveResident ? String(row.residentPhone ?? "") : "",
    identityNumber: row.hasActiveResident ? String(row.identityNumber ?? "") : "",
    monthlyRentKsh: optionalWhole(row.configuredMonthlyRentKsh ?? row.monthlyRentKsh),
    depositKsh: optionalWhole(row.depositKsh),
    waterMeterNumber: meterText(row.waterMeterNumber),
    electricityMeterNumber: meterText(row.electricityMeterNumber),
    balanceKsh: optionalWhole(row.roomBalanceKsh)
  }));
}

// The rent setup sheet is saved whole, so every house keeps its current values and only
// houses whose rent or deposit differ from the sheet get the imported numbers.
export function buildRentSheetImportPayload(
  sheet: ApiRecord,
  updates: HouseSheetPlan["rent"]
): { payload: ApiRecord; changed: number } {
  const updatesByHouse = new Map(updates.map((item) => [normalizeSheetHouse(item.houseNumber), item]));
  let changed = 0;
  const rows = (Array.isArray(sheet.rows) ? (sheet.rows as ApiRecord[]) : []).map((item) => {
    const houseNumber = normalizeSheetHouse(item.houseNumber as string);
    const currentRent = optionalWhole(item.roomDefaultMonthlyRentKsh);
    const resolvedRent = optionalWhole(item.resolvedMonthlyRentKsh ?? item.monthlyRentKsh);
    const currentDeposit = (optionalWhole(item.depositKsh) ?? 0) > 0 ? optionalWhole(item.depositKsh) : null;
    const update = updatesByHouse.get(houseNumber);
    const rentChanged = update?.monthlyRentKsh != null && update.monthlyRentKsh !== resolvedRent;
    const depositChanged = update?.depositKsh != null && update.depositKsh !== currentDeposit;
    if (rentChanged || depositChanged) {
      changed += 1;
    }
    return {
      houseNumber,
      monthlyRentKsh: rentChanged ? update!.monthlyRentKsh : currentRent,
      depositKsh: depositChanged ? update!.depositKsh : currentDeposit,
      currentMonthPaidKsh: null,
      paymentDueDay: optionalWhole(item.roomDefaultDueDay),
      graceDays: optionalWhole(item.roomDefaultGraceDays),
      active: item.roomDefaultActive !== false
    };
  });
  return {
    changed,
    payload: {
      buildingDefaultMonthlyRentKsh: optionalWhole(sheet.buildingDefaultMonthlyRentKsh),
      buildingDefaultDepositKsh: optionalWhole(sheet.buildingDefaultDepositKsh),
      buildingDefaultDueDay: optionalWhole(sheet.buildingDefaultDueDay),
      buildingDefaultGraceDays: optionalWhole(sheet.buildingDefaultGraceDays) ?? 0,
      chargeStartDate: String(sheet.chargeStartDate ?? "").trim() || null,
      rows
    }
  };
}

export function changedMeters(
  meters: HouseSheetPlan["meters"],
  registryRows: ApiRecord[]
): HouseSheetPlan["meters"] {
  const current = new Map(
    registryRows.map((row) => [normalizeSheetHouse(row.houseNumber as string), row])
  );
  return meters
    .map((item) => {
      const row = current.get(item.houseNumber);
      const water =
        item.waterMeterNumber && item.waterMeterNumber !== meterText(row?.waterMeterNumber)
          ? item.waterMeterNumber
          : undefined;
      const electricity =
        item.electricityMeterNumber &&
        item.electricityMeterNumber !== meterText(row?.electricityMeterNumber)
          ? item.electricityMeterNumber
          : undefined;
      return {
        houseNumber: item.houseNumber,
        ...(water ? { waterMeterNumber: water } : {}),
        ...(electricity ? { electricityMeterNumber: electricity } : {})
      };
    })
    .filter((item) => item.waterMeterNumber || item.electricityMeterNumber);
}

const errorText = (error: unknown) => (error instanceof Error ? error.message : String(error));

export async function prepareHouseSheetImport(
  api: HouseSheetApi,
  buildingId: string,
  rows: HouseSheetRow[],
  tenantMode: TenantMode
): Promise<HouseSheetPlan> {
  const building = encodeURIComponent(buildingId);
  const [registry, sheet] = await Promise.all([
    api(`/api/landlord/buildings/${building}/utility-registry`),
    api(`/api/landlord/buildings/${building}/rent-setup-sheet`).catch(() => ({ data: {} }))
  ]);
  const registryRows = Array.isArray(registry.data) ? (registry.data as ApiRecord[]) : [];
  const plan = planHouseSheetImport(
    rows,
    {
      houseNumbers: registryRows.map((row) => String(row.houseNumber ?? "")),
      occupiedHouseNumbers: registryRows
        .filter((row) => row.hasActiveResident)
        .map((row) => String(row.houseNumber ?? ""))
    },
    { requireIdentityNumber: tenantMode === "direct" }
  );
  plan.meters = changedMeters(plan.meters, registryRows);
  const existingRent = plan.rent.filter((item) =>
    registryRows.some((row) => normalizeSheetHouse(row.houseNumber as string) === item.houseNumber)
  );
  const newRent = plan.rent.filter((item) => !existingRent.includes(item));
  const sheetData = (sheet.data ?? {}) as ApiRecord;
  const unchanged = new Set(
    existingRent
      .filter((item) => buildRentSheetImportPayload(sheetData, [item]).changed === 0)
      .map((item) => item.houseNumber)
  );
  plan.rent = [...existingRent.filter((item) => !unchanged.has(item.houseNumber)), ...newRent];
  return plan;
}

export async function applyHouseSheetImport(
  api: HouseSheetApi,
  buildingId: string,
  plan: HouseSheetPlan,
  tenantMode: TenantMode,
  today: string
): Promise<{ done: string[]; failed: string[] }> {
  const building = encodeURIComponent(buildingId);
  const done: string[] = [];
  const failed: string[] = [];

  for (let i = 0; i < plan.newHouseNumbers.length; i += 1000) {
    const houseNumbers = plan.newHouseNumbers.slice(i, i + 1000);
    await api(`/api/landlord/buildings/${building}/houses`, {
      method: "POST",
      body: { houseNumbers }
    });
  }
  if (plan.newHouseNumbers.length) {
    done.push(`${plan.newHouseNumbers.length} added`);
  }

  if (plan.rent.length) {
    try {
      const sheet = await api(`/api/landlord/buildings/${building}/rent-setup-sheet`);
      const { payload, changed } = buildRentSheetImportPayload(
        (sheet.data ?? {}) as ApiRecord,
        plan.rent
      );
      if (changed > 0) {
        await api(`/api/landlord/buildings/${building}/rent-setup-sheet`, {
          method: "PUT",
          body: payload
        });
        done.push(`rent set on ${changed}`);
      }
    } catch (error) {
      failed.push(`Rent: ${errorText(error)}`);
    }
  }

  if (plan.meters.length) {
    try {
      await api(`/api/landlord/buildings/${building}/utility-registry`, {
        method: "PUT",
        body: { rows: plan.meters }
      });
      done.push(`meters set on ${plan.meters.length}`);
    } catch (error) {
      failed.push(`Meters: ${errorText(error)}`);
    }
  }

  let tenantsAdded = 0;
  for (const tenant of plan.tenants) {
    try {
      if (tenantMode === "direct") {
        await api("/api/landlord/residents/direct", {
          method: "POST",
          body: {
            buildingId,
            houseNumber: tenant.houseNumber,
            fullName: tenant.fullName,
            phoneNumber: tenant.phoneNumber,
            identityType: "national_id",
            identityNumber: tenant.identityNumber,
            billingStartDate: tenant.moveInDate || today
          }
        });
      } else {
        await api("/api/landlord/tenant-agreement-drafts", {
          method: "POST",
          body: {
            buildingId,
            houseNumber: tenant.houseNumber,
            fullName: tenant.fullName,
            phoneNumber: tenant.phoneNumber,
            ...(tenant.identityNumber
              ? { identityType: "national_id", identityNumber: tenant.identityNumber }
              : {}),
            ...(tenant.moveInDate ? { leaseStartDate: tenant.moveInDate } : {}),
            ...(tenant.monthlyRentKsh != null ? { monthlyRentKsh: tenant.monthlyRentKsh } : {}),
            ...(tenant.depositKsh != null ? { depositKsh: tenant.depositKsh } : {})
          }
        });
      }
      tenantsAdded += 1;
    } catch (error) {
      failed.push(`House ${tenant.houseNumber}: ${errorText(error)}`);
    }
  }
  if (tenantsAdded) {
    done.push(
      `${tenantsAdded} tenant${tenantsAdded === 1 ? "" : "s"} ${
        tenantMode === "direct" ? "added" : "saved as drafts"
      }`
    );
  }
  return { done, failed };
}

// ---- .xlsx writing -------------------------------------------------------------

const encoder = new TextEncoder();
const decoder = new TextDecoder();

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function zipStored(files: Array<{ name: string; data: Uint8Array }>): Uint8Array {
  const parts: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;
  for (const file of files) {
    const name = encoder.encode(file.name);
    const crc = crc32(file.data);
    const local = new DataView(new ArrayBuffer(30));
    local.setUint32(0, 0x04034b50, true);
    local.setUint16(4, 20, true);
    local.setUint16(6, 0x0800, true);
    local.setUint32(14, crc, true);
    local.setUint32(18, file.data.length, true);
    local.setUint32(22, file.data.length, true);
    local.setUint16(26, name.length, true);
    parts.push(new Uint8Array(local.buffer), name, file.data);

    const entry = new DataView(new ArrayBuffer(46));
    entry.setUint32(0, 0x02014b50, true);
    entry.setUint16(4, 20, true);
    entry.setUint16(6, 20, true);
    entry.setUint16(8, 0x0800, true);
    entry.setUint32(16, crc, true);
    entry.setUint32(20, file.data.length, true);
    entry.setUint32(24, file.data.length, true);
    entry.setUint16(28, name.length, true);
    entry.setUint32(42, offset, true);
    central.push(new Uint8Array(entry.buffer), name);
    offset += 30 + name.length + file.data.length;
  }
  const centralSize = central.reduce((sum, part) => sum + part.length, 0);
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true);
  end.setUint16(8, files.length, true);
  end.setUint16(10, files.length, true);
  end.setUint32(12, centralSize, true);
  end.setUint32(16, offset, true);
  const all = [...parts, ...central, new Uint8Array(end.buffer)];
  const out = new Uint8Array(all.reduce((sum, part) => sum + part.length, 0));
  let cursor = 0;
  for (const part of all) {
    out.set(part, cursor);
    cursor += part.length;
  }
  return out;
}

const escapeXml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "");

function columnName(index: number): string {
  let name = "";
  let n = index + 1;
  while (n > 0) {
    const rem = (n - 1) % 26;
    name = String.fromCharCode(65 + rem) + name;
    n = Math.floor((n - 1) / 26);
  }
  return name;
}

export function buildXlsx(sheetName: string, table: SheetCell[][]): Uint8Array {
  const safeName = escapeXml(sheetName.replace(/[\\/?*[\]:]/g, " ").slice(0, 31) || "Sheet1");
  const widths = (table[0] ?? []).map((_, col) =>
    Math.min(40, Math.max(10, ...table.map((row) => cellText(row[col]).length + 2)))
  );
  const sheetRows = table
    .map((row, rowIndex) => {
      const cells = row
        .map((value, colIndex) => {
          const ref = `${columnName(colIndex)}${rowIndex + 1}`;
          const style = rowIndex === 0 ? ' s="1"' : "";
          if (typeof value === "number" && Number.isFinite(value)) {
            return `<c r="${ref}"${style}><v>${value}</v></c>`;
          }
          const text = cellText(value);
          return text
            ? `<c r="${ref}"${style} t="inlineStr"><is><t>${escapeXml(text)}</t></is></c>`
            : "";
        })
        .join("");
      return `<row r="${rowIndex + 1}">${cells}</row>`;
    })
    .join("");
  const cols = widths.length
    ? `<cols>${widths
        .map((width, i) => `<col min="${i + 1}" max="${i + 1}" width="${width}" customWidth="1"/>`)
        .join("")}</cols>`
    : "";
  const xml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
  const files: Record<string, string> = {
    "[Content_Types].xml": `${xml}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`,
    "_rels/.rels": `${xml}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
    "xl/workbook.xml": `${xml}<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${safeName}" sheetId="1" r:id="rId1"/></sheets></workbook>`,
    "xl/_rels/workbook.xml.rels": `${xml}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`,
    "xl/styles.xml": `${xml}<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`,
    "xl/worksheets/sheet1.xml": `${xml}<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>${cols}<sheetData>${sheetRows}</sheetData></worksheet>`
  };
  return zipStored(
    Object.entries(files).map(([name, text]) => ({ name, data: encoder.encode(text) }))
  );
}

// ---- reading .xlsx / .csv ------------------------------------------------------

async function inflateRaw(bytes: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([new Uint8Array(bytes)]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function unzip(bytes: Uint8Array): Promise<Map<string, Uint8Array>> {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let end = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i -= 1) {
    if (view.getUint32(i, true) === 0x06054b50) {
      end = i;
      break;
    }
  }
  if (end < 0) {
    throw new Error("This file is not a valid .xlsx workbook.");
  }
  const count = view.getUint16(end + 10, true);
  let cursor = view.getUint32(end + 16, true);
  const files = new Map<string, Uint8Array>();
  for (let i = 0; i < count; i += 1) {
    if (view.getUint32(cursor, true) !== 0x02014b50) {
      throw new Error("This file is not a valid .xlsx workbook.");
    }
    const method = view.getUint16(cursor + 10, true);
    const compressedSize = view.getUint32(cursor + 20, true);
    const nameLength = view.getUint16(cursor + 28, true);
    const extraLength = view.getUint16(cursor + 30, true);
    const commentLength = view.getUint16(cursor + 32, true);
    const localOffset = view.getUint32(cursor + 42, true);
    const name = decoder.decode(bytes.subarray(cursor + 46, cursor + 46 + nameLength));
    cursor += 46 + nameLength + extraLength + commentLength;
    if (!name.startsWith("xl/")) {
      continue;
    }
    const dataStart =
      localOffset +
      30 +
      view.getUint16(localOffset + 26, true) +
      view.getUint16(localOffset + 28, true);
    const raw = bytes.subarray(dataStart, dataStart + compressedSize);
    if (method === 0) {
      files.set(name, raw);
    } else if (method === 8) {
      files.set(name, await inflateRaw(raw));
    }
  }
  return files;
}

const decodeXml = (value: string) =>
  value
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number(dec)))
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");

const textRuns = (xml: string) =>
  [...xml.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)].map((m) => decodeXml(m[1])).join("");

const columnIndex = (ref: string) =>
  [...ref.replace(/\d+$/, "")].reduce((sum, ch) => sum * 26 + ch.charCodeAt(0) - 64, 0) - 1;

async function readXlsx(bytes: Uint8Array): Promise<SheetCell[][]> {
  const files = await unzip(bytes);
  const text = (name: string) => {
    const data = files.get(name);
    return data ? decoder.decode(data) : "";
  };
  const workbook = text("xl/workbook.xml");
  const firstSheetId = workbook.match(/<sheet\b[^>]*\br:id="([^"]+)"/)?.[1] ?? "";
  const rels = text("xl/_rels/workbook.xml.rels");
  const target = [...rels.matchAll(/<Relationship\b[^>]*>/g)]
    .map((m) => m[0])
    .find((tag) => tag.includes(`Id="${firstSheetId}"`))
    ?.match(/Target="([^"]+)"/)?.[1];
  const sheetPath = target
    ? target.startsWith("/")
      ? target.slice(1)
      : `xl/${target}`
    : "xl/worksheets/sheet1.xml";
  const sheet = text(sheetPath) || text("xl/worksheets/sheet1.xml");
  if (!sheet) {
    throw new Error("No sheet found in this workbook.");
  }
  const shared = [...text("xl/sharedStrings.xml").matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) =>
    textRuns(m[1])
  );

  const table: SheetCell[][] = [];
  for (const rowMatch of sheet.matchAll(/<row\b([^>]*?)(?:\/>|>([\s\S]*?)<\/row>)/g)) {
    const rowNumber = Number(rowMatch[1].match(/\br="(\d+)"/)?.[1] ?? table.length + 1);
    const row: SheetCell[] = [];
    let nextColumn = 0;
    for (const cell of (rowMatch[2] ?? "").matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const attrs = cell[1];
      const body = cell[2] ?? "";
      const ref = attrs.match(/\br="([A-Z]+\d*)"/)?.[1];
      const col = ref ? columnIndex(ref) : nextColumn;
      nextColumn = col + 1;
      const type = attrs.match(/\bt="(\w+)"/)?.[1] ?? "n";
      const raw = body.match(/<v>([\s\S]*?)<\/v>/)?.[1];
      let value: SheetCell = null;
      if (type === "s") {
        value = raw == null ? null : shared[Number(raw)] ?? null;
      } else if (type === "inlineStr") {
        value = textRuns(body);
      } else if (type === "str" || type === "e") {
        value = raw == null ? null : decodeXml(raw);
      } else if (type === "b") {
        value = raw === "1" ? "TRUE" : "FALSE";
      } else if (raw != null) {
        const number = Number(raw);
        value = Number.isFinite(number) ? number : decodeXml(raw);
      }
      row[col] = value;
    }
    table[rowNumber - 1] = row;
  }
  return Array.from(table, (row) => (row ? Array.from(row, (cell) => cell ?? null) : []));
}

export function parseCsv(text: string): SheetCell[][] {
  const source = text.replace(/^﻿/, "");
  const firstLine = source.split(/\r?\n/, 1)[0] ?? "";
  const delimiter = [",", ";", "\t"].reduce((best, candidate) =>
    firstLine.split(candidate).length > firstLine.split(best).length ? candidate : best
  );
  const rows: SheetCell[][] = [];
  let row: SheetCell[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < source.length; i += 1) {
    const ch = source[i];
    if (quoted) {
      if (ch === '"' && source[i + 1] === '"') {
        cell += '"';
        i += 1;
      } else if (ch === '"') {
        quoted = false;
      } else {
        cell += ch;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === delimiter) {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && source[i + 1] === "\n") {
        i += 1;
      }
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += ch;
    }
  }
  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

export async function readSpreadsheet(bytes: Uint8Array, fileName: string): Promise<SheetCell[][]> {
  const isZip = bytes[0] === 0x50 && bytes[1] === 0x4b;
  if (isZip) {
    return readXlsx(bytes);
  }
  if (bytes[0] === 0xd0 && bytes[1] === 0xcf) {
    throw new Error("Old .xls files are not supported. In Excel, use Save As → .xlsx.");
  }
  if (/\.(xlsx|xlsm)$/i.test(fileName)) {
    throw new Error("This file is not a valid .xlsx workbook.");
  }
  return parseCsv(decoder.decode(bytes));
}
