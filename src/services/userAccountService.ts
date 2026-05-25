import { randomBytes, scryptSync, timingSafeEqual, createHash } from "node:crypto";
import type {
  LandlordAccessRequestStatus,
  Prisma,
  PrismaClient,
  TenantApplicationStatus,
  UserRole
} from "@prisma/client";
import type {
  AccountChangePasswordInput,
  AdminRevokeLandlordInput,
  CreateLandlordAccessRequestInput,
  LandlordDecisionInput,
  OwnerStaffCreateInput,
  OwnerStaffDisableInput,
  ResidentAdminPasswordResetInput,
  ResidentChangePasswordInput,
  ResidentPasswordSetupInput,
  ResidentPhoneLoginInput,
  ReviewLandlordAccessRequestInput,
  TenantAgreementUpsertInput,
  TenantApplicationInput,
  UserLoginInput,
  UserRegisterInput
} from "../validation/schemas.js";

type LoginRateRecord = {
  attempts: number;
  resetAt: number;
};

export const OWNER_STAFF_LIMIT = 3;

export interface AuthenticatedUserSession {
  token: string;
  userId: string;
  role: UserRole;
  fullName: string;
  email: string;
  phone: string;
  expiresAt: string;
  mustChangePassword: boolean;
  residentTenancyId?: string;
}

type LandlordApplicationActor = {
  role: UserRole | "caretaker";
  userId?: string | null;
  visibleBuildingIds?: Set<string> | null;
};

export interface ResidentPhoneSessionResult {
  session: AuthenticatedUserSession;
  tenancyId: string;
  buildingId: string;
  houseNumber: string;
}

export interface UserAccountServiceOptions {
  sessionTtlHours?: number;
  loginWindowMs?: number;
  loginMaxAttempts?: number;
}

function nowMs(): number {
  return Date.now();
}

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function normalizeKenyaPhone(phoneNumber: string): string {
  const normalized = phoneNumber.replace(/[\s-]/g, "").trim();

  if (normalized.startsWith("+254")) return normalized;
  if (normalized.startsWith("254")) return `+${normalized}`;
  if (normalized.startsWith("0")) return `+254${normalized.slice(1)}`;
  return normalized;
}

function normalizeHouseNumber(value: string): string {
  return value.trim().toUpperCase();
}

function normalizeOptionalText(value: string | null | undefined): string | undefined {
  const normalized = String(value ?? "").trim();
  return normalized.length > 0 ? normalized : undefined;
}

function normalizeStringList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return [
    ...new Set(
      value
        .map((item) => String(item ?? "").trim())
        .filter(Boolean)
    )
  ];
}

function isMissingTenantApplicationIdentityColumnsError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : "";
  const code =
    error && typeof error === "object" && "code" in error
      ? String((error as { code?: unknown }).code ?? "")
      : "";

  if (code !== "P2022") {
    return false;
  }

  return /TenantApplication\.(identityType|identityNumber|occupationStatus|occupationLabel)/i.test(
    message
  );
}

function toDateOnlyString(value: Date | null | undefined): string | undefined {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
    return undefined;
  }

  return value.toISOString().slice(0, 10);
}

function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function createSessionToken(): string {
  return randomBytes(32).toString("hex");
}

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const digest = scryptSync(password, salt, 64).toString("hex");
  return `scrypt$${salt}$${digest}`;
}

function verifyPassword(password: string, encodedHash: string): boolean {
  const [algo, salt, digestHex] = encodedHash.split("$");
  if (algo !== "scrypt" || !salt || !digestHex) {
    return false;
  }

  const expected = Buffer.from(digestHex, "hex");
  const derived = scryptSync(password, salt, expected.length);
  if (expected.length !== derived.length) {
    return false;
  }

  return timingSafeEqual(expected, derived);
}

function mapRoleValue(value: string): UserRole {
  switch (value) {
    case "tenant":
    case "landlord":
    case "admin":
    case "root_admin":
      return value;
    default:
      return "tenant";
  }
}

type LandlordAccessRequestWithActors = Prisma.LandlordAccessRequestGetPayload<{
  include: {
    user: {
      select: {
        id: true;
        fullName: true;
        email: true;
        phone: true;
        role: true;
      };
    };
    reviewedBy: {
      select: {
        id: true;
        fullName: true;
        email: true;
        role: true;
      };
    };
  };
}>;

type TenantAgreementRecord = Prisma.TenantAgreementGetPayload<{
  select: {
    id: true;
    tenancyId: true;
    buildingId: true;
    houseNumber: true;
    residentUserId: true;
    identityType: true;
    identityNumber: true;
    identityDocumentUrls: true;
    occupationStatus: true;
    occupationLabel: true;
    organizationName: true;
    organizationLocation: true;
    studentRegistrationNumber: true;
    sponsorName: true;
    sponsorPhone: true;
    emergencyContactName: true;
    emergencyContactPhone: true;
    leaseStartDate: true;
    leaseEndDate: true;
    monthlyRentKsh: true;
    depositKsh: true;
    paymentDueDay: true;
    specialTerms: true;
    createdAt: true;
    updatedAt: true;
  };
}>;

function mapLandlordAccessRequest(record: LandlordAccessRequestWithActors) {
  return {
    id: record.id,
    status: record.status,
    reason: record.reason ?? undefined,
    reviewerNote: record.reviewerNote ?? undefined,
    requestedAt: record.requestedAt.toISOString(),
    reviewedAt: record.reviewedAt?.toISOString(),
    user: {
      id: record.user.id,
      fullName: record.user.fullName,
      email: record.user.email,
      phone: record.user.phone,
      role: record.user.role
    },
    reviewedBy: record.reviewedBy
      ? {
          id: record.reviewedBy.id,
          fullName: record.reviewedBy.fullName,
          email: record.reviewedBy.email,
          role: record.reviewedBy.role
        }
      : null
  };
}

function mapTenantAgreement(record: TenantAgreementRecord) {
  return {
    id: record.id,
    tenancyId: record.tenancyId,
    buildingId: record.buildingId,
    houseNumber: record.houseNumber,
    residentUserId: record.residentUserId,
    identityType: record.identityType ?? undefined,
    identityNumber: record.identityNumber ?? undefined,
    identityDocumentUrls: normalizeStringList(record.identityDocumentUrls),
    occupationStatus: record.occupationStatus ?? undefined,
    occupationLabel: record.occupationLabel ?? undefined,
    organizationName: record.organizationName ?? undefined,
    organizationLocation: record.organizationLocation ?? undefined,
    studentRegistrationNumber: record.studentRegistrationNumber ?? undefined,
    sponsorName: record.sponsorName ?? undefined,
    sponsorPhone: record.sponsorPhone ?? undefined,
    emergencyContactName: record.emergencyContactName ?? undefined,
    emergencyContactPhone: record.emergencyContactPhone ?? undefined,
    leaseStartDate: toDateOnlyString(record.leaseStartDate),
    leaseEndDate: toDateOnlyString(record.leaseEndDate),
    monthlyRentKsh: record.monthlyRentKsh ?? undefined,
    depositKsh: record.depositKsh ?? undefined,
    paymentDueDay: record.paymentDueDay ?? undefined,
    specialTerms: record.specialTerms ?? undefined,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString()
  };
}

export class UserAccountService {
  private readonly sessionTtlHours: number;
  private readonly loginWindowMs: number;
  private readonly loginMaxAttempts: number;
  private readonly loginRateByEmail = new Map<string, LoginRateRecord>();
  private readonly loginRateByPhone = new Map<string, LoginRateRecord>();

  constructor(
    private readonly prisma: PrismaClient,
    options: UserAccountServiceOptions = {}
  ) {
    this.sessionTtlHours = Math.max(1, Math.floor(options.sessionTtlHours ?? 24));
    this.loginWindowMs = Math.max(60_000, Math.floor(options.loginWindowMs ?? 15 * 60 * 1000));
    this.loginMaxAttempts = Math.max(3, Math.floor(options.loginMaxAttempts ?? 8));
  }

  async register(input: UserRegisterInput) {
    await this.purgeExpiredSessions();

    const email = normalizeEmail(input.email);
    const phone = normalizeKenyaPhone(input.phoneNumber);
    const passwordHash = hashPassword(input.password);

    const existing = await this.prisma.housingUser.findFirst({
      where: {
        OR: [{ email }, { phone }]
      },
      select: { id: true, email: true, phone: true }
    });

    if (existing) {
      if (existing.email === email) {
        throw new Error("EMAIL_ALREADY_EXISTS");
      }
      throw new Error("PHONE_ALREADY_EXISTS");
    }

    const created = await this.prisma.housingUser.create({
      data: {
        fullName: input.fullName.trim(),
        email,
        phone,
        passwordHash,
        role: "tenant",
        status: "active"
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        role: true,
        createdAt: true
      }
    });

    return {
      id: created.id,
      fullName: created.fullName,
      email: created.email,
      phone: created.phone,
      role: created.role,
      createdAt: created.createdAt.toISOString()
    };
  }

  async listOwnerStaffUsers() {
    const rows = await this.prisma.housingUser.findMany({
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
        status: true,
        requirePasswordChange: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: { createdAt: "asc" }
    });

    return {
      users: rows.map((row) => ({
        id: row.id,
        fullName: row.fullName,
        email: row.email,
        phone: row.phone,
        role: row.role,
        status: row.status,
        mustChangePassword: Boolean(row.requirePasswordChange),
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString()
      })),
      limit: OWNER_STAFF_LIMIT,
      remaining: Math.max(0, OWNER_STAFF_LIMIT - rows.length)
    };
  }

  async createOwnerStaffUser(input: OwnerStaffCreateInput) {
    await this.purgeExpiredSessions();

    const currentActiveCount = await this.prisma.housingUser.count({
      where: {
        role: "landlord",
        status: "active"
      }
    });
    if (currentActiveCount >= OWNER_STAFF_LIMIT) {
      throw new Error("OWNER_STAFF_LIMIT_REACHED");
    }

    const email = normalizeEmail(input.email);
    const phone = normalizeKenyaPhone(input.phoneNumber);
    const existing = await this.prisma.housingUser.findFirst({
      where: {
        OR: [{ email }, { phone }]
      },
      select: { id: true, email: true, phone: true }
    });

    if (existing) {
      if (existing.email === email) {
        throw new Error("EMAIL_ALREADY_EXISTS");
      }
      throw new Error("PHONE_ALREADY_EXISTS");
    }

    const created = await this.prisma.housingUser.create({
      data: {
        fullName: input.fullName.trim(),
        email,
        phone,
        passwordHash: hashPassword(input.temporaryPassword),
        requirePasswordChange: true,
        role: "landlord",
        status: "active"
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        requirePasswordChange: true,
        createdAt: true,
        updatedAt: true
      }
    });

    return {
      id: created.id,
      fullName: created.fullName,
      email: created.email,
      phone: created.phone,
      role: created.role,
      status: created.status,
      mustChangePassword: Boolean(created.requirePasswordChange),
      createdAt: created.createdAt.toISOString(),
      updatedAt: created.updatedAt.toISOString()
    };
  }

  async disableOwnerStaffUser(
    targetUserId: string,
    input: OwnerStaffDisableInput & { actorUserId?: string }
  ) {
    const userId = targetUserId.trim();
    if (!userId) {
      throw new Error("OWNER_STAFF_USER_NOT_FOUND");
    }
    if (input.confirmUserId && input.confirmUserId.trim() !== userId) {
      throw new Error("OWNER_STAFF_CONFIRMATION_MISMATCH");
    }
    if (input.actorUserId && input.actorUserId === userId) {
      throw new Error("OWNER_STAFF_SELF_DISABLE_DENIED");
    }

    const targetUser = await this.prisma.housingUser.findUnique({
      where: { id: userId },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        updatedAt: true
      }
    });

    if (!targetUser || targetUser.role !== "landlord") {
      throw new Error("OWNER_STAFF_USER_NOT_FOUND");
    }

    if (targetUser.status !== "active") {
      return {
        id: targetUser.id,
        fullName: targetUser.fullName,
        email: targetUser.email,
        phone: targetUser.phone,
        role: targetUser.role,
        status: targetUser.status,
        disabled: false,
        updatedAt: targetUser.updatedAt.toISOString()
      };
    }

    const activeCount = await this.prisma.housingUser.count({
      where: {
        role: "landlord",
        status: "active"
      }
    });
    if (activeCount <= 1) {
      throw new Error("OWNER_STAFF_LAST_OWNER");
    }

    const disabled = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.housingUser.update({
        where: { id: userId },
        data: {
          status: "disabled"
        },
        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
          role: true,
          status: true,
          updatedAt: true
        }
      });

      await tx.userSession.updateMany({
        where: {
          userId,
          revokedAt: null
        },
        data: {
          revokedAt: new Date()
        }
      });

      return updated;
    });

    return {
      id: disabled.id,
      fullName: disabled.fullName,
      email: disabled.email,
      phone: disabled.phone,
      role: disabled.role,
      status: disabled.status,
      disabled: true,
      updatedAt: disabled.updatedAt.toISOString()
    };
  }

  async createSession(input: UserLoginInput): Promise<AuthenticatedUserSession> {
    await this.purgeExpiredSessions();

    const emailRaw = typeof input.email === "string" ? input.email.trim() : "";
    const phoneRaw =
      typeof input.phoneNumber === "string" ? input.phoneNumber.trim() : "";

    let user:
      | {
          id: string;
          fullName: string;
          email: string;
          phone: string;
          passwordHash: string;
          requirePasswordChange: boolean;
          role: UserRole;
          status: string;
        }
      | null = null;
    let failedKeyType: "email" | "phone" = "email";
    let failedKeyValue = "";

    if (emailRaw) {
      const email = normalizeEmail(emailRaw);
      failedKeyType = "email";
      failedKeyValue = email;
      if (this.isRateLimited(this.loginRateByEmail, email)) {
        throw new Error("LOGIN_RATE_LIMITED");
      }

      user = await this.prisma.housingUser.findUnique({
        where: { email }
      });
    } else if (phoneRaw) {
      const phone = normalizeKenyaPhone(phoneRaw);
      failedKeyType = "phone";
      failedKeyValue = phone;
      if (this.isRateLimited(this.loginRateByPhone, phone)) {
        throw new Error("LOGIN_RATE_LIMITED");
      }

      user = await this.prisma.housingUser.findUnique({
        where: { phone }
      });
    }

    if (!user) {
      if (failedKeyType === "phone") {
        this.trackFailedPhoneLogin(failedKeyValue);
      } else {
        this.trackFailedLogin(failedKeyValue);
      }
      throw new Error("ACCOUNT_NOT_FOUND");
    }

    if (!verifyPassword(input.password, user.passwordHash)) {
      if (failedKeyType === "phone") {
        this.trackFailedPhoneLogin(failedKeyValue);
      } else {
        this.trackFailedLogin(failedKeyValue);
      }
      throw new Error("INVALID_PASSWORD");
    }

    if (user.status !== "active") {
      throw new Error("ACCOUNT_DISABLED");
    }

    this.loginRateByEmail.delete(normalizeEmail(user.email));
    this.loginRateByPhone.delete(normalizeKenyaPhone(user.phone));
    return this.issueSessionForUser(user);
  }

  async setupResidentPasswordAndCreateSession(
    input: ResidentPasswordSetupInput
  ): Promise<AuthenticatedUserSession> {
    await this.purgeExpiredSessions();

    const phone = normalizeKenyaPhone(input.phoneNumber);
    const houseNumber = normalizeHouseNumber(input.houseNumber);
    const tenancy = await this.findActiveTenancyByHouseAndPhone({
      buildingId: input.buildingId,
      houseNumber,
      phoneNumber: phone
    });

    const user = tenancy
      ? await this.prisma.housingUser.update({
          where: { id: tenancy.user.id },
          data: {
            passwordHash: hashPassword(input.password),
            requirePasswordChange: false
          }
        })
      : await this.provisionResidentForSetup({
          buildingId: input.buildingId,
          houseNumber,
          phoneNumber: phone,
          password: input.password
        });

    if (user.status !== "active") {
      throw new Error("ACCOUNT_DISABLED");
    }
    if (user.role !== "tenant") {
      throw new Error("RESIDENT_SIGNUP_ROLE_CONFLICT");
    }

    this.loginRateByPhone.delete(phone);
    this.loginRateByEmail.delete(normalizeEmail(user.email));
    const scopedTenancy =
      tenancy ??
      (await this.findActiveTenancyByHouseAndPhone({
        buildingId: input.buildingId,
        houseNumber,
        phoneNumber: phone
      }));
    return this.issueSessionForUser(user, {
      residentTenancyId: scopedTenancy?.id
    });
  }

  async createResidentPhoneSession(
    input: ResidentPhoneLoginInput
  ): Promise<ResidentPhoneSessionResult> {
    await this.purgeExpiredSessions();
    const phone = normalizeKenyaPhone(input.phoneNumber);
    const requestedBuildingId = normalizeOptionalText(input.buildingId);
    const requestedHouseNumber = input.houseNumber
      ? normalizeHouseNumber(input.houseNumber)
      : undefined;

    if (this.isRateLimited(this.loginRateByPhone, phone)) {
      throw new Error("LOGIN_RATE_LIMITED");
    }

    let user = await this.prisma.housingUser.findUnique({
      where: { phone }
    });
    if (!user) {
      this.trackFailedPhoneLogin(phone);
      throw new Error("TENANCY_NOT_FOUND");
    }

    if (!verifyPassword(input.password, user.passwordHash)) {
      this.trackFailedPhoneLogin(phone);
      throw new Error("RESIDENT_PASSWORD_INCORRECT");
    }

    if (user.status !== "active") {
      throw new Error("ACCOUNT_DISABLED");
    }
    if (user.role !== "tenant") {
      throw new Error("RESIDENT_LOGIN_ROLE_CONFLICT");
    }

    let tenancy =
      requestedBuildingId && requestedHouseNumber
        ? await this.findActiveTenancyByHouseAndPhone({
            buildingId: requestedBuildingId,
            houseNumber: requestedHouseNumber,
            phoneNumber: phone
          })
        : await this.findLatestActiveTenancyByResidentUser(user.id);

    if (!tenancy) {
      const pendingApplication = await this.findPendingTenantApplicationForResidentUser({
        userId: user.id,
        buildingId: requestedBuildingId,
        houseNumber: requestedHouseNumber
      });

      if (!pendingApplication) {
        throw new Error("TENANCY_NOT_FOUND");
      }

      user = await this.provisionResidentForSetup({
        buildingId: pendingApplication.buildingId,
        houseNumber: pendingApplication.houseNumber,
        phoneNumber: phone,
        password: input.password
      });
      tenancy = await this.findActiveTenancyByHouseAndPhone({
        buildingId: pendingApplication.buildingId,
        houseNumber: pendingApplication.houseNumber,
        phoneNumber: phone
      });
    }

    if (!tenancy) {
      throw new Error("TENANCY_NOT_FOUND");
    }

    this.loginRateByPhone.delete(phone);
    this.loginRateByEmail.delete(normalizeEmail(user.email));
    const session = await this.issueSessionForUser(user, {
      residentTenancyId: tenancy.id
    });

    return {
      session,
      tenancyId: tenancy.id,
      buildingId: tenancy.buildingId,
      houseNumber: tenancy.unit.houseNumber
    };
  }

  async resetResidentPasswordByTenancy(input: ResidentAdminPasswordResetInput) {
    await this.purgeExpiredSessions();

    const phone = normalizeKenyaPhone(input.phoneNumber);
    const houseNumber = normalizeHouseNumber(input.houseNumber);
    const tenancy = await this.findActiveTenancyByHouseAndPhone({
      buildingId: input.buildingId,
      houseNumber,
      phoneNumber: phone
    });

    if (!tenancy) {
      throw new Error("TENANCY_NOT_FOUND");
    }

    const user = await this.prisma.housingUser.update({
      where: { id: tenancy.user.id },
      data: {
        passwordHash: hashPassword(input.temporaryPassword),
        requirePasswordChange: true
      }
    });

    await this.prisma.userSession.updateMany({
      where: { userId: user.id, revokedAt: null },
      data: { revokedAt: new Date() }
    });

    return {
      userId: user.id,
      fullName: user.fullName,
      phone: user.phone,
      buildingId: input.buildingId,
      houseNumber,
      resetAt: new Date().toISOString()
    };
  }

  async hasActiveResidentTenancy(input: {
    buildingId: string;
    houseNumber: string;
    phoneNumber: string;
  }) {
    const tenancy = await this.findActiveTenancyByHouseAndPhone({
      buildingId: input.buildingId,
      houseNumber: input.houseNumber,
      phoneNumber: input.phoneNumber
    });

    return Boolean(tenancy);
  }

  async resolveUserByIdentifier(identifier: string): Promise<{
    identifierType: "email" | "phone";
    normalizedIdentifier: string;
    user: {
      id: string;
      fullName: string;
      email: string;
      phone: string;
      role: UserRole;
      status: string;
    } | null;
  }> {
    await this.purgeExpiredSessions();

    const raw = String(identifier ?? "").trim();
    const compact = raw.replace(/[\s-]/g, "");
    const looksLikeKenyaPhone = /^(?:\+254|254|0)\d{9}$/.test(compact);
    const identifierType: "email" | "phone" = looksLikeKenyaPhone ? "phone" : "email";
    const normalizedIdentifier =
      identifierType === "phone"
        ? normalizeKenyaPhone(compact)
        : normalizeEmail(raw);

    const user =
      identifierType === "phone"
        ? await this.prisma.housingUser.findUnique({
            where: { phone: normalizedIdentifier },
            select: {
              id: true,
              fullName: true,
              email: true,
              phone: true,
              role: true,
              status: true
            }
          })
        : await this.prisma.housingUser.findUnique({
            where: { email: normalizedIdentifier },
            select: {
              id: true,
              fullName: true,
              email: true,
              phone: true,
              role: true,
              status: true
            }
          });

    return {
      identifierType,
      normalizedIdentifier,
      user
    };
  }

  async resetPasswordByUserId(input: {
    userId: string;
    temporaryPassword: string;
    requirePasswordChange?: boolean;
  }) {
    await this.purgeExpiredSessions();

    const existing = await this.prisma.housingUser.findUnique({
      where: { id: input.userId },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        role: true,
        status: true
      }
    });

    if (!existing) {
      throw new Error("USER_NOT_FOUND");
    }

    if (existing.status !== "active") {
      throw new Error("ACCOUNT_DISABLED");
    }

    const resetAt = new Date();
    const requirePasswordChange =
      typeof input.requirePasswordChange === "boolean"
        ? input.requirePasswordChange
        : true;

    const user = await this.prisma.housingUser.update({
      where: { id: existing.id },
      data: {
        passwordHash: hashPassword(input.temporaryPassword),
        requirePasswordChange
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        role: true
      }
    });

    await this.prisma.userSession.updateMany({
      where: { userId: user.id, revokedAt: null },
      data: { revokedAt: resetAt }
    });

    this.loginRateByPhone.delete(normalizeKenyaPhone(user.phone));
    this.loginRateByEmail.delete(normalizeEmail(user.email));

    return {
      userId: user.id,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      role: user.role,
      requirePasswordChange,
      resetAt: resetAt.toISOString()
    };
  }

  async changeResidentPassword(
    session: Pick<AuthenticatedUserSession, "userId" | "residentTenancyId">,
    input: ResidentChangePasswordInput
  ): Promise<AuthenticatedUserSession> {
    await this.purgeExpiredSessions();

    const user = await this.prisma.housingUser.update({
      where: { id: session.userId },
      data: {
        passwordHash: hashPassword(input.newPassword),
        requirePasswordChange: false
      }
    });

    if (user.status !== "active") {
      throw new Error("ACCOUNT_DISABLED");
    }

    await this.prisma.userSession.updateMany({
      where: { userId: user.id, revokedAt: null },
      data: { revokedAt: new Date() }
    });

    this.loginRateByPhone.delete(normalizeKenyaPhone(user.phone));
    this.loginRateByEmail.delete(normalizeEmail(user.email));
    return this.issueSessionForUser(user, {
      residentTenancyId: session.residentTenancyId
    });
  }

  async changeAccountPassword(
    session: Pick<AuthenticatedUserSession, "userId" | "residentTenancyId">,
    input: AccountChangePasswordInput
  ): Promise<AuthenticatedUserSession> {
    await this.purgeExpiredSessions();

    const user = await this.prisma.housingUser.update({
      where: { id: session.userId },
      data: {
        passwordHash: hashPassword(input.newPassword),
        requirePasswordChange: false
      }
    });

    if (user.status !== "active") {
      throw new Error("ACCOUNT_DISABLED");
    }

    await this.prisma.userSession.updateMany({
      where: { userId: user.id, revokedAt: null },
      data: { revokedAt: new Date() }
    });

    this.loginRateByPhone.delete(normalizeKenyaPhone(user.phone));
    this.loginRateByEmail.delete(normalizeEmail(user.email));
    return this.issueSessionForUser(user, {
      residentTenancyId: session.residentTenancyId
    });
  }

  private async issueSessionForUser(
    user: {
      id: string;
      role: UserRole;
      fullName: string;
      email: string;
      phone: string;
      requirePasswordChange: boolean;
    },
    options: { residentTenancyId?: string } = {}
  ): Promise<AuthenticatedUserSession> {
    const token = createSessionToken();
    const tokenHash = hashSessionToken(token);
    const expiresAt = new Date(nowMs() + this.sessionTtlHours * 60 * 60 * 1000);
    const residentTenancyId = normalizeOptionalText(options.residentTenancyId);

    await this.prisma.userSession.create({
      data: {
        userId: user.id,
        residentTenancyId,
        tokenHash,
        expiresAt
      }
    });

    return {
      token,
      userId: user.id,
      role: user.role,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      expiresAt: expiresAt.toISOString(),
      mustChangePassword: Boolean(user.requirePasswordChange),
      residentTenancyId
    };
  }

  private async findActiveTenancyByHouseAndPhone(input: {
    buildingId: string;
    houseNumber: string;
    phoneNumber: string;
  }) {
    const houseNumber = normalizeHouseNumber(input.houseNumber);
    const phoneNumber = normalizeKenyaPhone(input.phoneNumber);
    return this.prisma.tenancy.findFirst({
      where: {
        active: true,
        buildingId: input.buildingId,
        unit: {
          houseNumber
        },
        user: {
          phone: phoneNumber
        }
      },
      include: {
        user: true,
        unit: {
          select: { houseNumber: true }
        }
      },
      orderBy: { createdAt: "desc" }
    });
  }

  private async findLatestActiveTenancyByResidentUser(userId: string) {
    return this.prisma.tenancy.findFirst({
      where: {
        active: true,
        userId
      },
      include: {
        user: true,
        unit: {
          select: { houseNumber: true }
        }
      },
      orderBy: { createdAt: "desc" }
    });
  }

  private async findPendingTenantApplicationForResidentUser(input: {
    userId: string;
    buildingId?: string;
    houseNumber?: string;
  }) {
    const where: Prisma.TenantApplicationWhereInput = {
      userId: input.userId,
      status: "pending"
    };

    if (input.buildingId) {
      where.buildingId = input.buildingId;
    }
    if (input.houseNumber) {
      where.houseNumber = input.houseNumber;
    }

    return this.prisma.tenantApplication.findFirst({
      where,
      select: {
        buildingId: true,
        houseNumber: true
      },
      orderBy: { updatedAt: "desc" }
    });
  }

  private async provisionResidentForSetup(input: {
    buildingId: string;
    houseNumber: string;
    phoneNumber: string;
    password: string;
  }) {
    const phoneNumber = normalizeKenyaPhone(input.phoneNumber);
    const houseNumber = normalizeHouseNumber(input.houseNumber);
    const passwordHash = hashPassword(input.password);

    return this.prisma.$transaction(async (tx) => {
      let unit = await tx.houseUnit.findUnique({
        where: {
          buildingId_houseNumber: {
            buildingId: input.buildingId,
            houseNumber
          }
        },
        select: {
          id: true,
          isActive: true
        }
      });

      if (!unit) {
        const buildingUnitCount = await tx.houseUnit.count({
          where: { buildingId: input.buildingId }
        });

        if (buildingUnitCount > 0) {
          throw new Error("HOUSE_NOT_FOUND");
        }

        unit = await tx.houseUnit.create({
          data: {
            buildingId: input.buildingId,
            houseNumber,
            isActive: true
          },
          select: {
            id: true,
            isActive: true
          }
        });
      }

      if (!unit.isActive) {
        throw new Error("HOUSE_INACTIVE");
      }

      const existingHouseTenancy = await tx.tenancy.findFirst({
        where: {
          buildingId: input.buildingId,
          unitId: unit.id,
          active: true
        },
        include: {
          user: true
        },
        orderBy: {
          createdAt: "desc"
        }
      });

      if (
        existingHouseTenancy &&
        normalizeKenyaPhone(existingHouseTenancy.user.phone) !== phoneNumber
      ) {
        throw new Error("HOUSE_OCCUPIED");
      }

      let user = existingHouseTenancy?.user
        ? existingHouseTenancy.user
        : await tx.housingUser.findUnique({
            where: { phone: phoneNumber }
          });

      if (!user) {
        const email = await this.generateResidentPlaceholderEmail(tx, phoneNumber);
        user = await tx.housingUser.create({
          data: {
            fullName: `Resident ${houseNumber}`,
            email,
            phone: phoneNumber,
            passwordHash,
            role: "tenant",
            status: "active"
          }
        });
      }

      if (user.status !== "active") {
        throw new Error("ACCOUNT_DISABLED");
      }
      if (user.role !== "tenant") {
        throw new Error("RESIDENT_SIGNUP_ROLE_CONFLICT");
      }

      if (!existingHouseTenancy || existingHouseTenancy.userId !== user.id) {
        await tx.tenancy.updateMany({
          where: {
            buildingId: input.buildingId,
            userId: user.id,
            active: true
          },
          data: {
            active: false,
            endedAt: new Date()
          }
        });

        await tx.tenancy.create({
          data: {
            userId: user.id,
            buildingId: input.buildingId,
            unitId: unit.id,
            active: true
          }
        });
      }

      return tx.housingUser.update({
        where: { id: user.id },
        data: {
          passwordHash,
          requirePasswordChange: false
        }
      });
    });
  }

  private async generateResidentPlaceholderEmail(
    tx: Prisma.TransactionClient,
    phoneNumber: string
  ): Promise<string> {
    const digits = phoneNumber.replace(/\D/g, "");
    const base = digits ? `resident.${digits}` : `resident.${randomBytes(4).toString("hex")}`;
    const domain = "resident.captyn.local";

    for (let attempt = 0; attempt < 100; attempt += 1) {
      const suffix = attempt === 0 ? "" : `.${attempt}`;
      const candidate = `${base}${suffix}@${domain}`;
      const existing = await tx.housingUser.findUnique({
        where: { email: candidate },
        select: { id: true }
      });
      if (!existing) {
        return candidate;
      }
    }

    return `${base}.${randomBytes(3).toString("hex")}@${domain}`;
  }

  async getSession(token: string | undefined): Promise<AuthenticatedUserSession | null> {
    await this.purgeExpiredSessions();
    if (!token) return null;

    const tokenHash = hashSessionToken(token);
    const session = await this.prisma.userSession.findUnique({
      where: { tokenHash },
      include: { user: true }
    });

    if (!session || session.revokedAt) {
      return null;
    }

    if (session.expiresAt.getTime() <= nowMs()) {
      await this.prisma.userSession.deleteMany({
        where: { tokenHash }
      });
      return null;
    }

    if (session.user.status !== "active") {
      return null;
    }

    return {
      token,
      userId: session.user.id,
      role: session.user.role,
      fullName: session.user.fullName,
      email: session.user.email,
      phone: session.user.phone,
      expiresAt: session.expiresAt.toISOString(),
      mustChangePassword: Boolean(session.user.requirePasswordChange),
      residentTenancyId: session.residentTenancyId ?? undefined
    };
  }

  async logout(token: string | undefined): Promise<void> {
    if (!token) return;
    await this.prisma.userSession.updateMany({
      where: { tokenHash: hashSessionToken(token), revokedAt: null },
      data: { revokedAt: new Date() }
    });
  }

  async listVisibleBuildingIds(session: AuthenticatedUserSession): Promise<Set<string> | null> {
    if (session.role === "admin" || session.role === "root_admin") {
      return null;
    }

    // Dedicated landlord app: owner/staff accounts manage all buildings in this deployment.
    if (session.role === "landlord") {
      return null;
    }

    const rows = await this.prisma.tenancy.findMany({
      where: { userId: session.userId, active: true },
      select: { buildingId: true }
    });

    return new Set(rows.map((item) => item.buildingId));
  }

  async canAccessBuilding(session: AuthenticatedUserSession, buildingId: string): Promise<boolean> {
    if (session.role === "admin" || session.role === "root_admin") {
      return true;
    }

    // Dedicated landlord app: owner/staff accounts can manage any existing building.
    if (session.role === "landlord") {
      const building = await this.prisma.building.findUnique({
        where: { id: buildingId },
        select: { id: true }
      });
      return Boolean(building);
    }

    const tenancy = await this.prisma.tenancy.findFirst({
      where: { buildingId, userId: session.userId, active: true },
      select: { id: true }
    });
    return Boolean(tenancy);
  }

  async removeResidentFromBuilding(
    session: AuthenticatedUserSession,
    input: {
      buildingId: string;
      userId: string;
      note?: string;
      actorRole?: UserRole | "caretaker";
      visibleBuildingIds?: Set<string> | null;
    }
  ) {
    const actorRole = input.actorRole ?? session.role;
    if (
      actorRole !== "landlord" &&
      actorRole !== "admin" &&
      actorRole !== "root_admin" &&
      actorRole !== "caretaker"
    ) {
      throw new Error("LANDLORD_OR_ADMIN_ROLE_REQUIRED");
    }

    const building = await this.prisma.building.findUnique({
      where: { id: input.buildingId },
      select: {
        id: true,
        name: true,
        landlordUserId: true
      }
    });
    if (!building) {
      throw new Error("BUILDING_NOT_FOUND");
    }
    if (
      input.visibleBuildingIds instanceof Set &&
      !input.visibleBuildingIds.has(building.id)
    ) {
      throw new Error("BUILDING_ACCESS_DENIED");
    }
    if (actorRole === "caretaker" && !(input.visibleBuildingIds instanceof Set)) {
      throw new Error("BUILDING_ACCESS_DENIED");
    }

    const tenancy = await this.prisma.tenancy.findFirst({
      where: {
        buildingId: input.buildingId,
        userId: input.userId,
        active: true
      },
      include: {
        unit: {
          select: {
            houseNumber: true
          }
        },
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            role: true
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    if (!tenancy) {
      throw new Error("TENANCY_NOT_FOUND");
    }

    if (tenancy.user.role === "admin" || tenancy.user.role === "root_admin") {
      throw new Error("TARGET_USER_NOT_RESIDENT");
    }

    const note = input.note?.trim() || undefined;
    const endedAt = new Date();

    await this.prisma.$transaction(async (tx) => {
      await tx.tenancy.updateMany({
        where: {
          buildingId: input.buildingId,
          userId: input.userId,
          active: true
        },
        data: {
          active: false,
          endedAt
        }
      });

      await tx.userSession.updateMany({
        where: {
          userId: input.userId,
          revokedAt: null
        },
        data: {
          revokedAt: endedAt
        }
      });

      if (note) {
        await tx.tenantApplication.updateMany({
          where: {
            userId: input.userId,
            buildingId: input.buildingId,
            status: "pending"
          },
          data: {
            status: "rejected",
            note,
            reviewedAt: endedAt,
            reviewedByUserId: session.userId
          }
        });
      }
    });

    return {
      building: {
        id: building.id,
        name: building.name
      },
      user: {
        id: tenancy.user.id,
        fullName: tenancy.user.fullName,
        email: tenancy.user.email,
        phone: tenancy.user.phone
      },
      tenancyId: tenancy.id,
      houseNumber: tenancy.unit.houseNumber,
      note,
      removedAt: endedAt.toISOString()
    };
  }

  private async upsertTenantApplicationForUser(
    tx: Prisma.TransactionClient,
    userId: string,
    input: TenantApplicationInput
  ) {
    const houseNumber = normalizeHouseNumber(input.houseNumber);

    const building = await tx.building.findUnique({
      where: { id: input.buildingId },
      select: {
        id: true,
        name: true,
        houseUnits: {
          where: { houseNumber, isActive: true },
          select: { id: true, houseNumber: true }
        }
      }
    });

    if (!building) {
      throw new Error("BUILDING_NOT_FOUND");
    }

    const unit = building.houseUnits[0];
    if (!unit) {
      throw new Error("HOUSE_NUMBER_NOT_FOUND");
    }

    const conflictingTenancy = await tx.tenancy.findFirst({
      where: {
        buildingId: building.id,
        unitId: unit.id,
        active: true,
        userId: { not: userId }
      },
      select: { id: true }
    });

    if (conflictingTenancy) {
      throw new Error("HOUSE_OCCUPIED");
    }

    const where = {
      userId_buildingId_houseNumber: {
        userId,
        buildingId: building.id,
        houseNumber
      }
    };
    const [existingApplication, activeTenancy] = await Promise.all([
      tx.tenantApplication.findUnique({
        where,
        select: {
          status: true
        }
      }),
      tx.tenancy.findFirst({
        where: {
          userId,
          buildingId: building.id,
          unitId: unit.id,
          active: true
        },
        select: {
          id: true
        }
      })
    ]);

    if (activeTenancy && existingApplication?.status !== "pending") {
      throw new Error("TENANCY_ALREADY_ACTIVE");
    }

    const include = {
      building: {
        select: {
          id: true,
          name: true
        }
      }
    };

    let application;

    try {
      application = await tx.tenantApplication.upsert({
        where,
        update: {
          unitId: unit.id,
          identityType: input.identityType ?? null,
          identityNumber: normalizeOptionalText(input.identityNumber) ?? null,
          occupationStatus: input.occupationStatus ?? null,
          occupationLabel: normalizeOptionalText(input.occupationLabel) ?? null,
          status: "pending",
          note: input.note,
          reviewedAt: null,
          reviewedByUserId: null
        },
        create: {
          userId,
          buildingId: building.id,
          unitId: unit.id,
          houseNumber,
          identityType: input.identityType ?? null,
          identityNumber: normalizeOptionalText(input.identityNumber) ?? null,
          occupationStatus: input.occupationStatus ?? null,
          occupationLabel: normalizeOptionalText(input.occupationLabel) ?? null,
          note: input.note,
          status: "pending"
        },
        include
      });
    } catch (error) {
      if (!isMissingTenantApplicationIdentityColumnsError(error)) {
        throw error;
      }

      application = await tx.tenantApplication.upsert({
        where,
        update: {
          unitId: unit.id,
          status: "pending",
          note: input.note,
          reviewedAt: null,
          reviewedByUserId: null
        },
        create: {
          userId,
          buildingId: building.id,
          unitId: unit.id,
          houseNumber,
          note: input.note,
          status: "pending"
        },
        include
      });
    }

    return {
      id: application.id,
      status: application.status,
      houseNumber: application.houseNumber,
      identityType: application.identityType ?? undefined,
      identityNumber: application.identityNumber ?? undefined,
      occupationStatus: application.occupationStatus ?? undefined,
      occupationLabel: application.occupationLabel ?? undefined,
      note: application.note ?? undefined,
      building: application.building,
      createdAt: application.createdAt.toISOString(),
      updatedAt: application.updatedAt.toISOString()
    };
  }

  async submitResidentSignupApplication(input: ResidentPasswordSetupInput) {
    await this.purgeExpiredSessions();

    const phoneNumber = normalizeKenyaPhone(input.phoneNumber);
    const passwordHash = hashPassword(input.password);
    const houseNumber = normalizeHouseNumber(input.houseNumber);

    const { application } = await this.prisma.$transaction(async (tx) => {
      let user = await tx.housingUser.findUnique({
        where: { phone: phoneNumber }
      });

      if (!user) {
        const email = await this.generateResidentPlaceholderEmail(tx, phoneNumber);
        user = await tx.housingUser.create({
          data: {
            fullName: `Tenant ${normalizeHouseNumber(input.houseNumber)}`,
            email,
            phone: phoneNumber,
            passwordHash,
            role: "tenant",
            status: "active"
          }
        });
      } else {
        if (user.status !== "active") {
          throw new Error("ACCOUNT_DISABLED");
        }
        if (user.role !== "tenant") {
          throw new Error("RESIDENT_SIGNUP_ROLE_CONFLICT");
        }

        user = await tx.housingUser.update({
          where: { id: user.id },
          data: {
            passwordHash,
            requirePasswordChange: false
          }
        });
      }

      const application = await this.upsertTenantApplicationForUser(tx, user.id, {
        buildingId: input.buildingId,
        houseNumber,
        identityType: input.identityType,
        identityNumber: input.identityNumber,
        occupationStatus: input.occupationStatus,
        occupationLabel: input.occupationLabel,
        note: "Resident signup access request"
      });

      return {
        application
      };
    });

    const provisionedUser = await this.provisionResidentForSetup({
      buildingId: input.buildingId,
      houseNumber,
      phoneNumber,
      password: input.password
    });
    const tenancy = await this.findActiveTenancyByHouseAndPhone({
      buildingId: input.buildingId,
      houseNumber,
      phoneNumber
    });
    const session = await this.issueSessionForUser(provisionedUser, {
      residentTenancyId: tenancy?.id
    });

    this.loginRateByPhone.delete(phoneNumber);
    this.loginRateByEmail.delete(normalizeEmail(provisionedUser.email));

    return {
      tenant: {
        userId: provisionedUser.id,
        phone: provisionedUser.phone
      },
      session,
      ...application
    };
  }

  async createTenantApplication(
    session: AuthenticatedUserSession,
    input: TenantApplicationInput
  ) {
    if (session.role !== "tenant") {
      throw new Error("TENANT_ROLE_REQUIRED");
    }

    return this.upsertTenantApplicationForUser(this.prisma, session.userId, input);
  }

  async listMyApplications(session: AuthenticatedUserSession) {
    const rows = await this.prisma.tenantApplication.findMany({
      where: { userId: session.userId },
      include: {
        building: { select: { id: true, name: true } }
      },
      orderBy: { updatedAt: "desc" }
    });

    return rows.map((item) => ({
      id: item.id,
      status: item.status,
      houseNumber: item.houseNumber,
      identityType: item.identityType ?? undefined,
      identityNumber: item.identityNumber ?? undefined,
      occupationStatus: item.occupationStatus ?? undefined,
      occupationLabel: item.occupationLabel ?? undefined,
      note: item.note ?? undefined,
      building: item.building,
      reviewedAt: item.reviewedAt?.toISOString(),
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString()
    }));
  }

  async listLandlordApplications(
    session: LandlordApplicationActor,
    status?: TenantApplicationStatus
  ) {
    if (
      session.role !== "landlord" &&
      session.role !== "admin" &&
      session.role !== "root_admin" &&
      session.role !== "caretaker"
    ) {
      throw new Error("LANDLORD_OR_ADMIN_ROLE_REQUIRED");
    }

    const where: Prisma.TenantApplicationWhereInput = {};
    if (status) {
      where.status = status;
    }
    if (session.visibleBuildingIds instanceof Set) {
      where.buildingId = { in: [...session.visibleBuildingIds] };
    }

    const rows = await this.prisma.tenantApplication.findMany({
      where,
      include: {
        user: {
          select: { id: true, fullName: true, email: true, phone: true }
        },
        building: {
          select: { id: true, name: true }
        }
      },
      orderBy: { createdAt: "asc" }
    });

    return rows.map((item) => ({
      id: item.id,
      status: item.status,
      houseNumber: item.houseNumber,
      identityType: item.identityType ?? undefined,
      identityNumber: item.identityNumber ?? undefined,
      occupationStatus: item.occupationStatus ?? undefined,
      occupationLabel: item.occupationLabel ?? undefined,
      note: item.note ?? undefined,
      building: item.building,
      tenant: item.user,
      reviewedAt: item.reviewedAt?.toISOString(),
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString()
    }));
  }

  async reviewTenantApplication(
    session: LandlordApplicationActor,
    applicationId: string,
    input: LandlordDecisionInput
  ) {
    if (
      session.role !== "landlord" &&
      session.role !== "admin" &&
      session.role !== "root_admin" &&
      session.role !== "caretaker"
    ) {
      throw new Error("LANDLORD_OR_ADMIN_ROLE_REQUIRED");
    }

    const application = await this.prisma.tenantApplication.findUnique({
      where: { id: applicationId },
      include: {
        building: { select: { id: true, landlordUserId: true, name: true } },
        user: { select: { id: true, fullName: true, email: true, phone: true } },
        unit: { select: { id: true, houseNumber: true } }
      }
    });

    if (!application) {
      throw new Error("APPLICATION_NOT_FOUND");
    }
    if (
      session.visibleBuildingIds instanceof Set &&
      !session.visibleBuildingIds.has(application.buildingId)
    ) {
      throw new Error("BUILDING_ACCESS_DENIED");
    }
    if (session.role === "caretaker" && !(session.visibleBuildingIds instanceof Set)) {
      throw new Error("BUILDING_ACCESS_DENIED");
    }

    if (input.action === "reject") {
      const rejectedAt = new Date();
      const rejected = await this.prisma.$transaction(async (tx) => {
        await tx.tenancy.updateMany({
          where: {
            userId: application.userId,
            buildingId: application.buildingId,
            unitId: application.unitId ?? undefined,
            active: true
          },
          data: {
            active: false,
            endedAt: rejectedAt
          }
        });

        await tx.userSession.updateMany({
          where: {
            userId: application.userId,
            revokedAt: null
          },
          data: {
            revokedAt: rejectedAt
          }
        });

        return tx.tenantApplication.update({
          where: { id: application.id },
          data: {
            status: "rejected",
            reviewedAt: rejectedAt,
            reviewedByUserId: session.userId ?? null,
            note: input.note ?? application.note
          }
        });
      });

      return {
        id: rejected.id,
        status: rejected.status,
        building: {
          id: application.building.id,
          name: application.building.name
        },
        tenant: application.user,
        houseNumber: rejected.houseNumber,
        reviewedAt: rejected.reviewedAt?.toISOString()
      };
    }

    if (!application.unitId || !application.unit) {
      throw new Error("HOUSE_NUMBER_NOT_FOUND");
    }
    const approvedUnitId = application.unitId;

    const approved = await this.prisma.$transaction(async (tx) => {
      const conflictingTenancy = await tx.tenancy.findFirst({
        where: {
          buildingId: application.buildingId,
          unitId: approvedUnitId,
          active: true,
          userId: { not: application.userId }
        },
        select: { id: true }
      });

      if (conflictingTenancy) {
        throw new Error("HOUSE_OCCUPIED");
      }

      const existingTenancy = await tx.tenancy.findFirst({
        where: {
          userId: application.userId,
          buildingId: application.buildingId,
          unitId: approvedUnitId,
          active: true
        },
        select: {
          id: true
        }
      });

      if (existingTenancy) {
        await tx.tenancy.updateMany({
          where: {
            buildingId: application.buildingId,
            userId: application.userId,
            active: true,
            id: { not: existingTenancy.id }
          },
          data: {
            active: false,
            endedAt: new Date()
          }
        });
      } else {
        await tx.tenancy.updateMany({
          where: {
            buildingId: application.buildingId,
            userId: application.userId,
            active: true
          },
          data: {
            active: false,
            endedAt: new Date()
          }
        });

        await tx.tenancy.create({
          data: {
            userId: application.userId,
            buildingId: application.buildingId,
            unitId: approvedUnitId,
            active: true
          }
        });
      }

      return tx.tenantApplication.update({
        where: { id: application.id },
        data: {
          status: "approved",
          reviewedAt: new Date(),
          reviewedByUserId: session.userId ?? null,
          note: input.note ?? application.note
        }
      });
    });

    return {
      id: approved.id,
      status: approved.status,
      building: {
        id: application.building.id,
        name: application.building.name
      },
      tenant: application.user,
      houseNumber: approved.houseNumber,
      reviewedAt: approved.reviewedAt?.toISOString()
    };
  }

  async getActiveTenantAgreement(input: { buildingId: string; houseNumber: string }) {
    const houseNumber = normalizeHouseNumber(input.houseNumber);
    const tenancy = await this.prisma.tenancy.findFirst({
      where: {
        buildingId: input.buildingId,
        active: true,
        unit: {
          houseNumber,
          isActive: true
        }
      },
      select: {
        id: true,
        userId: true,
        user: {
          select: {
            fullName: true,
            phone: true,
            email: true
          }
        },
        unit: {
          select: {
            houseNumber: true
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    if (!tenancy) {
      return {
        houseNumber,
        hasActiveResident: false,
        resident: null,
        agreement: null
      };
    }

    const agreement = await this.prisma.tenantAgreement.findUnique({
      where: { tenancyId: tenancy.id },
      select: {
        id: true,
        tenancyId: true,
        buildingId: true,
        houseNumber: true,
        residentUserId: true,
        identityType: true,
        identityNumber: true,
        identityDocumentUrls: true,
        occupationStatus: true,
        occupationLabel: true,
        organizationName: true,
        organizationLocation: true,
        studentRegistrationNumber: true,
        sponsorName: true,
        sponsorPhone: true,
        emergencyContactName: true,
        emergencyContactPhone: true,
        leaseStartDate: true,
        leaseEndDate: true,
        monthlyRentKsh: true,
        depositKsh: true,
        paymentDueDay: true,
        specialTerms: true,
        createdAt: true,
        updatedAt: true
      }
    });

    return {
      houseNumber,
      hasActiveResident: true,
      resident: {
        userId: tenancy.userId,
        fullName: tenancy.user.fullName,
        phone: tenancy.user.phone,
        email: tenancy.user.email
      },
      agreement: agreement ? mapTenantAgreement(agreement) : null
    };
  }

  async upsertActiveTenantAgreement(input: {
    buildingId: string;
    houseNumber: string;
    payload: TenantAgreementUpsertInput;
  }) {
    const houseNumber = normalizeHouseNumber(input.houseNumber);
    const tenancy = await this.prisma.tenancy.findFirst({
      where: {
        buildingId: input.buildingId,
        active: true,
        unit: {
          houseNumber,
          isActive: true
        }
      },
      select: {
        id: true,
        userId: true
      },
      orderBy: { createdAt: "desc" }
    });

    if (!tenancy) {
      throw new Error("ACTIVE_TENANCY_NOT_FOUND");
    }

    const normalizedPayload = {
      identityType: input.payload.identityType ?? null,
      identityNumber: normalizeOptionalText(input.payload.identityNumber) ?? null,
      identityDocumentUrls: normalizeStringList(
        input.payload.identityDocumentUrls
      ),
      occupationStatus: input.payload.occupationStatus ?? null,
      occupationLabel: normalizeOptionalText(input.payload.occupationLabel) ?? null,
      organizationName: normalizeOptionalText(input.payload.organizationName) ?? null,
      organizationLocation:
        normalizeOptionalText(input.payload.organizationLocation) ?? null,
      studentRegistrationNumber:
        normalizeOptionalText(input.payload.studentRegistrationNumber) ?? null,
      sponsorName: normalizeOptionalText(input.payload.sponsorName) ?? null,
      sponsorPhone: normalizeOptionalText(input.payload.sponsorPhone) ?? null,
      emergencyContactName:
        normalizeOptionalText(input.payload.emergencyContactName) ?? null,
      emergencyContactPhone:
        normalizeOptionalText(input.payload.emergencyContactPhone) ?? null,
      leaseStartDate: input.payload.leaseStartDate
        ? new Date(`${input.payload.leaseStartDate}T00:00:00.000Z`)
        : null,
      leaseEndDate: input.payload.leaseEndDate
        ? new Date(`${input.payload.leaseEndDate}T00:00:00.000Z`)
        : null,
      monthlyRentKsh: input.payload.monthlyRentKsh ?? null,
      depositKsh: input.payload.depositKsh ?? null,
      paymentDueDay: input.payload.paymentDueDay ?? null,
      specialTerms: normalizeOptionalText(input.payload.specialTerms) ?? null
    };

    const hasValue = Object.values(normalizedPayload).some((value) =>
      Array.isArray(value) ? value.length > 0 : value != null
    );
    if (!hasValue) {
      await this.prisma.tenantAgreement.deleteMany({
        where: { tenancyId: tenancy.id }
      });

      return {
        houseNumber,
        hasActiveResident: true,
        residentUserId: tenancy.userId,
        agreement: null
      };
    }

    const agreement = await this.prisma.tenantAgreement.upsert({
      where: { tenancyId: tenancy.id },
      update: {
        buildingId: input.buildingId,
        houseNumber,
        residentUserId: tenancy.userId,
        ...normalizedPayload
      },
      create: {
        tenancyId: tenancy.id,
        buildingId: input.buildingId,
        houseNumber,
        residentUserId: tenancy.userId,
        ...normalizedPayload
      },
      select: {
        id: true,
        tenancyId: true,
        buildingId: true,
        houseNumber: true,
        residentUserId: true,
        identityType: true,
        identityNumber: true,
        identityDocumentUrls: true,
        occupationStatus: true,
        occupationLabel: true,
        organizationName: true,
        organizationLocation: true,
        studentRegistrationNumber: true,
        sponsorName: true,
        sponsorPhone: true,
        emergencyContactName: true,
        emergencyContactPhone: true,
        leaseStartDate: true,
        leaseEndDate: true,
        monthlyRentKsh: true,
        depositKsh: true,
        paymentDueDay: true,
        specialTerms: true,
        createdAt: true,
        updatedAt: true
      }
    });

    return {
      houseNumber,
      hasActiveResident: true,
      residentUserId: tenancy.userId,
      agreement: mapTenantAgreement(agreement)
    };
  }

  async createLandlordAccessRequest(
    session: AuthenticatedUserSession,
    input: CreateLandlordAccessRequestInput
  ) {
    if (session.role !== "tenant") {
      throw new Error("LANDLORD_ACCESS_ALREADY_GRANTED");
    }

    const pending = await this.prisma.landlordAccessRequest.findFirst({
      where: {
        userId: session.userId,
        status: "pending"
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            role: true
          }
        },
        reviewedBy: {
          select: {
            id: true,
            fullName: true,
            email: true,
            role: true
          }
        }
      },
      orderBy: { requestedAt: "desc" }
    });

    if (pending) {
      return {
        created: false,
        request: mapLandlordAccessRequest(pending)
      };
    }

    const created = await this.prisma.landlordAccessRequest.create({
      data: {
        userId: session.userId,
        reason: input.reason?.trim() || undefined
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            role: true
          }
        },
        reviewedBy: {
          select: {
            id: true,
            fullName: true,
            email: true,
            role: true
          }
        }
      }
    });

    return {
      created: true,
      request: mapLandlordAccessRequest(created)
    };
  }

  async listMyLandlordAccessRequests(
    session: AuthenticatedUserSession,
    status?: LandlordAccessRequestStatus
  ) {
    const rows = await this.prisma.landlordAccessRequest.findMany({
      where: {
        userId: session.userId,
        status
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            role: true
          }
        },
        reviewedBy: {
          select: {
            id: true,
            fullName: true,
            email: true,
            role: true
          }
        }
      },
      orderBy: { requestedAt: "desc" }
    });

    const mapped = rows.map((item) => mapLandlordAccessRequest(item));

    // Hide stale approved rows when user is no longer an active landlord.
    return mapped.filter((item) => {
      if (item.status !== "approved") {
        return true;
      }
      return item.user.role === "landlord";
    });
  }

  async listLandlordAccessRequests(
    status?: LandlordAccessRequestStatus,
    limit = 300
  ) {
    const boundedLimit = Math.min(Math.max(Math.floor(limit), 1), 2_000);

    const rows = await this.prisma.landlordAccessRequest.findMany({
      where: { status },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            role: true
          }
        },
        reviewedBy: {
          select: {
            id: true,
            fullName: true,
            email: true,
            role: true
          }
        }
      },
      orderBy: { requestedAt: "asc" },
      take: boundedLimit
    });

    const mapped = rows.map((item) => mapLandlordAccessRequest(item));

    // Hide stale approved rows when user is no longer an active landlord.
    return mapped.filter((item) => {
      if (item.status !== "approved") {
        return true;
      }
      return item.user.role === "landlord";
    });
  }

  async reviewLandlordAccessRequest(
    requestId: string,
    input: ReviewLandlordAccessRequestInput,
    reviewerUserId?: string
  ) {
    const existing = await this.prisma.landlordAccessRequest.findUnique({
      where: { id: requestId },
      select: {
        id: true,
        status: true,
        userId: true
      }
    });

    if (!existing) {
      throw new Error("LANDLORD_ACCESS_REQUEST_NOT_FOUND");
    }

    if (existing.status !== "pending") {
      throw new Error("LANDLORD_ACCESS_REQUEST_ALREADY_REVIEWED");
    }

    const reviewedAt = new Date();
    const nextStatus = input.action === "approve" ? "approved" : "rejected";

    const updated = await this.prisma.$transaction(async (tx) => {
      const updatedCount = await tx.landlordAccessRequest.updateMany({
        where: {
          id: requestId,
          status: "pending"
        },
        data: {
          status: nextStatus,
          reviewerNote: input.note?.trim() || undefined,
          reviewedAt,
          reviewedByUserId: reviewerUserId ?? null
        }
      });

      if (updatedCount.count === 0) {
        throw new Error("LANDLORD_ACCESS_REQUEST_ALREADY_REVIEWED");
      }

      if (input.action === "approve") {
        await tx.housingUser.updateMany({
          where: {
            id: existing.userId,
            role: "tenant"
          },
          data: {
            role: "landlord"
          }
        });
      }

      const finalRecord = await tx.landlordAccessRequest.findUnique({
        where: { id: requestId },
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
              phone: true,
              role: true
            }
          },
          reviewedBy: {
            select: {
              id: true,
              fullName: true,
              email: true,
              role: true
            }
          }
        }
      });

      if (!finalRecord) {
        throw new Error("LANDLORD_ACCESS_REQUEST_NOT_FOUND");
      }

      return finalRecord;
    });

    return mapLandlordAccessRequest(updated);
  }

  async revokeLandlordRole(
    userId: string,
    input: AdminRevokeLandlordInput & { reviewerUserId?: string }
  ) {
    const targetUser = await this.prisma.housingUser.findUnique({
      where: { id: userId },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        role: true
      }
    });

    if (!targetUser) {
      throw new Error("LANDLORD_USER_NOT_FOUND");
    }

    if (targetUser.role !== "landlord") {
      throw new Error("LANDLORD_ROLE_NOT_ASSIGNED");
    }

    const revokedAt = new Date();
    const note = input.note?.trim() || undefined;

    const outcome = await this.prisma.$transaction(async (tx) => {
      const clearedBuildings = await tx.building.updateMany({
        where: {
          landlordUserId: targetUser.id
        },
        data: {
          landlordUserId: null
        }
      });

      await tx.housingUser.update({
        where: { id: targetUser.id },
        data: {
          role: "tenant"
        }
      });

      const revokedSessions = await tx.userSession.updateMany({
        where: {
          userId: targetUser.id,
          revokedAt: null
        },
        data: {
          revokedAt
        }
      });

      await tx.landlordAccessRequest.updateMany({
        where: {
          userId: targetUser.id,
          status: {
            in: ["pending", "approved"]
          }
        },
        data: {
          status: "rejected",
          reviewerNote: note ?? "Revoked during admin landlord-role removal.",
          reviewedAt: revokedAt,
          reviewedByUserId: input.reviewerUserId ?? null
        }
      });

      return {
        clearedBuildingsCount: clearedBuildings.count,
        revokedSessionsCount: revokedSessions.count
      };
    });

    return {
      user: {
        id: targetUser.id,
        fullName: targetUser.fullName,
        email: targetUser.email,
        phone: targetUser.phone,
        previousRole: "landlord" as const,
        currentRole: "tenant" as const
      },
      note,
      revokedAt: revokedAt.toISOString(),
      clearedBuildingsCount: outcome.clearedBuildingsCount,
      revokedSessionsCount: outcome.revokedSessionsCount
    };
  }

  private isRateLimited(
    source: Map<string, LoginRateRecord>,
    key: string
  ): boolean {
    const now = nowMs();
    const record = source.get(key);
    return Boolean(record && record.resetAt > now && record.attempts >= this.loginMaxAttempts);
  }

  private trackFailedLogin(email: string) {
    const now = nowMs();
    const existing = this.loginRateByEmail.get(email);
    if (!existing || existing.resetAt <= now) {
      this.loginRateByEmail.set(email, {
        attempts: 1,
        resetAt: now + this.loginWindowMs
      });
      return;
    }

    this.loginRateByEmail.set(email, {
      attempts: existing.attempts + 1,
      resetAt: existing.resetAt
    });
  }

  private trackFailedPhoneLogin(phone: string) {
    const now = nowMs();
    const existing = this.loginRateByPhone.get(phone);
    if (!existing || existing.resetAt <= now) {
      this.loginRateByPhone.set(phone, {
        attempts: 1,
        resetAt: now + this.loginWindowMs
      });
      return;
    }

    this.loginRateByPhone.set(phone, {
      attempts: existing.attempts + 1,
      resetAt: existing.resetAt
    });
  }

  private async purgeExpiredSessions() {
    for (const [email, record] of this.loginRateByEmail) {
      if (record.resetAt <= nowMs()) {
        this.loginRateByEmail.delete(email);
      }
    }

    for (const [phone, record] of this.loginRateByPhone) {
      if (record.resetAt <= nowMs()) {
        this.loginRateByPhone.delete(phone);
      }
    }

    await this.prisma.userSession.deleteMany({
      where: {
        OR: [{ expiresAt: { lte: new Date() } }, { revokedAt: { not: null } }]
      }
    });
  }
}
