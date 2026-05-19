import webpush, { type PushSubscription } from "web-push";

export interface ResidentPushSubscriptionInput {
  endpoint: string;
  expirationTime?: number | null;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export interface ResidentPushSubscriptionRecord
  extends ResidentPushSubscriptionInput {
  userId: string;
  buildingId: string;
  houseNumber: string;
  userAgent?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PushSubscriptionPersistedState {
  subscriptions: ResidentPushSubscriptionRecord[];
}

export interface PushNotificationPayload {
  title: string;
  body: string;
  tag?: string;
  url?: string;
  level?: "info" | "warning" | "success";
}

interface ResidentScope {
  userId: string;
  buildingId: string;
  houseNumber: string;
}

interface PushServiceConfig {
  publicKey: string;
  privateKey: string;
  subject: string;
}

type PushStateChangeHandler = (
  state: PushSubscriptionPersistedState
) => void | Promise<void>;

function nowIso(): string {
  return new Date().toISOString();
}

function normalizeBuildingId(value: string): string {
  const normalized = String(value ?? "").trim();
  return normalized || "__unknown_building__";
}

function normalizeHouseNumber(value: string): string {
  return String(value ?? "").trim().toUpperCase();
}

function normalizeSubscriptionInput(
  value: ResidentPushSubscriptionInput
): ResidentPushSubscriptionInput {
  return {
    endpoint: String(value.endpoint ?? "").trim(),
    expirationTime:
      typeof value.expirationTime === "number" ? value.expirationTime : null,
    keys: {
      p256dh: String(value.keys?.p256dh ?? "").trim(),
      auth: String(value.keys?.auth ?? "").trim()
    }
  };
}

function toWebPushSubscription(
  value: ResidentPushSubscriptionRecord
): PushSubscription {
  return {
    endpoint: value.endpoint,
    expirationTime: value.expirationTime ?? null,
    keys: {
      p256dh: value.keys.p256dh,
      auth: value.keys.auth
    }
  };
}

export class PushNotificationService {
  private readonly subscriptionsByEndpoint = new Map<
    string,
    ResidentPushSubscriptionRecord
  >();
  private stateChangeHandler?: PushStateChangeHandler;
  private readonly enabled: boolean;
  private readonly publicKey: string;

  constructor(config?: PushServiceConfig | null) {
    const publicKey = String(config?.publicKey ?? "").trim();
    const privateKey = String(config?.privateKey ?? "").trim();
    const subject = String(config?.subject ?? "").trim();

    this.enabled = Boolean(publicKey && privateKey && subject);
    this.publicKey = publicKey;

    if (this.enabled) {
      webpush.setVapidDetails(subject, publicKey, privateKey);
    }
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  getPublicKey(): string | null {
    return this.enabled ? this.publicKey : null;
  }

  setStateChangeHandler(handler?: PushStateChangeHandler): void {
    this.stateChangeHandler = handler;
  }

  importState(state: PushSubscriptionPersistedState | null | undefined): void {
    this.subscriptionsByEndpoint.clear();

    if (!state || !Array.isArray(state.subscriptions)) {
      return;
    }

    for (const item of state.subscriptions) {
      if (!item?.endpoint || !item?.keys?.p256dh || !item?.keys?.auth) {
        continue;
      }

      const subscription = normalizeSubscriptionInput(item);
      this.subscriptionsByEndpoint.set(subscription.endpoint, {
        ...subscription,
        userId: String(item.userId ?? "").trim(),
        buildingId: normalizeBuildingId(item.buildingId),
        houseNumber: normalizeHouseNumber(item.houseNumber),
        userAgent: String(item.userAgent ?? "").trim() || undefined,
        createdAt: String(item.createdAt ?? "").trim() || nowIso(),
        updatedAt: String(item.updatedAt ?? "").trim() || nowIso()
      });
    }
  }

  exportState(): PushSubscriptionPersistedState {
    return {
      subscriptions: [...this.subscriptionsByEndpoint.values()]
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
        .map((item) => ({
          ...item,
          keys: { ...item.keys }
        }))
    };
  }

  upsertResidentSubscription(
    scope: ResidentScope,
    subscriptionInput: ResidentPushSubscriptionInput,
    userAgent?: string
  ): ResidentPushSubscriptionRecord {
    const subscription = normalizeSubscriptionInput(subscriptionInput);
    const existing = this.subscriptionsByEndpoint.get(subscription.endpoint);
    const timestamp = nowIso();

    const record: ResidentPushSubscriptionRecord = {
      ...subscription,
      userId: String(scope.userId ?? "").trim(),
      buildingId: normalizeBuildingId(scope.buildingId),
      houseNumber: normalizeHouseNumber(scope.houseNumber),
      userAgent: String(userAgent ?? "").trim() || undefined,
      createdAt: existing?.createdAt ?? timestamp,
      updatedAt: timestamp
    };

    this.subscriptionsByEndpoint.set(subscription.endpoint, record);
    this.emitStateChange();
    return record;
  }

  removeSubscription(endpoint: string): boolean {
    const removed = this.subscriptionsByEndpoint.delete(String(endpoint ?? "").trim());
    if (removed) {
      this.emitStateChange();
    }
    return removed;
  }

  async notifyResidentScope(
    buildingId: string,
    houseNumber: string,
    payload: PushNotificationPayload
  ): Promise<void> {
    if (!this.enabled) {
      return;
    }

    const targetBuildingId = normalizeBuildingId(buildingId);
    const targetHouseNumber = normalizeHouseNumber(houseNumber);
    const targets = [...this.subscriptionsByEndpoint.values()].filter(
      (item) =>
        item.buildingId === targetBuildingId &&
        item.houseNumber === targetHouseNumber
    );

    if (targets.length === 0) {
      return;
    }

    const serializedPayload = JSON.stringify(payload);
    const staleEndpoints: string[] = [];

    await Promise.all(
      targets.map(async (item) => {
        try {
          await webpush.sendNotification(
            toWebPushSubscription(item),
            serializedPayload,
            {
              TTL: 60 * 60,
              urgency: payload.level === "warning" ? "high" : "normal"
            }
          );
        } catch (error) {
          const statusCode =
            typeof error === "object" && error && "statusCode" in error
              ? Number((error as { statusCode?: number }).statusCode)
              : 0;

          if (statusCode === 404 || statusCode === 410) {
            staleEndpoints.push(item.endpoint);
            return;
          }

          console.error("Failed to send housing web push notification", error);
        }
      })
    );

    if (staleEndpoints.length > 0) {
      let changed = false;
      for (const endpoint of staleEndpoints) {
        changed =
          this.subscriptionsByEndpoint.delete(endpoint) || changed;
      }
      if (changed) {
        this.emitStateChange();
      }
    }
  }

  private emitStateChange(): void {
    if (!this.stateChangeHandler) {
      return;
    }

    const snapshot = this.exportState();
    void Promise.resolve(this.stateChangeHandler(snapshot)).catch((error) => {
      console.error("Failed to persist push subscription state", error);
    });
  }
}
