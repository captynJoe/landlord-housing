import assert from "node:assert/strict";
import { scryptSync } from "node:crypto";
import test from "node:test";
import {
  OWNER_STAFF_LIMIT,
  UserAccountService
} from "../src/services/userAccountService.js";

function testPasswordHash(password: string, salt = "test-salt"): string {
  return `scrypt$${salt}$${scryptSync(password, salt, 64).toString("hex")}`;
}

test("resident provisioning only closes active tenancies in the target building", async () => {
  const updateManyCalls: any[] = [];
  const user = {
    id: "tenant-1",
    fullName: "Tenant One",
    email: "tenant.one@example.test",
    phone: "+254700000001",
    role: "tenant",
    status: "active"
  };
  const tx = {
    houseUnit: {
      findUnique: async () => ({ id: "unit-b-14", isActive: true })
    },
    tenancy: {
      findFirst: async () => null,
      updateMany: async (args: unknown) => {
        updateManyCalls.push(args);
        return { count: 1 };
      },
      create: async () => ({ id: "tenancy-b-14" })
    },
    housingUser: {
      findUnique: async () => user,
      update: async () => user
    }
  };
  const service = new UserAccountService({
    $transaction: async (callback: (transaction: typeof tx) => unknown) => callback(tx)
  } as never);

  await (
    service as unknown as {
      provisionResidentForSetup(input: {
        buildingId: string;
        houseNumber: string;
        phoneNumber: string;
        password: string;
      }): Promise<unknown>;
    }
  ).provisionResidentForSetup({
    buildingId: "BLDG-B",
    houseNumber: "14",
    phoneNumber: "+254700000001",
    password: "tenant-secret"
  });

  assert.equal(updateManyCalls.length, 1);
  assert.deepEqual(updateManyCalls[0], {
    where: {
      buildingId: "BLDG-B",
      userId: "tenant-1",
      active: true
    },
    data: {
      active: false,
      endedAt: updateManyCalls[0].data.endedAt
    }
  });
});

test("direct tenant onboarding forces first login password change and approves the room", async () => {
  const user = {
    id: "tenant-1",
    fullName: "Existing Tenant",
    email: "tenant.one@example.test",
    phone: "+254700000001",
    role: "tenant",
    status: "active",
    requirePasswordChange: false
  };
  const updatedUser = {
    ...user,
    fullName: "Jane Wanjiku",
    requirePasswordChange: true
  };
  const housingUserUpdateCalls: any[] = [];
  const tenantApplicationUpsertCalls: any[] = [];
  const tenantAgreementUpsertCalls: any[] = [];
  const provisionTx = {
    houseUnit: {
      findUnique: async () => ({ id: "unit-a-10", isActive: true })
    },
    tenancy: {
      findFirst: async () => null,
      updateMany: async () => ({ count: 1 }),
      create: async () => ({ id: "tenancy-a-10" })
    },
    housingUser: {
      findUnique: async () => user,
      update: async (args: unknown) => {
        housingUserUpdateCalls.push(args);
        return updatedUser;
      }
    }
  };
  const approvalTx = {
    building: {
      findUnique: async () => ({
        id: "BLDG-A",
        name: "Building A",
        houseUnits: [{ id: "unit-a-10", houseNumber: "A10" }]
      })
    },
    tenantApplication: {
      upsert: async (args: unknown) => {
        tenantApplicationUpsertCalls.push(args);
        return {
          id: "application-1",
          status: "approved",
          houseNumber: "A10",
          reviewedAt: new Date("2026-05-29T10:00:00.000Z")
        };
      }
    },
    tenantAgreement: {
      upsert: async (args: unknown) => {
        tenantAgreementUpsertCalls.push(args);
        return { id: "agreement-1" };
      }
    }
  };
  let transactionCall = 0;
  const service = new UserAccountService({
    tenancy: {
      findFirst: async () => ({
        id: "tenancy-a-10",
        buildingId: "BLDG-A",
        user: updatedUser,
        unit: { houseNumber: "A10" }
      })
    },
    $transaction: async (callback: (transaction: unknown) => unknown) => {
      transactionCall += 1;
      return callback(transactionCall === 1 ? provisionTx : approvalTx);
    }
  } as never);

  const result = await service.createDirectTenant(
    {
      buildingId: "BLDG-A",
      houseNumber: "a10",
      fullName: "Jane Wanjiku",
      phoneNumber: "0700000001",
      identityType: "national_id",
      identityNumber: "12345678"
    },
    { userId: "landlord-1" }
  );

  assert.equal(result.tenant.mustChangePassword, true);
  assert.equal(result.tenant.fullName, "Jane Wanjiku");
  assert.equal(result.application.status, "approved");
  assert.equal(result.temporaryPassword.source, "identity_number");
  assert.equal(housingUserUpdateCalls.length, 1);
  assert.equal(housingUserUpdateCalls[0].data.requirePasswordChange, true);
  assert.equal(housingUserUpdateCalls[0].data.fullName, "Jane Wanjiku");
  assert.equal(tenantApplicationUpsertCalls[0].create.status, "approved");
  assert.equal(tenantApplicationUpsertCalls[0].create.reviewedByUserId, "landlord-1");
  assert.equal(tenantAgreementUpsertCalls[0].create.identityNumber, "12345678");
});

test("resident phone login resolves the active tenancy without building selection", async () => {
  const tenancyQueries: unknown[] = [];
  const createdSessions: unknown[] = [];
  const user = {
    id: "tenant-1",
    fullName: "Tenant One",
    email: "tenant.one@example.test",
    phone: "+254700000001",
    passwordHash: testPasswordHash("tenant-secret"),
    role: "tenant",
    status: "active",
    requirePasswordChange: false
  };
  const service = new UserAccountService({
    userSession: {
      deleteMany: async () => ({ count: 0 }),
      create: async (args: unknown) => {
        createdSessions.push(args);
        return args;
      }
    },
    housingUser: {
      findUnique: async (args: { where: { phone?: string } }) =>
        args.where.phone === user.phone ? user : null
    },
    tenancy: {
      findFirst: async (args: unknown) => {
        tenancyQueries.push(args);
        return {
          id: "tenancy-b-5",
          userId: user.id,
          buildingId: "BLDG-B",
          unit: {
            houseNumber: "B5"
          },
          user,
          active: true
        };
      }
    },
    tenantApplication: {
      findFirst: async () => null
    }
  } as never);

  const result = await service.createResidentPhoneSession({
    phoneNumber: "0700000001",
    password: "tenant-secret"
  });

  assert.equal(result.buildingId, "BLDG-B");
  assert.equal(result.tenancyId, "tenancy-b-5");
  assert.equal(result.houseNumber, "B5");
  assert.equal(result.session.userId, user.id);
  assert.equal(result.session.residentTenancyId, "tenancy-b-5");
  assert.equal(createdSessions.length, 1);
  assert.equal(
    (createdSessions[0] as { data: { residentTenancyId?: string } }).data
      .residentTenancyId,
    "tenancy-b-5"
  );
  assert.deepEqual(tenancyQueries[0], {
    where: {
      active: true,
      userId: user.id
    },
    include: {
      user: true,
      unit: {
        select: { houseNumber: true }
      }
    },
    orderBy: { createdAt: "desc" }
  });
});

test("tenant approval only closes same-building active tenancies", async () => {
  const updateManyCalls: any[] = [];
  const application = {
    id: "application-1",
    userId: "tenant-1",
    buildingId: "BLDG-B",
    unitId: "unit-b-14",
    houseNumber: "14",
    note: null,
    building: {
      id: "BLDG-B",
      landlordUserId: "landlord-b",
      name: "Building B"
    },
    user: {
      id: "tenant-1",
      fullName: "Tenant One",
      email: "tenant.one@example.test",
      phone: "+254700000001"
    },
    unit: {
      id: "unit-b-14",
      houseNumber: "14"
    }
  };
  const tx = {
    tenancy: {
      findFirst: async () => null,
      updateMany: async (args: unknown) => {
        updateManyCalls.push(args);
        return { count: 1 };
      },
      create: async () => ({ id: "tenancy-b-14" })
    },
    tenantApplication: {
      update: async () => ({
        id: application.id,
        status: "approved",
        houseNumber: application.houseNumber,
        reviewedAt: new Date("2026-05-16T00:00:00.000Z")
      })
    }
  };
  const service = new UserAccountService({
    tenantApplication: {
      findUnique: async () => application
    },
    $transaction: async (callback: (transaction: typeof tx) => unknown) => callback(tx)
  } as never);

  await service.reviewTenantApplication(
    {
      token: "session-token",
      userId: "landlord-b",
      role: "landlord",
      fullName: "Landlord B",
      email: "landlord.b@example.test",
      phone: "+254700000002",
      expiresAt: "2026-05-16T12:00:00.000Z",
      mustChangePassword: false
    },
    application.id,
    { action: "approve" }
  );

  assert.equal(updateManyCalls.length, 1);
  assert.deepEqual(updateManyCalls[0], {
    where: {
      buildingId: "BLDG-B",
      userId: "tenant-1",
      active: true
    },
    data: {
      active: false,
      endedAt: updateManyCalls[0].data.endedAt
    }
  });
});

test("caretaker tenant approval is limited to assigned buildings", async () => {
  const application = {
    id: "application-1",
    userId: "tenant-1",
    buildingId: "BLDG-B",
    unitId: "unit-b-14",
    houseNumber: "14",
    note: null,
    building: {
      id: "BLDG-B",
      landlordUserId: "landlord-b",
      name: "Building B"
    },
    user: {
      id: "tenant-1",
      fullName: "Tenant One",
      email: "tenant.one@example.test",
      phone: "+254700000001"
    },
    unit: {
      id: "unit-b-14",
      houseNumber: "14"
    }
  };
  const tx = {
    tenancy: {
      findFirst: async () => null,
      updateMany: async () => ({ count: 1 }),
      create: async () => ({ id: "tenancy-b-14" })
    },
    tenantApplication: {
      update: async () => ({
        id: application.id,
        status: "approved",
        houseNumber: application.houseNumber,
        reviewedAt: new Date("2026-05-16T00:00:00.000Z")
      })
    }
  };
  const service = new UserAccountService({
    tenantApplication: {
      findUnique: async () => application
    },
    $transaction: async (callback: (transaction: typeof tx) => unknown) => callback(tx)
  } as never);

  await assert.rejects(
    () =>
      service.reviewTenantApplication(
        {
          userId: "caretaker-1",
          role: "caretaker",
          visibleBuildingIds: new Set(["BLDG-A"])
        },
        application.id,
        { action: "approve" }
      ),
    /BUILDING_ACCESS_DENIED/
  );

  const approved = await service.reviewTenantApplication(
    {
      userId: "caretaker-1",
      role: "caretaker",
      visibleBuildingIds: new Set(["BLDG-B"])
    },
    application.id,
    { action: "approve" }
  );

  assert.equal(approved.status, "approved");
  assert.equal(approved.building.id, "BLDG-B");
});

test("caretaker resident removal is limited to assigned buildings", async () => {
  const updateManyCalls: any[] = [];
  const service = new UserAccountService({
    building: {
      findUnique: async () => ({
        id: "BLDG-B",
        name: "Building B",
        landlordUserId: "landlord-b"
      })
    },
    tenancy: {
      findFirst: async () => ({
        id: "tenancy-b-14",
        unit: {
          houseNumber: "14"
        },
        user: {
          id: "tenant-1",
          fullName: "Tenant One",
          email: "tenant.one@example.test",
          phone: "+254700000001",
          role: "tenant"
        }
      })
    },
    $transaction: async (callback: (transaction: unknown) => unknown) =>
      callback({
        tenancy: {
          updateMany: async (args: unknown) => {
            updateManyCalls.push(args);
            return { count: 1 };
          }
        },
        userSession: {
          updateMany: async () => ({ count: 1 })
        },
        tenantApplication: {
          updateMany: async () => ({ count: 0 })
        }
      })
  } as never);

  const session = {
    token: "session-token",
    userId: "caretaker-1",
    role: "tenant" as const,
    fullName: "House Manager",
    email: "manager@example.test",
    phone: "+254700000004",
    expiresAt: "2026-05-16T12:00:00.000Z",
    mustChangePassword: false
  };

  await assert.rejects(
    () =>
      service.removeResidentFromBuilding(session, {
        buildingId: "BLDG-B",
        userId: "tenant-1",
        actorRole: "caretaker",
        visibleBuildingIds: new Set(["BLDG-A"])
      }),
    /BUILDING_ACCESS_DENIED/
  );

  const removed = await service.removeResidentFromBuilding(session, {
    buildingId: "BLDG-B",
    userId: "tenant-1",
    actorRole: "caretaker",
    visibleBuildingIds: new Set(["BLDG-B"]),
    note: "Moved out"
  });

  assert.equal(removed.houseNumber, "14");
  assert.equal(updateManyCalls.length, 1);
  assert.deepEqual(updateManyCalls[0].where, {
    buildingId: "BLDG-B",
    userId: "tenant-1",
    active: true
  });
});

test("dedicated landlord staff can see and manage all buildings", async () => {
  const findUniqueCalls: unknown[] = [];
  const service = new UserAccountService({
    building: {
      findUnique: async (args: unknown) => {
        findUniqueCalls.push(args);
        return { id: "BLDG-B" };
      }
    }
  } as never);

  const session = {
    token: "session-token",
    userId: "staff-a",
    role: "staff" as const,
    fullName: "Staff Member",
    email: "staff@example.test",
    phone: "+254700000003",
    expiresAt: "2026-05-16T12:00:00.000Z",
    mustChangePassword: false
  };

  const visibleBuildingIds = await service.listVisibleBuildingIds(session);
  const canAccess = await service.canAccessBuilding(session, "BLDG-B");

  assert.equal(visibleBuildingIds, null);
  assert.equal(canAccess, true);
  assert.deepEqual(findUniqueCalls[0], {
    where: { id: "BLDG-B" },
    select: { id: true }
  });
});

test("staff creation normalizes credentials and requires password change", async () => {
  const createdAt = new Date("2026-05-18T09:00:00.000Z");
  let createArgs: any;
  const service = new UserAccountService({
    userSession: {
      deleteMany: async () => ({ count: 0 })
    },
    housingUser: {
      count: async () => 1,
      findFirst: async () => null,
      create: async (args: any) => {
        createArgs = args;
        return {
          id: "owner-staff-2",
          ...args.data,
          createdAt,
          updatedAt: createdAt
        };
      }
    }
  } as never);

  const result = await service.createOwnerStaffUser({
    fullName: "  Staff Two  ",
    email: "  Owner.Two@Example.Test ",
    phoneNumber: "0711 111 111",
    temporaryPassword: "temporary-secret"
  });

  assert.equal(createArgs.data.fullName, "Staff Two");
  assert.equal(createArgs.data.email, "owner.two@example.test");
  assert.equal(createArgs.data.phone, "+254711111111");
  assert.equal(createArgs.data.role, "staff");
  assert.equal(createArgs.data.status, "active");
  assert.equal(createArgs.data.requirePasswordChange, true);
  assert.match(createArgs.data.passwordHash, /^scrypt\$/);
  assert.equal(result.id, "owner-staff-2");
  assert.equal(result.role, "staff");
  assert.equal(result.email, "owner.two@example.test");
  assert.equal(result.phone, "+254711111111");
  assert.equal(result.mustChangePassword, true);
});

test("staff creation enforces the active account limit", async () => {
  const service = new UserAccountService({
    userSession: {
      deleteMany: async () => ({ count: 0 })
    },
    housingUser: {
      count: async () => OWNER_STAFF_LIMIT
    }
  } as never);

  await assert.rejects(
    () =>
      service.createOwnerStaffUser({
        fullName: "Extra Owner",
        email: "extra.owner@example.test",
        phoneNumber: "+254722222222",
        temporaryPassword: "temporary-secret"
      }),
    /OWNER_STAFF_LIMIT_REACHED/
  );
});

test("staff disabling does not target landlord accounts", async () => {
  const service = new UserAccountService({
    housingUser: {
      findUnique: async () => ({
        id: "landlord-1",
        fullName: "Only Owner",
        email: "owner@example.test",
        phone: "+254700000001",
        role: "landlord",
        status: "active",
        updatedAt: new Date("2026-05-18T09:00:00.000Z")
      })
    }
  } as never);

  await assert.rejects(
    () =>
      service.disableOwnerStaffUser("landlord-1", {
        actorUserId: "root-admin",
        confirmUserId: "landlord-1"
      }),
    /OWNER_STAFF_USER_NOT_FOUND/
  );
});

test("staff disabling allows staff removal without an owner guard", async () => {
  const updatedAt = new Date("2026-05-18T09:30:00.000Z");
  let countCalls = 0;
  const service = new UserAccountService({
    housingUser: {
      findUnique: async () => ({
        id: "staff-1",
        fullName: "Desk Staff",
        email: "staff@example.test",
        phone: "+254700000002",
        role: "staff",
        status: "active",
        updatedAt
      }),
      count: async () => {
        countCalls += 1;
        return 0;
      }
    },
    $transaction: async (callback: (transaction: any) => unknown) =>
      callback({
        housingUser: {
          update: async () => ({
            id: "staff-1",
            fullName: "Desk Staff",
            email: "staff@example.test",
            phone: "+254700000002",
            role: "staff",
            status: "disabled",
            updatedAt
          })
        },
        userSession: {
          updateMany: async () => ({ count: 1 })
        }
      })
  } as never);

  const result = await service.disableOwnerStaffUser("staff-1", {
    actorUserId: "owner-1",
    confirmUserId: "staff-1"
  });

  assert.equal(result.disabled, true);
  assert.equal(result.role, "staff");
  assert.equal(countCalls, 0);
});

test("primary landlord lookup returns the earliest active landlord account", async () => {
  const createdAt = new Date("2026-05-18T07:00:00.000Z");
  let findFirstArgs: any;
  const service = new UserAccountService({
    housingUser: {
      findFirst: async (args: any) => {
        findFirstArgs = args;
        return {
          id: "landlord-1",
          fullName: "Primary Owner",
          email: "owner@example.test",
          phone: "+254700000001",
          role: "landlord",
          requirePasswordChange: false,
          createdAt
        };
      }
    }
  } as never);

  const result = await service.getPrimaryLandlordUser();

  assert.equal(result?.id, "landlord-1");
  assert.equal(result?.role, "landlord");
  assert.deepEqual(findFirstArgs, {
    where: {
      role: "landlord",
      status: "active"
    },
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
      role: true,
      requirePasswordChange: true
    },
    orderBy: { createdAt: "asc" }
  });
});

test("createSessionForUserId issues a database-backed session for an active landlord", async () => {
  const createdSessions: any[] = [];
  const service = new UserAccountService({
    userSession: {
      deleteMany: async () => ({ count: 0 }),
      create: async (args: any) => {
        createdSessions.push(args);
        return args;
      }
    },
    housingUser: {
      findUnique: async () => ({
        id: "landlord-1",
        fullName: "Primary Owner",
        email: "owner@example.test",
        phone: "+254700000001",
        role: "landlord",
        requirePasswordChange: false,
        status: "active"
      })
    }
  } as never);

  const session = await service.createSessionForUserId("landlord-1");

  assert.equal(session?.userId, "landlord-1");
  assert.equal(session?.role, "landlord");
  assert.equal(createdSessions.length, 1);
  assert.equal(createdSessions[0].data.userId, "landlord-1");
});
