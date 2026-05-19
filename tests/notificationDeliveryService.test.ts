import assert from "node:assert/strict";
import test from "node:test";
import { NotificationDeliveryService } from "../src/services/notifications/index.js";
import { ResidentNotificationPreferenceService } from "../src/services/residentNotificationPreferenceService.js";

test("delivers grouped push alerts and billing SMS when resident preferences allow", async () => {
  const pushCalls = [];
  const smsCalls = [];
  const preferences = new ResidentNotificationPreferenceService();
  preferences.updateForUser("tenant-1", {
    smsEnabled: true,
    rentEnabled: true,
    utilityEnabled: true
  });

  const service = new NotificationDeliveryService({
    pushNotificationService: {
      isEnabled: () => true,
      notifyResidentScope: async (buildingId, houseNumber, payload) => {
        pushCalls.push({ buildingId, houseNumber, payload });
      }
    },
    smsNotificationService: {
      isEnabled: () => true,
      send: async (input) => {
        smsCalls.push(input);
      }
    },
    residentNotificationPreferenceService: preferences,
    resolveRecipient: async () => ({
      userId: "tenant-1",
      phoneNumber: "+254712345678",
      verificationStatus: "verified"
    })
  });

  await service.deliverResidentNotifications([
    {
      id: "rent-1",
      buildingId: "CAPTYN001",
      houseNumber: "A-1",
      title: "Rent Reminder (D-1)",
      message: "Rent balance KSh 12,000 is due tomorrow.",
      level: "warning",
      source: "rent",
      createdAt: new Date().toISOString(),
      dedupeKey: "rent-reminder-a1"
    },
    {
      id: "utility-1",
      buildingId: "CAPTYN001",
      houseNumber: "A-1",
      title: "Water Payment Received",
      message: "Water payment of KSh 800 has been applied.",
      level: "success",
      source: "system",
      createdAt: new Date().toISOString(),
      dedupeKey: "utility-payment-water-1"
    }
  ]);

  assert.equal(pushCalls.length, 1);
  assert.equal(pushCalls[0].payload.title, "2 new resident alerts");
  assert.equal(smsCalls.length, 2);
  assert.match(smsCalls[0].message, /Housing Portal$/);
  assert.equal(smsCalls[0].to, "+254712345678");
});

test("skips billing push and SMS for residents who are not verified", async () => {
  const pushCalls = [];
  const smsCalls = [];
  const preferences = new ResidentNotificationPreferenceService();

  const service = new NotificationDeliveryService({
    pushNotificationService: {
      isEnabled: () => true,
      notifyResidentScope: async (buildingId, houseNumber, payload) => {
        pushCalls.push({ buildingId, houseNumber, payload });
      }
    },
    smsNotificationService: {
      isEnabled: () => true,
      send: async (input) => {
        smsCalls.push(input);
      }
    },
    residentNotificationPreferenceService: preferences,
    resolveRecipient: async () => ({
      userId: "tenant-2",
      phoneNumber: "+254700000000",
      verificationStatus: "pending_review"
    })
  });

  await service.deliverResidentNotifications([
    {
      id: "rent-2",
      buildingId: "CAPTYN001",
      houseNumber: "B-2",
      title: "Rent Payment Received",
      message: "M-PESA payment ABC123 has been posted.",
      level: "success",
      source: "rent",
      createdAt: new Date().toISOString(),
      dedupeKey: "rent-payment-abc123"
    }
  ]);

  assert.equal(pushCalls.length, 0);
  assert.equal(smsCalls.length, 0);
});
