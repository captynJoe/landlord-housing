import { randomUUID } from "node:crypto";
import type {
  RentMpesaCallbackInput,
  UpsertRentDueInput
} from "../validation/schemas.js";

type RentPaymentProvider = "mpesa" | "cash" | "bank" | "card" | "deposit_credit";
type RentPaymentSource = "manual" | "mpesa" | "settlement";

interface RecordRentPaymentInput {
  buildingId: string;
  houseNumber: string;
  amountKsh: number;
  provider: RentPaymentProvider;
  providerReference: string;
  phoneNumber?: string;
  paidAt?: string;
  billingMonth?: string;
  tenantUserId?: string;
  tenantName?: string;
  paymentProfileId?: string;
  paymentProfileName?: string;
  paymentAccountReference?: string;
  source?: RentPaymentSource;
}

export const RENT_LEGACY_BUILDING_ID = "__LEGACY__";
const RENT_ROLLOVER_WINDOW_DAYS = 7;

export interface RentPaymentEvent {
  id: string;
  buildingId: string;
  houseNumber: string;
  billingMonth: string;
  tenantUserId?: string;
  tenantName?: string;
  provider: RentPaymentProvider;
  providerReference: string;
  amountKsh: number;
  phoneNumber?: string;
  paymentProfileId?: string;
  paymentProfileName?: string;
  paymentAccountReference?: string;
  paidAt: string;
  createdAt: string;
  source?: RentPaymentSource;
}

interface ReminderState {
  d3CycleKey?: string;
  d1CycleKey?: string;
  overdueDateKey?: string;
}

export interface RentLatePenaltyPolicy {
  enabled: boolean;
  amountKsh: number;
  graceDays: number;
}

export interface RentLatePenaltyCharge {
  id: string;
  billingMonth: string;
  amountKsh: number;
  dueDate: string;
  appliedAt: string;
  note?: string;
}

export interface RentDueRecord {
  buildingId: string;
  houseNumber: string;
  monthlyRentKsh: number;
  balanceKsh: number;
  dueDate: string;
  note?: string;
  updatedAt: string;
  payments: RentPaymentEvent[];
  latePenaltyCharges: RentLatePenaltyCharge[];
  reminderState: ReminderState;
}

export interface RentDueSnapshot extends Omit<RentDueRecord, "reminderState"> {
  status: "clear" | "due_soon" | "overdue";
  paymentStatus: "paid" | "partial" | "not_paid";
  currentBillingMonth: string;
  paidAmountKsh: number;
  currentMonthPaidKsh: number;
  currentMonthOutstandingKsh: number;
  arrearsKsh: number;
  totalPaidKsh: number;
  currentMonthLatePenaltyKsh: number;
  totalLatePenaltyKsh: number;
  graceDays: number;
  overdueStartsAt: string;
  daysToOverdue: number;
  daysToDue: number;
}

export interface RentReminderNotification {
  buildingId: string;
  houseNumber: string;
  title: string;
  message: string;
  level: "info" | "warning";
  createdAt: string;
  dedupeKey: string;
}

export interface RecordMpesaPaymentResult {
  event: RentPaymentEvent;
  applied: boolean;
  snapshot: RentDueSnapshot | null;
}

interface ReferenceIndexEntry {
  event: RentPaymentEvent;
  applied: boolean;
}

interface ListRentPaymentsOptions {
  buildingId?: string;
  houseNumber?: string;
}

interface UnrecordRentPaymentInput {
  buildingId: string;
  houseNumber: string;
  paymentId: string;
}

export interface RentBillingHoldCheck {
  buildingId: string;
  houseNumber: string;
  billingMonth: string;
  dueDate: string;
}

type RentBillingHoldPredicate = (input: RentBillingHoldCheck) => boolean;
type RentLatePenaltyPolicyResolver = (
  buildingId: string
) => RentLatePenaltyPolicy | null | undefined;

export interface UnrecordRentPaymentResult {
  event: RentPaymentEvent;
  applied: boolean;
  snapshot: RentDueSnapshot | null;
}

export interface WriteOffRentBalanceResult {
  buildingId: string;
  houseNumber: string;
  previousBalanceKsh: number;
  snapshot: RentDueSnapshot;
}

export interface RentLedgerPersistedState {
  records: RentDueRecord[];
  pendingPayments: RentPaymentEvent[];
}

type RentLedgerStateChangeHandler = (
  state: RentLedgerPersistedState
) => void | Promise<void>;

function normalizeHouseNumber(value: string): string {
  return value.trim().toUpperCase();
}

function normalizeBuildingId(value: string | undefined): string {
  const normalized = String(value ?? "")
    .trim()
    .toUpperCase();
  return normalized || RENT_LEGACY_BUILDING_ID;
}

function ledgerKey(buildingId: string, houseNumber: string): string {
  return `${normalizeBuildingId(buildingId)}:${normalizeHouseNumber(houseNumber)}`;
}

function buildingMatchesScope(itemBuildingId: string, requestedBuildingId?: string): boolean {
  if (!requestedBuildingId) {
    return true;
  }

  const normalizedItem = normalizeBuildingId(itemBuildingId);
  const normalizedRequested = normalizeBuildingId(requestedBuildingId);
  return (
    normalizedItem === normalizedRequested ||
    normalizedItem === RENT_LEGACY_BUILDING_ID
  );
}

function nowIso(): string {
  return new Date().toISOString();
}

function toUtcDate(value: string): Date {
  return new Date(value);
}

function dayDiff(from: Date, to: Date): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.ceil((to.getTime() - from.getTime()) / msPerDay);
}

function getStatus(
  balanceKsh: number,
  daysToDue: number
): RentDueSnapshot["status"] {
  if (balanceKsh === 0) {
    return "clear";
  }

  if (daysToDue < 0) {
    return "overdue";
  }

  return "due_soon";
}

function isoDateKey(value: string): string {
  return value.slice(0, 10);
}

function billingMonthFromDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    const now = new Date();
    return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  }

  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function normalizeProviderReference(value: string): string {
  return value.trim().toUpperCase();
}

function addMonthsPreservingUtcDay(value: string, months: number): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const day = date.getUTCDate();
  const hours = date.getUTCHours();
  const minutes = date.getUTCMinutes();
  const seconds = date.getUTCSeconds();
  const milliseconds = date.getUTCMilliseconds();

  const targetMonthIndex = month + months;
  const targetYear = year + Math.floor(targetMonthIndex / 12);
  const targetMonth = ((targetMonthIndex % 12) + 12) % 12;
  const lastDay = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();
  const targetDay = Math.min(day, lastDay);

  return new Date(
    Date.UTC(
      targetYear,
      targetMonth,
      targetDay,
      hours,
      minutes,
      seconds,
      milliseconds
    )
  ).toISOString();
}

function subtractUtcDays(value: string, days: number): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString();
}

function normalizeRentPaymentProvider(value: string | undefined): RentPaymentProvider {
  switch (value) {
    case "cash":
    case "bank":
    case "card":
    case "deposit_credit":
    case "mpesa":
      return value;
    default:
      return "mpesa";
  }
}

function paymentStatusForRecord(record: RentDueRecord): RentDueSnapshot["paymentStatus"] {
  if (record.balanceKsh <= 0) return "paid";
  if (record.balanceKsh >= record.monthlyRentKsh) return "not_paid";
  return "partial";
}

function normalizeLatePenaltyPolicy(
  policy: RentLatePenaltyPolicy | null | undefined
): RentLatePenaltyPolicy {
  return {
    enabled: Boolean(policy?.enabled),
    amountKsh: Math.max(0, Math.round(Number(policy?.amountKsh ?? 0))),
    graceDays: Math.max(0, Math.round(Number(policy?.graceDays ?? 0)))
  };
}

export class RentLedgerService {
  private readonly records = new Map<string, RentDueRecord>();
  private readonly pendingPayments = new Map<string, RentPaymentEvent[]>();
  private readonly paymentReferenceIndex = new Map<string, ReferenceIndexEntry>();
  private stateChangeHandler?: RentLedgerStateChangeHandler;
  private billingHoldPredicate?: RentBillingHoldPredicate;
  private latePenaltyPolicyResolver?: RentLatePenaltyPolicyResolver;

  setStateChangeHandler(handler?: RentLedgerStateChangeHandler): void {
    this.stateChangeHandler = handler;
  }

  setBillingHoldPredicate(predicate?: RentBillingHoldPredicate): void {
    this.billingHoldPredicate = predicate;
  }

  setLatePenaltyPolicyResolver(resolver?: RentLatePenaltyPolicyResolver): void {
    this.latePenaltyPolicyResolver = resolver;
  }

  exportState(): RentLedgerPersistedState {
    const records = [...this.records.values()].map((record) => ({
      ...record,
      payments: [...record.payments],
      latePenaltyCharges: [...(record.latePenaltyCharges ?? [])],
      reminderState: { ...record.reminderState }
    }));

    const pendingPayments = [...this.pendingPayments.values()]
      .flatMap((items) => items)
      .map((item) => ({ ...item }));

    return {
      records,
      pendingPayments
    };
  }

  importState(state: RentLedgerPersistedState | null | undefined): void {
    this.records.clear();
    this.pendingPayments.clear();
    this.paymentReferenceIndex.clear();

    if (!state) {
      return;
    }

    if (Array.isArray(state.records)) {
      for (const record of state.records) {
        if (!record || !record.houseNumber) {
          continue;
        }

        const buildingId = normalizeBuildingId(record.buildingId);
        const houseNumber = normalizeHouseNumber(record.houseNumber);
        const normalizedRecord: RentDueRecord = {
          buildingId,
          houseNumber,
          monthlyRentKsh: Number(record.monthlyRentKsh ?? 0),
          balanceKsh: Number(record.balanceKsh ?? 0),
          dueDate: record.dueDate,
          note: record.note,
          updatedAt: record.updatedAt || nowIso(),
          payments: Array.isArray(record.payments)
            ? record.payments.map((payment) => ({
                ...payment,
                buildingId: normalizeBuildingId(payment.buildingId ?? buildingId),
                houseNumber,
                provider: normalizeRentPaymentProvider(payment.provider),
                providerReference: normalizeProviderReference(payment.providerReference)
              }))
            : [],
          latePenaltyCharges: Array.isArray(record.latePenaltyCharges)
            ? record.latePenaltyCharges
                .filter((charge) => charge && charge.billingMonth)
                .map((charge) => ({
                  id: String(charge.id ?? randomUUID()),
                  billingMonth: String(charge.billingMonth),
                  amountKsh: Math.max(0, Math.round(Number(charge.amountKsh ?? 0))),
                  dueDate: String(charge.dueDate ?? record.dueDate),
                  appliedAt: String(charge.appliedAt ?? record.updatedAt ?? nowIso()),
                  note: typeof charge.note === "string" ? charge.note : undefined
                }))
            : [],
          reminderState: {
            d3CycleKey: record.reminderState?.d3CycleKey,
            d1CycleKey: record.reminderState?.d1CycleKey,
            overdueDateKey: record.reminderState?.overdueDateKey
          }
        };

        this.records.set(ledgerKey(buildingId, houseNumber), normalizedRecord);
      }
    }

    if (Array.isArray(state.pendingPayments)) {
      for (const payment of state.pendingPayments) {
        if (!payment || !payment.houseNumber || !payment.providerReference) {
          continue;
        }

        const buildingId = normalizeBuildingId(payment.buildingId);
        const houseNumber = normalizeHouseNumber(payment.houseNumber);
        const key = ledgerKey(buildingId, houseNumber);
        const current = this.pendingPayments.get(key) ?? [];
        current.push({
          ...payment,
          buildingId,
          houseNumber,
          provider: normalizeRentPaymentProvider(payment.provider),
          providerReference: normalizeProviderReference(payment.providerReference)
        });
        this.pendingPayments.set(key, current);
      }
    }

    for (const record of this.records.values()) {
      for (const payment of record.payments) {
        this.paymentReferenceIndex.set(normalizeProviderReference(payment.providerReference), {
          event: {
            ...payment,
            buildingId: record.buildingId,
            houseNumber: record.houseNumber
          },
          applied: true
        });
      }
    }

    for (const pending of this.pendingPayments.values()) {
      for (const payment of pending) {
        const key = normalizeProviderReference(payment.providerReference);
        if (this.paymentReferenceIndex.has(key)) {
          continue;
        }

        this.paymentReferenceIndex.set(key, {
          event: { ...payment },
          applied: false
        });
      }
    }
  }

  upsertRentDue(
    buildingId: string,
    houseNumber: string,
    input: UpsertRentDueInput
  ): RentDueSnapshot {
    const normalizedBuildingId = normalizeBuildingId(buildingId);
    const normalizedHouse = normalizeHouseNumber(houseNumber);
    const key = ledgerKey(normalizedBuildingId, normalizedHouse);
    const legacyKey =
      normalizedBuildingId === RENT_LEGACY_BUILDING_ID
        ? null
        : ledgerKey(RENT_LEGACY_BUILDING_ID, normalizedHouse);
    const existing =
      this.records.get(key) ?? (legacyKey ? this.records.get(legacyKey) : undefined);
    const dueCycleKey = isoDateKey(input.dueDate);

    const payments =
      existing?.payments.map((payment) => ({
        ...payment,
        buildingId:
          existing.buildingId === normalizedBuildingId
            ? payment.buildingId
            : normalizedBuildingId,
        houseNumber: normalizedHouse
      })) ?? [];

    const reminderState: ReminderState =
      existing && isoDateKey(existing.dueDate) === dueCycleKey
        ? existing.reminderState
        : {};

    const record: RentDueRecord = {
      buildingId: normalizedBuildingId,
      houseNumber: normalizedHouse,
      monthlyRentKsh: input.monthlyRentKsh,
      balanceKsh: input.balanceKsh,
      dueDate: input.dueDate,
      note: input.note?.trim(),
      updatedAt: nowIso(),
      payments,
      latePenaltyCharges:
        existing?.latePenaltyCharges.map((charge) => ({ ...charge })) ?? [],
      reminderState
    };

    this.records.set(key, record);
    if (legacyKey && this.records.has(legacyKey)) {
      this.records.delete(legacyKey);
    }
    payments.forEach((payment) => {
      this.paymentReferenceIndex.set(payment.providerReference, {
        event: payment,
        applied: true
      });
    });

    this.applyPendingPayments(normalizedBuildingId, normalizedHouse);

    const refreshed = this.records.get(key)!;
    this.emitStateChange();
    return this.toSnapshot(refreshed);
  }

  getRentDue(buildingId: string, houseNumber: string): RentDueSnapshot | null {
    const record = this.resolveRecord(buildingId, houseNumber);
    if (!record) {
      return null;
    }

    if (this.refreshRecordForBilling(record)) {
      this.emitStateChange();
    }
    return this.toSnapshot(record);
  }

  listRentDueRecords(limit = 500, buildingId?: string): RentDueSnapshot[] {
    this.advanceVisibleRecordCycles(buildingId);
    return [...this.records.values()]
      .filter((record) => buildingMatchesScope(record.buildingId, buildingId))
      .map((record) => this.toSnapshot(record))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .slice(0, Math.max(1, limit));
  }

  listPayments(options: ListRentPaymentsOptions = {}): RentPaymentEvent[] {
    this.advanceVisibleRecordCycles(options.buildingId);
    const normalizedBuildingId = options.buildingId
      ? normalizeBuildingId(options.buildingId)
      : undefined;
    const normalizedHouse = options.houseNumber
      ? normalizeHouseNumber(options.houseNumber)
      : undefined;

    if (normalizedHouse && normalizedBuildingId) {
      const exactKey = ledgerKey(normalizedBuildingId, normalizedHouse);
      const legacyKey =
        normalizedBuildingId === RENT_LEGACY_BUILDING_ID
          ? null
          : ledgerKey(RENT_LEGACY_BUILDING_ID, normalizedHouse);

      const resolved = this.records.get(exactKey)?.payments ?? [];
      const pending = this.pendingPayments.get(exactKey) ?? [];
      const legacyResolved = legacyKey ? this.records.get(legacyKey)?.payments ?? [] : [];
      const legacyPending = legacyKey ? this.pendingPayments.get(legacyKey) ?? [] : [];

      return [...resolved, ...pending, ...legacyResolved, ...legacyPending].sort((a, b) =>
        b.paidAt.localeCompare(a.paidAt)
      );
    }

    const resolved = [...this.records.values()]
      .filter((record) => {
        if (!buildingMatchesScope(record.buildingId, normalizedBuildingId)) {
          return false;
        }

        if (normalizedHouse && record.houseNumber !== normalizedHouse) {
          return false;
        }

        return true;
      })
      .flatMap((item) => item.payments);

    const pending = [...this.pendingPayments.values()]
      .flatMap((item) => item)
      .filter((item) => {
        if (!buildingMatchesScope(item.buildingId, normalizedBuildingId)) {
          return false;
        }

        if (normalizedHouse && item.houseNumber !== normalizedHouse) {
          return false;
        }

        return true;
      });

    return [...resolved, ...pending].sort((a, b) => b.paidAt.localeCompare(a.paidAt));
  }

  unrecordCashPayment(
    input: UnrecordRentPaymentInput
  ): UnrecordRentPaymentResult | null {
    const normalizedBuildingId = normalizeBuildingId(input.buildingId);
    const normalizedHouse = normalizeHouseNumber(input.houseNumber);
    const paymentId = String(input.paymentId ?? "").trim();
    if (!paymentId) {
      return null;
    }

    const scopedKeys = [
      ledgerKey(normalizedBuildingId, normalizedHouse),
      ...(normalizedBuildingId === RENT_LEGACY_BUILDING_ID
        ? []
        : [ledgerKey(RENT_LEGACY_BUILDING_ID, normalizedHouse)])
    ];

    for (const key of scopedKeys) {
      const record = this.records.get(key);
      if (!record) {
        continue;
      }

      const paymentIndex = record.payments.findIndex((payment) => payment.id === paymentId);
      if (paymentIndex === -1) {
        continue;
      }

      const event = record.payments[paymentIndex];
      if (!event) {
        return null;
      }
      if (event.provider !== "cash" && event.source !== "manual") {
        throw new Error("Only manually recorded rent payments can be unrecorded.");
      }

      record.payments.splice(paymentIndex, 1);
      record.balanceKsh = Math.max(0, Math.round(record.balanceKsh + event.amountKsh));
      record.updatedAt = nowIso();
      if (record.note === "Rent cleared by CASH payment event.") {
        record.note = undefined;
      }
      this.paymentReferenceIndex.delete(normalizeProviderReference(event.providerReference));
      this.emitStateChange();

      return {
        event: { ...event },
        applied: true,
        snapshot: this.toSnapshot(record)
      };
    }

    for (const key of scopedKeys) {
      const pending = this.pendingPayments.get(key);
      if (!pending) {
        continue;
      }

      const paymentIndex = pending.findIndex((payment) => payment.id === paymentId);
      if (paymentIndex === -1) {
        continue;
      }

      const event = pending[paymentIndex];
      if (!event) {
        return null;
      }
      if (event.provider !== "cash" && event.source !== "manual") {
        throw new Error("Only manually recorded rent payments can be unrecorded.");
      }

      pending.splice(paymentIndex, 1);
      if (pending.length === 0) {
        this.pendingPayments.delete(key);
      }
      this.paymentReferenceIndex.delete(normalizeProviderReference(event.providerReference));
      this.emitStateChange();

      return {
        event: { ...event },
        applied: false,
        snapshot: null
      };
    }

    return null;
  }

  purgeHouse(buildingId: string, houseNumber: string): boolean {
    const normalizedBuildingId = normalizeBuildingId(buildingId);
    const normalizedHouse = normalizeHouseNumber(houseNumber);
    const keys = [
      ledgerKey(normalizedBuildingId, normalizedHouse),
      ledgerKey(RENT_LEGACY_BUILDING_ID, normalizedHouse)
    ];
    const referencesToDelete = new Set<string>();
    let changed = false;

    for (const key of keys) {
      const record = this.records.get(key);
      if (record) {
        record.payments.forEach((payment) => {
          if (payment.providerReference) {
            referencesToDelete.add(payment.providerReference);
          }
        });
        this.records.delete(key);
        changed = true;
      }

      const pending = this.pendingPayments.get(key);
      if (pending && pending.length > 0) {
        pending.forEach((payment) => {
          if (payment.providerReference) {
            referencesToDelete.add(payment.providerReference);
          }
        });
        this.pendingPayments.delete(key);
        changed = true;
      }
    }

    if (!changed) {
      return false;
    }

    referencesToDelete.forEach((reference) => {
      this.paymentReferenceIndex.delete(reference);
    });
    this.emitStateChange();
    return true;
  }

  writeOffHouseBalance(
    buildingId: string,
    houseNumber: string,
    note = "Outstanding rent written off when resident was removed."
  ): WriteOffRentBalanceResult | null {
    const record = this.resolveRecord(buildingId, houseNumber);
    if (!record) {
      return null;
    }

    const advanced = this.refreshRecordForBilling(record);
    const previousBalanceKsh = Math.max(0, Math.round(Number(record.balanceKsh ?? 0)));
    if (previousBalanceKsh > 0) {
      record.balanceKsh = 0;
      record.note = note;
      record.updatedAt = nowIso();
    }

    if (advanced || previousBalanceKsh > 0) {
      this.emitStateChange();
    }

    return {
      buildingId: record.buildingId,
      houseNumber: record.houseNumber,
      previousBalanceKsh,
      snapshot: this.toSnapshot(record)
    };
  }

  recordMpesaPayment(input: RentMpesaCallbackInput): RecordMpesaPaymentResult {
    return this.recordPayment({
      buildingId: input.buildingId ?? "",
      houseNumber: input.houseNumber,
      amountKsh: input.amountKsh,
      provider: "mpesa",
      providerReference: input.providerReference,
      phoneNumber: input.phoneNumber,
      paidAt: input.paidAt,
      billingMonth: input.billingMonth,
      tenantUserId: input.tenantUserId,
      tenantName: input.tenantName,
      paymentProfileId: input.paymentProfileId,
      paymentProfileName: input.paymentProfileName,
      paymentAccountReference: input.paymentAccountReference,
      source: "mpesa"
    });
  }

  recordPayment(input: RecordRentPaymentInput): RecordMpesaPaymentResult {
    const normalizedBuildingId = normalizeBuildingId(input.buildingId);
    const normalizedHouse = normalizeHouseNumber(input.houseNumber);
    const normalizedReference = normalizeProviderReference(input.providerReference);
    const existingReference = this.paymentReferenceIndex.get(normalizedReference);
    if (existingReference) {
      const snapshot = this.resolveRecord(
        existingReference.event.buildingId,
        existingReference.event.houseNumber
      );
      return {
        event: existingReference.event,
        applied: existingReference.applied,
        snapshot: snapshot ? this.toSnapshot(snapshot) : null
      };
    }

    const paidAt = input.paidAt ?? nowIso();
    const billingMonth = input.billingMonth ?? billingMonthFromDateTime(paidAt);
    const event: RentPaymentEvent = {
      id: randomUUID(),
      buildingId: normalizedBuildingId,
      houseNumber: normalizedHouse,
      billingMonth,
      tenantUserId: input.tenantUserId,
      tenantName: input.tenantName,
      provider: normalizeRentPaymentProvider(input.provider),
      providerReference: normalizedReference,
      amountKsh: Math.round(input.amountKsh),
      phoneNumber: input.phoneNumber,
      paymentProfileId: input.paymentProfileId,
      paymentProfileName: input.paymentProfileName,
      paymentAccountReference: input.paymentAccountReference,
      paidAt,
      createdAt: nowIso(),
      source: input.source
    };

    const record = this.resolveRecord(normalizedBuildingId, normalizedHouse);
    if (!record) {
      const key = ledgerKey(normalizedBuildingId, normalizedHouse);
      const current = this.pendingPayments.get(key) ?? [];
      this.pendingPayments.set(key, [event, ...current]);
      this.paymentReferenceIndex.set(event.providerReference, {
        event,
        applied: false
      });
      this.emitStateChange();

      return {
        event,
        applied: false,
        snapshot: null
      };
    }

    this.refreshRecordForBilling(record, new Date(paidAt));

    if (record.buildingId !== normalizedBuildingId) {
      const migratedRecord: RentDueRecord = {
        ...record,
        buildingId: normalizedBuildingId,
        payments: record.payments.map((payment) => ({
          ...payment,
          buildingId: normalizedBuildingId
        }))
      };
      this.records.delete(ledgerKey(record.buildingId, record.houseNumber));
      this.records.set(ledgerKey(normalizedBuildingId, normalizedHouse), migratedRecord);
      record.payments.forEach((payment) => {
        this.paymentReferenceIndex.set(payment.providerReference, {
          event: {
            ...payment,
            buildingId: normalizedBuildingId
          },
          applied: true
        });
      });
      this.applyPaymentToRecord(migratedRecord, event);
      this.refreshRecordForBilling(migratedRecord);
      this.paymentReferenceIndex.set(event.providerReference, {
        event,
        applied: true
      });
      this.emitStateChange();

      return {
        event,
        applied: true,
        snapshot: this.toSnapshot(migratedRecord)
      };
    }

    this.applyPaymentToRecord(record, event);
    this.refreshRecordForBilling(record);
    this.paymentReferenceIndex.set(event.providerReference, {
      event,
      applied: true
    });
    this.emitStateChange();

    return {
      event,
      applied: true,
      snapshot: this.toSnapshot(record)
    };
  }

  collectAutoReminders(buildingId: string, houseNumber: string): RentReminderNotification[] {
    const record = this.resolveRecord(buildingId, houseNumber);
    if (!record) {
      return [];
    }

    const advanced = this.refreshRecordForBilling(record);
    if (record.balanceKsh <= 0) {
      if (advanced) {
        this.emitStateChange();
      }
      return [];
    }

    const now = new Date();
    const daysToDue = dayDiff(now, toUtcDate(record.dueDate));
    const dueCycleKey = isoDateKey(record.dueDate);
    const createdAt = now.toISOString();
    const reminders: RentReminderNotification[] = [];
    const dedupeBase = `${record.buildingId}-${record.houseNumber}`;

    if (daysToDue === 3 && record.reminderState.d3CycleKey !== dueCycleKey) {
      record.reminderState.d3CycleKey = dueCycleKey;
      reminders.push({
        buildingId: record.buildingId,
        houseNumber: record.houseNumber,
        title: "Rent Reminder (D-3)",
        message: `Rent balance KSh ${record.balanceKsh.toLocaleString("en-US")} is due in 3 days.`,
        level: "info",
        createdAt,
        dedupeKey: `rent-reminder-d3-${dedupeBase}-${dueCycleKey}`
      });
    }

    if (daysToDue === 1 && record.reminderState.d1CycleKey !== dueCycleKey) {
      record.reminderState.d1CycleKey = dueCycleKey;
      reminders.push({
        buildingId: record.buildingId,
        houseNumber: record.houseNumber,
        title: "Rent Reminder (D-1)",
        message: `Rent balance KSh ${record.balanceKsh.toLocaleString("en-US")} is due tomorrow.`,
        level: "warning",
        createdAt,
        dedupeKey: `rent-reminder-d1-${dedupeBase}-${dueCycleKey}`
      });
    }

    if (daysToDue < 0) {
      const todayKey = isoDateKey(createdAt);
      if (record.reminderState.overdueDateKey !== todayKey) {
        record.reminderState.overdueDateKey = todayKey;
        reminders.push({
          buildingId: record.buildingId,
          houseNumber: record.houseNumber,
          title: "Rent Overdue",
          message: `Rent is overdue by ${Math.abs(daysToDue)} day(s). Outstanding balance is KSh ${record.balanceKsh.toLocaleString("en-US")}.`,
          level: "warning",
          createdAt,
          dedupeKey: `rent-reminder-overdue-${dedupeBase}-${todayKey}`
        });
      }
    }

    if (advanced || reminders.length > 0) {
      this.emitStateChange();
    }

    return reminders;
  }

  listCollectionStatus(limit = 500, buildingId?: string) {
    this.advanceVisibleRecordCycles(buildingId);
    return [...this.records.values()]
      .filter((record) => buildingMatchesScope(record.buildingId, buildingId))
      .map((record) => {
        const snapshot = this.toSnapshot(record);
        const latestPayment = record.payments[0];
        return {
          buildingId: snapshot.buildingId,
          houseNumber: snapshot.houseNumber,
          monthlyRentKsh: snapshot.monthlyRentKsh,
          balanceKsh: snapshot.balanceKsh,
          dueDate: snapshot.dueDate,
          paymentStatus: snapshot.paymentStatus,
          paidAmountKsh: snapshot.paidAmountKsh,
          currentBillingMonth: snapshot.currentBillingMonth,
          currentMonthPaidKsh: snapshot.currentMonthPaidKsh,
          currentMonthOutstandingKsh: snapshot.currentMonthOutstandingKsh,
          arrearsKsh: snapshot.arrearsKsh,
          totalPaidKsh: snapshot.totalPaidKsh,
          currentMonthLatePenaltyKsh: snapshot.currentMonthLatePenaltyKsh,
          totalLatePenaltyKsh: snapshot.totalLatePenaltyKsh,
          latePenaltyCharges: snapshot.latePenaltyCharges,
          latestPaymentReference: latestPayment?.providerReference,
          latestPaymentAt: latestPayment?.paidAt,
          latestPaymentAmountKsh: latestPayment?.amountKsh
        };
      })
      .sort((a, b) =>
        `${a.buildingId}:${a.houseNumber}`.localeCompare(`${b.buildingId}:${b.houseNumber}`)
      )
      .slice(0, Math.max(1, limit));
  }

  private resolveRecord(buildingId: string, houseNumber: string): RentDueRecord | undefined {
    const normalizedBuildingId = normalizeBuildingId(buildingId);
    const normalizedHouse = normalizeHouseNumber(houseNumber);
    return (
      this.records.get(ledgerKey(normalizedBuildingId, normalizedHouse)) ??
      (normalizedBuildingId !== RENT_LEGACY_BUILDING_ID
        ? this.records.get(ledgerKey(RENT_LEGACY_BUILDING_ID, normalizedHouse))
        : undefined)
    );
  }

  private advanceVisibleRecordCycles(buildingId?: string) {
    let changed = false;

    for (const record of this.records.values()) {
      if (!buildingMatchesScope(record.buildingId, buildingId)) {
        continue;
      }

      changed = this.refreshRecordForBilling(record) || changed;
    }

    if (changed) {
      this.emitStateChange();
    }
  }

  private refreshRecordForBilling(record: RentDueRecord, now = new Date()): boolean {
    return this.advanceRecordCyclesIfNeeded(record, now);
  }

  private advanceRecordCyclesIfNeeded(record: RentDueRecord, now = new Date()): boolean {
    if (!Number.isFinite(record.monthlyRentKsh) || record.monthlyRentKsh <= 0) {
      return this.applyLatePenaltyIfNeeded(record, now);
    }

    let changed = this.applyLatePenaltyIfNeeded(record, now);
    let nextDueDate = addMonthsPreservingUtcDay(record.dueDate, 1);
    let nextWindowStart = subtractUtcDays(nextDueDate, RENT_ROLLOVER_WINDOW_DAYS);

    while (Date.parse(nextWindowStart) <= now.getTime()) {
      changed = this.applyLatePenaltyIfNeeded(record, now) || changed;
      const billingMonth = billingMonthFromDateTime(nextDueDate);
      const isHeld =
        this.billingHoldPredicate?.({
          buildingId: record.buildingId,
          houseNumber: record.houseNumber,
          billingMonth,
          dueDate: nextDueDate
        }) ?? false;

      if (!isHeld) {
        record.balanceKsh =
          Math.max(0, Number(record.balanceKsh ?? 0)) + record.monthlyRentKsh;
      }
      record.dueDate = nextDueDate;
      record.updatedAt = nowIso();
      record.reminderState = {};
      changed = true;

      nextDueDate = addMonthsPreservingUtcDay(record.dueDate, 1);
      nextWindowStart = subtractUtcDays(nextDueDate, RENT_ROLLOVER_WINDOW_DAYS);
    }

    changed = this.applyLatePenaltyIfNeeded(record, now) || changed;
    return changed;
  }

  private applyLatePenaltyIfNeeded(record: RentDueRecord, now = new Date()): boolean {
    const policy = normalizeLatePenaltyPolicy(
      this.latePenaltyPolicyResolver?.(record.buildingId)
    );
    if (!policy.enabled || policy.amountKsh <= 0) {
      return false;
    }

    if (Math.max(0, Number(record.balanceKsh ?? 0)) <= 0) {
      return false;
    }

    const dueDate = new Date(record.dueDate);
    if (Number.isNaN(dueDate.getTime())) {
      return false;
    }

    const billingMonth = billingMonthFromDateTime(record.dueDate);
    const alreadyApplied = (record.latePenaltyCharges ?? []).some(
      (charge) => charge.billingMonth === billingMonth
    );
    if (alreadyApplied) {
      return false;
    }

    const isHeld =
      this.billingHoldPredicate?.({
        buildingId: record.buildingId,
        houseNumber: record.houseNumber,
        billingMonth,
        dueDate: record.dueDate
      }) ?? false;
    if (isHeld) {
      return false;
    }

    const penaltyStartsAt = new Date(dueDate);
    penaltyStartsAt.setUTCDate(penaltyStartsAt.getUTCDate() + policy.graceDays);
    if (now.getTime() <= penaltyStartsAt.getTime()) {
      return false;
    }

    const appliedAt = nowIso();
    const charge: RentLatePenaltyCharge = {
      id: randomUUID(),
      billingMonth,
      amountKsh: policy.amountKsh,
      dueDate: record.dueDate,
      appliedAt,
      note: `Fixed late rent penalty after ${policy.graceDays} grace day${
        policy.graceDays === 1 ? "" : "s"
      }.`
    };
    record.latePenaltyCharges = [...(record.latePenaltyCharges ?? []), charge];
    record.balanceKsh = Math.max(0, Math.round(Number(record.balanceKsh ?? 0))) + policy.amountKsh;
    record.updatedAt = appliedAt;
    return true;
  }

  private applyPendingPayments(buildingId: string, houseNumber: string) {
    const key = ledgerKey(buildingId, houseNumber);
    const record = this.records.get(key);
    if (!record) {
      return;
    }

    const pendingKeys = [key];
    const legacyKey =
      record.buildingId === RENT_LEGACY_BUILDING_ID
        ? null
        : ledgerKey(RENT_LEGACY_BUILDING_ID, record.houseNumber);
    if (legacyKey) {
      pendingKeys.push(legacyKey);
    }

    const byOldestFirst = pendingKeys
      .flatMap((pendingKey) => this.pendingPayments.get(pendingKey) ?? [])
      .sort((a, b) => a.paidAt.localeCompare(b.paidAt));

    if (byOldestFirst.length === 0) {
      return;
    }

    for (const event of byOldestFirst) {
      const normalizedEvent = {
        ...event,
        buildingId: record.buildingId,
        houseNumber: record.houseNumber
      };
      this.applyPaymentToRecord(record, normalizedEvent);
      this.paymentReferenceIndex.set(normalizedEvent.providerReference, {
        event: normalizedEvent,
        applied: true
      });
    }

    pendingKeys.forEach((pendingKey) => {
      this.pendingPayments.delete(pendingKey);
    });
  }

  private applyPaymentToRecord(record: RentDueRecord, event: RentPaymentEvent) {
    record.payments.unshift({
      ...event,
      buildingId: record.buildingId,
      houseNumber: record.houseNumber
    });
    record.balanceKsh = Math.max(0, record.balanceKsh - event.amountKsh);
    record.updatedAt = nowIso();

    if (record.balanceKsh === 0 && !record.note?.trim()) {
      record.note = `Rent cleared by ${event.provider.toUpperCase()} payment event.`;
    }
  }

  private emitStateChange(): void {
    if (!this.stateChangeHandler) {
      return;
    }

    const snapshot = this.exportState();
    void Promise.resolve(this.stateChangeHandler(snapshot)).catch((error) => {
      console.error("Failed to persist rent ledger state", error);
    });
  }

  private toSnapshot(record: RentDueRecord): RentDueSnapshot {
    const dueDate = toUtcDate(record.dueDate);
    const safeDueDate = Number.isNaN(dueDate.getTime()) ? new Date() : dueDate;
    const daysToDue = dayDiff(new Date(), safeDueDate);
    const policy = normalizeLatePenaltyPolicy(
      this.latePenaltyPolicyResolver?.(record.buildingId)
    );
    const overdueStartsAtDate = new Date(safeDueDate);
    overdueStartsAtDate.setUTCDate(overdueStartsAtDate.getUTCDate() + policy.graceDays);
    const balanceKsh = Math.max(0, Number(record.balanceKsh ?? 0));
    const monthlyRentKsh = Math.max(0, Number(record.monthlyRentKsh ?? 0));
    const currentBillingMonth = billingMonthFromDateTime(record.dueDate);
    const currentMonthLatePenaltyKsh = (record.latePenaltyCharges ?? [])
      .filter((charge) => charge.billingMonth === currentBillingMonth)
      .reduce((sum, charge) => sum + Math.max(0, Number(charge.amountKsh ?? 0)), 0);
    const totalLatePenaltyKsh = (record.latePenaltyCharges ?? []).reduce(
      (sum, charge) => sum + Math.max(0, Number(charge.amountKsh ?? 0)),
      0
    );
    const currentCycleChargeKsh = monthlyRentKsh + currentMonthLatePenaltyKsh;
    const currentMonthOutstandingKsh =
      currentCycleChargeKsh > 0 ? Math.min(balanceKsh, currentCycleChargeKsh) : balanceKsh;
    const currentMonthPaidKsh =
      currentCycleChargeKsh > 0
        ? Math.max(0, currentCycleChargeKsh - currentMonthOutstandingKsh)
        : 0;
    const totalPaidKsh = record.payments.reduce(
      (sum, payment) => sum + Math.max(0, Number(payment.amountKsh ?? 0)),
      0
    );

    return {
      buildingId: record.buildingId,
      houseNumber: record.houseNumber,
      monthlyRentKsh,
      balanceKsh,
      dueDate: record.dueDate,
      note: record.note,
      updatedAt: record.updatedAt,
      payments: [...record.payments],
      latePenaltyCharges: [...(record.latePenaltyCharges ?? [])],
      status: getStatus(record.balanceKsh, daysToDue),
      paymentStatus: paymentStatusForRecord(record),
      currentBillingMonth,
      paidAmountKsh: currentMonthPaidKsh,
      currentMonthPaidKsh,
      currentMonthOutstandingKsh,
      arrearsKsh: Math.max(0, balanceKsh - currentMonthOutstandingKsh),
      totalPaidKsh,
      currentMonthLatePenaltyKsh,
      totalLatePenaltyKsh,
      graceDays: policy.graceDays,
      overdueStartsAt: overdueStartsAtDate.toISOString(),
      daysToOverdue: dayDiff(new Date(), overdueStartsAtDate),
      daysToDue
    };
  }
}
