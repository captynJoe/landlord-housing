import { randomUUID } from "node:crypto";

export type OwnerNotificationLevel = "info" | "warning" | "success";
export type OwnerNotificationSource = "manager_action" | "system";

export interface OwnerNotification {
  id: string;
  title: string;
  message: string;
  level: OwnerNotificationLevel;
  source: OwnerNotificationSource;
  action: string;
  buildingId?: string;
  buildingName?: string;
  houseNumber?: string;
  actorUserId?: string;
  actorName?: string;
  actorRole?: string;
  url?: string;
  recipientUserIds: string[];
  readByUserIds: string[];
  metadata?: Record<string, unknown>;
  dedupeKey?: string;
  createdAt: string;
}

export interface OwnerNotificationInput {
  title: string;
  message: string;
  level?: OwnerNotificationLevel;
  source?: OwnerNotificationSource;
  action: string;
  buildingId?: string;
  buildingName?: string;
  houseNumber?: string;
  actorUserId?: string;
  actorName?: string;
  actorRole?: string;
  url?: string;
  recipientUserIds?: string[];
  metadata?: Record<string, unknown>;
  dedupeKey?: string;
  createdAt?: string;
}

export interface OwnerNotificationPersistedState {
  notifications: OwnerNotification[];
}

type OwnerNotificationStateChangeHandler = (
  state: OwnerNotificationPersistedState
) => void | Promise<void>;

function nowIso(): string {
  return new Date().toISOString();
}

function normalizedOptionalString(value: unknown): string | undefined {
  const normalized = String(value ?? "").trim();
  return normalized || undefined;
}

function uniqueStrings(values: unknown): string[] {
  if (!Array.isArray(values)) {
    return [];
  }

  return [
    ...new Set(
      values
        .map((item) => String(item ?? "").trim())
        .filter(Boolean)
    )
  ];
}

function cloneNotification(item: OwnerNotification): OwnerNotification {
  return {
    ...item,
    recipientUserIds: [...item.recipientUserIds],
    readByUserIds: [...item.readByUserIds],
    metadata: item.metadata ? { ...item.metadata } : undefined
  };
}

export class OwnerNotificationService {
  private readonly notificationsById = new Map<string, OwnerNotification>();
  private readonly dedupeKeys = new Set<string>();
  private stateChangeHandler?: OwnerNotificationStateChangeHandler;

  setStateChangeHandler(handler?: OwnerNotificationStateChangeHandler): void {
    this.stateChangeHandler = handler;
  }

  importState(state: OwnerNotificationPersistedState | null | undefined): void {
    this.notificationsById.clear();
    this.dedupeKeys.clear();

    if (!state || !Array.isArray(state.notifications)) {
      return;
    }

    for (const item of state.notifications) {
      const id = normalizedOptionalString(item?.id);
      if (!id) {
        continue;
      }

      const notification: OwnerNotification = {
        id,
        title: normalizedOptionalString(item.title) ?? "Owner Alert",
        message: normalizedOptionalString(item.message) ?? "New owner alert.",
        level:
          item.level === "warning" || item.level === "success"
            ? item.level
            : "info",
        source: item.source === "system" ? "system" : "manager_action",
        action: normalizedOptionalString(item.action) ?? "system.alert",
        buildingId: normalizedOptionalString(item.buildingId),
        buildingName: normalizedOptionalString(item.buildingName),
        houseNumber: normalizedOptionalString(item.houseNumber),
        actorUserId: normalizedOptionalString(item.actorUserId),
        actorName: normalizedOptionalString(item.actorName),
        actorRole: normalizedOptionalString(item.actorRole),
        url: normalizedOptionalString(item.url),
        recipientUserIds: uniqueStrings(item.recipientUserIds),
        readByUserIds: uniqueStrings(item.readByUserIds),
        metadata:
          item.metadata && typeof item.metadata === "object" && !Array.isArray(item.metadata)
            ? { ...(item.metadata as Record<string, unknown>) }
            : undefined,
        dedupeKey: normalizedOptionalString(item.dedupeKey),
        createdAt: normalizedOptionalString(item.createdAt) ?? nowIso()
      };

      this.notificationsById.set(notification.id, notification);
      if (notification.dedupeKey) {
        this.dedupeKeys.add(notification.dedupeKey);
      }
    }
  }

  exportState(): OwnerNotificationPersistedState {
    return {
      notifications: this.sortedNotifications().map(cloneNotification)
    };
  }

  enqueue(input: OwnerNotificationInput): OwnerNotification | null {
    const dedupeKey = normalizedOptionalString(input.dedupeKey);
    if (dedupeKey && this.dedupeKeys.has(dedupeKey)) {
      return null;
    }

    const notification: OwnerNotification = {
      id: randomUUID(),
      title: input.title.trim(),
      message: input.message.trim(),
      level: input.level ?? "info",
      source: input.source ?? "manager_action",
      action: input.action.trim(),
      buildingId: normalizedOptionalString(input.buildingId),
      buildingName: normalizedOptionalString(input.buildingName),
      houseNumber: normalizedOptionalString(input.houseNumber),
      actorUserId: normalizedOptionalString(input.actorUserId),
      actorName: normalizedOptionalString(input.actorName),
      actorRole: normalizedOptionalString(input.actorRole),
      url: normalizedOptionalString(input.url),
      recipientUserIds: uniqueStrings(input.recipientUserIds),
      readByUserIds: [],
      metadata: input.metadata ? { ...input.metadata } : undefined,
      dedupeKey,
      createdAt: input.createdAt ?? nowIso()
    };

    this.notificationsById.set(notification.id, notification);
    if (dedupeKey) {
      this.dedupeKeys.add(dedupeKey);
    }
    this.emitStateChange();

    return cloneNotification(notification);
  }

  listForUser(
    userId: string,
    options: { limit?: number } = {}
  ): Array<OwnerNotification & { read: boolean }> {
    const normalizedUserId = String(userId ?? "").trim();
    if (!normalizedUserId) {
      return [];
    }

    const limit = Math.min(Math.max(Math.trunc(options.limit ?? 50), 1), 200);
    return this.sortedNotifications()
      .filter(
        (item) =>
          item.recipientUserIds.length === 0 ||
          item.recipientUserIds.includes(normalizedUserId)
      )
      .slice(0, limit)
      .map((item) => ({
        ...cloneNotification(item),
        read: item.readByUserIds.includes(normalizedUserId)
      }));
  }

  countUnreadForUser(userId: string): number {
    const normalizedUserId = String(userId ?? "").trim();
    if (!normalizedUserId) {
      return 0;
    }

    return this.sortedNotifications().filter(
      (item) =>
        (item.recipientUserIds.length === 0 ||
          item.recipientUserIds.includes(normalizedUserId)) &&
        !item.readByUserIds.includes(normalizedUserId)
    ).length;
  }

  markRead(userId: string, notificationIds?: string[]): number {
    const normalizedUserId = String(userId ?? "").trim();
    if (!normalizedUserId) {
      return 0;
    }

    const idSet =
      Array.isArray(notificationIds) && notificationIds.length > 0
        ? new Set(notificationIds.map((item) => String(item ?? "").trim()).filter(Boolean))
        : null;

    let changed = 0;
    for (const notification of this.notificationsById.values()) {
      if (
        notification.recipientUserIds.length > 0 &&
        !notification.recipientUserIds.includes(normalizedUserId)
      ) {
        continue;
      }
      if (idSet && !idSet.has(notification.id)) {
        continue;
      }
      if (notification.readByUserIds.includes(normalizedUserId)) {
        continue;
      }

      notification.readByUserIds.push(normalizedUserId);
      changed += 1;
    }

    if (changed > 0) {
      this.emitStateChange();
    }

    return changed;
  }

  private sortedNotifications(): OwnerNotification[] {
    return [...this.notificationsById.values()].sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt)
    );
  }

  private emitStateChange(): void {
    if (!this.stateChangeHandler) {
      return;
    }

    const snapshot = this.exportState();
    void Promise.resolve(this.stateChangeHandler(snapshot)).catch((error) => {
      console.error("Failed to persist owner notifications", error);
    });
  }
}
