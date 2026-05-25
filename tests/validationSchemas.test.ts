import assert from "node:assert/strict";
import test from "node:test";
import {
  accountChangePasswordSchema,
  adminAccessCredentialUpdateSchema,
  createRoomBillingHoldSchema,
  depositRefundRecordSchema,
  landlordRemoveBuildingUserSchema,
  residentDebtCollectionSchema,
  residentPhoneLoginSchema
} from "../src/validation/schemas.js";

test("admin credential updates accept email-style usernames", () => {
  const parsed = adminAccessCredentialUpdateSchema.parse({
    username: "joe@captyn.admin",
    password: "DIYPCq18",
    confirmPassword: "DIYPCq18"
  });

  assert.equal(parsed.username, "joe@captyn.admin");
});

test("resident phone login does not require building or house selection", () => {
  const parsed = residentPhoneLoginSchema.parse({
    phoneNumber: "0700000001",
    password: "tenant-secret"
  });

  assert.equal(parsed.buildingId, undefined);
  assert.equal(parsed.houseNumber, undefined);
  assert.equal(parsed.phoneNumber, "0700000001");
});

test("account password change requires confirmation match", () => {
  const parsed = accountChangePasswordSchema.parse({
    newPassword: "permanent-secret",
    confirmPassword: "permanent-secret"
  });

  assert.equal(parsed.newPassword, "permanent-secret");
  assert.throws(
    () =>
      accountChangePasswordSchema.parse({
        newPassword: "permanent-secret",
        confirmPassword: "different-secret"
      }),
    /Confirmation password must match/
  );
});

test("room billing holds require a valid month range", () => {
  const parsed = createRoomBillingHoldSchema.parse({
    scope: "utilities",
    utilityType: "water",
    startMonth: "2026-05",
    endMonth: "2026-05",
    reason: "Tenant away"
  });

  assert.equal(parsed.scope, "utilities");
  assert.equal(parsed.utilityType, "water");

  assert.throws(
    () =>
      createRoomBillingHoldSchema.parse({
        scope: "rent",
        utilityType: "water",
        startMonth: "2026-06",
        endMonth: "2026-05"
      }),
    /End month must be/
  );
});

test("resident removal requires an explicit move-out settlement action", () => {
  const parsed = landlordRemoveBuildingUserSchema.parse({
    confirmUserId: "resident-1",
    confirmationText: "REMOVE",
    settlementAction: "transfer_to_resident_debt",
    confirmedOutstandingKsh: 850
  });

  assert.equal(parsed.settlementAction, "transfer_to_resident_debt");
  assert.throws(
    () =>
      landlordRemoveBuildingUserSchema.parse({
        confirmUserId: "resident-1",
        confirmationText: "REMOVE"
      }),
    /settlementAction/
  );
});

test("resident debt collection defaults to cash and accepts collection reference", () => {
  const parsed = residentDebtCollectionSchema.parse({
    amountKsh: 850,
    providerReference: "CASH-MOVEOUT-001",
    note: "Collected after handover"
  });

  assert.equal(parsed.amountKsh, 850);
  assert.equal(parsed.provider, "cash");
  assert.equal(parsed.providerReference, "CASH-MOVEOUT-001");
  assert.equal(parsed.note, "Collected after handover");
});

test("deposit refund recording defaults to cash and accepts payout reference", () => {
  const parsed = depositRefundRecordSchema.parse({
    amountKsh: 5000,
    providerReference: "CASH-REFUND-001",
    note: "Paid after inspection"
  });

  assert.equal(parsed.amountKsh, 5000);
  assert.equal(parsed.provider, "cash");
  assert.equal(parsed.providerReference, "CASH-REFUND-001");
  assert.equal(parsed.note, "Paid after inspection");
});
