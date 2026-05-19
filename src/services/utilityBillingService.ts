import { randomUUID } from "node:crypto";
import type {
  CreateUtilityBillInput,
  RecordUtilityPaymentInput,
  UpsertUtilityMeterInput,
  UtilityTypeInput
} from "../validation/schemas.js";

export type UtilityType = UtilityTypeInput;
export const UTILITY_LEGACY_BUILDING_ID = "__LEGACY__";
const UTILITY_BALANCE_VISIBILITY_WINDOW_DAYS = 7;
type UtilityPaymentSource = "manual" | "resident" | "mpesa";

export interface UtilityMeterRecord {
  utilityType: UtilityType;
  buildingId: string;
  houseNumber: string;
  meterNumber: string;
  updatedAt: string;
}

export interface UtilityPaymentEvent {
  id: string;
  utilityType: UtilityType;
  buildingId: string;
  houseNumber: string;
  billingMonth?: string;
  provider: "mpesa" | "cash" | "bank" | "card";
  providerReference?: string;
  amountKsh: number;
  paidAt: string;
  note?: string;
  createdAt: string;
  source?: UtilityPaymentSource;
}

export interface UtilityPaymentAllocation {
  event: UtilityPaymentEvent;
  bill: UtilityBillSnapshot;
  appliedAmountKsh: number;
}

interface UtilityBillRecord {
  id: string;
  utilityType: UtilityType;
  buildingId: string;
  houseNumber: string;
  billingMonth: string;
  meterNumber: string;
  previousReading: number;
  currentReading: number;
  unitsConsumed: number;
  ratePerUnitKsh: number;
  fixedChargeKsh: number;
  amountKsh: number;
  balanceKsh: number;
  dueDate: string;
  note?: string;
  createdAt: string;
  updatedAt: string;
  payments: UtilityPaymentEvent[];
}

export interface UtilityBillSnapshot extends Omit<UtilityBillRecord, "payments"> {
  payments: UtilityPaymentEvent[];
  status: "clear" | "due_soon" | "overdue";
  daysToDue: number;
}

export interface UtilityReadingSnapshot {
  utilityType: UtilityType;
  buildingId: string;
  houseNumber: string;
  billingMonth: string;
  meterNumber: string;
  previousReading: number;
  currentReading: number;
  unitsConsumed: number;
  recordedAt: string;
}

export interface RecordUtilityPaymentResult {
  event: UtilityPaymentEvent;
  bill: UtilityBillSnapshot;
  allocations: UtilityPaymentAllocation[];
  totalAppliedAmountKsh: number;
}

export interface UnrecordUtilityPaymentResult {
  events: UtilityPaymentEvent[];
  allocations: UtilityPaymentAllocation[];
  totalAmountKsh: number;
}

export interface UtilityWriteOffBillResult {
  id: string;
  utilityType: UtilityType;
  billingMonth: string;
  previousBalanceKsh: number;
}

export interface UtilityWriteOffResult {
  buildingId: string;
  houseNumber: string;
  totalWrittenOffKsh: number;
  bills: UtilityWriteOffBillResult[];
}

export interface UtilityPaymentPreview {
  targetBill: UtilityBillSnapshot;
  effectiveBill: UtilityBillSnapshot;
  candidateBills: UtilityBillSnapshot[];
  availableBalanceKsh: number;
  requestedAmountKsh: number;
}

interface UtilityPaymentReferenceIndexEntry {
  events: UtilityPaymentEvent[];
  billIds: string[];
}

export interface UtilityReminderNotification {
  buildingId: string;
  houseNumber: string;
  utilityType: UtilityType;
  billingMonth: string;
  title: string;
  message: string;
  level: "info" | "warning";
  createdAt: string;
  dedupeKey: string;
}

interface ListUtilityBillsOptions {
  utilityType?: UtilityType;
  buildingId?: string;
  houseNumber?: string;
  billingMonth?: string;
  limit?: number;
}

interface ListUtilityPaymentsOptions {
  utilityType?: UtilityType;
  buildingId?: string;
  houseNumber?: string;
  limit?: number;
}

export interface UtilityBillingHoldCheck {
  utilityType: UtilityType;
  buildingId: string;
  houseNumber: string;
  billingMonth: string;
  dueDate: string;
}

type UtilityBillingHoldPredicate = (input: UtilityBillingHoldCheck) => boolean;

export interface UtilityBillingPersistedState {
  meters: UtilityMeterRecord[];
  bills: UtilityBillSnapshot[];
}

export interface UtilityRoomBalanceSummary {
  buildingId: string;
  houseNumber: string;
  currentDueKsh: number;
  arrearsKsh: number;
  totalOpenKsh: number;
  nextDueDate?: string;
}

export interface CombinedUtilityChargeMonthlyAmount {
  buildingId: string;
  billingMonth: string;
  amountKsh: number;
}

export interface CombinedUtilityChargeBuildingAmount {
  buildingId: string;
  amountKsh: number;
}

export interface CombinedUtilityChargeRoomAmount {
  buildingId: string;
  houseNumber: string;
  amountKsh: number;
}

interface ResolvedUtilityPaymentContext {
  normalizedHouse: string;
  candidateBills: UtilityBillRecord[];
  targetBill: UtilityBillRecord;
  effectiveBill: UtilityBillRecord;
  availableBalanceKsh: number;
  requestedAmountKsh: number;
}

type UtilityBillingStateChangeHandler = (
  state: UtilityBillingPersistedState
) => void | Promise<void>;

function nowIso(): string {
  return new Date().toISOString();
}

function normalizeHouseNumber(value: string): string {
  return value.trim().toUpperCase();
}

function normalizeBuildingId(value: string | undefined): string {
  const normalized = String(value ?? "")
    .trim()
    .toUpperCase();
  return normalized || UTILITY_LEGACY_BUILDING_ID;
}

function normalizeProviderReference(value: string): string {
  return value.trim().toUpperCase();
}

function ledgerKey(
  utilityType: UtilityType,
  buildingId: string,
  houseNumber: string
): string {
  return `${utilityType}:${normalizeBuildingId(buildingId)}:${normalizeHouseNumber(
    houseNumber
  )}`;
}

function buildingMatchesScope(
  itemBuildingId: string,
  requestedBuildingId?: string
): boolean {
  if (!requestedBuildingId) {
    return true;
  }

  const normalizedItem = normalizeBuildingId(itemBuildingId);
  const normalizedRequested = normalizeBuildingId(requestedBuildingId);
  return (
    normalizedItem === normalizedRequested ||
    normalizedItem === UTILITY_LEGACY_BUILDING_ID
  );
}

function dayDiff(from: Date, to: Date): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.ceil((to.getTime() - from.getTime()) / msPerDay);
}

function utilityStatus(
  balanceKsh: number,
  daysToDue: number
): UtilityBillSnapshot["status"] {
  if (balanceKsh <= 0) {
    return "clear";
  }

  if (daysToDue < 0) {
    return "overdue";
  }

  return "due_soon";
}

function monthSortAsc(a: string, b: string): number {
  return a.localeCompare(b);
}

function monthSortDesc(a: string, b: string): number {
  return b.localeCompare(a);
}

function shiftBillingMonthLabel(billingMonth: string, offset: number): string | null {
  const match = String(billingMonth ?? "").trim().match(/^(\d{4})-(\d{2})$/);
  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
    return null;
  }

  const shifted = new Date(Date.UTC(year, month - 1 + offset, 1, 0, 0, 0, 0));
  return `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, "0")}`;
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

function subtractUtcDays(value: string, days: number): string | null {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  const copy = new Date(parsed);
  copy.setUTCDate(copy.getUTCDate() - days);
  return copy.toISOString();
}

function isBaselineCutoverBill(record: UtilityBillRecord): boolean {
  return (
    record.amountKsh <= 0 &&
    record.balanceKsh <= 0 &&
    String(record.note ?? "").trim().startsWith("Baseline reading")
  );
}

function isCombinedUtilityFeeRecord(record: UtilityBillRecord): boolean {
  return String(record.note ?? "").trim().startsWith("Combined utility fee");
}

function isRecurringNonMeteredBill(record: UtilityBillRecord): boolean {
  return (
    String(record.meterNumber ?? "").trim().toUpperCase() === "NO-METER" &&
    Math.max(0, Number(record.fixedChargeKsh ?? 0), Number(record.amountKsh ?? 0)) > 0 &&
    Number(record.previousReading ?? 0) <= 0 &&
    Number(record.currentReading ?? 0) <= 0 &&
    Number(record.unitsConsumed ?? 0) <= 0 &&
    Number(record.ratePerUnitKsh ?? 0) <= 0
  );
}

function normalizeConfiguredMeterNumber(value: string | undefined): string {
  const normalized = String(value ?? "").trim();
  const upper = normalized.toUpperCase();
  if (!normalized || upper === "NO-METER" || upper === "METER-UNSET") {
    return "";
  }

  return normalized;
}

function normalizeStoredBillMeterNumber(value: string | undefined): string {
  const normalized = String(value ?? "").trim();
  if (normalized.toUpperCase() === "METER-UNSET") {
    return "";
  }

  return normalized;
}

function hasUsableMeterNumber(value: string | undefined): boolean {
  return Boolean(normalizeConfiguredMeterNumber(value));
}

export class UtilityBillingService {
  private readonly meters = new Map<string, UtilityMeterRecord>();
  private readonly billsByLedger = new Map<string, UtilityBillRecord[]>();
  private readonly paymentReferenceIndex = new Map<
    string,
    UtilityPaymentReferenceIndexEntry
  >();
  private stateChangeHandler?: UtilityBillingStateChangeHandler;
  private billingHoldPredicate?: UtilityBillingHoldPredicate;
  private combinedChargeBuildingIds = new Set<string>();
  private readonly combinedChargeAmountsByBuilding = new Map<string, number>();
  private readonly combinedChargeAmountsByMonth = new Map<string, number>();
  private readonly combinedChargeAmountsByRoom = new Map<string, number>();

  setCombinedChargeBuildingIds(buildingIds: string[]): void {
    this.combinedChargeBuildingIds = new Set(
      buildingIds
        .map((item) => normalizeBuildingId(item))
        .filter((item) => item && item !== UTILITY_LEGACY_BUILDING_ID)
    );
    this.normalizeCombinedChargeState();
  }

  setCombinedChargeBuildingAmounts(
    records: CombinedUtilityChargeBuildingAmount[]
  ): void {
    this.combinedChargeAmountsByBuilding.clear();

    for (const record of records) {
      if (!record?.buildingId) {
        continue;
      }

      const amountKsh = Number(record.amountKsh);
      if (!Number.isFinite(amountKsh) || amountKsh <= 0) {
        continue;
      }

      this.combinedChargeAmountsByBuilding.set(
        normalizeBuildingId(record.buildingId),
        Math.max(0, Math.round(amountKsh))
      );
    }

    this.normalizeCombinedChargeState();
  }

  setCombinedChargeMonthlyAmounts(
    records: CombinedUtilityChargeMonthlyAmount[]
  ): void {
    this.combinedChargeAmountsByMonth.clear();

    for (const record of records) {
      if (!record?.buildingId || !record?.billingMonth) {
        continue;
      }

      const amountKsh = Number(record.amountKsh);
      if (!Number.isFinite(amountKsh) || amountKsh <= 0) {
        continue;
      }

      this.combinedChargeAmountsByMonth.set(
        `${normalizeBuildingId(record.buildingId)}::${record.billingMonth}`,
        Math.max(0, Math.round(amountKsh))
      );
    }

    this.normalizeCombinedChargeState();
  }

  setCombinedChargeRoomAmounts(records: CombinedUtilityChargeRoomAmount[]): void {
    this.combinedChargeAmountsByRoom.clear();

    for (const record of records) {
      if (!record?.buildingId || !record?.houseNumber) {
        continue;
      }

      const amountKsh = Number(record.amountKsh);
      if (!Number.isFinite(amountKsh) || amountKsh <= 0) {
        continue;
      }

      this.combinedChargeAmountsByRoom.set(
        `${normalizeBuildingId(record.buildingId)}::${normalizeHouseNumber(
          record.houseNumber
        )}`,
        Math.max(0, Math.round(amountKsh))
      );
    }

    this.normalizeCombinedChargeState();
  }

  setStateChangeHandler(handler?: UtilityBillingStateChangeHandler): void {
    this.stateChangeHandler = handler;
  }

  setBillingHoldPredicate(predicate?: UtilityBillingHoldPredicate): void {
    this.billingHoldPredicate = predicate;
  }

  exportState(): UtilityBillingPersistedState {
    const meters = [...this.meters.values()]
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .map((item) => ({ ...item }));

    const bills = [...this.billsByLedger.values()]
      .flatMap((items) => items)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .map((item) => this.toSnapshot(item));

    return { meters, bills };
  }

  importState(state: UtilityBillingPersistedState | null | undefined): boolean {
    this.meters.clear();
    this.billsByLedger.clear();
    this.paymentReferenceIndex.clear();

    let normalizedLegacyPlaceholders = false;

    if (!state) {
      return normalizedLegacyPlaceholders;
    }

    if (Array.isArray(state.meters)) {
      for (const meter of state.meters) {
        if (!meter || !meter.utilityType || !meter.houseNumber || !meter.meterNumber) {
          continue;
        }

        const meterNumber = normalizeConfiguredMeterNumber(meter.meterNumber);
        if (!meterNumber) {
          normalizedLegacyPlaceholders = true;
          continue;
        }

        const normalizedHouse = normalizeHouseNumber(meter.houseNumber);
        const normalizedBuildingId = normalizeBuildingId(
          (meter as { buildingId?: string }).buildingId
        );
        const normalized: UtilityMeterRecord = {
          utilityType: meter.utilityType,
          buildingId: normalizedBuildingId,
          houseNumber: normalizedHouse,
          meterNumber,
          updatedAt: meter.updatedAt || nowIso()
        };

        this.meters.set(
          ledgerKey(
            normalized.utilityType,
            normalized.buildingId,
            normalized.houseNumber
          ),
          normalized
        );
      }
    }

    if (Array.isArray(state.bills)) {
      for (const snapshot of state.bills) {
        if (!snapshot || !snapshot.utilityType || !snapshot.houseNumber || !snapshot.billingMonth) {
          continue;
        }

        const normalizedHouse = normalizeHouseNumber(snapshot.houseNumber);
        const normalizedBuildingId = normalizeBuildingId(
          (snapshot as { buildingId?: string }).buildingId
        );
        const key = ledgerKey(snapshot.utilityType, normalizedBuildingId, normalizedHouse);
        const records = this.billsByLedger.get(key) ?? [];
        const meterNumber = normalizeStoredBillMeterNumber(snapshot.meterNumber);
        if (meterNumber !== String(snapshot.meterNumber ?? "").trim()) {
          normalizedLegacyPlaceholders = true;
        }

        const record: UtilityBillRecord = {
          id: snapshot.id,
          utilityType: snapshot.utilityType,
          buildingId: normalizedBuildingId,
          houseNumber: normalizedHouse,
          billingMonth: snapshot.billingMonth,
          meterNumber,
          previousReading: Number(snapshot.previousReading ?? 0),
          currentReading: Number(snapshot.currentReading ?? 0),
          unitsConsumed: Number(snapshot.unitsConsumed ?? 0),
          ratePerUnitKsh: Number(snapshot.ratePerUnitKsh ?? 0),
          fixedChargeKsh: Number(snapshot.fixedChargeKsh ?? 0),
          amountKsh: Number(snapshot.amountKsh ?? 0),
          balanceKsh: Number(snapshot.balanceKsh ?? 0),
          dueDate: snapshot.dueDate,
          note: snapshot.note,
          createdAt: snapshot.createdAt || nowIso(),
          updatedAt: snapshot.updatedAt || nowIso(),
          payments: Array.isArray(snapshot.payments)
            ? snapshot.payments.map((payment) => ({
                ...payment,
                utilityType: snapshot.utilityType,
                buildingId:
                  (payment as { buildingId?: string }).buildingId ?? normalizedBuildingId,
                houseNumber: normalizedHouse,
                billingMonth: payment.billingMonth ?? snapshot.billingMonth,
                providerReference: payment.providerReference
                  ? normalizeProviderReference(payment.providerReference)
                  : undefined
              }))
            : []
        };

        records.push(record);
        this.billsByLedger.set(key, records);
      }
    }

    for (const records of this.billsByLedger.values()) {
      records.sort((a, b) => monthSortDesc(a.billingMonth, b.billingMonth));
    }

    this.normalizeCombinedChargeState();
    return normalizedLegacyPlaceholders;
  }

  upsertMeter(
    utilityType: UtilityType,
    buildingId: string,
    houseNumber: string,
    input: UpsertUtilityMeterInput
  ): UtilityMeterRecord {
    const normalizedBuildingId = normalizeBuildingId(buildingId);
    const normalizedHouse = normalizeHouseNumber(houseNumber);
    const meterNumber = normalizeConfiguredMeterNumber(input.meterNumber);
    if (!meterNumber) {
      throw new Error(
        "Enter the actual meter number. Leave the field blank for rooms without a meter."
      );
    }
    const meter: UtilityMeterRecord = {
      utilityType,
      buildingId: normalizedBuildingId,
      houseNumber: normalizedHouse,
      meterNumber,
      updatedAt: nowIso()
    };

    this.meters.set(ledgerKey(utilityType, normalizedBuildingId, normalizedHouse), meter);
    this.emitStateChange();
    return { ...meter };
  }

  getMeter(
    utilityType: UtilityType,
    buildingId: string,
    houseNumber: string
  ): UtilityMeterRecord | null {
    const normalizedBuildingId = normalizeBuildingId(buildingId);
    const normalizedHouse = normalizeHouseNumber(houseNumber);
    const exact = this.meters.get(ledgerKey(utilityType, normalizedBuildingId, normalizedHouse));
    if (exact) {
      return { ...exact };
    }

    if (normalizedBuildingId !== UTILITY_LEGACY_BUILDING_ID) {
      const legacy = this.meters.get(
        ledgerKey(utilityType, UTILITY_LEGACY_BUILDING_ID, normalizedHouse)
      );
      if (legacy) {
        return { ...legacy };
      }
    }

    return null;
  }

  listMeters(
    options: { utilityType?: UtilityType; buildingId?: string; houseNumber?: string } = {}
  ) {
    const normalizedBuildingId = options.buildingId
      ? normalizeBuildingId(options.buildingId)
      : undefined;
    const normalizedHouse = options.houseNumber
      ? normalizeHouseNumber(options.houseNumber)
      : undefined;

    return [...this.meters.values()]
      .filter((item) => {
        if (options.utilityType && item.utilityType !== options.utilityType) {
          return false;
        }

        if (
          normalizedBuildingId &&
          !buildingMatchesScope(item.buildingId, normalizedBuildingId)
        ) {
          return false;
        }

        if (normalizedHouse && item.houseNumber !== normalizedHouse) {
          return false;
        }

        return true;
      })
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .map((item) => ({ ...item }));
  }

  purgeHouse(buildingId: string, houseNumber: string): boolean {
    const normalizedBuildingId = normalizeBuildingId(buildingId);
    const normalizedHouse = normalizeHouseNumber(houseNumber);
    let changed = false;

    for (const [key, meter] of this.meters.entries()) {
      if (
        meter.buildingId === normalizedBuildingId &&
        meter.houseNumber === normalizedHouse
      ) {
        this.meters.delete(key);
        changed = true;
      }
    }

    for (const [key, records] of this.billsByLedger.entries()) {
      const sample = records[0];
      if (!sample) {
        continue;
      }

      if (
        sample.buildingId === normalizedBuildingId &&
        sample.houseNumber === normalizedHouse
      ) {
        this.billsByLedger.delete(key);
        changed = true;
      }
    }

    if (
      this.combinedChargeAmountsByRoom.delete(
        `${normalizedBuildingId}::${normalizedHouse}`
      )
    ) {
      changed = true;
    }

    if (!changed) {
      return false;
    }

    this.rebuildPaymentReferenceIndex();
    this.emitStateChange();
    return true;
  }

  writeOffHouseBalances(
    buildingId: string,
    houseNumber: string,
    note = "Outstanding utility balance written off when resident was removed."
  ): UtilityWriteOffResult {
    const normalizedBuildingId = normalizeBuildingId(buildingId);
    const normalizedHouse = normalizeHouseNumber(houseNumber);
    const bills: UtilityWriteOffBillResult[] = [];
    let totalWrittenOffKsh = 0;

    for (const records of this.billsByLedger.values()) {
      const sample = records[0];
      if (!sample) {
        continue;
      }

      if (
        sample.buildingId !== normalizedBuildingId ||
        sample.houseNumber !== normalizedHouse
      ) {
        continue;
      }

      for (const record of records) {
        const previousBalanceKsh = Math.max(
          0,
          Math.round(Number(record.balanceKsh ?? 0))
        );
        if (previousBalanceKsh <= 0) {
          continue;
        }

        record.balanceKsh = 0;
        record.note = record.note?.trim()
          ? `${record.note.trim()} ${note}`
          : note;
        record.updatedAt = nowIso();
        totalWrittenOffKsh += previousBalanceKsh;
        bills.push({
          id: record.id,
          utilityType: record.utilityType,
          billingMonth: record.billingMonth,
          previousBalanceKsh
        });
      }
    }

    if (bills.length > 0) {
      this.emitStateChange();
    }

    return {
      buildingId: normalizedBuildingId,
      houseNumber: normalizedHouse,
      totalWrittenOffKsh,
      bills
    };
  }

  createBill(
    utilityType: UtilityType,
    buildingId: string,
    houseNumber: string,
    input: CreateUtilityBillInput
  ): UtilityBillSnapshot {
    const normalizedBuildingId = normalizeBuildingId(buildingId);
    const normalizedHouse = normalizeHouseNumber(houseNumber);
    const key = ledgerKey(utilityType, normalizedBuildingId, normalizedHouse);
    const records = this.billsByLedger.get(key) ?? [];

    if (records.some((item) => item.billingMonth === input.billingMonth)) {
      throw new Error(
        `${utilityType} bill for ${normalizedHouse} in ${input.billingMonth} already exists.`
      );
    }

    const inputMeterNumber = normalizeConfiguredMeterNumber(input.meterNumber);
    const existingMeter = this.getMeter(utilityType, normalizedBuildingId, normalizedHouse);
    const meterNumber =
      inputMeterNumber || normalizeConfiguredMeterNumber(existingMeter?.meterNumber);
    const hasMeter =
      meterNumber.length > 0 || input.currentReading != null || input.ratePerUnitKsh != null;

    if (inputMeterNumber) {
      this.upsertMeter(utilityType, normalizedBuildingId, normalizedHouse, {
        meterNumber: inputMeterNumber
      });
    }

    const fixedChargeKsh = Math.max(0, Math.round(input.fixedChargeKsh ?? 0));
    let previousReading = 0;
    let currentReading = 0;
    let ratePerUnitKsh = 0;
    let unitsConsumed = 0;
    let amountKsh = 0;

    if (hasMeter) {
      if (input.currentReading == null || input.ratePerUnitKsh == null) {
        throw new Error(
          `Current reading and rate per unit are required for metered ${utilityType} billing (${normalizedHouse}).`
        );
      }

      const previousRecord = [...records]
        .sort((a, b) => monthSortDesc(a.billingMonth, b.billingMonth))
        .find((item) => item.billingMonth < input.billingMonth);

      previousReading = input.previousReading ?? previousRecord?.currentReading ?? 0;
      currentReading = input.currentReading;
      if (currentReading < previousReading) {
        throw new Error(
          "Current reading must be greater than or equal to previous reading."
        );
      }

      ratePerUnitKsh = input.ratePerUnitKsh;
      unitsConsumed = Number((currentReading - previousReading).toFixed(3));
      amountKsh = Math.max(
        0,
        Math.round(unitsConsumed * ratePerUnitKsh + fixedChargeKsh)
      );
    } else {
      if (Number(fixedChargeKsh) <= 0) {
        throw new Error(
          `Fixed charge must be greater than zero for ${utilityType} (${normalizedHouse}) without a meter.`
        );
      }
      amountKsh = fixedChargeKsh;
    }

    const now = nowIso();
    const bill: UtilityBillRecord = {
      id: randomUUID(),
      utilityType,
      buildingId: normalizedBuildingId,
      houseNumber: normalizedHouse,
      billingMonth: input.billingMonth,
      meterNumber: hasMeter ? meterNumber : "NO-METER",
      previousReading,
      currentReading,
      unitsConsumed,
      ratePerUnitKsh,
      fixedChargeKsh,
      amountKsh,
      balanceKsh: amountKsh,
      dueDate: input.dueDate,
      note: input.note?.trim(),
      createdAt: now,
      updatedAt: now,
      payments: []
    };

    records.push(bill);
    records.sort((a, b) => monthSortDesc(a.billingMonth, b.billingMonth));
    this.billsByLedger.set(key, records);
    this.emitStateChange();

    return this.toSnapshot(bill);
  }

  backfillRecurringBills(options: {
    utilityType?: UtilityType;
    buildingId?: string;
    houseNumber?: string;
    visibleThroughDate?: string | Date;
  } = {}): UtilityBillSnapshot[] {
    const defaultVisibleThrough = new Date(
      Date.now() + UTILITY_BALANCE_VISIBILITY_WINDOW_DAYS * 24 * 60 * 60 * 1000
    );
    const visibleThroughDate =
      options.visibleThroughDate instanceof Date
        ? options.visibleThroughDate
        : options.visibleThroughDate
          ? new Date(options.visibleThroughDate)
          : defaultVisibleThrough;
    const visibleThroughMs = Number.isNaN(visibleThroughDate.getTime())
      ? defaultVisibleThrough.getTime()
      : visibleThroughDate.getTime();
    const normalizedBuildingId = options.buildingId
      ? normalizeBuildingId(options.buildingId)
      : undefined;
    const normalizedHouse = options.houseNumber
      ? normalizeHouseNumber(options.houseNumber)
      : undefined;
    const createdBills: UtilityBillSnapshot[] = [];

    for (const records of this.billsByLedger.values()) {
      if (records.length === 0) {
        continue;
      }

      const sample = records[0];
      if (options.utilityType && sample.utilityType !== options.utilityType) {
        continue;
      }
      if (normalizedBuildingId && sample.buildingId !== normalizedBuildingId) {
        continue;
      }
      if (normalizedHouse && sample.houseNumber !== normalizedHouse) {
        continue;
      }

      let orderedRecords = [...records].sort((a, b) =>
        monthSortAsc(a.billingMonth, b.billingMonth)
      );
      let cursor = [...orderedRecords]
        .sort((a, b) => monthSortDesc(a.billingMonth, b.billingMonth))
        .find((item) => isRecurringNonMeteredBill(item));

      if (!cursor) {
        continue;
      }

      while (true) {
        const nextBillingMonth = shiftBillingMonthLabel(cursor.billingMonth, 1);
        const nextDueDate = shiftIsoDateByMonths(cursor.dueDate, 1);
        if (!nextBillingMonth || !nextDueDate) {
          break;
        }

        const nextDueMs = Date.parse(nextDueDate);
        if (!Number.isFinite(nextDueMs) || nextDueMs > visibleThroughMs) {
          break;
        }

        const existing = orderedRecords.find((item) => item.billingMonth === nextBillingMonth);
        if (existing) {
          if (!isRecurringNonMeteredBill(existing)) {
            break;
          }
          cursor = existing;
          continue;
        }

        const fixedChargeKsh = Math.max(
          0,
          Math.round(Number(cursor.fixedChargeKsh ?? cursor.amountKsh ?? 0))
        );
        if (fixedChargeKsh <= 0) {
          break;
        }

        const isHeld =
          this.billingHoldPredicate?.({
            utilityType: cursor.utilityType,
            buildingId: cursor.buildingId,
            houseNumber: cursor.houseNumber,
            billingMonth: nextBillingMonth,
            dueDate: nextDueDate
          }) ?? false;

        if (isHeld) {
          cursor = {
            ...cursor,
            id: `${cursor.id}:held:${nextBillingMonth}`,
            billingMonth: nextBillingMonth,
            dueDate: nextDueDate,
            updatedAt: nowIso()
          };
          continue;
        }

        const created = this.createBill(cursor.utilityType, cursor.buildingId, cursor.houseNumber, {
          billingMonth: nextBillingMonth,
          fixedChargeKsh,
          dueDate: nextDueDate,
          note: cursor.note?.trim() || undefined
        });
        createdBills.push(created);

        orderedRecords = [...records].sort((a, b) => monthSortAsc(a.billingMonth, b.billingMonth));
        const createdRecord = records.find((item) => item.billingMonth === nextBillingMonth);
        if (!createdRecord) {
          break;
        }
        cursor = createdRecord;
      }
    }

    return createdBills;
  }

  listBills(options: ListUtilityBillsOptions = {}): UtilityBillSnapshot[] {
    const limit = Number.isFinite(options.limit)
      ? Math.min(Math.max(options.limit ?? 300, 1), 1_000)
      : 300;

    const normalizedBuildingId = options.buildingId
      ? normalizeBuildingId(options.buildingId)
      : undefined;
    const normalizedHouse = options.houseNumber
      ? normalizeHouseNumber(options.houseNumber)
      : undefined;

    const rows = [...this.billsByLedger.values()]
      .flatMap((items) => items)
      .filter((item) => {
        if (options.utilityType && item.utilityType !== options.utilityType) {
          return false;
        }

        if (options.billingMonth && item.billingMonth !== options.billingMonth) {
          return false;
        }

        if (
          normalizedBuildingId &&
          !buildingMatchesScope(item.buildingId, normalizedBuildingId)
        ) {
          return false;
        }

        if (normalizedHouse && item.houseNumber !== normalizedHouse) {
          return false;
        }

        return true;
      })
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .slice(0, limit);

    return rows.map((row) => this.toSnapshot(row));
  }

  listBillsForHouse(
    buildingId: string,
    houseNumber: string,
    utilityType?: UtilityType,
    limit = 24
  ): UtilityBillSnapshot[] {
    return this.listBills({
      buildingId,
      houseNumber,
      utilityType,
      limit
    });
  }

  listResidentVisibleBillsForHouse(
    buildingId: string,
    houseNumber: string,
    utilityType?: UtilityType,
    limit = 24
  ): UtilityBillSnapshot[] {
    return this.listBillsForHouse(buildingId, houseNumber, utilityType, limit).filter(
      (item) => Number(item.balanceKsh ?? 0) <= 0 || this.isBillBalanceVisible(item)
    );
  }

  listLatestReadingsForHouse(
    buildingId: string,
    houseNumber: string,
    limit = 120
  ): UtilityReadingSnapshot[] {
    const latestByType = new Map<UtilityType, UtilityReadingSnapshot>();

    this.listBillsForHouse(buildingId, houseNumber, undefined, limit).forEach((item) => {
      if (String(item.meterNumber ?? "").trim() === "NO-METER") {
        return;
      }

      if (latestByType.has(item.utilityType)) {
        return;
      }

      latestByType.set(item.utilityType, {
        utilityType: item.utilityType,
        buildingId: item.buildingId,
        houseNumber: item.houseNumber,
        billingMonth: item.billingMonth,
        meterNumber: item.meterNumber,
        previousReading: item.previousReading,
        currentReading: item.currentReading,
        unitsConsumed: item.unitsConsumed,
        recordedAt: item.updatedAt
      });
    });

    return (["water", "electricity"] as UtilityType[])
      .map((utilityType) => latestByType.get(utilityType))
      .filter((item): item is UtilityReadingSnapshot => Boolean(item));
  }

  hasHiddenUpcomingBalancesForHouse(
    buildingId: string,
    houseNumber: string,
    utilityType?: UtilityType
  ): boolean {
    return this.listBillsForHouse(buildingId, houseNumber, utilityType, 120).some(
      (item) => Number(item.balanceKsh ?? 0) > 0 && !this.isBillBalanceVisible(item)
    );
  }

  listVisibleRoomBalances(buildingId?: string): UtilityRoomBalanceSummary[] {
    const roomMonths = new Map<string, UtilityBillSnapshot>();

    this.listBills({
      buildingId,
      limit: 2_000
    })
      .filter((item) => item.balanceKsh > 0 && this.isBillBalanceVisible(item))
      .forEach((item) => {
        const monthKey = `${item.buildingId}::${item.houseNumber}::${item.billingMonth}`;
        const current = roomMonths.get(monthKey);
        if (!current) {
          roomMonths.set(monthKey, item);
          return;
        }

        const currentScore = [
          Number(current.amountKsh ?? 0),
          Number(current.balanceKsh ?? 0),
          current.updatedAt
        ];
        const candidateScore = [
          Number(item.amountKsh ?? 0),
          Number(item.balanceKsh ?? 0),
          item.updatedAt
        ];

        for (let index = 0; index < candidateScore.length; index += 1) {
          if (candidateScore[index] > currentScore[index]) {
            roomMonths.set(monthKey, item);
            break;
          }
          if (candidateScore[index] < currentScore[index]) {
            break;
          }
        }
      });

    const grouped = new Map<string, UtilityRoomBalanceSummary>();
    roomMonths.forEach((item) => {
      const key = `${item.buildingId}::${item.houseNumber}`;
      const current =
        grouped.get(key) ??
        {
          buildingId: item.buildingId,
          houseNumber: item.houseNumber,
          currentDueKsh: 0,
          arrearsKsh: 0,
          totalOpenKsh: 0,
          nextDueDate: undefined
        };

      current.totalOpenKsh += Math.max(0, Number(item.balanceKsh ?? 0));
      if (Number(item.daysToDue ?? 0) < 0) {
        current.arrearsKsh += Math.max(0, Number(item.balanceKsh ?? 0));
      } else {
        current.currentDueKsh += Math.max(0, Number(item.balanceKsh ?? 0));
      }

      if (
        item.dueDate &&
        (!current.nextDueDate || item.dueDate.localeCompare(current.nextDueDate) < 0)
      ) {
        current.nextDueDate = item.dueDate;
      }

      grouped.set(key, current);
    });

    return [...grouped.values()].sort((a, b) =>
      `${a.buildingId}:${a.houseNumber}`.localeCompare(`${b.buildingId}:${b.houseNumber}`)
    );
  }

  previewPayment(
    utilityType: UtilityType,
    buildingId: string,
    houseNumber: string,
    input: Pick<RecordUtilityPaymentInput, "billingMonth" | "amountKsh">
  ): UtilityPaymentPreview {
    const context = this.resolvePaymentContext(utilityType, buildingId, houseNumber, input);
    return {
      targetBill: this.toSnapshot(context.targetBill),
      effectiveBill: this.toSnapshot(context.effectiveBill),
      candidateBills: context.candidateBills.map((item) => this.toSnapshot(item)),
      availableBalanceKsh: context.availableBalanceKsh,
      requestedAmountKsh: context.requestedAmountKsh
    };
  }

  recordPayment(
    utilityType: UtilityType,
    buildingId: string,
    houseNumber: string,
    input: RecordUtilityPaymentInput & { source?: UtilityPaymentSource }
  ): RecordUtilityPaymentResult {
    const {
      normalizedHouse,
      candidateBills,
      availableBalanceKsh,
      requestedAmountKsh
    } = this.resolvePaymentContext(utilityType, buildingId, houseNumber, input);

    if (requestedAmountKsh > availableBalanceKsh) {
      throw new Error(
        `Payment is larger than the open ${utilityType} balance for house ${normalizedHouse}.`
      );
    }

    const normalizedReference = input.providerReference?.trim()
      ? normalizeProviderReference(input.providerReference)
      : undefined;
    if (normalizedReference) {
      const existingReference = this.paymentReferenceIndex.get(normalizedReference);
      if (existingReference) {
        const existingResult = this.buildRecordPaymentResult(
          existingReference.events,
          existingReference.billIds
        );
        if (existingResult) {
          return existingResult;
        }
      }
    }

    const paidAt = input.paidAt ?? nowIso();
    const createdAt = nowIso();
    let remainingAmountKsh = requestedAmountKsh;
    const appliedEvents: UtilityPaymentEvent[] = [];
    const appliedBillIds: string[] = [];

    for (const bill of candidateBills) {
      if (remainingAmountKsh <= 0) {
        break;
      }

      const openBalanceKsh = Math.max(0, Math.round(bill.balanceKsh));
      if (openBalanceKsh <= 0) {
        continue;
      }

      const appliedAmountKsh = Math.min(remainingAmountKsh, openBalanceKsh);
      const event: UtilityPaymentEvent = {
        id: randomUUID(),
        utilityType,
        buildingId: bill.buildingId,
        houseNumber: normalizedHouse,
        billingMonth: bill.billingMonth,
        provider: input.provider,
        providerReference: normalizedReference,
        amountKsh: appliedAmountKsh,
        paidAt,
        note: input.note?.trim() || undefined,
        createdAt,
        source: input.source
      };

      bill.payments.unshift(event);
      bill.balanceKsh = Math.max(0, bill.balanceKsh - appliedAmountKsh);
      bill.updatedAt = createdAt;
      appliedEvents.push(event);
      appliedBillIds.push(bill.id);
      remainingAmountKsh -= appliedAmountKsh;
    }

    if (normalizedReference) {
      this.paymentReferenceIndex.set(normalizedReference, {
        events: appliedEvents.map((event) => ({ ...event })),
        billIds: [...appliedBillIds]
      });
    }
    this.emitStateChange();

    const result = this.buildRecordPaymentResult(appliedEvents, appliedBillIds);
    if (!result) {
      throw new Error(
        `Failed to record ${utilityType} payment for house ${normalizedHouse}.`
      );
    }

    return result;
  }

  unrecordCashPayment(
    utilityType: UtilityType,
    buildingId: string,
    houseNumber: string,
    paymentId: string
  ): UnrecordUtilityPaymentResult | null {
    const normalizedBuildingId = normalizeBuildingId(buildingId);
    const normalizedHouse = normalizeHouseNumber(houseNumber);
    const normalizedPaymentId = String(paymentId ?? "").trim();
    if (!normalizedPaymentId) {
      return null;
    }

    let targetEvent: UtilityPaymentEvent | null = null;
    for (const bills of this.billsByLedger.values()) {
      for (const bill of bills) {
        if (
          bill.utilityType !== utilityType ||
          !buildingMatchesScope(bill.buildingId, normalizedBuildingId) ||
          bill.houseNumber !== normalizedHouse
        ) {
          continue;
        }

        const event = bill.payments.find((payment) => payment.id === normalizedPaymentId);
        if (event) {
          targetEvent = event;
          break;
        }
      }

      if (targetEvent) {
        break;
      }
    }

    if (!targetEvent) {
      return null;
    }
    if (targetEvent.provider !== "cash" && targetEvent.source !== "manual") {
      throw new Error("Only manually recorded utility payments can be unrecorded.");
    }

    const normalizedReference = targetEvent.providerReference
      ? normalizeProviderReference(targetEvent.providerReference)
      : undefined;
    const removed: UtilityPaymentEvent[] = [];
    const touchedBills: Array<{ bill: UtilityBillRecord; event: UtilityPaymentEvent }> = [];
    const updatedAt = nowIso();

    for (const bills of this.billsByLedger.values()) {
      for (const bill of bills) {
        if (
          bill.utilityType !== utilityType ||
          !buildingMatchesScope(bill.buildingId, normalizedBuildingId) ||
          bill.houseNumber !== normalizedHouse
        ) {
          continue;
        }

        for (let index = bill.payments.length - 1; index >= 0; index -= 1) {
          const payment = bill.payments[index];
          if (
            !payment ||
            (payment.provider !== "cash" && payment.source !== "manual")
          ) {
            continue;
          }

          const paymentReference = payment.providerReference
            ? normalizeProviderReference(payment.providerReference)
            : undefined;
          const shouldRemove =
            payment.id === normalizedPaymentId ||
            (normalizedReference !== undefined && paymentReference === normalizedReference);
          if (!shouldRemove) {
            continue;
          }

          const [event] = bill.payments.splice(index, 1);
          if (!event) {
            continue;
          }

          bill.balanceKsh = Math.max(0, Math.round(bill.balanceKsh + event.amountKsh));
          bill.updatedAt = updatedAt;
          removed.push({ ...event });
          touchedBills.push({ bill, event: { ...event } });
        }
      }
    }

    if (removed.length === 0) {
      return null;
    }

    this.rebuildPaymentReferenceIndex();
    this.emitStateChange();

    return {
      events: removed,
      allocations: touchedBills.map(({ bill, event }) => ({
        event,
        bill: this.toSnapshot(bill),
        appliedAmountKsh: event.amountKsh
      })),
      totalAmountKsh: removed.reduce(
        (sum, event) => sum + Math.max(0, Number(event.amountKsh ?? 0)),
        0
      )
    };
  }

  private resolvePaymentContext(
    utilityType: UtilityType,
    buildingId: string,
    houseNumber: string,
    input: Pick<RecordUtilityPaymentInput, "billingMonth" | "amountKsh">
  ): ResolvedUtilityPaymentContext {
    const normalizedBuildingId = normalizeBuildingId(buildingId);
    const normalizedHouse = normalizeHouseNumber(houseNumber);
    const key = ledgerKey(utilityType, normalizedBuildingId, normalizedHouse);
    const records = this.billsByLedger.get(key) ?? [];
    const legacyRecords =
      normalizedBuildingId === UTILITY_LEGACY_BUILDING_ID
        ? []
        : this.billsByLedger.get(
            ledgerKey(utilityType, UTILITY_LEGACY_BUILDING_ID, normalizedHouse)
          ) ?? [];
    const mergedRecords = records.length > 0 ? records : legacyRecords;

    if (mergedRecords.length === 0) {
      throw new Error(`No ${utilityType} bills found for house ${normalizedHouse}.`);
    }

    const openBills = [...mergedRecords]
      .filter((item) => item.balanceKsh > 0)
      .sort((a, b) => monthSortAsc(a.billingMonth, b.billingMonth));
    const selectedBill = input.billingMonth
      ? mergedRecords.find((item) => item.billingMonth === input.billingMonth)
      : undefined;
    const targetBill = selectedBill ?? openBills[0];

    if (!targetBill) {
      throw new Error(
        `No outstanding ${utilityType} bill found for house ${normalizedHouse}.`
      );
    }

    const candidateBills = openBills;
    const availableBalanceKsh = candidateBills.reduce(
      (sum, item) => sum + Math.max(0, Math.round(item.balanceKsh)),
      0
    );
    const effectiveBill = candidateBills[0] ?? targetBill;

    if (availableBalanceKsh <= 0 || Number(effectiveBill.balanceKsh ?? 0) <= 0) {
      throw new Error(
        `No outstanding ${utilityType} bill found for house ${normalizedHouse}.`
      );
    }

    return {
      normalizedHouse,
      candidateBills,
      targetBill,
      effectiveBill,
      availableBalanceKsh,
      requestedAmountKsh: Math.round(input.amountKsh)
    };
  }

  collectAutoReminders(
    buildingId: string,
    houseNumber: string
  ): UtilityReminderNotification[] {
    const normalizedBuildingId = normalizeBuildingId(buildingId);
    const normalizedHouse = normalizeHouseNumber(houseNumber);
    const createdAt = nowIso();
    const todayKey = createdAt.slice(0, 10);

    const bills = this.listBillsForHouse(
      normalizedBuildingId,
      normalizedHouse,
      undefined,
      120
    ).filter((item) => item.balanceKsh > 0);

    const reminders: UtilityReminderNotification[] = [];

    for (const bill of bills) {
      const utilityLabel =
        bill.utilityType === "water" ? "Water" : "Electricity";
      const balanceText = `KSh ${bill.balanceKsh.toLocaleString("en-US")}`;

      if (bill.daysToDue === 3) {
        reminders.push({
          buildingId: normalizedBuildingId,
          houseNumber: normalizedHouse,
          utilityType: bill.utilityType,
          billingMonth: bill.billingMonth,
          title: `${utilityLabel} Bill Reminder (D-3)`,
          message: `${utilityLabel} balance ${balanceText} is due in 3 days for ${bill.billingMonth}.`,
          level: "info",
          createdAt,
          dedupeKey: `utility-reminder-d3-${bill.utilityType}-${normalizedBuildingId}-${normalizedHouse}-${bill.billingMonth}`
        });
      }

      if (bill.daysToDue === 1) {
        reminders.push({
          buildingId: normalizedBuildingId,
          houseNumber: normalizedHouse,
          utilityType: bill.utilityType,
          billingMonth: bill.billingMonth,
          title: `${utilityLabel} Bill Reminder (D-1)`,
          message: `${utilityLabel} balance ${balanceText} is due tomorrow for ${bill.billingMonth}.`,
          level: "warning",
          createdAt,
          dedupeKey: `utility-reminder-d1-${bill.utilityType}-${normalizedBuildingId}-${normalizedHouse}-${bill.billingMonth}`
        });
      }

      if (bill.daysToDue < 0) {
        reminders.push({
          buildingId: normalizedBuildingId,
          houseNumber: normalizedHouse,
          utilityType: bill.utilityType,
          billingMonth: bill.billingMonth,
          title: `${utilityLabel} Bill Overdue`,
          message: `${utilityLabel} balance ${balanceText} is overdue for ${bill.billingMonth}.`,
          level: "warning",
          createdAt,
          dedupeKey: `utility-reminder-overdue-${bill.utilityType}-${normalizedBuildingId}-${normalizedHouse}-${bill.billingMonth}-${todayKey}`
        });
      }
    }

    return reminders;
  }

  listPayments(options: ListUtilityPaymentsOptions = {}): UtilityPaymentEvent[] {
    const limit = Number.isFinite(options.limit)
      ? Math.min(Math.max(options.limit ?? 500, 1), 2_000)
      : 500;

    const normalizedBuildingId = options.buildingId
      ? normalizeBuildingId(options.buildingId)
      : undefined;
    const normalizedHouse = options.houseNumber
      ? normalizeHouseNumber(options.houseNumber)
      : undefined;

    return [...this.billsByLedger.values()]
      .flatMap((items) => items)
      .flatMap((item) => item.payments)
      .filter((item) => {
        if (options.utilityType && item.utilityType !== options.utilityType) {
          return false;
        }

        if (
          normalizedBuildingId &&
          !buildingMatchesScope(item.buildingId, normalizedBuildingId)
        ) {
          return false;
        }

        if (normalizedHouse && item.houseNumber !== normalizedHouse) {
          return false;
        }

        return true;
      })
      .sort((a, b) => b.paidAt.localeCompare(a.paidAt))
      .slice(0, limit)
      .map((item) => ({ ...item }));
  }

  private emitStateChange(): void {
    if (!this.stateChangeHandler) {
      return;
    }

    const snapshot = this.exportState();
    void Promise.resolve(this.stateChangeHandler(snapshot)).catch((error) => {
      console.error("Failed to persist utility billing state", error);
    });
  }

  private toSnapshot(record: UtilityBillRecord): UtilityBillSnapshot {
    const daysToDue = dayDiff(new Date(), new Date(record.dueDate));

    return {
      id: record.id,
      utilityType: record.utilityType,
      buildingId: record.buildingId,
      houseNumber: record.houseNumber,
      billingMonth: record.billingMonth,
      meterNumber: record.meterNumber,
      previousReading: record.previousReading,
      currentReading: record.currentReading,
      unitsConsumed: record.unitsConsumed,
      ratePerUnitKsh: record.ratePerUnitKsh,
      fixedChargeKsh: record.fixedChargeKsh,
      amountKsh: record.amountKsh,
      balanceKsh: record.balanceKsh,
      dueDate: record.dueDate,
      note: record.note,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      payments: [...record.payments],
      status: utilityStatus(record.balanceKsh, daysToDue),
      daysToDue
    };
  }

  private isBillBalanceVisible(record: Pick<UtilityBillRecord, "dueDate">): boolean {
    const visibleAt = subtractUtcDays(record.dueDate, UTILITY_BALANCE_VISIBILITY_WINDOW_DAYS);
    if (!visibleAt) {
      return true;
    }

    return Date.parse(visibleAt) <= Date.now();
  }

  private findBillById(billId: string): UtilityBillRecord | null {
    for (const records of this.billsByLedger.values()) {
      const match = records.find((item) => item.id === billId);
      if (match) {
        return match;
      }
    }

    return null;
  }

  private buildRecordPaymentResult(
    events: UtilityPaymentEvent[],
    billIds: string[]
  ): RecordUtilityPaymentResult | null {
    const allocations = events
      .map((event, index) => {
        const bill = this.findBillById(billIds[index] ?? "");
        if (!bill) {
          return null;
        }

        return {
          event: { ...event },
          bill: this.toSnapshot(bill),
          appliedAmountKsh: event.amountKsh
        };
      })
      .filter((item): item is UtilityPaymentAllocation => item !== null);

    if (allocations.length === 0) {
      return null;
    }

    return {
      event: allocations[0].event,
      bill: allocations[0].bill,
      allocations,
      totalAppliedAmountKsh: allocations.reduce(
        (sum, item) => sum + item.appliedAmountKsh,
        0
      )
    };
  }

  private normalizeCombinedChargeState(): void {
    this.normalizeBaselineCombinedCharges();
    this.normalizeCombinedMonthlyCharges();
    this.rebuildPaymentReferenceIndex();
  }

  private rebuildPaymentReferenceIndex(): void {
    this.paymentReferenceIndex.clear();

    for (const records of this.billsByLedger.values()) {
      for (const record of records) {
        for (const payment of record.payments) {
          if (!payment.providerReference) {
            continue;
          }

          const existing = this.paymentReferenceIndex.get(payment.providerReference);
          if (existing) {
            existing.events.push({ ...payment });
            existing.billIds.push(record.id);
            continue;
          }

          this.paymentReferenceIndex.set(payment.providerReference, {
            events: [{ ...payment }],
            billIds: [record.id]
          });
        }
      }
    }
  }

  private normalizeBaselineCombinedCharges(): void {
    const baselineGroups = new Map<string, UtilityBillRecord[]>();
    for (const records of this.billsByLedger.values()) {
      for (const record of records) {
        if (!isBaselineCutoverBill(record)) {
          continue;
        }

        const key = `${record.buildingId}::${record.houseNumber}::${record.billingMonth}`;
        const bucket = baselineGroups.get(key) ?? [];
        bucket.push(record);
        baselineGroups.set(key, bucket);
      }
    }

    for (const records of baselineGroups.values()) {
      if (records.some((item) => item.amountKsh > 0 || item.balanceKsh > 0)) {
        continue;
      }

      const reference = records[0];
      if (!reference) {
        continue;
      }

      const roomKey = `${reference.buildingId}::${reference.houseNumber}`;
      if (!this.combinedChargeBuildingIds.has(reference.buildingId)) {
        continue;
      }

      const fallbackAmount =
        this.getCombinedChargeAmountForRoom(reference.buildingId, reference.houseNumber) ??
        this.getCombinedChargeAmount(reference.buildingId, reference.billingMonth) ??
        this.getCombinedChargeAmountForBuilding(reference.buildingId);
      if (
        fallbackAmount == null ||
        !Number.isFinite(fallbackAmount) ||
        fallbackAmount <= 0
      ) {
        continue;
      }
      const resolvedFallbackAmount = Math.max(0, Number(fallbackAmount));

      const target =
        records.find((item) => item.utilityType === "water") ?? reference;
      target.amountKsh = resolvedFallbackAmount;
      target.balanceKsh = resolvedFallbackAmount;
      target.fixedChargeKsh = resolvedFallbackAmount;
      target.previousReading = 0;
      target.currentReading = 0;
      target.unitsConsumed = 0;
      target.ratePerUnitKsh = 0;
      target.meterNumber = "NO-METER";
      target.note = `Combined utility fee (water+electricity) for ${target.billingMonth}.`;
      target.updatedAt = nowIso();
    }
  }

  private normalizeCombinedMonthlyCharges(): void {
    const combinedGroups = new Map<string, UtilityBillRecord[]>();
    for (const records of this.billsByLedger.values()) {
      for (const record of records) {
        if (!isCombinedUtilityFeeRecord(record)) {
          continue;
        }

        if (!this.combinedChargeBuildingIds.has(record.buildingId)) {
          continue;
        }

        const roomKey = `${record.buildingId}::${record.houseNumber}`;
        const key = `${roomKey}::${record.billingMonth}`;
        const bucket = combinedGroups.get(key) ?? [];
        bucket.push(record);
        combinedGroups.set(key, bucket);
      }
    }

    for (const records of combinedGroups.values()) {
      if (records.length <= 1) {
        continue;
      }

      const positiveRows = records.filter((item) => item.amountKsh > 0 || item.balanceKsh > 0);
      const target =
        records.find((item) => item.utilityType === "water") ?? records[0];
      if (!target) {
        continue;
      }

      const roomAmount = this.getCombinedChargeAmountForRoom(
        target.buildingId,
        target.houseNumber
      );
      if (positiveRows.length <= 1 && roomAmount == null) {
        continue;
      }

      const postedAmounts = records
        .map((item) => Number(item.amountKsh ?? 0))
        .filter((amount) => Number.isFinite(amount) && amount > 0);
      const configuredAmount = this.getCombinedChargeAmount(
        target.buildingId,
        target.billingMonth
      );
      const buildingAmount = this.getCombinedChargeAmountForBuilding(target.buildingId);
      const combinedAmount =
        roomAmount ??
        (postedAmounts.length > 0
          ? Math.max(...postedAmounts)
          : configuredAmount ?? buildingAmount);
      if (
        combinedAmount == null ||
        !Number.isFinite(combinedAmount) ||
        combinedAmount <= 0
      ) {
        continue;
      }
      const resolvedCombinedAmount = Math.max(0, Number(combinedAmount));
      const mergedPayments = records
        .flatMap((item) => item.payments ?? [])
        .sort((a, b) => b.paidAt.localeCompare(a.paidAt))
        .map((payment) => ({
          ...payment,
          utilityType: target.utilityType,
          buildingId: target.buildingId,
          houseNumber: target.houseNumber,
          billingMonth: target.billingMonth
        }));
      const totalPaid = mergedPayments.reduce(
        (sum, payment) => sum + Number(payment.amountKsh ?? 0),
        0
      );

      target.amountKsh = resolvedCombinedAmount;
      target.balanceKsh = Math.max(0, resolvedCombinedAmount - totalPaid);
      target.fixedChargeKsh = resolvedCombinedAmount;
      target.previousReading = 0;
      target.currentReading = 0;
      target.unitsConsumed = 0;
      target.ratePerUnitKsh = 0;
      target.meterNumber = "NO-METER";
      target.note = `Combined utility fee (water+electricity) for ${target.billingMonth}.`;
      target.payments = mergedPayments;
      target.updatedAt = nowIso();

      records.forEach((record) => {
        if (record.id === target.id) {
          return;
        }

        record.amountKsh = 0;
        record.balanceKsh = 0;
        record.fixedChargeKsh = 0;
        record.previousReading = 0;
        record.currentReading = 0;
        record.unitsConsumed = 0;
        record.ratePerUnitKsh = 0;
        record.meterNumber = "NO-METER";
        record.note = `Combined utility fee tracked on ${target.utilityType} for ${record.billingMonth}.`;
        record.payments = [];
        record.updatedAt = target.updatedAt;
      });
    }
  }

  private getCombinedChargeAmount(
    buildingId: string,
    billingMonth: string
  ): number | undefined {
    const value = this.combinedChargeAmountsByMonth.get(
      `${normalizeBuildingId(buildingId)}::${billingMonth}`
    );
    return Number.isFinite(value) ? value : undefined;
  }

  private getCombinedChargeAmountForBuilding(buildingId: string): number | undefined {
    const value = this.combinedChargeAmountsByBuilding.get(
      normalizeBuildingId(buildingId)
    );
    return Number.isFinite(value) ? value : undefined;
  }

  private getCombinedChargeAmountForRoom(
    buildingId: string,
    houseNumber: string
  ): number | undefined {
    const value = this.combinedChargeAmountsByRoom.get(
      `${normalizeBuildingId(buildingId)}::${normalizeHouseNumber(houseNumber)}`
    );
    return Number.isFinite(value) ? value : undefined;
  }
}
