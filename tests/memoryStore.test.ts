import assert from "node:assert/strict";
import test from "node:test";
import { MemoryStore } from "../src/store/memoryStore.js";

test("creates buildings with CAPTYN building IDs", async () => {
  const store = new MemoryStore();

  const building = await store.createBuilding({
    name: "Sunrise Apartments",
    address: "Kasarani, Nairobi",
    county: "Nairobi",
    cctvStatus: "partial",
    media: {
      imageUrls: [],
      videoUrls: []
    }
  });

  assert.match(building.id, /^CAPTYN-BLDG-\d{5}$/);
});

test("adds and resolves incidents", async () => {
  const store = new MemoryStore();
  const [building] = await store.listBuildings();

  assert.ok(building);
  const incident = await store.addIncident(building.id, {
    title: "Water leak",
    details: "Leak in bathroom ceiling",
    severity: "high"
  });

  assert.ok(incident);
  assert.equal(incident.status, "open");

  const resolved = await store.resolveIncident(building.id, incident.id, {
    resolutionNotes: "Pipe replaced"
  });

  assert.ok(resolved);
  assert.equal(resolved.status, "resolved");
  assert.equal(resolved.resolutionNotes, "Pipe replaced");
});

test("adds vacancy snapshots", async () => {
  const store = new MemoryStore();
  const [building] = await store.listBuildings();

  assert.ok(building);
  const snapshot = await store.addVacancySnapshot(building.id, {
    movedOutAt: "2026-02-08T10:00:00.000Z",
    beforeImageUrls: ["https://example.com/before.jpg"],
    afterImageUrls: ["https://example.com/after.jpg"],
    videoUrls: [],
    structuralChanges: ["Repainted living room"],
    damages: ["Door scratch"],
    repairs: ["Door refinished"],
    notes: "Routine turnover update"
  });

  assert.ok(snapshot);
  assert.equal(snapshot.repairs.length, 1);
});
