import assert from "node:assert/strict";
import test from "node:test";
import { OutboundMessageService } from "../src/services/outboundMessageService.js";

test("records and lists outbound SMS messages newest first", () => {
  const service = new OutboundMessageService();

  const first = service.record({
    provider: "talksasa",
    source: "manual",
    category: "general",
    status: "sent",
    recipientKind: "room",
    recipientName: "Jane Tenant",
    recipientPhone: "+254712345678",
    buildingId: "BLDG-1",
    houseNumber: "A1",
    title: "Maintenance",
    body: "Hello Jane.",
    createdAt: "2026-05-28T10:00:00.000Z"
  });
  const second = service.record({
    provider: "talksasa",
    source: "system",
    category: "rent",
    status: "failed",
    recipientKind: "room",
    recipientPhone: "+254700000000",
    buildingId: "BLDG-2",
    houseNumber: "B2",
    body: "Rent reminder.",
    error: "Invalid sender",
    createdAt: "2026-05-29T10:00:00.000Z"
  });

  assert.equal(first.status, "sent");
  assert.equal(first.title, "Maintenance");
  assert.equal(second.status, "failed");
  assert.equal(service.list({ limit: 2 })[0].id, second.id);
  assert.equal(service.list({ buildingId: "BLDG-1" }).length, 1);
  assert.equal(service.list({ buildingIds: ["BLDG-1"], includeUnscoped: false }).length, 1);
});

test("imports persisted outbound message state defensively", () => {
  const service = new OutboundMessageService();

  service.importState({
    messages: [
      {
        id: "message-1",
        channel: "sms",
        provider: "talksasa",
        source: "manual",
        category: "general",
        status: "sent",
        recipientKind: "phone",
        recipientPhone: "+254712345678",
        body: "Saved message",
        createdAt: "2026-05-29T10:00:00.000Z"
      },
      {
        id: "bad-message",
        channel: "sms",
        provider: "talksasa",
        source: "manual",
        category: "general",
        status: "sent",
        recipientKind: "phone",
        body: "",
        createdAt: "2026-05-29T10:00:00.000Z"
      }
    ]
  });

  const messages = service.list();
  assert.equal(messages.length, 1);
  assert.equal(messages[0].id, "message-1");
});
