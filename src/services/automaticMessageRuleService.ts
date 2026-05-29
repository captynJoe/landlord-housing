export type AutomaticMessageKind =
  | "payment_receipt"
  | "rent_reminder"
  | "utility_reminder"
  | "overdue_notice"
  | "general";

export interface AutomaticMessageRules {
  paymentReceiptsEnabled: boolean;
  rentRemindersEnabled: boolean;
  utilityRemindersEnabled: boolean;
  overdueNoticesEnabled: boolean;
}

export interface AutomaticMessageRuleRecord extends AutomaticMessageRules {
  buildingId: string;
  updatedAt: string;
}

export interface AutomaticMessageRulePersistedState {
  rules: AutomaticMessageRuleRecord[];
}

export type AutomaticMessageRuleStateChangeHandler = (
  state: AutomaticMessageRulePersistedState
) => void | Promise<void>;

export const DEFAULT_AUTOMATIC_MESSAGE_RULES: AutomaticMessageRules = {
  paymentReceiptsEnabled: true,
  rentRemindersEnabled: true,
  utilityRemindersEnabled: true,
  overdueNoticesEnabled: true
};

function normalizeBuildingId(value: unknown): string {
  return String(value ?? "").trim();
}

function normalizeBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function normalizeIsoDate(value: unknown): string {
  const raw = String(value ?? "").trim();
  const date = raw ? new Date(raw) : new Date();
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

function normalizeRules(
  value: Partial<AutomaticMessageRules> | null | undefined
): AutomaticMessageRules {
  return {
    paymentReceiptsEnabled: normalizeBoolean(
      value?.paymentReceiptsEnabled,
      DEFAULT_AUTOMATIC_MESSAGE_RULES.paymentReceiptsEnabled
    ),
    rentRemindersEnabled: normalizeBoolean(
      value?.rentRemindersEnabled,
      DEFAULT_AUTOMATIC_MESSAGE_RULES.rentRemindersEnabled
    ),
    utilityRemindersEnabled: normalizeBoolean(
      value?.utilityRemindersEnabled,
      DEFAULT_AUTOMATIC_MESSAGE_RULES.utilityRemindersEnabled
    ),
    overdueNoticesEnabled: normalizeBoolean(
      value?.overdueNoticesEnabled,
      DEFAULT_AUTOMATIC_MESSAGE_RULES.overdueNoticesEnabled
    )
  };
}

function cloneRecord(record: AutomaticMessageRuleRecord): AutomaticMessageRuleRecord {
  return { ...record };
}

export class AutomaticMessageRuleService {
  private readonly rulesByBuildingId = new Map<string, AutomaticMessageRuleRecord>();
  private stateChangeHandler?: AutomaticMessageRuleStateChangeHandler;

  setStateChangeHandler(handler?: AutomaticMessageRuleStateChangeHandler): void {
    this.stateChangeHandler = handler;
  }

  importState(state: AutomaticMessageRulePersistedState | null | undefined): void {
    this.rulesByBuildingId.clear();

    if (!state || !Array.isArray(state.rules)) {
      return;
    }

    for (const item of state.rules) {
      const buildingId = normalizeBuildingId(item?.buildingId);
      if (!buildingId) {
        continue;
      }

      this.rulesByBuildingId.set(buildingId, {
        buildingId,
        ...normalizeRules(item),
        updatedAt: normalizeIsoDate(item.updatedAt)
      });
    }
  }

  exportState(): AutomaticMessageRulePersistedState {
    return {
      rules: [...this.rulesByBuildingId.values()]
        .sort((a, b) => a.buildingId.localeCompare(b.buildingId))
        .map(cloneRecord)
    };
  }

  getForBuilding(buildingId: string): AutomaticMessageRuleRecord {
    const normalizedBuildingId = normalizeBuildingId(buildingId);
    const existing = this.rulesByBuildingId.get(normalizedBuildingId);
    if (existing) {
      return cloneRecord(existing);
    }

    return {
      buildingId: normalizedBuildingId,
      ...DEFAULT_AUTOMATIC_MESSAGE_RULES,
      updatedAt: new Date(0).toISOString()
    };
  }

  updateForBuilding(
    buildingId: string,
    patch: Partial<AutomaticMessageRules>
  ): AutomaticMessageRuleRecord {
    const normalizedBuildingId = normalizeBuildingId(buildingId);
    if (!normalizedBuildingId) {
      throw new Error("BUILDING_ID_REQUIRED");
    }

    const current = this.getForBuilding(normalizedBuildingId);
    const nextRules: AutomaticMessageRules = { ...current };
    if (typeof patch.paymentReceiptsEnabled === "boolean") {
      nextRules.paymentReceiptsEnabled = patch.paymentReceiptsEnabled;
    }
    if (typeof patch.rentRemindersEnabled === "boolean") {
      nextRules.rentRemindersEnabled = patch.rentRemindersEnabled;
    }
    if (typeof patch.utilityRemindersEnabled === "boolean") {
      nextRules.utilityRemindersEnabled = patch.utilityRemindersEnabled;
    }
    if (typeof patch.overdueNoticesEnabled === "boolean") {
      nextRules.overdueNoticesEnabled = patch.overdueNoticesEnabled;
    }

    const updated: AutomaticMessageRuleRecord = {
      buildingId: normalizedBuildingId,
      ...normalizeRules(nextRules),
      updatedAt: new Date().toISOString()
    };

    this.rulesByBuildingId.set(normalizedBuildingId, updated);
    this.emitStateChange();
    return cloneRecord(updated);
  }

  allows(buildingId: string, kind: AutomaticMessageKind): boolean {
    const rules = this.getForBuilding(buildingId);
    if (kind === "payment_receipt") {
      return rules.paymentReceiptsEnabled;
    }
    if (kind === "rent_reminder") {
      return rules.rentRemindersEnabled;
    }
    if (kind === "utility_reminder") {
      return rules.utilityRemindersEnabled;
    }
    if (kind === "overdue_notice") {
      return rules.overdueNoticesEnabled;
    }

    return true;
  }

  private emitStateChange(): void {
    if (!this.stateChangeHandler) {
      return;
    }

    const snapshot = this.exportState();
    void Promise.resolve(this.stateChangeHandler(snapshot)).catch((error) => {
      console.error("Failed to persist automatic message rules", error);
    });
  }
}
