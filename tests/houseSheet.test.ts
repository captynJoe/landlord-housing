import assert from "node:assert/strict";
import test from "node:test";
import { deflateRawSync } from "node:zlib";
import {
  applyHouseSheetImport,
  buildRentSheetImportPayload,
  buildXlsx,
  changedMeters,
  describeHouseSheetPlan,
  houseSheetTable,
  parseCsv,
  parseHouseSheet,
  parseSheetDate,
  planHouseSheetImport,
  prepareHouseSheetImport,
  readSpreadsheet
} from "../src/public/house-sheet.js";

// Re-zips stored entries with deflate, the way Excel saves workbooks.
function deflateZip(stored: Uint8Array): Uint8Array {
  const view = new DataView(stored.buffer, stored.byteOffset, stored.byteLength);
  const entries: Array<{ name: Buffer; data: Buffer }> = [];
  let cursor = 0;
  while (view.getUint32(cursor, true) === 0x04034b50) {
    const size = view.getUint32(cursor + 18, true);
    const nameLength = view.getUint16(cursor + 26, true);
    const name = Buffer.from(stored.subarray(cursor + 30, cursor + 30 + nameLength));
    const data = Buffer.from(stored.subarray(cursor + 30 + nameLength, cursor + 30 + nameLength + size));
    entries.push({ name, data });
    cursor += 30 + nameLength + size;
  }
  const locals: Buffer[] = [];
  const central: Buffer[] = [];
  let offset = 0;
  for (const entry of entries) {
    const compressed = deflateRawSync(entry.data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(8, 8);
    local.writeUInt32LE(compressed.length, 18);
    local.writeUInt32LE(entry.data.length, 22);
    local.writeUInt16LE(entry.name.length, 26);
    locals.push(local, entry.name, compressed);
    const dir = Buffer.alloc(46);
    dir.writeUInt32LE(0x02014b50, 0);
    dir.writeUInt16LE(8, 10);
    dir.writeUInt32LE(compressed.length, 20);
    dir.writeUInt32LE(entry.data.length, 24);
    dir.writeUInt16LE(entry.name.length, 28);
    dir.writeUInt32LE(offset, 42);
    central.push(dir, entry.name);
    offset += 30 + entry.name.length + compressed.length;
  }
  const centralBuffer = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralBuffer.length, 12);
  end.writeUInt32LE(offset, 16);
  return new Uint8Array(Buffer.concat([...locals, centralBuffer, end]));
}

test("an exported sheet reads back with the same values", async () => {
  const table = houseSheetTable([
    { houseNumber: "A1", residentName: "Jane & Co <x>", residentPhone: "0712345678", monthlyRentKsh: 6500, depositKsh: 6500, waterMeterNumber: "W-1", balanceKsh: 0 },
    { houseNumber: "A2" }
  ]);
  const bytes = buildXlsx("Rosa Flats", table);
  for (const file of [bytes, deflateZip(bytes)]) {
    const read = await readSpreadsheet(file, "houses.xlsx");
    assert.equal(read[0][0], "House No.");
    assert.deepEqual(read[1].slice(0, 7), ["A1", "Jane & Co <x>", "0712345678", null, 6500, 6500, "W-1"]);
    assert.equal(read[2][0], "A2");
  }
});

test("landlord column names and Excel number quirks are understood", () => {
  const { rows, errors } = parseHouseSheet([
    ["Rosa Flats tenants"],
    ["Room No", "Name", "Mobile", "National ID", "Rent (KSh)", "Deposit", "KPLC", "Move in"],
    ["b2", "Mary W", 712345678, 12345678, "KSh 7,000", "", 54321, 46023],
    ["", "", "", "", "", "", "", ""],
    ["B2", "dup", "", "", "", "", "", ""],
    ["", "Orphan", "", "", "", "", "", ""]
  ]);
  assert.deepEqual(errors, ["Row 5: house B2 is listed twice.", "Row 6: no house number."]);
  assert.equal(rows.length, 1);
  assert.deepEqual(rows[0], {
    line: 3,
    houseNumber: "B2",
    fullName: "Mary W",
    phoneNumber: "0712345678",
    identityNumber: "12345678",
    monthlyRentKsh: 7000,
    depositKsh: null,
    waterMeterNumber: "",
    electricityMeterNumber: "54321",
    moveInDate: "2026-01-01"
  });
});

test("a sheet without a house column is rejected", () => {
  assert.deepEqual(parseHouseSheet([["Name", "Phone"]]).errors, ["No House No. column found."]);
});

test("dates in day/month/year order", () => {
  assert.equal(parseSheetDate("5/3/2026"), "2026-03-05");
  assert.equal(parseSheetDate("2026-03-05"), "2026-03-05");
  assert.equal(parseSheetDate("soon"), "");
});

test("the import plan adds missing houses and skips tenants it cannot create", () => {
  const { rows } = parseHouseSheet([
    ["House No.", "Tenant", "Phone", "ID No.", "Monthly Rent", "Water Meter"],
    ["A1", "Already Here", "0711111111", "1111", 5000, ""],
    ["A2", "New Tenant", "0722222222", "22222222", "", "W-2"],
    ["A3", "No Id", "0733333333", "", "", ""],
    ["A4", "Bad Phone", "12345", "44444444", "", ""],
    ["A5", "", "", "", 4000, ""]
  ]);
  const current = { houseNumbers: ["a1", "A2"], occupiedHouseNumbers: ["A1"] };
  const plan = planHouseSheetImport(rows, current, { requireIdentityNumber: true });
  assert.deepEqual(plan.newHouseNumbers, ["A3", "A4", "A5"]);
  assert.deepEqual(plan.rent.map((r) => r.houseNumber), ["A1", "A5"]);
  assert.deepEqual(plan.meters, [{ houseNumber: "A2", waterMeterNumber: "W-2" }]);
  assert.deepEqual(plan.tenants.map((t) => t.houseNumber), ["A2"]);
  assert.deepEqual(plan.skipped, [
    "House A3: tenant needs ID number.",
    "House A4: tenant needs valid phone."
  ]);
  assert.deepEqual(describeHouseSheetPlan(plan), [
    "Add 3 houses",
    "Set rent on 2 houses",
    "Set meters on 1 house",
    "Add 1 tenant"
  ]);

  const drafts = planHouseSheetImport(rows, current, { requireIdentityNumber: false });
  assert.deepEqual(drafts.tenants.map((t) => t.houseNumber), ["A2", "A3"]);
});

test("CSV with quotes and semicolons", async () => {
  assert.deepEqual(parseCsv('House;Name\r\n"A1";"Doe; ""JJ"""\n'), [
    ["House", "Name"],
    ["A1", 'Doe; "JJ"']
  ]);
  const read = await readSpreadsheet(new TextEncoder().encode("House No.,Tenant\nA1,Jo\n"), "x.csv");
  assert.deepEqual(read, [["House No.", "Tenant"], ["A1", "Jo"]]);
  await assert.rejects(
    readSpreadsheet(new Uint8Array([0xd0, 0xcf, 0x11]), "old.xls"),
    /Save As/
  );
});

const SHEET = {
  buildingDefaultMonthlyRentKsh: 5000,
  buildingDefaultDepositKsh: 5000,
  buildingDefaultDueDay: 5,
  buildingDefaultGraceDays: 3,
  chargeStartDate: "2026-01-01",
  rows: [
    { houseNumber: "A1", roomDefaultMonthlyRentKsh: null, resolvedMonthlyRentKsh: 5000, depositKsh: 0, roomDefaultDueDay: null, roomDefaultGraceDays: null, roomDefaultActive: true },
    { houseNumber: "A2", roomDefaultMonthlyRentKsh: 6000, resolvedMonthlyRentKsh: 6000, depositKsh: 6000, roomDefaultDueDay: 10, roomDefaultGraceDays: 2, roomDefaultActive: true },
    { houseNumber: "A3", roomDefaultMonthlyRentKsh: null, resolvedMonthlyRentKsh: 5000, depositKsh: 0, roomDefaultActive: false }
  ]
};

test("the rent sheet is saved whole, with only changed houses updated", () => {
  const { payload, changed } = buildRentSheetImportPayload(SHEET, [
    { houseNumber: "A1", monthlyRentKsh: 5000, depositKsh: null },
    { houseNumber: "A2", monthlyRentKsh: 6500, depositKsh: null }
  ]);
  assert.equal(changed, 1);
  assert.deepEqual(payload, {
    buildingDefaultMonthlyRentKsh: 5000,
    buildingDefaultDepositKsh: 5000,
    buildingDefaultDueDay: 5,
    buildingDefaultGraceDays: 3,
    chargeStartDate: "2026-01-01",
    rows: [
      { houseNumber: "A1", monthlyRentKsh: null, depositKsh: null, currentMonthPaidKsh: null, paymentDueDay: null, graceDays: null, active: true },
      { houseNumber: "A2", monthlyRentKsh: 6500, depositKsh: 6000, currentMonthPaidKsh: null, paymentDueDay: 10, graceDays: 2, active: true },
      { houseNumber: "A3", monthlyRentKsh: null, depositKsh: null, currentMonthPaidKsh: null, paymentDueDay: null, graceDays: null, active: false }
    ]
  });
});

test("meters already on record are not sent again", () => {
  assert.deepEqual(
    changedMeters(
      [
        { houseNumber: "A1", waterMeterNumber: "W-1", electricityMeterNumber: "E-9" },
        { houseNumber: "A2", waterMeterNumber: "W-2" }
      ],
      [
        { houseNumber: "A1", waterMeterNumber: "W-1", electricityMeterNumber: "METER-UNSET" },
        { houseNumber: "A2", waterMeterNumber: "W-2" }
      ]
    ),
    [{ houseNumber: "A1", electricityMeterNumber: "E-9" }]
  );
});

test("an import adds houses, then rent, meters and tenants through the landlord API", async () => {
  const calls: Array<{ path: string; method: string; body?: unknown }> = [];
  const registry = [
    { houseNumber: "A1", hasActiveResident: true, residentName: "Old", waterMeterNumber: "W-1" },
    { houseNumber: "A2", hasActiveResident: false }
  ];
  let houses = ["A1", "A2"];
  const api = async (path: string, init?: { method: string; body: unknown }) => {
    calls.push({ path, method: init?.method ?? "GET", body: init?.body });
    if (path.endsWith("/utility-registry") && !init) {
      return { data: registry };
    }
    if (path.endsWith("/rent-setup-sheet") && !init) {
      return { data: { ...SHEET, rows: houses.map((houseNumber) => ({ houseNumber, resolvedMonthlyRentKsh: 5000 })) } };
    }
    if (path.endsWith("/houses")) {
      houses = [...houses, ...(init!.body as { houseNumbers: string[] }).houseNumbers];
    }
    if (path === "/api/landlord/residents/direct" && (init!.body as { houseNumber: string }).houseNumber === "A3") {
      throw new Error("This house is already occupied.");
    }
    return {};
  };
  const { rows } = parseHouseSheet([
    ["House No.", "Tenant", "Phone", "ID No.", "Monthly Rent", "Water Meter", "Move-in Date"],
    ["A1", "Someone Else", "0711111111", "1111111", 5000, "W-1", ""],
    ["A2", "Ann", "0722222222", "22222222", 5500, "W-2", "2026-02-01"],
    ["A3", "Ben", "0733333333", "33333333", 5000, "", ""]
  ]);
  const plan = await prepareHouseSheetImport(api, "rosa", rows, "direct");
  assert.deepEqual(describeHouseSheetPlan(plan), [
    "Add 1 house",
    "Set rent on 2 houses",
    "Set meters on 1 house",
    "Add 2 tenants"
  ]);

  calls.length = 0;
  const result = await applyHouseSheetImport(api, "rosa", plan, "direct", "2026-10-11");
  assert.deepEqual(
    calls.map((call) => `${call.method} ${call.path}`),
    [
      "POST /api/landlord/buildings/rosa/houses",
      "GET /api/landlord/buildings/rosa/rent-setup-sheet",
      "PUT /api/landlord/buildings/rosa/rent-setup-sheet",
      "PUT /api/landlord/buildings/rosa/utility-registry",
      "POST /api/landlord/residents/direct",
      "POST /api/landlord/residents/direct"
    ]
  );
  const rentRows = (calls[2].body as { rows: Array<{ houseNumber: string; monthlyRentKsh: number | null }> }).rows;
  assert.deepEqual(rentRows.map((row) => [row.houseNumber, row.monthlyRentKsh]), [["A1", null], ["A2", 5500], ["A3", null]]);
  assert.equal((calls[4].body as { billingStartDate: string }).billingStartDate, "2026-02-01");
  assert.deepEqual(result, {
    done: ["1 added", "rent set on 1", "meters set on 1", "1 tenant added"],
    failed: ["House A3: This house is already occupied."]
  });
});
