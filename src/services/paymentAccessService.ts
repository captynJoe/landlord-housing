import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import path from "node:path";

export type PaymentChannel = "rent" | "water" | "electricity";

export interface BuildingPaymentAccessRecord {
  buildingId: string;
  rentEnabled: boolean;
  waterEnabled: boolean;
  electricityEnabled: boolean;
  updatedAt: string;
  updatedByRole?: string;
  updatedByUserId?: string;
  note?: string;
}

type StoredRecord = Omit<BuildingPaymentAccessRecord, "buildingId">;

export interface PaymentAccessPersistedState {
  records: BuildingPaymentAccessRecord[];
}

type PaymentAccessStateChangeHandler = (
  state: PaymentAccessPersistedState
) => void | Promise<void>;

const DEFAULT_RECORD: StoredRecord = {
  rentEnabled: true,
  waterEnabled: true,
  electricityEnabled: true,
  updatedAt: ""
};

function normalizeBuildingId(value: string): string {
  return String(value ?? "").trim();
}

export class PaymentAccessService {
  private readonly filePath: string;
  private readonly records = new Map<string, StoredRecord>();
  private stateChangeHandler?: PaymentAccessStateChangeHandler;

  constructor(filePath = path.resolve(process.cwd(), "data", "payment-access-controls.json")) {
    this.filePath = filePath;
    this.loadFromDisk();
  }

  setStateChangeHandler(handler?: PaymentAccessStateChangeHandler): void {
    this.stateChangeHandler = handler;
  }

  exportState(): PaymentAccessPersistedState {
    const records = [...this.records.entries()]
      .map(([buildingId, value]) => ({
        buildingId,
        rentEnabled: Boolean(value.rentEnabled),
        waterEnabled: Boolean(value.waterEnabled),
        electricityEnabled: Boolean(value.electricityEnabled),
        updatedAt: value.updatedAt || new Date(0).toISOString(),
        updatedByRole: value.updatedByRole,
        updatedByUserId: value.updatedByUserId,
        note: value.note
      }))
      .sort((a, b) => a.buildingId.localeCompare(b.buildingId));

    return { records };
  }

  importState(state: PaymentAccessPersistedState | null | undefined): void {
    this.records.clear();

    if (!state || !Array.isArray(state.records)) {
      return;
    }

    for (const row of state.records) {
      if (!row || !row.buildingId) {
        continue;
      }

      const buildingId = normalizeBuildingId(row.buildingId);
      if (!buildingId) {
        continue;
      }

      this.records.set(buildingId, {
        rentEnabled:
          typeof row.rentEnabled === "boolean"
            ? row.rentEnabled
            : DEFAULT_RECORD.rentEnabled,
        waterEnabled:
          typeof row.waterEnabled === "boolean"
            ? row.waterEnabled
            : DEFAULT_RECORD.waterEnabled,
        electricityEnabled:
          typeof row.electricityEnabled === "boolean"
            ? row.electricityEnabled
            : DEFAULT_RECORD.electricityEnabled,
        updatedAt:
          typeof row.updatedAt === "string" && row.updatedAt
            ? row.updatedAt
            : new Date(0).toISOString(),
        updatedByRole: typeof row.updatedByRole === "string" ? row.updatedByRole : undefined,
        updatedByUserId:
          typeof row.updatedByUserId === "string" ? row.updatedByUserId : undefined,
        note: typeof row.note === "string" ? row.note : undefined
      });
    }

    this.persistToDisk();
  }

  getForBuilding(buildingId: string): BuildingPaymentAccessRecord {
    const normalizedBuildingId = normalizeBuildingId(buildingId);
    const current = this.records.get(normalizedBuildingId) ?? DEFAULT_RECORD;
    return {
      buildingId: normalizedBuildingId,
      rentEnabled: Boolean(current.rentEnabled),
      waterEnabled: Boolean(current.waterEnabled),
      electricityEnabled: Boolean(current.electricityEnabled),
      updatedAt: current.updatedAt || new Date(0).toISOString(),
      updatedByRole: current.updatedByRole,
      updatedByUserId: current.updatedByUserId,
      note: current.note
    };
  }

  isEnabled(buildingId: string, channel: PaymentChannel): boolean {
    const current = this.getForBuilding(buildingId);
    if (channel === "rent") {
      return current.rentEnabled;
    }
    if (channel === "water") {
      return current.waterEnabled;
    }
    return current.electricityEnabled;
  }

  listForBuildings(buildingIds: string[]): BuildingPaymentAccessRecord[] {
    return buildingIds.map((buildingId) => this.getForBuilding(buildingId));
  }

  updateForBuilding(
    buildingId: string,
    input: {
      rentEnabled?: boolean;
      waterEnabled?: boolean;
      electricityEnabled?: boolean;
      note?: string;
    },
    actor?: {
      role?: string;
      userId?: string;
    }
  ): BuildingPaymentAccessRecord {
    const normalizedBuildingId = normalizeBuildingId(buildingId);
    const current = this.getForBuilding(normalizedBuildingId);
    const updated: BuildingPaymentAccessRecord = {
      ...current,
      rentEnabled:
        typeof input.rentEnabled === "boolean" ? input.rentEnabled : current.rentEnabled,
      waterEnabled:
        typeof input.waterEnabled === "boolean"
          ? input.waterEnabled
          : current.waterEnabled,
      electricityEnabled:
        typeof input.electricityEnabled === "boolean"
          ? input.electricityEnabled
          : current.electricityEnabled,
      updatedAt: new Date().toISOString(),
      updatedByRole: actor?.role,
      updatedByUserId: actor?.userId,
      note: input.note?.trim() || undefined
    };

    this.records.set(normalizedBuildingId, {
      rentEnabled: updated.rentEnabled,
      waterEnabled: updated.waterEnabled,
      electricityEnabled: updated.electricityEnabled,
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
      console.error("Failed to persist payment access state", error);
    });
  }

  private loadFromDisk(): void {
    try {
      const raw = readFileSync(this.filePath, "utf8");
      const parsed = JSON.parse(raw) as Record<string, Partial<StoredRecord>>;
      Object.entries(parsed).forEach(([buildingId, value]) => {
        const normalizedBuildingId = normalizeBuildingId(buildingId);
        if (!normalizedBuildingId) {
          return;
        }

        this.records.set(normalizedBuildingId, {
          rentEnabled:
            typeof value.rentEnabled === "boolean"
              ? value.rentEnabled
              : DEFAULT_RECORD.rentEnabled,
          waterEnabled:
            typeof value.waterEnabled === "boolean"
              ? value.waterEnabled
              : DEFAULT_RECORD.waterEnabled,
          electricityEnabled:
            typeof value.electricityEnabled === "boolean"
              ? value.electricityEnabled
              : DEFAULT_RECORD.electricityEnabled,
          updatedAt:
            typeof value.updatedAt === "string" && value.updatedAt
              ? value.updatedAt
              : new Date(0).toISOString(),
          updatedByRole:
            typeof value.updatedByRole === "string" ? value.updatedByRole : undefined,
          updatedByUserId:
            typeof value.updatedByUserId === "string"
              ? value.updatedByUserId
              : undefined,
          note: typeof value.note === "string" ? value.note : undefined
        });
      });
    } catch (_error) {
      // Missing or malformed file falls back to defaults.
    }
  }

  private persistToDisk(): void {
    const dir = path.dirname(this.filePath);
    mkdirSync(dir, { recursive: true });

    const payload: Record<string, StoredRecord> = {};
    this.records.forEach((value, key) => {
      payload[key] = value;
    });

    const tempPath = `${this.filePath}.tmp`;
    writeFileSync(tempPath, JSON.stringify(payload, null, 2), "utf8");
    renameSync(tempPath, this.filePath);
  }
}
