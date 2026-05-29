import type { ResidentNotificationPreferenceService } from "../residentNotificationPreferenceService.js";
import type {
  PushNotificationPayload,
  PushNotificationService
} from "../pushNotificationService.js";
import type { UserNotification } from "../userSupportService.js";
import type { OutboundMessageService } from "../outboundMessageService.js";
import type { AutomaticMessageKind } from "../automaticMessageRuleService.js";
import type { SmsNotificationService } from "./sms.js";

type NotificationCategory = "rent" | "utility" | "support" | "general";
export type ResidentSmsNotificationKind = AutomaticMessageKind;
type ResidentVerificationStatus = "verified" | "pending_review" | "rejected";

interface ResidentNotificationRecipient {
  userId: string;
  phoneNumber?: string;
  verificationStatus?: ResidentVerificationStatus;
}

interface NotificationDeliveryServiceOptions {
  pushNotificationService: Pick<
    PushNotificationService,
    "isEnabled" | "notifyResidentScope"
  >;
  smsNotificationService: Pick<SmsNotificationService, "isEnabled" | "send"> & {
    getProvider?: SmsNotificationService["getProvider"];
  };
  outboundMessageService?: Pick<OutboundMessageService, "record">;
  residentNotificationPreferenceService: Pick<
    ResidentNotificationPreferenceService,
    "getForUser"
  >;
  allowSystemSms?: (input: {
    notification: UserNotification;
    category: NotificationCategory;
    kind: ResidentSmsNotificationKind;
  }) => boolean;
  resolveRecipient: (scope: {
    buildingId: string;
    houseNumber: string;
  }) => Promise<ResidentNotificationRecipient | null>;
}

function classifyNotification(item: Pick<UserNotification, "source" | "dedupeKey">): NotificationCategory {
  const dedupeKey = String(item.dedupeKey ?? "").trim();
  if (item.source === "rent") {
    return "rent";
  }
  if (
    dedupeKey.startsWith("utility-reminder-") ||
    dedupeKey.startsWith("utility-payment-")
  ) {
    return "utility";
  }
  if (item.source === "ticket") {
    return "support";
  }
  return "general";
}

function classifySmsNotificationKind(
  item: Pick<UserNotification, "source" | "dedupeKey">
): ResidentSmsNotificationKind {
  const dedupeKey = String(item.dedupeKey ?? "").trim();

  if (
    dedupeKey.startsWith("rent-reminder-overdue-") ||
    dedupeKey.startsWith("utility-reminder-overdue-")
  ) {
    return "overdue_notice";
  }

  if (
    dedupeKey.startsWith("rent-payment-") ||
    dedupeKey.startsWith("utility-payment-")
  ) {
    return "payment_receipt";
  }

  if (dedupeKey.startsWith("rent-reminder-")) {
    return "rent_reminder";
  }

  if (dedupeKey.startsWith("utility-reminder-")) {
    return "utility_reminder";
  }

  return "general";
}

function isBillingNotification(item: Pick<UserNotification, "source" | "dedupeKey">): boolean {
  const category = classifyNotification(item);
  return category === "rent" || category === "utility";
}

function canReceiveBillingNotifications(
  recipient: ResidentNotificationRecipient | null
): boolean {
  return recipient?.verificationStatus === "verified";
}

function allowSmsForCategory(
  category: NotificationCategory,
  preferences: ReturnType<ResidentNotificationPreferenceService["getForUser"]>
): boolean {
  if (!preferences.smsEnabled) {
    return false;
  }

  if (category === "rent") {
    return preferences.rentEnabled;
  }

  if (category === "utility") {
    return preferences.utilityEnabled;
  }

  if (category === "support") {
    return preferences.supportEnabled;
  }

  return false;
}

function buildSmsBody(notification: UserNotification): string {
  const body = `${notification.title}: ${notification.message}`.trim();
  return `${body} - Housing Portal`;
}

export class NotificationDeliveryService {
  constructor(private readonly options: NotificationDeliveryServiceOptions) {}

  async deliverResidentNotifications(notifications: UserNotification[]): Promise<void> {
    if (notifications.length === 0) {
      return;
    }

    await Promise.allSettled([
      this.deliverPushNotifications(notifications),
      this.deliverSmsNotifications(notifications)
    ]);
  }

  private async deliverPushNotifications(
    notifications: UserNotification[]
  ): Promise<void> {
    if (!this.options.pushNotificationService.isEnabled()) {
      return;
    }

    const grouped = new Map<string, UserNotification[]>();
    for (const item of notifications) {
      const key = `${item.buildingId}::${item.houseNumber}`;
      const current = grouped.get(key) ?? [];
      current.push(item);
      grouped.set(key, current);
    }

    const recipientCache = new Map<string, ResidentNotificationRecipient | null>();

    for (const [key, items] of grouped.entries()) {
      const [first] = items;
      if (!first) {
        continue;
      }

      let recipient = recipientCache.get(key);
      if (recipient === undefined) {
        recipient = await this.options.resolveRecipient({
          buildingId: first.buildingId,
          houseNumber: first.houseNumber
        });
        recipientCache.set(key, recipient);
      }

      const visibleItems = items.filter((item) => {
        if (!isBillingNotification(item)) {
          return true;
        }
        return canReceiveBillingNotifications(recipient);
      });

      if (visibleItems.length === 0) {
        continue;
      }

      const [visibleFirst] = visibleItems;
      if (!visibleFirst) {
        continue;
      }

      const payload: PushNotificationPayload =
        visibleItems.length === 1
          ? {
              title: visibleFirst.title,
              body: visibleFirst.message,
              level: visibleFirst.level,
              tag: visibleFirst.dedupeKey ?? `resident-${visibleFirst.source}`,
              url: "/resident"
            }
          : {
              title: `${visibleItems.length} new resident alerts`,
              body: visibleItems
                .slice(0, 2)
                .map((item) => item.title)
                .join(" • "),
              level: visibleItems.some((item) => item.level === "warning")
                ? "warning"
                : visibleItems.some((item) => item.level === "success")
                  ? "success"
                  : "info",
              tag: `resident-alerts-${visibleFirst.buildingId}-${visibleFirst.houseNumber}`,
              url: "/resident"
            };

      try {
        await this.options.pushNotificationService.notifyResidentScope(
          visibleFirst.buildingId,
          visibleFirst.houseNumber,
          payload
        );
      } catch (error) {
        console.error("Failed to deliver resident push notification batch", {
          buildingId: visibleFirst.buildingId,
          houseNumber: visibleFirst.houseNumber,
          error
        });
      }
    }
  }

  private async deliverSmsNotifications(
    notifications: UserNotification[]
  ): Promise<void> {
    if (!this.options.smsNotificationService.isEnabled()) {
      return;
    }

    const recipientCache = new Map<string, ResidentNotificationRecipient | null>();

    for (const notification of notifications) {
      const scopeKey = `${notification.buildingId}::${notification.houseNumber}`;
      let recipient = recipientCache.get(scopeKey);
      if (recipient === undefined) {
        recipient = await this.options.resolveRecipient({
          buildingId: notification.buildingId,
          houseNumber: notification.houseNumber
        });
        recipientCache.set(scopeKey, recipient);
      }

      if (!recipient?.userId || !recipient.phoneNumber) {
        continue;
      }

      if (
        isBillingNotification(notification) &&
        !canReceiveBillingNotifications(recipient)
      ) {
        continue;
      }

      const preferences = this.options.residentNotificationPreferenceService.getForUser(
        recipient.userId
      );
      const category = classifyNotification(notification);
      if (!allowSmsForCategory(category, preferences)) {
        continue;
      }
      const kind = classifySmsNotificationKind(notification);
      if (
        this.options.allowSystemSms &&
        !this.options.allowSystemSms({ notification, category, kind })
      ) {
        continue;
      }

      try {
        const message = buildSmsBody(notification);
        await this.options.smsNotificationService.send({
          to: recipient.phoneNumber,
          message,
          tag: notification.dedupeKey
        });
        this.options.outboundMessageService?.record({
          provider: this.options.smsNotificationService.getProvider?.() ?? "sms",
          source: "system",
          category,
          status: "sent",
          recipientKind: "room",
          recipientUserId: recipient.userId,
          recipientPhone: recipient.phoneNumber,
          buildingId: notification.buildingId,
          houseNumber: notification.houseNumber,
          body: message,
          tag: notification.dedupeKey
        });
      } catch (error) {
        this.options.outboundMessageService?.record({
          provider: this.options.smsNotificationService.getProvider?.() ?? "sms",
          source: "system",
          category,
          status: "failed",
          recipientKind: "room",
          recipientUserId: recipient.userId,
          recipientPhone: recipient.phoneNumber,
          buildingId: notification.buildingId,
          houseNumber: notification.houseNumber,
          body: buildSmsBody(notification),
          tag: notification.dedupeKey,
          error: error instanceof Error ? error.message : "SMS delivery failed."
        });
        console.error("Failed to deliver resident SMS notification", {
          userId: recipient.userId,
          buildingId: notification.buildingId,
          houseNumber: notification.houseNumber,
          dedupeKey: notification.dedupeKey,
          error
        });
      }
    }
  }
}

export { EmailNotificationService } from "./email.js";
export { SmsNotificationService } from "./sms.js";
