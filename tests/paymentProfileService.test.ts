import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import {
  PaymentProfileService,
  buildRentAccountReference
} from "../src/services/paymentProfileService.js";

function tempStatePath(): string {
  return path.join(mkdtempSync(path.join(tmpdir(), "payment-profiles-")), "state.json");
}

test("lists env M-PESA profiles without exposing secrets", () => {
  const service = new PaymentProfileService({
    filePath: tempStatePath(),
    env: {
      BASE_URL: "https://estate.test",
      MPESA_STK_ENABLED: "true",
      MPESA_ENVIRONMENT: "sandbox",
      MPESA_CALLBACK_URL: "https://estate.test/api/payments/mpesa/rent-callback",
      MPESA_CONSUMER_KEY: "default-key",
      MPESA_CONSUMER_SECRET: "default-secret",
      MPESA_BUSINESS_SHORT_CODE: "111111",
      MPESA_PASSKEY: "default-passkey",
      MPESA_PAYMENT_PROFILES_JSON: JSON.stringify([
        {
          id: "building-a",
          name: "Building A Account",
          shortCode: "222222",
          partyB: "333333",
          consumerKey: "building-key",
          consumerSecret: "building-secret",
          passkey: "building-passkey",
          accountReferencePrefix: "BLDGA"
        }
      ])
    }
  });

  const profiles = service.listProfiles("/api/payments/mpesa/rent-callback");
  const defaultProfile = profiles.find((item) => item.id === "default");
  const buildingProfile = profiles.find((item) => item.id === "building-a");

  assert.equal(profiles.length, 2);
  assert.equal(defaultProfile?.isConfigured, true);
  assert.equal(defaultProfile?.shortCode, "111111");
  assert.equal(buildingProfile?.name, "Building A Account");
  assert.equal(buildingProfile?.shortCode, "222222");
  assert.equal(buildingProfile?.partyB, "333333");
  assert.equal(buildingProfile?.isConfigured, true);
  assert.equal(JSON.stringify(buildingProfile).includes("building-secret"), false);
});

test("assigns a building to a configured profile and resolves STK config", () => {
  const service = new PaymentProfileService({
    filePath: tempStatePath(),
    env: {
      BASE_URL: "https://estate.test",
      MPESA_STK_ENABLED: "true",
      MPESA_PAYMENT_PROFILES_JSON: JSON.stringify([
        {
          id: "building-b",
          name: "Building B Account",
          shortCode: "444444",
          consumerKey: "building-b-key",
          consumerSecret: "building-b-secret",
          passkey: "building-b-passkey"
        }
      ])
    }
  });

  const assignment = service.updateAssignment("BLDG-B", {
    profileId: "building-b",
    accountReference: "BLDGB"
  });
  const resolved = service.resolveForBuilding(
    "BLDG-B",
    "/api/payments/mpesa/rent-callback"
  );

  assert.equal(assignment.profileId, "building-b");
  assert.equal(resolved.publicProfile?.id, "building-b");
  assert.equal(resolved.config?.shortCode, "444444");
  assert.equal(resolved.config?.partyB, "444444");
  assert.equal(resolved.config?.callbackUrl, "https://estate.test/api/payments/mpesa/rent-callback");
  assert.equal(
    buildRentAccountReference({
      houseNumber: "A-12",
      assignment,
      profile: resolved.publicProfile
    }),
    "BLDGB"
  );
});

test("does not silently fall back when an assigned profile is removed", () => {
  const service = new PaymentProfileService({
    filePath: tempStatePath(),
    env: {
      BASE_URL: "https://estate.test",
      MPESA_PAYMENT_PROFILES_JSON: JSON.stringify([
        {
          id: "building-c",
          name: "Building C Account",
          shortCode: "555555",
          consumerKey: "key",
          consumerSecret: "secret",
          passkey: "passkey"
        }
      ])
    }
  });

  service.updateAssignment("BLDG-C", { profileId: "building-c" });
  const restored = new PaymentProfileService({
    filePath: tempStatePath(),
    env: {
      BASE_URL: "https://estate.test",
      MPESA_PAYMENT_PROFILES_JSON: "[]"
    }
  });
  restored.importState(service.exportState());

  const resolved = restored.resolveForBuilding(
    "BLDG-C",
    "/api/payments/mpesa/rent-callback"
  );
  assert.equal(resolved.publicProfile, null);
  assert.equal(resolved.config, null);
});
