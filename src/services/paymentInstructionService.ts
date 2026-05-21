import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import path from "node:path";

export type PaymentInstructionMethod = "mpesa" | "bank" | "cash" | "manual";

export interface BuildingPaymentInstructionsRecord {
  buildingId: string;
  primaryMethod: PaymentInstructionMethod;
  mpesaBusinessNumber?: string;
  mpesaAccountReference?: string;
  mpesaAccountName?: string;
  bankName?: string;
  bankAccountName?: string;
  bankAccountNumber?: string;
  bankBranch?: string;
  bankSwiftCode?: string;
  cashLocation?: string;
  instructions?: string;
  proofInstructions?: string;
  updatedAt: string;
  updatedByRole?: string;
  updatedByUserId?: string;
  note?: string;
}

export interface PaymentInstructionsPersistedState {
  records: BuildingPaymentInstructionsRecord[];
}

type PaymentInstructionsStateChangeHandler = (
  state: PaymentInstructionsPersistedState
) => void | Promise<void>;

type StoredRecord = Omit<BuildingPaymentInstructionsRecord, "buildingId">;

const DEFAULT_RECORD: StoredRecord = {
  primaryMethod: "mpesa",
  updatedAt: ""
};

function normalizeBuildingId(value: string | undefined): string {
  return String(value ?? "").trim();
}

function normalizeOptionalString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.trim();
  return normalized || undefined;
}

function normalizeMethod(value: unknown): PaymentInstructionMethod {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (
    normalized === "bank" ||
    normalized === "cash" ||
    normalized === "manual" ||
    normalized === "mpesa"
  ) {
    return normalized;
  }

  return DEFAULT_RECORD.primaryMethod;
}

function normalizeRecord(
  buildingId: string,
  value: Partial<BuildingPaymentInstructionsRecord> | null | undefined
): BuildingPaymentInstructionsRecord {
  return {
    buildingId: normalizeBuildingId(buildingId),
    primaryMethod: normalizeMethod(value?.primaryMethod),
    mpesaBusinessNumber: normalizeOptionalString(value?.mpesaBusinessNumber),
    mpesaAccountReference: normalizeOptionalString(value?.mpesaAccountReference),
    mpesaAccountName: normalizeOptionalString(value?.mpesaAccountName),
    bankName: normalizeOptionalString(value?.bankName),
    bankAccountName: normalizeOptionalString(value?.bankAccountName),
    bankAccountNumber: normalizeOptionalString(value?.bankAccountNumber),
    bankBranch: normalizeOptionalString(value?.bankBranch),
    bankSwiftCode: normalizeOptionalString(value?.bankSwiftCode),
    cashLocation: normalizeOptionalString(value?.cashLocation),
    instructions: normalizeOptionalString(value?.instructions),
    proofInstructions: normalizeOptionalString(value?.proofInstructions),
    updatedAt: normalizeOptionalString(value?.updatedAt) ?? new Date(0).toISOString(),
    updatedByRole: normalizeOptionalString(value?.updatedByRole),
    updatedByUserId: normalizeOptionalString(value?.updatedByUserId),
    note: normalizeOptionalString(value?.note)
  };
}

export class PaymentInstructionService {
  private readonly filePath: string;
  private readonly records = new Map<string, StoredRecord>();
  private stateChangeHandler?: PaymentInstructionsStateChangeHandler;

  constructor(
    filePath = path.resolve(process.cwd(), "data", "payment-instructions.json")
  ) {
    this.filePath = filePath;
    this.loadFromDisk();
  }

  setStateChangeHandler(handler?: PaymentInstructionsStateChangeHandler): void {
    this.stateChangeHandler = handler;
  }

  exportState(): PaymentInstructionsPersistedState {
    return {
      records: [...this.records.entries()]
        .map(([buildingId, value]) =>
          normalizeRecord(buildingId, {
            buildingId,
            ...value
          })
        )
        .sort((a, b) => a.buildingId.localeCompare(b.buildingId))
    };
  }

  importState(state: PaymentInstructionsPersistedState | null | undefined): void {
    this.records.clear();

    if (!state || !Array.isArray(state.records)) {
      return;
    }

    for (const row of state.records) {
      const buildingId = normalizeBuildingId(row?.buildingId);
      if (!buildingId) {
        continue;
      }

      const normalized = normalizeRecord(buildingId, row);
      this.records.set(buildingId, {
        primaryMethod: normalized.primaryMethod,
        mpesaBusinessNumber: normalized.mpesaBusinessNumber,
        mpesaAccountReference: normalized.mpesaAccountReference,
        mpesaAccountName: normalized.mpesaAccountName,
        bankName: normalized.bankName,
        bankAccountName: normalized.bankAccountName,
        bankAccountNumber: normalized.bankAccountNumber,
        bankBranch: normalized.bankBranch,
        bankSwiftCode: normalized.bankSwiftCode,
        cashLocation: normalized.cashLocation,
        instructions: normalized.instructions,
        proofInstructions: normalized.proofInstructions,
        updatedAt: normalized.updatedAt,
        updatedByRole: normalized.updatedByRole,
        updatedByUserId: normalized.updatedByUserId,
        note: normalized.note
      });
    }

    this.persistToDisk();
  }

  getForBuilding(buildingId: string): BuildingPaymentInstructionsRecord {
    const normalizedBuildingId = normalizeBuildingId(buildingId);
    const current = this.records.get(normalizedBuildingId) ?? DEFAULT_RECORD;
    return normalizeRecord(normalizedBuildingId, {
      buildingId: normalizedBuildingId,
      ...current
    });
  }

  listForBuildings(buildingIds: string[]): BuildingPaymentInstructionsRecord[] {
    return buildingIds.map((buildingId) => this.getForBuilding(buildingId));
  }

  updateForBuilding(
    buildingId: string,
    input: Partial<BuildingPaymentInstructionsRecord>,
    actor?: {
      role?: string;
      userId?: string;
    }
  ): BuildingPaymentInstructionsRecord {
    const normalizedBuildingId = normalizeBuildingId(buildingId);
    const current = this.getForBuilding(normalizedBuildingId);
    const updated = normalizeRecord(normalizedBuildingId, {
      ...current,
      ...input,
      updatedAt: new Date().toISOString(),
      updatedByRole: actor?.role,
      updatedByUserId: actor?.userId
    });

    this.records.set(normalizedBuildingId, {
      primaryMethod: updated.primaryMethod,
      mpesaBusinessNumber: updated.mpesaBusinessNumber,
      mpesaAccountReference: updated.mpesaAccountReference,
      mpesaAccountName: updated.mpesaAccountName,
      bankName: updated.bankName,
      bankAccountName: updated.bankAccountName,
      bankAccountNumber: updated.bankAccountNumber,
      bankBranch: updated.bankBranch,
      bankSwiftCode: updated.bankSwiftCode,
      cashLocation: updated.cashLocation,
      instructions: updated.instructions,
      proofInstructions: updated.proofInstructions,
      updatedAt: updated.updatedAt,
      updatedByRole: updated.updatedByRole,
      updatedByUserId: updated.updatedByUserId,
      note: updated.note
    });
    this.persistToDisk();
    this.emitStateChange();

    return updated;
  }

  removeBuilding(buildingId: string): boolean {
    const normalizedBuildingId = normalizeBuildingId(buildingId);
    if (!normalizedBuildingId) {
      return false;
    }

    const deleted = this.records.delete(normalizedBuildingId);
    if (!deleted) {
      return false;
    }

    this.persistToDisk();
    this.emitStateChange();
    return true;
  }

  private emitStateChange(): void {
    if (!this.stateChangeHandler) {
      return;
    }

    const snapshot = this.exportState();
    void Promise.resolve(this.stateChangeHandler(snapshot)).catch((error) => {
      console.error("Failed to persist payment instructions state", error);
    });
  }

  private loadFromDisk(): void {
    try {
      const raw = readFileSync(this.filePath, "utf8");
      const parsed = JSON.parse(raw) as PaymentInstructionsPersistedState;
      this.importState(parsed);
    } catch {
      // Missing local fallback file is normal when AppState persistence is used.
    }
  }

  private persistToDisk(): void {
    try {
      mkdirSync(path.dirname(this.filePath), { recursive: true });
      const tmpPath = `${this.filePath}.tmp`;
      writeFileSync(tmpPath, JSON.stringify(this.exportState(), null, 2), "utf8");
      renameSync(tmpPath, this.filePath);
    } catch (error) {
      console.error("Failed to persist payment instructions to disk", error);
    }
  }
}
