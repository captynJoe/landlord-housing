export interface ResidentNotificationPreferenceRecord {
  userId: string;
  smsEnabled: boolean;
  rentEnabled: boolean;
  utilityEnabled: boolean;
  supportEnabled: boolean;
  updatedAt: string;
}

export interface ResidentNotificationPreferencePersistedState {
  records: ResidentNotificationPreferenceRecord[];
}

export interface UpdateResidentNotificationPreferenceInput {
  smsEnabled?: boolean;
  rentEnabled?: boolean;
  utilityEnabled?: boolean;
  supportEnabled?: boolean;
}

type ResidentNotificationPreferenceStateChangeHandler = (
  state: ResidentNotificationPreferencePersistedState
) => void | Promise<void>;

const DEFAULT_PREFERENCES = {
  smsEnabled: true,
  rentEnabled: true,
  utilityEnabled: true,
  supportEnabled: false
} as const;

function nowIso(): string {
  return new Date().toISOString();
}

function normalizeUserId(value: string): string {
  return String(value ?? "").trim();
}

function createDefaultRecord(userId: string): ResidentNotificationPreferenceRecord {
  return {
    userId: normalizeUserId(userId),
    ...DEFAULT_PREFERENCES,
    updatedAt: nowIso()
  };
}

export class ResidentNotificationPreferenceService {
  private readonly records = new Map<string, ResidentNotificationPreferenceRecord>();
  private stateChangeHandler?: ResidentNotificationPreferenceStateChangeHandler;

  setStateChangeHandler(
    handler?: ResidentNotificationPreferenceStateChangeHandler
  ): void {
    this.stateChangeHandler = handler;
  }

  importState(
    state: ResidentNotificationPreferencePersistedState | null | undefined
  ): void {
    this.records.clear();

    if (!state || !Array.isArray(state.records)) {
      return;
    }

    for (const item of state.records) {
      const userId = normalizeUserId(item?.userId ?? "");
      if (!userId) {
        continue;
      }

      this.records.set(userId, {
        userId,
        smsEnabled:
          typeof item.smsEnabled === "boolean"
            ? item.smsEnabled
            : DEFAULT_PREFERENCES.smsEnabled,
        rentEnabled:
          typeof item.rentEnabled === "boolean"
            ? item.rentEnabled
            : DEFAULT_PREFERENCES.rentEnabled,
        utilityEnabled:
          typeof item.utilityEnabled === "boolean"
            ? item.utilityEnabled
            : DEFAULT_PREFERENCES.utilityEnabled,
        supportEnabled:
          typeof item.supportEnabled === "boolean"
            ? item.supportEnabled
            : DEFAULT_PREFERENCES.supportEnabled,
        updatedAt: String(item.updatedAt ?? "").trim() || nowIso()
      });
    }
  }

  exportState(): ResidentNotificationPreferencePersistedState {
    return {
      records: [...this.records.values()]
        .sort((a, b) => a.userId.localeCompare(b.userId))
        .map((item) => ({ ...item }))
    };
  }

  getForUser(userId: string): ResidentNotificationPreferenceRecord {
    const normalizedUserId = normalizeUserId(userId);
    if (!normalizedUserId) {
      return createDefaultRecord("");
    }

    const existing = this.records.get(normalizedUserId);
    if (existing) {
      return { ...existing };
    }

    return createDefaultRecord(normalizedUserId);
  }

  updateForUser(
    userId: string,
    input: UpdateResidentNotificationPreferenceInput
  ): ResidentNotificationPreferenceRecord {
    const normalizedUserId = normalizeUserId(userId);
    if (!normalizedUserId) {
      throw new Error("User ID is required to update notification preferences.");
    }

    const current = this.records.get(normalizedUserId) ?? createDefaultRecord(normalizedUserId);
    const updated: ResidentNotificationPreferenceRecord = {
      ...current,
      smsEnabled:
        typeof input.smsEnabled === "boolean" ? input.smsEnabled : current.smsEnabled,
      rentEnabled:
        typeof input.rentEnabled === "boolean" ? input.rentEnabled : current.rentEnabled,
      utilityEnabled:
        typeof input.utilityEnabled === "boolean"
          ? input.utilityEnabled
          : current.utilityEnabled,
      supportEnabled:
        typeof input.supportEnabled === "boolean"
          ? input.supportEnabled
          : current.supportEnabled,
      updatedAt: nowIso()
    };

    this.records.set(normalizedUserId, updated);
    this.emitStateChange();
    return { ...updated };
  }

  private emitStateChange(): void {
    if (!this.stateChangeHandler) {
      return;
    }

    const snapshot = this.exportState();
    void Promise.resolve(this.stateChangeHandler(snapshot)).catch((error) => {
      console.error("Failed to persist resident notification preferences", error);
    });
  }
}
