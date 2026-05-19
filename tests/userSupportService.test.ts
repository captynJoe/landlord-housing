import assert from "node:assert/strict";
import test from "node:test";
import { UserSupportService } from "../src/services/userSupportService.js";

test("creates room issue ticket and starter notifications", () => {
  const service = new UserSupportService();

  const { report, notifications } = service.createReport(
    {
      type: "room_issue",
      title: "Toilet flush failure",
      details: "Flush button is broken and water keeps running.",
      evidenceAttachments: []
    },
    {
      id: "CAPTYN-BLDG-00001",
      name: "Nyota Heights",
      cctvStatus: "verified"
    },
    {
      houseNumber: "a-12",
      phoneNumber: "+254712345678"
    }
  );

  assert.equal(report.houseNumber, "A-12");
  assert.equal(report.status, "open");
  assert.equal(report.queue, "maintenance");
  assert.equal(report.slaHours, 24);
  assert.equal(notifications.length, 2);
  assert.equal(notifications[0].title, "Ticket Opened");
});

test("creates theft ticket with CCTV workflow fields", () => {
  const service = new UserSupportService();

  const { report } = service.createReport(
    {
      type: "stolen_item",
      title: "Lost TV",
      details: "TV missing after returning from work.",
      stolenItem: "Samsung TV",
      incidentWindowStartAt: "2026-02-27T20:00:00.000Z",
      incidentWindowEndAt: "2026-02-28T06:00:00.000Z",
      incidentLocation: "Block B corridor",
      caseReference: "OB/22/02/2026",
      evidenceAttachments: ["https://example.com/cctv-frame-1.jpg"]
    },
    {
      id: "CAPTYN-BLDG-00001",
      name: "Nyota Heights",
      cctvStatus: "none"
    },
    {
      houseNumber: "B-4",
      phoneNumber: "+254700000000"
    }
  );

  assert.equal(report.queue, "security");
  assert.equal(report.slaHours, 4);
  assert.equal(report.incidentLocation, "Block B corridor");
  assert.match(report.cctvGuidance, /No CCTV coverage registered/);
});

test("updates ticket lifecycle and emits notification", () => {
  const service = new UserSupportService();

  const { report } = service.createReport(
    {
      type: "general",
      title: "Door noise",
      details: "Main corridor door is too noisy at night.",
      evidenceAttachments: []
    },
    {
      id: "CAPTYN-BLDG-00001",
      name: "Nyota Heights",
      cctvStatus: "partial"
    },
    {
      houseNumber: "C-8",
      phoneNumber: "+254711111111"
    }
  );

  const updated = service.updateReportStatus(report.id, {
    status: "triaged",
    adminNote: "Assigned to maintenance lead"
  });

  assert.ok(updated);
  assert.equal(updated.report.status, "triaged");

  const notifications = service.listNotifications("c-8");
  assert.ok(notifications.some((item) => item.title === "Ticket Update"));
});

test("lists tenant-scoped reports by normalized house number", () => {
  const service = new UserSupportService();

  service.createReport(
    {
      type: "general",
      title: "Noise issue",
      details: "Loud music after midnight.",
      evidenceAttachments: []
    },
    {
      id: "CAPTYN-BLDG-00001",
      name: "Nyota Heights",
      cctvStatus: "partial"
    },
    {
      houseNumber: "D-1",
      phoneNumber: "+254722222222"
    }
  );

  assert.equal(service.listReports("d-1").length, 1);
  assert.equal(service.listReports("A-1").length, 0);
});

test("emits inserted system notifications through the notification handler", async () => {
  const service = new UserSupportService();
  const insertedBatches = [];

  service.setNotificationInsertHandler((notifications) => {
    insertedBatches.push(notifications);
  });

  const inserted = service.enqueueSystemNotifications("captyn-bldg-00001", "e-3", [
    {
      title: "Rent Reminder",
      message: "Rent is due tomorrow.",
      level: "warning",
      source: "rent",
      dedupeKey: "rent-reminder-e3"
    }
  ]);

  await new Promise((resolve) => setTimeout(resolve, 0));

  assert.equal(inserted.length, 1);
  assert.equal(insertedBatches.length, 1);
  assert.equal(insertedBatches[0][0].title, "Rent Reminder");
});
