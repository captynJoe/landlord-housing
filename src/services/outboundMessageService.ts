import { randomUUID } from "node:crypto";

export type OutboundMessageChannel = "sms";
export type OutboundMessageSource = "system" | "manual";
export type OutboundMessageStatus = "sent" | "failed";
export type OutboundMessageRecipientKind = "phone" | "room" | "building";

export interface OutboundMessageActor {
  userId?: string;
  role?: string;
  name?: string;
}

export interface OutboundMessageRecord {
  id: string;
  channel: OutboundMessageChannel;
  provider: string;
  source: OutboundMessageSource;
  category: string;
  status: OutboundMessageStatus;
  recipientKind: OutboundMessageRecipientKind;
  recipientUserId?: string;
  recipientName?: string;
  recipientPhone?: string;
  buildingId?: string;
  buildingName?: string;
  houseNumber?: string;
  title?: string;
  body: string;
  tag?: string;
  error?: string;
  actor?: OutboundMessageActor;
  createdAt: string;
  sentAt?: string;
  failedAt?: string;
}

export interface OutboundMessagePersistedState {
  messages: OutboundMessageRecord[];
}

export interface OutboundMessageListOptions {
  limit?: number;
  buildingId?: string;
  buildingIds?: Iterable<string>;
  includeUnscoped?: boolean;
}

export type OutboundMessageStateChangeHandler = (
  state: OutboundMessagePersistedState
) => void | Promise<void>;

const MAX_RETAINED_MESSAGES = 2_000;

function normalizeOptionalString(value: unknown, max = 1_000): string | undefined {
  const normalized = String(value ?? "").replace(/\s+/g, " ").trim();
  return normalized ? normalized.slice(0, max) : undefined;
}

function normalizeIsoDate(value: unknown): string {
  const raw = String(value ?? "").trim();
  const date = raw ? new Date(raw) : new Date();
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

function normalizeStatus(value: unknown): OutboundMessageStatus {
  return value === "failed" ? "failed" : "sent";
}

function normalizeRecipientKind(value: unknown): OutboundMessageRecipientKind {
  if (value === "building" || value === "room" || value === "phone") {
    return value;
  }

  return "room";
}

function normalizeMessageRecord(value: unknown): OutboundMessageRecord | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const item = value as Partial<OutboundMessageRecord>;
  const id = normalizeOptionalString(item.id, 120) ?? randomUUID();
  const body = normalizeOptionalString(item.body, 1_000);
  if (!body) {
    return null;
  }

  const status = normalizeStatus(item.status);
  const createdAt = normalizeIsoDate(item.createdAt);

  return {
    id,
    channel: "sms",
    provider: normalizeOptionalString(item.provider, 80) ?? "sms",
    source: item.source === "manual" ? "manual" : "system",
    category: normalizeOptionalString(item.category, 80) ?? "general",
    status,
    recipientKind: normalizeRecipientKind(item.recipientKind),
    recipientUserId: normalizeOptionalString(item.recipientUserId, 120),
    recipientName: normalizeOptionalString(item.recipientName, 160),
    recipientPhone: normalizeOptionalString(item.recipientPhone, 80),
    buildingId: normalizeOptionalString(item.buildingId, 120),
    buildingName: normalizeOptionalString(item.buildingName, 160),
    houseNumber: normalizeOptionalString(item.houseNumber, 40),
    title: normalizeOptionalString(item.title, 80),
    body,
    tag: normalizeOptionalString(item.tag, 160),
    error: normalizeOptionalString(item.error, 500),
    actor: item.actor
      ? {
          userId: normalizeOptionalString(item.actor.userId, 120),
          role: normalizeOptionalString(item.actor.role, 40),
          name: normalizeOptionalString(item.actor.name, 160)
        }
      : undefined,
    createdAt,
    sentAt: item.sentAt ? normalizeIsoDate(item.sentAt) : status === "sent" ? createdAt : undefined,
    failedAt:
      item.failedAt ? normalizeIsoDate(item.failedAt) : status === "failed" ? createdAt : undefined
  };
}

function cloneMessage(message: OutboundMessageRecord): OutboundMessageRecord {
  return {
    ...message,
    actor: message.actor ? { ...message.actor } : undefined
  };
}

export class OutboundMessageService {
  private readonly messagesById = new Map<string, OutboundMessageRecord>();
  private stateChangeHandler?: OutboundMessageStateChangeHandler;

  setStateChangeHandler(handler?: OutboundMessageStateChangeHandler): void {
    this.stateChangeHandler = handler;
  }

  importState(state: OutboundMessagePersistedState | null | undefined): void {
    this.messagesById.clear();

    if (!state || !Array.isArray(state.messages)) {
      return;
    }

    for (const item of state.messages) {
      const record = normalizeMessageRecord(item);
      if (record) {
        this.messagesById.set(record.id, record);
      }
    }

    this.trimRetainedMessages();
  }

  exportState(): OutboundMessagePersistedState {
    return {
      messages: this.sortedMessages().map(cloneMessage)
    };
  }

  record(
    input: Omit<OutboundMessageRecord, "id" | "channel" | "createdAt" | "sentAt" | "failedAt"> &
      Partial<Pick<OutboundMessageRecord, "id" | "createdAt" | "sentAt" | "failedAt">>
  ): OutboundMessageRecord {
    const now = new Date().toISOString();
    const status = normalizeStatus(input.status);
    const record: OutboundMessageRecord = {
      id: normalizeOptionalString(input.id, 120) ?? randomUUID(),
      channel: "sms",
      provider: normalizeOptionalString(input.provider, 80) ?? "sms",
      source: input.source === "manual" ? "manual" : "system",
      category: normalizeOptionalString(input.category, 80) ?? "general",
      status,
      recipientKind: normalizeRecipientKind(input.recipientKind),
      recipientUserId: normalizeOptionalString(input.recipientUserId, 120),
      recipientName: normalizeOptionalString(input.recipientName, 160),
      recipientPhone: normalizeOptionalString(input.recipientPhone, 80),
      buildingId: normalizeOptionalString(input.buildingId, 120),
      buildingName: normalizeOptionalString(input.buildingName, 160),
      houseNumber: normalizeOptionalString(input.houseNumber, 40),
      title: normalizeOptionalString(input.title, 80),
      body: normalizeOptionalString(input.body, 1_000) ?? "",
      tag: normalizeOptionalString(input.tag, 160),
      error: normalizeOptionalString(input.error, 500),
      actor: input.actor
        ? {
            userId: normalizeOptionalString(input.actor.userId, 120),
            role: normalizeOptionalString(input.actor.role, 40),
            name: normalizeOptionalString(input.actor.name, 160)
          }
        : undefined,
      createdAt: input.createdAt ? normalizeIsoDate(input.createdAt) : now,
      sentAt: input.sentAt
        ? normalizeIsoDate(input.sentAt)
        : status === "sent"
          ? now
          : undefined,
      failedAt: input.failedAt
        ? normalizeIsoDate(input.failedAt)
        : status === "failed"
          ? now
          : undefined
    };

    if (!record.body) {
      throw new Error("OUTBOUND_MESSAGE_BODY_REQUIRED");
    }

    this.messagesById.set(record.id, record);
    this.trimRetainedMessages();
    this.emitStateChange();
    return cloneMessage(record);
  }

  list(options: OutboundMessageListOptions = {}): OutboundMessageRecord[] {
    const limit = Number.isFinite(Number(options.limit))
      ? Math.min(Math.max(Math.trunc(Number(options.limit)), 1), 500)
      : 100;
    const includeUnscoped = options.includeUnscoped !== false;
    const buildingId = normalizeOptionalString(options.buildingId, 120);
    const buildingIds = options.buildingIds
      ? new Set([...options.buildingIds].map((item) => String(item ?? "").trim()).filter(Boolean))
      : null;

    return this.sortedMessages()
      .filter((item) => {
        if (buildingId) {
          return item.buildingId === buildingId;
        }

        if (!buildingIds) {
          return true;
        }

        if (!item.buildingId) {
          return includeUnscoped;
        }

        return buildingIds.has(item.buildingId);
      })
      .slice(0, limit)
      .map(cloneMessage);
  }

  private sortedMessages(): OutboundMessageRecord[] {
    return [...this.messagesById.values()].sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt)
    );
  }

  private trimRetainedMessages(): void {
    const retained = this.sortedMessages().slice(0, MAX_RETAINED_MESSAGES);
    this.messagesById.clear();
    retained.forEach((item) => this.messagesById.set(item.id, item));
  }

  private emitStateChange(): void {
    if (!this.stateChangeHandler) {
      return;
    }

    const snapshot = this.exportState();
    void Promise.resolve(this.stateChangeHandler(snapshot)).catch((error) => {
      console.error("Failed to persist outbound messages", error);
    });
  }
}
