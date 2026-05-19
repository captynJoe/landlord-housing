import assert from "node:assert/strict";
import test from "node:test";
import { WifiAccessService } from "../src/services/wifiAccessService.js";

const wifiPackages = [
  {
    id: "hour_1",
    name: "Quick Check-In",
    hours: 1,
    priceKsh: 15,
    profile: "Short tasks"
  },
  {
    id: "hour_3",
    name: "Focused Session",
    hours: 3,
    priceKsh: 30,
    profile: "Meetings + classes"
  },
  {
    id: "hour_8",
    name: "Work Block",
    hours: 8,
    priceKsh: 65,
    profile: "Full shift"
  },
  {
    id: "day_24",
    name: "Day Pass",
    hours: 24,
    priceKsh: 120,
    profile: "24-hour access"
  }
] as const;

test("creates pending payment and normalizes phone", () => {
  const service = new WifiAccessService({
    callbackToken: "secret",
    packages: [...wifiPackages]
  });

  const payment = service.createPayment(
    {
      buildingId: "CAPTYN-BLDG-00001",
      packageId: "hour_3",
      phoneNumber: "0712345678"
    },
    {
      id: "CAPTYN-BLDG-00001",
      name: "Nyota Heights"
    }
  );

  assert.equal(payment.status, "pending_confirmation");
  assert.equal(payment.phoneNumber, "+254712345678");
  assert.match(payment.checkoutReference, /^WIFI-\d{13}-\d{6}$/);
});

test("updates package hours and pricing", () => {
  const service = new WifiAccessService({
    callbackToken: "secret",
    packages: [...wifiPackages]
  });

  const updated = service.updatePackage("hour_3", {
    hours: 4,
    priceKsh: 40,
    name: "Focused Session Plus"
  });

  assert.ok(updated);
  assert.equal(updated.hours, 4);
  assert.equal(updated.priceKsh, 40);
  assert.equal(updated.name, "Focused Session Plus");

  const payment = service.createPayment(
    {
      buildingId: "CAPTYN-BLDG-00001",
      packageId: "hour_3",
      phoneNumber: "0712345678"
    },
    {
      id: "CAPTYN-BLDG-00001",
      name: "Nyota Heights"
    }
  );

  assert.equal(payment.package.hours, 4);
  assert.equal(payment.amountKsh, 40);
});

test("uses building-scoped package snapshot when provided", () => {
  const service = new WifiAccessService({
    callbackToken: "secret",
    packages: [...wifiPackages]
  });

  const payment = service.createPayment(
    {
      buildingId: "CAPTYN-BLDG-00002",
      packageId: "hour_3",
      phoneNumber: "0712345678"
    },
    {
      id: "CAPTYN-BLDG-00002",
      name: "Bahari Court"
    },
    {
      id: "hour_3",
      name: "Bahari Evening Pack",
      hours: 5,
      priceKsh: 55,
      profile: "Per-building override",
      enabled: true
    }
  );

  assert.equal(payment.package.name, "Bahari Evening Pack");
  assert.equal(payment.package.hours, 5);
  assert.equal(payment.amountKsh, 55);
});

test("confirms payment and provisions voucher in mock mode", async () => {
  const service = new WifiAccessService({
    callbackToken: "secret",
    packages: [...wifiPackages]
  });

  const payment = service.createPayment(
    {
      buildingId: "CAPTYN-BLDG-00001",
      packageId: "hour_1",
      phoneNumber: "+254712345678"
    },
    {
      id: "CAPTYN-BLDG-00001",
      name: "Nyota Heights"
    }
  );

  const confirmed = await service.confirmPayment(payment.checkoutReference, {
    status: "success",
    providerReference: "MPESA-123"
  });

  assert.ok(confirmed);
  assert.equal(confirmed.status, "active");
  assert.equal(confirmed.provisioningStatus, "provisioned");
  assert.ok(confirmed.voucher);
  assert.match(confirmed.voucher.username, /^wifi\d{6}$/);
  assert.equal(confirmed.providerReference, "MPESA-123");
});

test("lists all payments for admin monitoring", () => {
  const service = new WifiAccessService({
    callbackToken: "secret",
    packages: [...wifiPackages]
  });

  const first = service.createPayment(
    {
      buildingId: "CAPTYN-BLDG-00001",
      packageId: "hour_1",
      phoneNumber: "0712345678"
    },
    {
      id: "CAPTYN-BLDG-00001",
      name: "Nyota Heights"
    }
  );

  const second = service.createPayment(
    {
      buildingId: "CAPTYN-BLDG-00001",
      packageId: "hour_3",
      phoneNumber: "0712345678"
    },
    {
      id: "CAPTYN-BLDG-00001",
      name: "Nyota Heights"
    }
  );

  const listed = service.listPayments();
  assert.equal(listed.length, 2);

  const references = listed.map((item) => item.checkoutReference);
  assert.ok(references.includes(first.checkoutReference));
  assert.ok(references.includes(second.checkoutReference));
});

test("rejects wrong callback token", () => {
  const service = new WifiAccessService({
    callbackToken: "secret",
    packages: [...wifiPackages]
  });

  assert.equal(service.isValidCallbackToken("wrong"), false);
  assert.equal(service.isValidCallbackToken("secret"), true);
});
