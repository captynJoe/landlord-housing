import assert from "node:assert/strict";
import test from "node:test";
import { OwnerNotificationService } from "../src/services/ownerNotificationService.js";

test("owner notifications are targeted and unread per owner", () => {
  const service = new OwnerNotificationService();

  const created = service.enqueue({
    title: "Resident Cleared",
    message: "House manager cleared A-1.",
    action: "resident.removed",
    buildingId: "jk-a",
    houseNumber: "A-1",
    recipientUserIds: ["owner-1", "owner-2"],
    dedupeKey: "resident-removed-1"
  });

  assert.ok(created);
  assert.equal(service.listForUser("manager-1").length, 0);
  assert.equal(service.countUnreadForUser("owner-1"), 1);
  assert.equal(service.countUnreadForUser("owner-2"), 1);

  assert.equal(service.markRead("owner-1", [created.id]), 1);
  assert.equal(service.countUnreadForUser("owner-1"), 0);
  assert.equal(service.countUnreadForUser("owner-2"), 1);
});

test("owner notifications dedupe and survive import/export", () => {
  const service = new OwnerNotificationService();

  assert.ok(
    service.enqueue({
      title: "Rent Payment Recorded",
      message: "Payment recorded.",
      action: "rent.payment.recorded",
      recipientUserIds: ["owner-1"],
      dedupeKey: "rent-payment-1"
    })
  );
  assert.equal(
    service.enqueue({
      title: "Rent Payment Recorded",
      message: "Duplicate.",
      action: "rent.payment.recorded",
      recipientUserIds: ["owner-1"],
      dedupeKey: "rent-payment-1"
    }),
    null
  );

  const restored = new OwnerNotificationService();
  restored.importState(service.exportState());

  assert.equal(restored.listForUser("owner-1").length, 1);
  assert.equal(
    restored.enqueue({
      title: "Rent Payment Recorded",
      message: "Duplicate after import.",
      action: "rent.payment.recorded",
      recipientUserIds: ["owner-1"],
      dedupeKey: "rent-payment-1"
    }),
    null
  );
});
