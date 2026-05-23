import "dotenv/config";
import cors from "cors";
import express from "express";
import type { NextFunction, Request, Response } from "express";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { Readable } from "node:stream";
import { ZodError } from "zod";
import type {
  LandlordAccessRequestStatus,
  TenantApplicationStatus,
  UserRole
} from "@prisma/client";
import {
  ensureCaptynWallet,
  isCaptynWalletConfigured,
  postProviderCollectionSettlement,
  upsertCaptynPayoutProfile
} from "./lib/captynWallet.js";
import { DarajaClient, formatDarajaMsisdn } from "./lib/mpesa/darajaClient.js";
import { createRepositoryContext } from "./repositories/createRepositoryContext.js";
import {
  AdminAuthService,
  type AdminAuthPersistedState,
  type AdminRole
} from "./services/adminAuthService.js";
import { AppStateService } from "./services/appStateService.js";
import {
  RentLedgerService,
  type RentLedgerPersistedState
} from "./services/rentLedgerService.js";
import {
  UtilityBillingService,
  type CombinedUtilityChargeBuildingAmount,
  type CombinedUtilityChargeMonthlyAmount,
  type CombinedUtilityChargeRoomAmount,
  type UtilityBillingPersistedState
} from "./services/utilityBillingService.js";
import {
  OWNER_STAFF_LIMIT,
  UserAccountService
} from "./services/userAccountService.js";
import {
  UserSupportService,
  type UserSupportPersistedState
} from "./services/userSupportService.js";
import {
  OwnerNotificationService,
  type OwnerNotificationPersistedState
} from "./services/ownerNotificationService.js";
import {
  WifiAccessService,
  type WifiAccessPersistedState,
  type WifiPackage
} from "./services/wifiAccessService.js";
import {
  BuildingWifiPackageService,
  DEFAULT_BUILDING_WIFI_PACKAGES
} from "./services/buildingWifiPackageService.js";
import {
  BuildingConfigurationService,
  type BuildingConfigurationRecord,
  toPaymentAccessRecord
} from "./services/buildingConfigurationService.js";
import {
  PaymentAccessService,
  type PaymentAccessPersistedState
} from "./services/paymentAccessService.js";
import {
  PaymentProfileService,
  buildRentAccountReference,
  type PaymentProfilePersistedState
} from "./services/paymentProfileService.js";
import {
  PaymentInstructionService,
  type BuildingPaymentInstructionsRecord,
  type PaymentInstructionsPersistedState
} from "./services/paymentInstructionService.js";
import {
  NotificationDeliveryService,
  SmsNotificationService
} from "./services/notifications/index.js";
import {
  PushNotificationService,
  type PushSubscriptionPersistedState
} from "./services/pushNotificationService.js";
import {
  ResidentNotificationPreferenceService,
  type ResidentNotificationPreferencePersistedState
} from "./services/residentNotificationPreferenceService.js";
import {
  adminAccessCredentialUpdateSchema,
  adminLoginSchema,
  deleteResidentPushSubscriptionSchema,
  confirmWifiPaymentSchema,
  createRentPaymentSchema,
  residentPasswordSetupSchema,
  residentPhoneLoginSchema,
  residentChangePasswordSchema,
  residentAdminPasswordResetSchema,
  residentPasswordRecoveryRequestSchema,
  residentPasswordRecoveryReviewSchema,
  accountPasswordRecoveryRequestSchema,
  initializeRentMpesaPaymentSchema,
  verifyRentMpesaPaymentSchema,
  initializeUtilityMpesaPaymentSchema,
  verifyUtilityMpesaPaymentSchema,
  recordAdminRentPaymentSchema,
  residentDebtCollectionSchema,
  createBuildingSchema,
  buildingMediaUpdateSchema,
  deleteBuildingSchema,
  createIncidentSchema,
  createUserReportSchema,
  createVacancySnapshotSchema,
  createWifiPaymentSchema,
  billingMonthSchema,
  houseNumberQuerySchema,
  rentMpesaCallbackSchema,
  createUtilityBillSchema,
  type CreateUtilityBillInput,
  createLandlordAccessRequestSchema,
  recordUtilityPaymentSchema,
  mediaUploadSignatureRequestSchema,
  residentPushSubscriptionSchema,
  ownerNotificationReadSchema,
  updateResidentNotificationPreferencesSchema,
  upsertUtilityMeterSchema,
  utilityTypeSchema,
  caretakerAccessRequestStatusSchema,
  landlordAccessRequestStatusSchema,
  reviewCaretakerAccessRequestSchema,
  reviewLandlordAccessRequestSchema,
  landlordAddBuildingHousesSchema,
  landlordRemoveBuildingHouseSchema,
  landlordWriteOffRoomBalanceSchema,
  landlordRemoveBuildingUserSchema,
  adminRevokeLandlordSchema,
  adminAssignBuildingLandlordSchema,
  landlordBuildingConfigurationUpdateSchema,
  landlordPaymentAccessUpdateSchema,
  landlordPaymentProfileUpdateSchema,
  landlordPaymentInstructionsUpdateSchema,
  landlordExpenditureCreateSchema,
  landlordUtilityBulkSubmissionAuditCreateSchema,
  landlordUtilityBulkSubmissionAuditFinalizeSchema,
  createRoomBillingHoldSchema,
  cancelRoomBillingHoldSchema,
  landlordUtilityRegistryUpsertSchema,
  landlordAssignCaretakerSchema,
  caretakerAccessResolveSchema,
  caretakerPasswordSetupSchema,
  caretakerPhoneLoginSchema,
  landlordUpdateTicketStatusSchema,
  landlordMonthlyCombinedUtilityChargeSchema,
  resolveIncidentSchema,
  ticketStatusSchema,
  tenantResolveSchema,
  residentTenantProfileUpsertSchema,
  updateWifiPackageSchema,
  ownerStaffCreateSchema,
  ownerStaffDisableSchema,
  landlordRentBulkSheetSchema,
  upsertRentDueSchema,
  wifiPackageIdSchema,
  landlordDecisionSchema,
  tenantAgreementUpsertSchema,
  tenantApplicationSchema,
  type LandlordUtilityBulkSubmissionAuditCreateInput,
  type LandlordUtilityBulkSubmissionAuditFinalizeInput,
  userLoginSchema,
  userRegisterSchema
} from "./validation/schemas.js";

const port = Number(process.env.PORT ?? 4000);
const publicDir = path.resolve(process.cwd(), "public");
const uploadsDir = path.resolve(process.cwd(), process.env.UPLOADS_DIR?.trim() || "uploads");
const adminSessionCookieName = normalizeCookieName(
  process.env.ADMIN_SESSION_COOKIE_NAME,
  "landlord_housing_admin_session"
);
const userSessionCookieName = normalizeCookieName(
  process.env.USER_SESSION_COOKIE_NAME,
  "landlord_housing_user_session"
);
const TERMINAL_MPESA_FAILURE_CODES = new Set([1, 17, 26, 1032, 1037, 2001]);
const MPESA_VERIFY_RATE_WINDOW_MS = 60 * 1000;
const MPESA_VERIFY_RATE_MAX_PER_ID = 80;
const AUTH_ROUTE_RATE_WINDOW_MS = 10 * 60 * 1000;
const RECURRING_UTILITY_VISIBILITY_WINDOW_DAYS = 7;
const RESIDENT_ID_GRACE_PERIOD_HOURS = 48;
const RESIDENT_ID_GRACE_PERIOD_MS =
  RESIDENT_ID_GRACE_PERIOD_HOURS * 60 * 60 * 1000;
const HOUSING_DIAGNOSTIC_LOGS_ENABLED =
  process.env.HOUSING_DIAGNOSTIC_LOGS_ENABLED !== "false";
const LOCAL_MEDIA_UPLOAD_MAX_BYTES = 10 * 1024 * 1024;
const LOCAL_MEDIA_UPLOAD_EXTENSION_BY_TYPE = new Map<string, string>([
  ["image/jpeg", "jpg"],
  ["image/jpg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"]
]);
const RESIDENT_BILLING_LOCKED_MESSAGE =
  "Payments and balances unlock after landlord verification.";
const PLATFORM_LANDLORD_GOVERNANCE_DISABLED = true;
const CAPTYN_HOUSING_WALLET_FEE_BPS = Math.max(
  0,
  Number.parseInt(process.env.CAPTYN_HOUSING_WALLET_FEE_BPS ?? "0", 10) || 0
);
const CAPTYN_HOUSING_WALLET_COLLECTION_ACCOUNT_CODE =
  process.env.CAPTYN_HOUSING_WALLET_COLLECTION_ACCOUNT_CODE?.trim() || undefined;

function logHousingEvent(event: string, details?: Record<string, unknown>) {
  if (!HOUSING_DIAGNOSTIC_LOGS_ENABLED) {
    return;
  }

  if (!details || Object.keys(details).length === 0) {
    console.log(`[housing-api] ${event}`);
    return;
  }

  console.log(`[housing-api] ${event}`, details);
}

function isPlatformLandlordGovernanceDisabled(): boolean {
  return PLATFORM_LANDLORD_GOVERNANCE_DISABLED;
}

function normalizeUploadFolderSegment(value: string | undefined, fallback: string): string {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized || fallback;
}

interface MultipartFileLike {
  arrayBuffer(): Promise<ArrayBuffer>;
  readonly name?: string;
  readonly size?: number;
  readonly type?: string;
}

function isMultipartFileLike(value: unknown): value is MultipartFileLike {
  return Boolean(
    value &&
      typeof value === "object" &&
      "arrayBuffer" in value &&
      typeof (value as { arrayBuffer?: unknown }).arrayBuffer === "function"
  );
}

function resolveMediaUploadExtension(fileName: string | undefined, mimeType: string | undefined) {
  const normalizedType = String(mimeType ?? "")
    .trim()
    .toLowerCase();
  const mapped = LOCAL_MEDIA_UPLOAD_EXTENSION_BY_TYPE.get(normalizedType);
  if (mapped) {
    return mapped;
  }

  const extension = path.extname(String(fileName ?? ""))
    .trim()
    .toLowerCase()
    .replace(/^\./, "");
  return [...LOCAL_MEDIA_UPLOAD_EXTENSION_BY_TYPE.values()].includes(extension)
    ? extension
    : null;
}

const AUTH_ROUTE_RATE_MAX_PER_IP = 20;
const PASSWORD_RECOVERY_RATE_WINDOW_MS = 15 * 60 * 1000;
const PASSWORD_RECOVERY_RATE_MAX_PER_KEY = 3;
const ACCOUNT_PASSWORD_RECOVERY_RATE_WINDOW_MS = 15 * 60 * 1000;
const ACCOUNT_PASSWORD_RECOVERY_RATE_MAX_PER_KEY = 3;
const pushVapidPublicKey = String(process.env.PUSH_VAPID_PUBLIC_KEY ?? "").trim();
const pushVapidPrivateKey = String(
  process.env.PUSH_VAPID_PRIVATE_KEY ?? ""
).trim();
const pushVapidSubject = String(
  process.env.PUSH_VAPID_SUBJECT ?? "mailto:support@captyn.shop"
).trim();
const africasTalkingApiKey = String(process.env.AFRICASTALKING_API_KEY ?? "").trim();
const africasTalkingUsername = String(process.env.AFRICASTALKING_USERNAME ?? "").trim();
const africasTalkingSenderId = String(process.env.AFRICASTALKING_SENDER_ID ?? "").trim();
const notificationSweepToken = String(process.env.NOTIFICATION_SWEEP_TOKEN ?? "").trim();
const ADMIN_AUTH_STATE_KEY = "admin_auth_v1";
const RENT_LEDGER_STATE_KEY = "rent_ledger_v1";
const UTILITY_BILLING_STATE_KEY = "utility_billing_v1";
const UTILITY_BULK_SUBMISSION_AUDIT_STATE_KEY = "utility_bulk_submission_audit_v1";
const USER_SUPPORT_STATE_KEY = "user_support_v1";
const WIFI_ACCESS_STATE_KEY = "wifi_access_v1";
const PAYMENT_ACCESS_STATE_KEY = "payment_access_v1";
const PAYMENT_PROFILE_STATE_KEY = "payment_profiles_v1";
const PAYMENT_INSTRUCTIONS_STATE_KEY = "payment_instructions_v1";
const CARETAKER_ACCESS_STATE_KEY = "caretaker_access_v1";
const BUILDING_EXPENDITURE_STATE_KEY = "building_expenditure_v1";
const RUNTIME_QUEUES_STATE_KEY = "runtime_queues_v1";
const PUSH_SUBSCRIPTIONS_STATE_KEY = "push_subscriptions_v1";
const RESIDENT_NOTIFICATION_PREFERENCES_STATE_KEY =
  "resident_notification_preferences_v1";
const OWNER_NOTIFICATIONS_STATE_KEY = "owner_notifications_v1";
const DEFAULT_ALLOWED_CORS_ORIGINS: string[] = [];
const STATE_CHANGING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const COOKIE_PROTECTED_PATH_PREFIXES = ["/api/auth/", "/api/user/", "/api/landlord/", "/api/admin/"];
const AUTH_RATE_LIMITED_PATHS = new Set([
  "/api/auth/caretaker/resolve",
  "/api/auth/caretaker/setup-password",
  "/api/auth/caretaker/login-phone",
  "/api/auth/register",
  "/api/auth/login",
  "/api/auth/password-recovery/request",
  "/api/auth/resident/signup",
  "/api/auth/resident/login-phone",
  "/api/auth/resident/password-recovery/request",
  "/api/auth/resident/change-password",
  "/api/auth/admin/login",
  "/api/auth/landlord/login"
]);

interface PendingRentStkRequest {
  buildingId: string;
  houseNumber: string;
  phoneNumber: string;
  amountKsh: number;
  billingMonth: string;
  initiatedAt: string;
  tenantUserId?: string;
  tenantName?: string;
  paymentProfileId?: string;
  paymentProfileName?: string;
  paymentAccountReference?: string;
  paymentShortCode?: string;
}

interface PendingUtilityStkRequest {
  utilityType: "water" | "electricity";
  buildingId: string;
  houseNumber: string;
  phoneNumber: string;
  amountKsh: number;
  billingMonth: string;
  initiatedAt: string;
  paymentProfileId?: string;
  paymentProfileName?: string;
  paymentAccountReference?: string;
  paymentShortCode?: string;
}

type ResidentPasswordRecoveryStatus = "pending" | "approved" | "rejected";
type AccountPasswordRecoveryStatus = "pending" | "approved" | "rejected";
type CaretakerAccessRequestStatus = "pending" | "approved" | "rejected";

interface ResidentPasswordRecoveryRequestRecord {
  id: string;
  buildingId: string;
  houseNumber: string;
  phoneNumber: string;
  note?: string;
  status: ResidentPasswordRecoveryStatus;
  requestedAt: string;
  reviewedAt?: string;
  reviewedByRole?: AdminRole;
  reviewedByUserId?: string;
  reviewerNote?: string;
  temporaryPasswordIssuedAt?: string;
}

interface AccountPasswordRecoveryRequestRecord {
  id: string;
  userId: string;
  identifierType: "email" | "phone";
  normalizedIdentifier: string;
  fullName: string;
  email: string;
  phone: string;
  role: UserRole;
  note?: string;
  status: AccountPasswordRecoveryStatus;
  requestedAt: string;
  reviewedAt?: string;
  reviewedByRole?: AdminRole;
  reviewedByUserId?: string;
  reviewerNote?: string;
  temporaryPasswordIssuedAt?: string;
}

interface HouseholdMemberRegistryRecord {
  buildingId: string;
  houseNumber: string;
  members: number;
  updatedAt: string;
}

interface UtilityChargeDefaultRecord {
  buildingId: string;
  houseNumber: string;
  waterFixedChargeKsh: number;
  electricityFixedChargeKsh: number;
  combinedUtilityChargeKsh: number;
  updatedAt: string;
}

interface UtilityRateDefaultRecord {
  buildingId: string;
  waterRatePerUnitKsh: number;
  electricityRatePerUnitKsh: number;
  updatedAt: string;
}

interface UtilityFixedChargeDefaultRecord {
  buildingId: string;
  waterFixedChargeKsh: number;
  electricityFixedChargeKsh: number;
  updatedAt: string;
}

const DEFAULT_WATER_RATE_PER_UNIT_KSH = 150;
const compareHouseNumbers = (left: string, right: string) =>
  String(left ?? "").localeCompare(String(right ?? ""), undefined, {
    numeric: true,
    sensitivity: "base"
  });

interface MonthlyCombinedUtilityChargeRecord {
  buildingId: string;
  billingMonth: string;
  amountKsh: number;
  updatedAt: string;
}

interface BuildingExpenditureRecord {
  id: string;
  buildingId: string;
  houseNumber?: string;
  category:
    | "maintenance"
    | "utilities"
    | "cleaning"
    | "security"
    | "supplies"
    | "staff"
    | "other";
  title: string;
  amountKsh: number;
  chargeableToResident?: boolean;
  note?: string;
  createdAt: string;
  createdByRole: "landlord" | "caretaker" | "admin" | "root_admin";
  createdByUserId?: string;
  createdByName?: string;
}

interface BuildingExpenditurePersistedState {
  records: BuildingExpenditureRecord[];
}

interface RuntimeQueuesPersistedState {
  pendingRentStkRequests: Array<{
    checkoutRequestId: string;
    data: PendingRentStkRequest;
  }>;
  pendingUtilityStkRequests: Array<{
    checkoutRequestId: string;
    data: PendingUtilityStkRequest;
  }>;
  residentPasswordRecoveryRequests: ResidentPasswordRecoveryRequestRecord[];
  accountPasswordRecoveryRequests: AccountPasswordRecoveryRequestRecord[];
  utilityChargeDefaults: UtilityChargeDefaultRecord[];
  utilityRateDefaults: UtilityRateDefaultRecord[];
  monthlyCombinedUtilityCharges: MonthlyCombinedUtilityChargeRecord[];
}

interface LandlordUtilityRegistryRow {
  houseNumber: string;
  residentName?: string;
  residentPhone?: string;
  residentUserId?: string;
  verificationStatus?: "verified" | "pending_review";
  identityType?: string;
  identityNumber?: string;
  occupationStatus?: string;
  occupationLabel?: string;
  organizationName?: string;
  organizationLocation?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  agreementUpdatedAt?: string;
  hasActiveResident: boolean;
  rentEnabled: boolean;
  monthlyRentKsh: number;
  rentPaymentStatus?: string;
  rentBalanceKsh: number;
  currentRentDueKsh: number;
  rentArrearsKsh: number;
  rentDueDate?: string;
  currentMonthRentPaidKsh: number;
  currentMonthRentOutstandingKsh: number;
  totalRentPaidKsh: number;
  currentUtilityDueKsh: number;
  utilityArrearsKsh: number;
  expenseBalanceKsh: number;
  expenseArrearsKsh: number;
  nextUtilityDueDate?: string;
  latestRentPaymentReference?: string;
  latestRentPaymentAt?: string;
  roomBalanceKsh: number;
  utilityBalanceKsh: number;
  householdMembers: number;
  waterFixedChargeKsh: number;
  electricityFixedChargeKsh: number;
  combinedUtilityChargeKsh: number;
  waterMeterNumber?: string;
  electricityMeterNumber?: string;
  waterMeterUpdatedAt?: string;
  electricityMeterUpdatedAt?: string;
}

interface UtilityBulkSubmissionAuditRow {
  houseNumber: string;
  householdMembers?: number;
  hasActiveResident?: boolean;
  waterMeterNumber?: string;
  waterPreviousReading?: number;
  waterCurrentReading?: number;
  waterFixedChargeKsh?: number;
  electricityMeterNumber?: string;
  electricityPreviousReading?: number;
  electricityCurrentReading?: number;
  electricityFixedChargeKsh?: number;
}

interface UtilityBulkSubmissionAuditResult {
  status: "pending" | "completed" | "partial_failed" | "failed";
  postedCount: number;
  requestedCount: number;
  failures: string[];
  completedAt?: string;
}

interface UtilityBulkSubmissionAuditRecord {
  id: string;
  createdAt: string;
  createdByRole: "landlord" | "caretaker" | "admin" | "root_admin";
  createdByUserId?: string;
  buildingId: string;
  buildingName: string;
  billingMonth: string;
  dueDate: string;
  note?: string;
  defaultWaterFixedChargeKsh?: number | null;
  defaultElectricityFixedChargeKsh?: number | null;
  defaultCombinedUtilityChargeKsh?: number | null;
  monthlyCombinedUtilityChargeKsh?: number | null;
  rateDefaults?: {
    waterRatePerUnitKsh?: number;
    electricityRatePerUnitKsh?: number;
  };
  rows: UtilityBulkSubmissionAuditRow[];
  result: UtilityBulkSubmissionAuditResult;
}

interface UtilityBulkSubmissionAuditState {
  submissions: UtilityBulkSubmissionAuditRecord[];
}

interface CaretakerAccessRecord {
  buildingId: string;
  userId: string;
  verificationHouseNumber: string;
  passwordSetupComplete: boolean;
  approvedAt: string;
  approvedByRole?: string;
  approvedByUserId?: string;
  note?: string;
  active: boolean;
  revokedAt?: string;
}

interface CaretakerAccessRequestRecord {
  id: string;
  userId: string;
  buildingId: string;
  houseNumber: string;
  status: CaretakerAccessRequestStatus;
  note?: string;
  reviewerNote?: string;
  requestedAt: string;
  reviewedAt?: string;
  reviewedByRole?: string;
  reviewedByUserId?: string;
}

interface CaretakerAccessPersistedState {
  records: CaretakerAccessRecord[];
  requests?: CaretakerAccessRequestRecord[];
}

const wifiPackages: WifiPackage[] = DEFAULT_BUILDING_WIFI_PACKAGES.map((item) => ({
  ...item
}));

function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  if (!cookieHeader) {
    return {};
  }

  return cookieHeader.split(";").reduce<Record<string, string>>((acc, part) => {
    const [rawKey, ...rest] = part.trim().split("=");
    if (!rawKey || rest.length === 0) {
      return acc;
    }

    acc[rawKey] = decodeURIComponent(rest.join("="));
    return acc;
  }, {});
}

function readBearerToken(req: express.Request): string | undefined {
  const authHeader = req.header("authorization");
  if (!authHeader) {
    return undefined;
  }

  const [scheme, token] = authHeader.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) {
    return undefined;
  }

  return token;
}

function readAdminSessionToken(req: express.Request): string | undefined {
  const headerToken = req.header("x-admin-session");
  if (headerToken) {
    return headerToken;
  }

  const bearer = readBearerToken(req);
  if (bearer) {
    return bearer;
  }

  const cookies = parseCookies(req.header("cookie"));
  return cookies[adminSessionCookieName];
}

function readUserSessionToken(req: express.Request): string | undefined {
  const headerToken = req.header("x-user-session");
  if (headerToken) {
    return headerToken;
  }

  const bearer = readBearerToken(req);
  if (bearer) {
    return bearer;
  }

  const cookies = parseCookies(req.header("cookie"));
  return cookies[userSessionCookieName];
}

function maskPhone(value: string): string {
  if (value.length < 7) {
    return "***";
  }

  return `${value.slice(0, 4)}****${value.slice(-3)}`;
}

function parseBooleanEnv(value: string | undefined): boolean | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === "true") {
    return true;
  }
  if (normalized === "false") {
    return false;
  }

  return null;
}

function normalizeCookieName(value: string | undefined, fallback: string): string {
  const normalized = String(value ?? "").trim();
  if (/^[A-Za-z0-9_.-]{1,128}$/.test(normalized)) {
    return normalized;
  }

  return fallback;
}

function normalizeCookieDomain(value: string | undefined): string | undefined {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (!normalized) {
    return undefined;
  }

  return normalized.replace(/^\./, "");
}

function normalizeOriginValue(value: string | undefined): string | null {
  if (typeof value !== "string" || value.trim().length === 0) {
    return null;
  }

  try {
    return new URL(value).origin.toLowerCase();
  } catch {
    return null;
  }
}

function parseAllowedOrigins(...values: Array<string | undefined>): Set<string> {
  const origins = new Set<string>();

  values.forEach((value) => {
    if (typeof value !== "string") {
      return;
    }

    value
      .split(",")
      .map((item) => item.trim())
      .filter((item) => item.length > 0 && item !== "*")
      .forEach((item) => {
        const normalized = normalizeOriginValue(item);
        if (normalized) {
          origins.add(normalized);
        }
      });
  });

  if (origins.size === 0) {
    DEFAULT_ALLOWED_CORS_ORIGINS.forEach((origin) => {
      const normalized = normalizeOriginValue(origin);
      if (normalized) {
        origins.add(normalized);
      }
    });
  }

  if (process.env.NODE_ENV !== "production") {
    [
      "http://localhost",
      "http://127.0.0.1",
      "http://localhost:4000",
      "http://127.0.0.1:4000",
      "http://localhost:4100",
      "http://127.0.0.1:4100"
    ].forEach((origin) => origins.add(origin));
  }

  return origins;
}

function normalizeKenyaPhone(phoneNumber: string): string {
  const normalized = phoneNumber.replace(/[\s-]/g, "").trim();

  if (normalized.startsWith("+254")) {
    return normalized;
  }

  if (normalized.startsWith("254")) {
    return `+${normalized}`;
  }

  if (normalized.startsWith("0")) {
    return `+254${normalized.slice(1)}`;
  }

  return normalized;
}

function normalizeHouseNumber(value: string): string {
  return value.trim().toUpperCase();
}

function normalizeBuildingId(value: string | undefined): string {
  const normalized = String(value ?? "").trim();
  return normalized || "__unknown_building__";
}

function buildAgreementFallbackRentDueDate(
  paymentDueDay?: number,
  leaseStartDate?: string | Date | null
): string {
  const now = new Date();
  const parsedLeaseStart =
    typeof leaseStartDate === "string"
      ? new Date(`${leaseStartDate}T00:00:00.000Z`)
      : leaseStartDate instanceof Date
        ? leaseStartDate
        : null;
  const fallbackDay = Number.isFinite(paymentDueDay)
    ? Number(paymentDueDay)
    : parsedLeaseStart && !Number.isNaN(parsedLeaseStart.getTime())
      ? parsedLeaseStart.getUTCDate()
      : now.getUTCDate();
  const lastDayOfMonth = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0)
  ).getUTCDate();
  const dueDay = Math.min(Math.max(Math.trunc(fallbackDay), 1), lastDayOfMonth);

  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), dueDay, 0, 0, 0, 0)
  ).toISOString();
}

function buildManualRentPaymentReference(
  provider: string,
  buildingId: string,
  houseNumber: string
): string {
  const providerLabel =
    String(provider ?? "cash")
      .trim()
      .replace(/[^a-z0-9]+/gi, "-")
      .replace(/^-+|-+$/g, "")
      .toUpperCase() || "CASH";
  const buildingLabel =
    normalizeBuildingId(buildingId)
      .replace(/[^a-z0-9]+/gi, "")
      .toUpperCase()
      .slice(0, 12) || "BUILDING";
  const houseLabel =
    normalizeHouseNumber(houseNumber)
      .replace(/[^a-z0-9]+/gi, "")
      .toUpperCase()
      .slice(0, 12) || "ROOM";
  const entropy = `${Date.now().toString(36)}-${randomUUID().slice(0, 6)}`
    .replace(/[^a-z0-9]+/gi, "")
    .toUpperCase();

  return `${providerLabel}-${buildingLabel}-${houseLabel}-${entropy}`.slice(0, 120);
}

function mapUtilityDomainError(error: unknown): { status: number; message: string } | null {
  if (!(error instanceof Error)) {
    return null;
  }

  const message = error.message || "Utility operation failed.";

  if (message.includes("already exists")) {
    return { status: 409, message };
  }

  if (message.includes("Meter number is required")) {
    return { status: 400, message };
  }

  if (message.includes("Current reading and rate per unit are required")) {
    return { status: 400, message };
  }

  if (message.includes("Fixed charge must be greater than zero")) {
    return { status: 400, message };
  }

  if (message.includes("Current reading must be greater than or equal")) {
    return { status: 400, message };
  }

  if (message.includes("Only manually recorded")) {
    return { status: 400, message };
  }

  if (message.includes("was not found") || message.includes("No ") && message.includes(" bills found")) {
    return { status: 404, message };
  }

  if (message.includes("already cleared") || message.includes("No outstanding")) {
    return { status: 409, message };
  }

  if (message.includes("exceeds remaining balance")) {
    return { status: 400, message };
  }

  return null;
}

function toIsoFromDarajaTimestamp(value: unknown): string | undefined {
  if (value == null) {
    return undefined;
  }

  const normalized = String(value).trim();
  if (!/^\d{14}$/.test(normalized)) {
    return undefined;
  }

  const year = normalized.slice(0, 4);
  const month = normalized.slice(4, 6);
  const day = normalized.slice(6, 8);
  const hour = normalized.slice(8, 10);
  const minute = normalized.slice(10, 12);
  const second = normalized.slice(12, 14);

  const date = new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}+03:00`);
  if (Number.isNaN(date.getTime())) {
    return undefined;
  }

  return date.toISOString();
}

function parseMpesaCallbackPayload(payload: unknown): {
  resultCode: number;
  resultDesc?: string;
  houseNumber?: string;
  amountKsh?: number;
  providerReference?: string;
  checkoutRequestId?: string;
  merchantRequestId?: string;
  phoneNumber?: string;
  paidAt?: string;
} {
  const source = payload as Record<string, unknown>;
  const callback = (source?.Body as Record<string, unknown> | undefined)
    ?.stkCallback as Record<string, unknown> | undefined;

  if (callback) {
    const resultCode = Number(callback.ResultCode ?? -1);
    const resultDesc =
      typeof callback.ResultDesc === "string" ? callback.ResultDesc : undefined;
    const checkoutRequestId =
      typeof callback.CheckoutRequestID === "string"
        ? callback.CheckoutRequestID.trim()
        : undefined;
    const merchantRequestId =
      typeof callback.MerchantRequestID === "string"
        ? callback.MerchantRequestID.trim()
        : undefined;

    const metadataItems =
      ((callback.CallbackMetadata as Record<string, unknown> | undefined)
        ?.Item as Array<Record<string, unknown>> | undefined) ?? [];

    const metadata = new Map<string, unknown>();
    for (const item of metadataItems) {
      const key = typeof item?.Name === "string" ? item.Name : undefined;
      if (!key) {
        continue;
      }

      metadata.set(key.toLowerCase(), item.Value);
    }

    const amountCandidate = Number(
      metadata.get("amount") ?? source.amountKsh ?? source.amount ?? NaN
    );

    const providerReference =
      (metadata.get("mpesareceiptnumber") as string | undefined) ??
      (source.providerReference as string | undefined) ??
      (source.receiptNumber as string | undefined);

    const accountReference =
      (metadata.get("accountreference") as string | undefined) ??
      (source.houseNumber as string | undefined) ??
      (source.accountReference as string | undefined);

    const phoneValue =
      metadata.get("phonenumber") ??
      source.phoneNumber ??
      source.msisdn;

    const paidAt =
      toIsoFromDarajaTimestamp(metadata.get("transactiondate")) ??
      (typeof source.paidAt === "string" ? source.paidAt : undefined);

    return {
      resultCode,
      resultDesc,
      houseNumber:
        typeof accountReference === "string" ? accountReference.trim() : undefined,
      amountKsh: Number.isFinite(amountCandidate) ? amountCandidate : undefined,
      providerReference:
        typeof providerReference === "string"
          ? providerReference.trim()
          : undefined,
      checkoutRequestId,
      merchantRequestId,
      phoneNumber:
        phoneValue == null ? undefined : String(phoneValue).trim(),
      paidAt
    };
  }

  const amountCandidate = Number(source.amountKsh ?? source.amount ?? NaN);

  return {
    resultCode: Number(source.resultCode ?? 0),
    resultDesc:
      typeof source.resultDesc === "string" ? source.resultDesc : undefined,
    houseNumber:
      typeof source.houseNumber === "string" ? source.houseNumber.trim() : undefined,
    amountKsh: Number.isFinite(amountCandidate) ? amountCandidate : undefined,
    providerReference:
      typeof source.providerReference === "string"
        ? source.providerReference.trim()
        : typeof source.receiptNumber === "string"
          ? source.receiptNumber.trim()
          : undefined,
    checkoutRequestId:
      typeof source.checkoutRequestId === "string"
        ? source.checkoutRequestId.trim()
        : undefined,
    merchantRequestId:
      typeof source.merchantRequestId === "string"
        ? source.merchantRequestId.trim()
        : undefined,
    phoneNumber:
      typeof source.phoneNumber === "string" ? source.phoneNumber.trim() : undefined,
    paidAt: typeof source.paidAt === "string" ? source.paidAt : undefined
  };
}

function parseTicketStatusFilter(value: unknown) {
  if (typeof value !== "string") {
    return undefined;
  }

  const parsed = ticketStatusSchema.safeParse(value);
  return parsed.success ? parsed.data : undefined;
}

function parseTenantApplicationStatus(value: unknown): TenantApplicationStatus | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  if (value === "pending" || value === "approved" || value === "rejected") {
    return value;
  }

  return undefined;
}

function toResidentVerificationStatus(
  status: TenantApplicationStatus | null | undefined
): "verified" | "pending_review" | "rejected" {
  if (status === "pending") {
    return "pending_review";
  }

  if (status === "rejected") {
    return "rejected";
  }

  return "verified";
}

function parseLandlordAccessRequestStatus(
  value: unknown
): LandlordAccessRequestStatus | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const parsed = landlordAccessRequestStatusSchema.safeParse(value);
  return parsed.success ? parsed.data : undefined;
}

function parseCaretakerAccessRequestStatus(
  value: unknown
): CaretakerAccessRequestStatus | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const parsed = caretakerAccessRequestStatusSchema.safeParse(value);
  return parsed.success ? parsed.data : undefined;
}

function appendQueryParam(url: string, key: string, value: string): string {
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
}

function callbackTokenMatches(
  req: express.Request,
  expected: string,
  headerName = "x-mpesa-callback-token"
): boolean {
  const headerToken = req.header(headerName);
  const queryToken =
    typeof req.query.token === "string"
      ? req.query.token
      : Array.isArray(req.query.token)
        ? req.query.token[0]
        : undefined;

  return headerToken === expected || queryToken === expected;
}

function hasUserRoleAtLeast(role: UserRole, minimumRole: UserRole): boolean {
  const rank: Record<UserRole, number> = {
    tenant: 1,
    landlord: 2,
    admin: 3,
    root_admin: 4
  };

  return rank[role] >= rank[minimumRole];
}

async function bootstrap() {
  const repositoryContext = await createRepositoryContext();
  const store = repositoryContext.buildingRepository;
  const app = express();
  app.set("trust proxy", 1);
  app.set("etag", false);

  const callbackToken =
    process.env.WIFI_PAYMENT_CALLBACK_TOKEN ?? "dev-wifi-callback-token";

  if (!process.env.WIFI_PAYMENT_CALLBACK_TOKEN) {
    console.warn(
      "WIFI_PAYMENT_CALLBACK_TOKEN is not set. Using dev default token. Set this in production."
    );
  }

  const adminToken = process.env.WIFI_ADMIN_TOKEN ?? "dev-admin-token";
  if (!process.env.WIFI_ADMIN_TOKEN) {
    console.warn(
      "WIFI_ADMIN_TOKEN is not set. Using dev default token. Set this in production."
    );
  }

  const landlordToken = process.env.LANDLORD_ACCESS_TOKEN;
  const rootAdminToken = process.env.WIFI_ROOT_ADMIN_TOKEN;
  const landlordUsername = process.env.LANDLORD_USERNAME;
  const landlordPassword = process.env.LANDLORD_PASSWORD;
  const adminUsername = process.env.ADMIN_USERNAME;
  const adminPassword = process.env.ADMIN_PASSWORD;
  const rootAdminUsername = process.env.ROOT_ADMIN_USERNAME;
  const rootAdminPassword = process.env.ROOT_ADMIN_PASSWORD;
  const mpesaRentCallbackToken =
    process.env.MPESA_RENT_CALLBACK_TOKEN ?? "dev-mpesa-rent-token";

  if (!process.env.MPESA_RENT_CALLBACK_TOKEN) {
    console.warn(
      "MPESA_RENT_CALLBACK_TOKEN is not set. Using dev default token. Set this in production."
    );
  }

  const pendingRentStkRequests = new Map<string, PendingRentStkRequest>();
  const pendingUtilityStkRequests = new Map<string, PendingUtilityStkRequest>();
  const mpesaVerifyWindow = new Map<string, { windowStartMs: number; count: number }>();
  const householdMembersByUnit = new Map<string, HouseholdMemberRegistryRecord>();
  const utilityChargeDefaultsByUnit = new Map<string, UtilityChargeDefaultRecord>();
  const utilityRateDefaultsByBuilding = new Map<string, UtilityRateDefaultRecord>();
  const utilityFixedChargeDefaultsByBuilding = new Map<
    string,
    UtilityFixedChargeDefaultRecord
  >();
  const monthlyCombinedUtilityChargesByMonth = new Map<
    string,
    MonthlyCombinedUtilityChargeRecord
  >();
  const buildingExpenditures = new Map<string, BuildingExpenditureRecord>();
  const residentPasswordRecoveryRequests = new Map<
    string,
    ResidentPasswordRecoveryRequestRecord
  >();
  const accountPasswordRecoveryRequests = new Map<
    string,
    AccountPasswordRecoveryRequestRecord
  >();
  const caretakerAccessRequests = new Map<string, CaretakerAccessRequestRecord>();
  const caretakerAccessByBuilding = new Map<
    string,
    Map<string, CaretakerAccessRecord>
  >();

  const settleRentPaymentInWallet = async (input: {
    buildingId: string;
    houseNumber: string;
    amountKsh: number;
    providerReference: string;
    billingMonth: string;
    paidAt: string;
    phoneNumber?: string;
    tenantUserId?: string;
    tenantName?: string;
  }) => {
    if (!isCaptynWalletConfigured()) {
      return null;
    }

    const building = await store.getBuilding(input.buildingId);
    if (!building) {
      throw new Error(`Building ${input.buildingId} not found for wallet settlement.`);
    }

    const beneficiaryOwnerType = building.landlordUserId ? "landlord" : "building";
    const beneficiaryOwnerId = building.landlordUserId || building.id;
    const beneficiaryWallet = await ensureCaptynWallet({
      ownerType: beneficiaryOwnerType,
      ownerId: beneficiaryOwnerId,
      currency: "KES"
    });

    if (building.landlordUserId) {
      try {
        await syncLandlordPayoutProfileInWallet({
          landlordUserId: building.landlordUserId,
          buildingId: building.id,
          walletId: beneficiaryWallet.id,
          reason: "rent_settlement"
        });
      } catch (profileError) {
        console.warn("Housing wallet payout profile sync failed during settlement:", profileError);
      }
    }

    const grossAmountMinor = Math.max(0, Math.round(input.amountKsh));
    const feeAmountMinor = Math.min(
      grossAmountMinor,
      Math.max(0, Math.round((grossAmountMinor * CAPTYN_HOUSING_WALLET_FEE_BPS) / 10_000))
    );

    return postProviderCollectionSettlement({
      beneficiaryWalletId: beneficiaryWallet.id,
      grossAmountMinor,
      feeAmountMinor,
      currency: "KES",
      idempotencyKey: `housing:rent:${input.providerReference}`,
      service: "landlord_housing",
      referenceType: "rent_payment",
      referenceId: input.providerReference,
      description: `Housing rent settlement for ${input.buildingId} ${input.houseNumber}`,
      sourceAccountCode: CAPTYN_HOUSING_WALLET_COLLECTION_ACCOUNT_CODE,
      metadata: {
        origin_service: "landlord_housing",
        provider: "mpesa",
        provider_reference: input.providerReference,
        building_id: input.buildingId,
        building_name: building.name,
        house_number: input.houseNumber,
        billing_month: input.billingMonth,
        paid_at: input.paidAt,
        tenant_user_id: input.tenantUserId,
        tenant_name: input.tenantName,
        tenant_phone: input.phoneNumber,
        landlord_user_id: building.landlordUserId || null,
        beneficiary_owner_type: beneficiaryOwnerType,
        beneficiary_owner_id: beneficiaryOwnerId,
        fee_bps: CAPTYN_HOUSING_WALLET_FEE_BPS
      }
    });
  };

  const syncLandlordPayoutProfileInWallet = async (input: {
    landlordUserId: string;
    buildingId: string;
    walletId?: string;
    reason: "landlord_assignment" | "rent_settlement";
  }) => {
    if (!isCaptynWalletConfigured() || !repositoryContext.prisma) {
      return null;
    }

    const landlord = await repositoryContext.prisma.housingUser.findUnique({
      where: { id: input.landlordUserId },
      select: {
        id: true,
        fullName: true,
        phone: true,
        role: true,
        status: true
      }
    });

    if (!landlord || landlord.role !== "landlord" || landlord.status !== "active") {
      return null;
    }

    const beneficiaryWallet =
      input.walletId
        ? { id: input.walletId }
        : await ensureCaptynWallet({
            ownerType: "landlord",
            ownerId: landlord.id,
            currency: "KES"
          });

    const normalizedPhone = formatDarajaMsisdn(landlord.phone);
    if (!normalizedPhone) {
      return null;
    }

    return upsertCaptynPayoutProfile({
      walletId: beneficiaryWallet.id,
      destinationType: "mpesa",
      destinationReference: normalizedPhone,
      beneficiaryName: landlord.fullName,
      status: "active",
      verificationStatus: "source_verified",
      payoutSchedule: "manual",
      metadata: {
        origin_service: "landlord_housing",
        sync_reason: input.reason,
        building_id: input.buildingId,
        landlord_user_id: landlord.id,
        landlord_phone: landlord.phone
      }
    });
  };

  const exportRuntimeQueuesState = (): RuntimeQueuesPersistedState => ({
    pendingRentStkRequests: [...pendingRentStkRequests.entries()].map(
      ([checkoutRequestId, data]) => ({
        checkoutRequestId,
        data
      })
    ),
    pendingUtilityStkRequests: [...pendingUtilityStkRequests.entries()].map(
      ([checkoutRequestId, data]) => ({
        checkoutRequestId,
        data
      })
    ),
    residentPasswordRecoveryRequests: [...residentPasswordRecoveryRequests.values()]
      .sort((a, b) => b.requestedAt.localeCompare(a.requestedAt))
      .map((item) => ({ ...item })),
    accountPasswordRecoveryRequests: [...accountPasswordRecoveryRequests.values()]
      .sort((a, b) => b.requestedAt.localeCompare(a.requestedAt))
      .map((item) => ({ ...item })),
    utilityChargeDefaults: [...utilityChargeDefaultsByUnit.values()]
      .sort((a, b) =>
        `${a.buildingId}:${a.houseNumber}`.localeCompare(
          `${b.buildingId}:${b.houseNumber}`
        )
      )
      .map((item) => ({ ...item })),
    utilityRateDefaults: [...utilityRateDefaultsByBuilding.values()]
      .sort((a, b) => a.buildingId.localeCompare(b.buildingId))
      .map((item) => ({ ...item })),
    monthlyCombinedUtilityCharges: [...monthlyCombinedUtilityChargesByMonth.values()]
      .sort((a, b) =>
        `${a.buildingId}:${a.billingMonth}`.localeCompare(
          `${b.buildingId}:${b.billingMonth}`
        )
      )
      .map((item) => ({ ...item }))
  });

  let persistRuntimeQueuesState = () => {};
  let persistCaretakerAccessState = () => {};
  let persistBuildingExpenditureState = () => {};

  const exportBuildingExpenditureState = (): BuildingExpenditurePersistedState => ({
    records: [...buildingExpenditures.values()]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((item) => ({ ...item }))
  });

  const importBuildingExpenditureState = (
    state: BuildingExpenditurePersistedState | null | undefined
  ) => {
    buildingExpenditures.clear();
    if (!state || !Array.isArray(state.records)) {
      return;
    }

    state.records.forEach((item) => {
      if (!item?.id || !item?.buildingId || !item?.title) {
        return;
      }

      buildingExpenditures.set(item.id, {
        ...item,
        chargeableToResident: Boolean(item.chargeableToResident),
        buildingId: normalizeBuildingId(item.buildingId),
        houseNumber: item.houseNumber
          ? normalizeHouseNumber(item.houseNumber)
          : undefined
      });
    });
  };

  const isResidentChargeableExpenditure = (item: BuildingExpenditureRecord) =>
    Boolean(item.chargeableToResident && item.houseNumber);

  const exportCaretakerAccessState = (): CaretakerAccessPersistedState => ({
    records: [...caretakerAccessByBuilding.values()]
      .flatMap((bucket) => [...bucket.values()])
      .sort((a, b) => b.approvedAt.localeCompare(a.approvedAt))
      .map((item) => ({ ...item })),
    requests: [...caretakerAccessRequests.values()]
      .sort((a, b) => b.requestedAt.localeCompare(a.requestedAt))
      .map((item) => ({ ...item }))
  });

  const importCaretakerAccessState = (
    state: CaretakerAccessPersistedState | null | undefined
  ) => {
    caretakerAccessByBuilding.clear();
    caretakerAccessRequests.clear();
    if (!state || !Array.isArray(state.records)) {
      if (!state || !Array.isArray(state?.requests)) {
        return;
      }
    }

    state.records.forEach((row) => {
      if (!row || !row.buildingId || !row.userId) {
        return;
      }

      const normalizedBuildingId = normalizeBuildingId(row.buildingId);
      const bucket =
        caretakerAccessByBuilding.get(normalizedBuildingId) ??
        new Map<string, CaretakerAccessRecord>();
      bucket.set(row.userId, {
        buildingId: normalizedBuildingId,
        userId: row.userId,
        verificationHouseNumber: normalizeHouseNumber(
          row.verificationHouseNumber || ""
        ),
        passwordSetupComplete: row.passwordSetupComplete !== false,
        approvedAt: row.approvedAt || new Date().toISOString(),
        approvedByRole: row.approvedByRole,
        approvedByUserId: row.approvedByUserId,
        note: row.note,
        active: row.active !== false,
        revokedAt: row.revokedAt
      });
      caretakerAccessByBuilding.set(normalizedBuildingId, bucket);
    });

    if (Array.isArray(state.requests)) {
      state.requests.forEach((row) => {
        if (!row?.id || !row?.userId || !row?.buildingId || !row?.houseNumber) {
          return;
        }

        caretakerAccessRequests.set(row.id, {
          id: row.id,
          userId: row.userId,
          buildingId: normalizeBuildingId(row.buildingId),
          houseNumber: normalizeHouseNumber(row.houseNumber),
          status:
            row.status === "approved" || row.status === "rejected"
              ? row.status
              : "pending",
          note: row.note,
          reviewerNote: row.reviewerNote,
          requestedAt: row.requestedAt || new Date().toISOString(),
          reviewedAt: row.reviewedAt,
          reviewedByRole: row.reviewedByRole,
          reviewedByUserId: row.reviewedByUserId
        });
      });
    }
  };

  const listCaretakerBuildingIdsForUser = (userId: string): Set<string> => {
    const ids = new Set<string>();
    for (const [buildingId, bucket] of caretakerAccessByBuilding.entries()) {
      const record = bucket.get(userId);
      if (record && record.active && record.passwordSetupComplete) {
        ids.add(buildingId);
      }
    }
    return ids;
  };

  const listCaretakerRecordsForBuilding = (
    buildingId: string
  ): CaretakerAccessRecord[] => {
    const normalizedBuildingId = normalizeBuildingId(buildingId);
    const bucket = caretakerAccessByBuilding.get(normalizedBuildingId);
    if (!bucket) {
      return [];
    }

    return [...bucket.values()]
      .filter((item) => item.active)
      .sort((a, b) => b.approvedAt.localeCompare(a.approvedAt))
      .map((item) => ({ ...item }));
  };

  const listActiveCaretakerRecordsForUser = (
    userId: string
  ): CaretakerAccessRecord[] => {
    const rows: CaretakerAccessRecord[] = [];
    for (const bucket of caretakerAccessByBuilding.values()) {
      const item = bucket.get(userId);
      if (item && item.active) {
        rows.push({ ...item });
      }
    }
    return rows.sort((a, b) => b.approvedAt.localeCompare(a.approvedAt));
  };

  const buildingContainsHouseNumber = async (
    buildingId: string,
    houseNumber: string
  ): Promise<boolean> => {
    const normalizedHouse = normalizeHouseNumber(houseNumber);
    const building = await store.getBuilding(buildingId);
    if (!building) {
      return false;
    }

    const listed = new Set(
      (building.houseNumbers ?? [])
        .map((item) => normalizeHouseNumber(item))
        .filter(Boolean)
    );
    if (listed.has(normalizedHouse)) {
      return true;
    }

    if (!repositoryContext.prisma) {
      return false;
    }

    const unit = await repositoryContext.prisma.houseUnit.findFirst({
      where: {
        buildingId,
        houseNumber: normalizedHouse,
        isActive: true
      },
      select: { id: true }
    });
    return Boolean(unit);
  };

  const resolveCaretakerAccessByPhoneAndHouse = async (input: {
    phoneNumber: string;
    houseNumber: string;
    buildingId?: string;
  }) => {
    if (!userAccountService) {
      throw new Error("USER_ACCOUNT_SERVICE_UNAVAILABLE");
    }

    const resolved = await userAccountService.resolveUserByIdentifier(
      input.phoneNumber
    );
    if (resolved.identifierType !== "phone" || !resolved.user) {
      return null;
    }

    if (resolved.user.status !== "active") {
      throw new Error("ACCOUNT_DISABLED");
    }

    const requestedBuildingId = input.buildingId?.trim() || "";
    const normalizedHouse = normalizeHouseNumber(input.houseNumber);

    const records = listActiveCaretakerRecordsForUser(resolved.user.id).filter(
      (item) => !requestedBuildingId || item.buildingId === requestedBuildingId
    );
    if (records.length === 0) {
      return null;
    }

    const matches: Array<{
      record: CaretakerAccessRecord;
      building: NonNullable<Awaited<ReturnType<typeof store.getBuilding>>>;
    }> = [];

    for (const record of records) {
      if (
        record.verificationHouseNumber &&
        normalizeHouseNumber(record.verificationHouseNumber) !== normalizedHouse
      ) {
        continue;
      }

      const hasHouse =
        record.verificationHouseNumber.length > 0
          ? true
          : await buildingContainsHouseNumber(record.buildingId, normalizedHouse);
      if (!hasHouse) {
        continue;
      }

      const building = await store.getBuilding(record.buildingId);
      if (!building) {
        continue;
      }

      matches.push({
        record,
        building
      });
    }

    if (matches.length === 0) {
      return null;
    }

    if (matches.length > 1) {
      // The phone number resolves to one user account, and caretaker scope after
      // sign-in is derived from all approved building assignments on that user.
      // When the same user is approved on multiple buildings with the same house
      // number, pick the most recently approved match instead of blocking login.
      matches.sort((a, b) => b.record.approvedAt.localeCompare(a.record.approvedAt));
    }

    return {
      user: resolved.user,
      building: matches[0].building,
      record: matches[0].record,
      houseNumber: normalizedHouse
    };
  };

  const upsertCaretakerAccess = (
    record: Omit<CaretakerAccessRecord, "active" | "revokedAt">
  ): CaretakerAccessRecord => {
    const normalizedBuildingId = normalizeBuildingId(record.buildingId);
    const bucket =
      caretakerAccessByBuilding.get(normalizedBuildingId) ??
      new Map<string, CaretakerAccessRecord>();

    const next: CaretakerAccessRecord = {
      ...record,
      buildingId: normalizedBuildingId,
      verificationHouseNumber: normalizeHouseNumber(record.verificationHouseNumber),
      passwordSetupComplete: Boolean(record.passwordSetupComplete),
      active: true,
      revokedAt: undefined
    };

    bucket.set(record.userId, next);
    caretakerAccessByBuilding.set(normalizedBuildingId, bucket);
    persistCaretakerAccessState();
    return next;
  };

  const markCaretakerPasswordSetupComplete = (
    buildingId: string,
    userId: string
  ): CaretakerAccessRecord | null => {
    const normalizedBuildingId = normalizeBuildingId(buildingId);
    const bucket = caretakerAccessByBuilding.get(normalizedBuildingId);
    if (!bucket) {
      return null;
    }

    const existing = bucket.get(userId);
    if (!existing) {
      return null;
    }

    const updated: CaretakerAccessRecord = {
      ...existing,
      passwordSetupComplete: true,
      active: true
    };
    bucket.set(userId, updated);
    caretakerAccessByBuilding.set(normalizedBuildingId, bucket);
    persistCaretakerAccessState();
    return updated;
  };

  const revokeCaretakerAccess = (
    buildingId: string,
    userId: string
  ): CaretakerAccessRecord | null => {
    const normalizedBuildingId = normalizeBuildingId(buildingId);
    const bucket = caretakerAccessByBuilding.get(normalizedBuildingId);
    if (!bucket) {
      return null;
    }

    const existing = bucket.get(userId);
    if (!existing) {
      return null;
    }

    const revoked: CaretakerAccessRecord = {
      ...existing,
      active: false,
      revokedAt: new Date().toISOString()
    };
    bucket.set(userId, revoked);
    caretakerAccessByBuilding.set(normalizedBuildingId, bucket);
    persistCaretakerAccessState();
    return revoked;
  };

  const listCaretakerAccessRequests = (input?: {
    buildingId?: string;
    status?: CaretakerAccessRequestStatus;
  }): CaretakerAccessRequestRecord[] => {
    const normalizedBuildingId = input?.buildingId
      ? normalizeBuildingId(input.buildingId)
      : undefined;

    return [...caretakerAccessRequests.values()]
      .filter((item) => {
        if (normalizedBuildingId && item.buildingId !== normalizedBuildingId) {
          return false;
        }
        if (input?.status && item.status !== input.status) {
          return false;
        }
        return true;
      })
      .sort((a, b) => b.requestedAt.localeCompare(a.requestedAt))
      .map((item) => ({ ...item }));
  };

  const findPendingCaretakerAccessRequest = (input: {
    userId: string;
    buildingId: string;
    houseNumber: string;
  }): CaretakerAccessRequestRecord | null => {
    const normalizedBuildingId = normalizeBuildingId(input.buildingId);
    const normalizedHouseNumber = normalizeHouseNumber(input.houseNumber);

    for (const item of caretakerAccessRequests.values()) {
      if (
        item.userId === input.userId &&
        item.buildingId === normalizedBuildingId &&
        item.houseNumber === normalizedHouseNumber &&
        item.status === "pending"
      ) {
        return { ...item };
      }
    }

    return null;
  };

  const createCaretakerAccessRequest = (
    input: Omit<CaretakerAccessRequestRecord, "id" | "status" | "requestedAt">
  ): CaretakerAccessRequestRecord => {
    const existing = findPendingCaretakerAccessRequest(input);
    if (existing) {
      return existing;
    }

    const next: CaretakerAccessRequestRecord = {
      id: randomUUID(),
      userId: input.userId,
      buildingId: normalizeBuildingId(input.buildingId),
      houseNumber: normalizeHouseNumber(input.houseNumber),
      status: "pending",
      note: input.note,
      reviewerNote: undefined,
      requestedAt: new Date().toISOString(),
      reviewedAt: undefined,
      reviewedByRole: undefined,
      reviewedByUserId: undefined
    };

    caretakerAccessRequests.set(next.id, next);
    persistCaretakerAccessState();
    return { ...next };
  };

  const reviewCaretakerAccessRequest = (input: {
    requestId: string;
    status: Exclude<CaretakerAccessRequestStatus, "pending">;
    reviewedByRole: string;
    reviewedByUserId?: string;
    reviewerNote?: string;
  }): CaretakerAccessRequestRecord | null => {
    const existing = caretakerAccessRequests.get(input.requestId);
    if (!existing) {
      return null;
    }

    const updated: CaretakerAccessRequestRecord = {
      ...existing,
      status: input.status,
      reviewerNote: input.reviewerNote,
      reviewedAt: new Date().toISOString(),
      reviewedByRole: input.reviewedByRole,
      reviewedByUserId: input.reviewedByUserId
    };

    caretakerAccessRequests.set(input.requestId, updated);
    persistCaretakerAccessState();
    return { ...updated };
  };

  const mapCaretakerAccessRequestWithUser = (
    request: CaretakerAccessRequestRecord,
    user: {
      id: string;
      fullName: string;
      email: string;
      phone: string;
      role: UserRole;
      status: string;
    } | null
  ) => ({
    ...request,
    user: user
      ? {
          id: user.id,
          fullName: user.fullName,
          email: user.email,
          phone: user.phone,
          role: user.role,
          status: user.status
        }
      : null
  });

  const approveCaretakerUserForBuilding = async (input: {
    building: NonNullable<Awaited<ReturnType<typeof store.getBuilding>>>;
    targetUser: {
      id: string;
      fullName: string;
      email: string;
      phone: string;
      role: UserRole;
      status: string;
    };
    verificationHouseNumber: string;
    approvedByRole: string;
    approvedByUserId?: string;
    note?: string;
  }) => {
    const verificationHouseNumber = normalizeHouseNumber(input.verificationHouseNumber);

    if (input.targetUser.status !== "active") {
      throw new Error("CARETAKER_TARGET_NOT_ACTIVE");
    }

    if (input.targetUser.role === "admin" || input.targetUser.role === "root_admin") {
      throw new Error("CARETAKER_TARGET_ROLE_CONFLICT");
    }

    const activeTenancy = await repositoryContext.prisma?.tenancy.findFirst({
      where: {
        userId: input.targetUser.id,
        active: true,
        buildingId: input.building.id
      },
      include: {
        unit: {
          select: {
            houseNumber: true
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    if (
      activeTenancy &&
      normalizeHouseNumber(activeTenancy.unit.houseNumber) !== verificationHouseNumber
    ) {
      throw new Error(
        `Selected account is currently resident of house ${normalizeHouseNumber(
          activeTenancy.unit.houseNumber
        )} in ${input.building.id}. Use that house number or choose the correct account.`
      );
    }

    return upsertCaretakerAccess({
      buildingId: input.building.id,
      userId: input.targetUser.id,
      verificationHouseNumber,
      passwordSetupComplete: false,
      approvedAt: new Date().toISOString(),
      approvedByRole: input.approvedByRole,
      approvedByUserId: input.approvedByUserId,
      note: input.note
    });
  };

  const memberRegistryKey = (buildingId: string, houseNumber: string) =>
    `${buildingId}::${normalizeHouseNumber(houseNumber)}`;
  const combinedUtilityChargeMonthKey = (
    buildingId: string,
    billingMonth: string
  ) => `${normalizeBuildingId(buildingId)}::${billingMonth}`;
  let warnedMissingHouseholdRegistryTable = false;
  const isMissingHouseholdRegistryTable = (error: unknown) => {
    if (!(error instanceof Error)) {
      return false;
    }

    const message = error.message || "";
    return (
      (message.includes("P2021") ||
        message.toLowerCase().includes("does not exist") ||
        message.toLowerCase().includes("relation")) &&
      message.includes("HouseholdMemberRegistry")
    );
  };

  const warnMissingHouseholdRegistryTable = () => {
    if (warnedMissingHouseholdRegistryTable) {
      return;
    }
    warnedMissingHouseholdRegistryTable = true;
    console.warn(
      "HouseholdMemberRegistry table is not available yet. Falling back to in-memory member registry. Run Prisma migrations to persist data."
    );
  };

  const listHouseholdMembersForBuilding = async (buildingId: string) => {
    if (repositoryContext.prisma) {
      try {
        const rows = await repositoryContext.prisma.householdMemberRegistry.findMany({
          where: { buildingId },
          select: {
            houseNumber: true,
            members: true,
            updatedAt: true
          }
        });

        return new Map(
          rows.map((item) => [
            normalizeHouseNumber(item.houseNumber),
            {
              buildingId,
              houseNumber: normalizeHouseNumber(item.houseNumber),
              members: item.members,
              updatedAt: item.updatedAt.toISOString()
            } satisfies HouseholdMemberRegistryRecord
          ])
        );
      } catch (error) {
        if (!isMissingHouseholdRegistryTable(error)) {
          throw error;
        }
        warnMissingHouseholdRegistryTable();
      }
    }

    const rows = new Map<string, HouseholdMemberRegistryRecord>();
    for (const item of householdMembersByUnit.values()) {
      if (item.buildingId !== buildingId) {
        continue;
      }
      rows.set(normalizeHouseNumber(item.houseNumber), item);
    }

    return rows;
  };

  const upsertHouseholdMembersForBuilding = async (
    buildingId: string,
    rows: Array<{ houseNumber: string; members: number }>
  ) => {
    if (rows.length === 0) {
      return;
    }

    const normalized = rows.map((item) => ({
      houseNumber: normalizeHouseNumber(item.houseNumber),
      members: item.members
    }));

    if (repositoryContext.prisma) {
      try {
        await repositoryContext.prisma.$transaction(
          normalized.map((item) =>
            repositoryContext.prisma!.householdMemberRegistry.upsert({
              where: {
                buildingId_houseNumber: {
                  buildingId,
                  houseNumber: item.houseNumber
                }
              },
              update: {
                members: item.members
              },
              create: {
                buildingId,
                houseNumber: item.houseNumber,
                members: item.members
              }
            })
          )
        );
      } catch (error) {
        if (!isMissingHouseholdRegistryTable(error)) {
          throw error;
        }
        warnMissingHouseholdRegistryTable();
      }
    }

    const now = new Date().toISOString();
    for (const item of normalized) {
      householdMembersByUnit.set(memberRegistryKey(buildingId, item.houseNumber), {
        buildingId,
        houseNumber: item.houseNumber,
        members: item.members,
        updatedAt: now
      });
    }
  };

  const listUtilityChargeDefaultsForBuilding = (buildingId: string) => {
    const normalizedBuildingId = normalizeBuildingId(buildingId);
    const rows = new Map<string, UtilityChargeDefaultRecord>();
    for (const item of utilityChargeDefaultsByUnit.values()) {
      if (normalizeBuildingId(item.buildingId) !== normalizedBuildingId) {
        continue;
      }

      const normalizedHouse = normalizeHouseNumber(item.houseNumber);
      rows.set(normalizedHouse, {
        ...item,
        buildingId: normalizedBuildingId,
        houseNumber: normalizedHouse
      });
    }

    return rows;
  };

  const upsertUtilityChargeDefaultsForBuilding = (
    buildingId: string,
    rows: Array<{
      houseNumber: string;
      waterFixedChargeKsh?: number;
      electricityFixedChargeKsh?: number;
      combinedUtilityChargeKsh?: number;
    }>
  ) => {
    if (rows.length === 0) {
      return;
    }

    const normalizedBuildingId = normalizeBuildingId(buildingId);
    const now = new Date().toISOString();
    for (const row of rows) {
      const houseNumber = normalizeHouseNumber(row.houseNumber);
      const key = memberRegistryKey(normalizedBuildingId, houseNumber);
      const current = utilityChargeDefaultsByUnit.get(key);
      utilityChargeDefaultsByUnit.set(key, {
        buildingId: normalizedBuildingId,
        houseNumber,
        waterFixedChargeKsh:
          row.waterFixedChargeKsh != null
            ? row.waterFixedChargeKsh
            : current?.waterFixedChargeKsh ?? 0,
        electricityFixedChargeKsh:
          row.electricityFixedChargeKsh != null
            ? row.electricityFixedChargeKsh
            : current?.electricityFixedChargeKsh ?? 0,
        combinedUtilityChargeKsh:
          row.combinedUtilityChargeKsh != null
            ? row.combinedUtilityChargeKsh
            : current?.combinedUtilityChargeKsh ?? 0,
        updatedAt: now
      });
    }

    syncCombinedUtilityChargeDefaultsToService();
    persistRuntimeQueuesState();
  };

  const toUtilityRateDefaultsRecord = (
    config: Pick<
      BuildingConfigurationRecord,
      | "buildingId"
      | "defaultWaterRatePerUnitKsh"
      | "defaultElectricityRatePerUnitKsh"
      | "updatedAt"
    >
  ): UtilityRateDefaultRecord | null => {
    if (
      config.defaultWaterRatePerUnitKsh == null &&
      config.defaultElectricityRatePerUnitKsh == null
    ) {
      return null;
    }

    return {
      buildingId: normalizeBuildingId(config.buildingId),
      waterRatePerUnitKsh:
        config.defaultWaterRatePerUnitKsh == null
          ? 0
          : Math.max(0, Number(config.defaultWaterRatePerUnitKsh)),
      electricityRatePerUnitKsh:
        config.defaultElectricityRatePerUnitKsh == null
          ? 0
          : Math.max(0, Number(config.defaultElectricityRatePerUnitKsh)),
      updatedAt: config.updatedAt
    };
  };

  const toUtilityFixedChargeDefaultsRecord = (
    config: Pick<
      BuildingConfigurationRecord,
      | "buildingId"
      | "defaultWaterFixedChargeKsh"
      | "defaultElectricityFixedChargeKsh"
      | "updatedAt"
    >
  ): UtilityFixedChargeDefaultRecord | null => {
    if (
      config.defaultWaterFixedChargeKsh == null &&
      config.defaultElectricityFixedChargeKsh == null
    ) {
      return null;
    }

    return {
      buildingId: normalizeBuildingId(config.buildingId),
      waterFixedChargeKsh:
        config.defaultWaterFixedChargeKsh == null
          ? 0
          : Math.max(0, Number(config.defaultWaterFixedChargeKsh)),
      electricityFixedChargeKsh:
        config.defaultElectricityFixedChargeKsh == null
          ? 0
          : Math.max(0, Number(config.defaultElectricityFixedChargeKsh)),
      updatedAt: config.updatedAt
    };
  };

  const syncUtilityPricingDefaultsForBuilding = (
    config: Pick<
      BuildingConfigurationRecord,
      | "buildingId"
      | "defaultWaterRatePerUnitKsh"
      | "defaultElectricityRatePerUnitKsh"
      | "defaultWaterFixedChargeKsh"
      | "defaultElectricityFixedChargeKsh"
      | "updatedAt"
    >
  ) => {
    const normalizedBuildingId = normalizeBuildingId(config.buildingId);
    const rateRecord = toUtilityRateDefaultsRecord(config);
    const fixedChargeRecord = toUtilityFixedChargeDefaultsRecord(config);

    if (rateRecord) {
      utilityRateDefaultsByBuilding.set(normalizedBuildingId, rateRecord);
    } else {
      utilityRateDefaultsByBuilding.delete(normalizedBuildingId);
    }

    if (fixedChargeRecord) {
      utilityFixedChargeDefaultsByBuilding.set(normalizedBuildingId, fixedChargeRecord);
    } else {
      utilityFixedChargeDefaultsByBuilding.delete(normalizedBuildingId);
    }
  };

  const getUtilityRateDefaultsForBuilding = (buildingId: string) => {
    const normalizedBuildingId = normalizeBuildingId(buildingId);
    const record = utilityRateDefaultsByBuilding.get(normalizedBuildingId);
    if (!record) {
      return null;
    }

    return {
      ...record,
      buildingId: normalizedBuildingId
    };
  };

  const getUtilityFixedChargeDefaultsForBuilding = (buildingId: string) => {
    const normalizedBuildingId = normalizeBuildingId(buildingId);
    const record = utilityFixedChargeDefaultsByBuilding.get(normalizedBuildingId);
    if (!record) {
      return null;
    }

    return {
      ...record,
      buildingId: normalizedBuildingId
    };
  };

  const getUtilityFixedChargeDefaultForHouse = (
    utilityType: "water" | "electricity",
    buildingId: string,
    houseNumber: string
  ) => {
    const normalizedBuildingId = normalizeBuildingId(buildingId);
    const normalizedHouseNumber = normalizeHouseNumber(houseNumber);
    const roomDefaults = utilityChargeDefaultsByUnit.get(
      memberRegistryKey(normalizedBuildingId, normalizedHouseNumber)
    );
    const roomValue =
      utilityType === "water"
        ? roomDefaults?.waterFixedChargeKsh
        : roomDefaults?.electricityFixedChargeKsh;

    if (Number.isFinite(Number(roomValue)) && Number(roomValue) > 0) {
      return Math.max(0, Number(roomValue));
    }

    const buildingDefaults = getUtilityFixedChargeDefaultsForBuilding(normalizedBuildingId);
    const buildingValue =
      utilityType === "water"
        ? buildingDefaults?.waterFixedChargeKsh
        : buildingDefaults?.electricityFixedChargeKsh;

    if (!Number.isFinite(Number(buildingValue))) {
      return undefined;
    }

    return Math.max(0, Number(buildingValue));
  };

  const upsertUtilityRateDefaultsForBuilding = async (
    buildingId: string,
    input: {
      waterRatePerUnitKsh?: number;
      electricityRatePerUnitKsh?: number;
    }
  ) => {
    if (!input) {
      return;
    }

    const hasWaterRate = input.waterRatePerUnitKsh != null;
    const hasElectricityRate = input.electricityRatePerUnitKsh != null;
    if (!hasWaterRate && !hasElectricityRate) {
      return;
    }

    const normalizedBuildingId = normalizeBuildingId(buildingId);
    const current = utilityRateDefaultsByBuilding.get(normalizedBuildingId);
    const now = new Date().toISOString();

    const waterRatePerUnitKsh = Number(input.waterRatePerUnitKsh);
    const electricityRatePerUnitKsh = Number(input.electricityRatePerUnitKsh);

    if (buildingConfigurationService) {
      const updated = await buildingConfigurationService.updateForBuilding(
        normalizedBuildingId,
        {
          defaultWaterRatePerUnitKsh: hasWaterRate
            ? Number.isFinite(waterRatePerUnitKsh)
              ? Math.max(0, waterRatePerUnitKsh)
              : 0
            : undefined,
          defaultElectricityRatePerUnitKsh: hasElectricityRate
            ? Number.isFinite(electricityRatePerUnitKsh)
              ? Math.max(0, electricityRatePerUnitKsh)
              : 0
            : undefined
        }
      );
      syncUtilityPricingDefaultsForBuilding(updated);
      return;
    }

    utilityRateDefaultsByBuilding.set(normalizedBuildingId, {
      buildingId: normalizedBuildingId,
      waterRatePerUnitKsh: Number.isFinite(waterRatePerUnitKsh)
        ? Math.max(0, waterRatePerUnitKsh)
        : current?.waterRatePerUnitKsh ?? 0,
      electricityRatePerUnitKsh: Number.isFinite(electricityRatePerUnitKsh)
        ? Math.max(0, electricityRatePerUnitKsh)
        : current?.electricityRatePerUnitKsh ?? 0,
      updatedAt: now
    });

    persistRuntimeQueuesState();
  };

  const syncCombinedUtilityChargeDefaultsToService = () => {
    const monthlyRecords: CombinedUtilityChargeMonthlyAmount[] = [
      ...monthlyCombinedUtilityChargesByMonth.values()
    ].map((item) => ({
      buildingId: item.buildingId,
      billingMonth: item.billingMonth,
      amountKsh: item.amountKsh
    }));

    const roomRecords: CombinedUtilityChargeRoomAmount[] = [
      ...utilityChargeDefaultsByUnit.values()
    ].map((item) => ({
      buildingId: item.buildingId,
      houseNumber: item.houseNumber,
      amountKsh: item.combinedUtilityChargeKsh
    }));

    utilityBillingService.setCombinedChargeMonthlyAmounts(monthlyRecords);
    utilityBillingService.setCombinedChargeRoomAmounts(roomRecords);
  };

  const getMonthlyCombinedUtilityCharge = (
    buildingId: string,
    billingMonth: string
  ) => {
    const normalizedBuildingId = normalizeBuildingId(buildingId);
    return (
      monthlyCombinedUtilityChargesByMonth.get(
        combinedUtilityChargeMonthKey(normalizedBuildingId, billingMonth)
      ) ?? null
    );
  };

  const upsertMonthlyCombinedUtilityCharge = (
    buildingId: string,
    billingMonth: string,
    amountKsh: number
  ) => {
    const normalizedBuildingId = normalizeBuildingId(buildingId);
    const normalizedAmount = Math.max(0, Math.round(Number(amountKsh) || 0));
    const record: MonthlyCombinedUtilityChargeRecord = {
      buildingId: normalizedBuildingId,
      billingMonth,
      amountKsh: normalizedAmount,
      updatedAt: new Date().toISOString()
    };

    monthlyCombinedUtilityChargesByMonth.set(
      combinedUtilityChargeMonthKey(normalizedBuildingId, billingMonth),
      record
    );
    syncCombinedUtilityChargeDefaultsToService();
    persistRuntimeQueuesState();

    return { ...record };
  };

  const applyUtilityBillDefaults = (
    utilityType: "water" | "electricity",
    buildingId: string,
    houseNumber: string,
    input: Partial<CreateUtilityBillInput>
  ): Partial<CreateUtilityBillInput> => {
    const resolved = { ...input };

    if (resolved.ratePerUnitKsh == null && resolved.currentReading != null) {
      const defaults = getUtilityRateDefaultsForBuilding(buildingId);
      const fallbackRaw =
        utilityType === "water"
          ? defaults?.waterRatePerUnitKsh ?? DEFAULT_WATER_RATE_PER_UNIT_KSH
          : defaults?.electricityRatePerUnitKsh;
      const fallback = Number(fallbackRaw);

      if (!Number.isFinite(fallback)) {
        const normalizedHouse = normalizeHouseNumber(houseNumber);
        throw new Error(
          `Current reading and rate per unit are required for metered ${utilityType} billing (${normalizedHouse}).`
        );
      }

      resolved.ratePerUnitKsh = fallback;
    }

    const hasMeteredFields =
      resolved.previousReading != null ||
      resolved.currentReading != null ||
      resolved.ratePerUnitKsh != null;
    if (!hasMeteredFields && resolved.fixedChargeKsh == null) {
      const defaultFixedChargeKsh = getUtilityFixedChargeDefaultForHouse(
        utilityType,
        buildingId,
        houseNumber
      );
      if (defaultFixedChargeKsh != null) {
        resolved.fixedChargeKsh = defaultFixedChargeKsh;
      }
    }

    return resolved;
  };

  const purgeRuntimeStateForBuilding = (buildingId: string) => {
    const normalizedBuildingId = normalizeBuildingId(buildingId);
    let runtimeQueuesChanged = false;

    for (const key of householdMembersByUnit.keys()) {
      if (!key.startsWith(`${normalizedBuildingId}::`)) {
        continue;
      }
      householdMembersByUnit.delete(key);
    }

    for (const key of utilityChargeDefaultsByUnit.keys()) {
      if (!key.startsWith(`${normalizedBuildingId}::`)) {
        continue;
      }
      utilityChargeDefaultsByUnit.delete(key);
      runtimeQueuesChanged = true;
    }

    if (utilityRateDefaultsByBuilding.delete(normalizedBuildingId)) {
      runtimeQueuesChanged = true;
    }

    utilityFixedChargeDefaultsByBuilding.delete(normalizedBuildingId);

    for (const key of monthlyCombinedUtilityChargesByMonth.keys()) {
      if (!key.startsWith(`${normalizedBuildingId}::`)) {
        continue;
      }
      monthlyCombinedUtilityChargesByMonth.delete(key);
      runtimeQueuesChanged = true;
    }

    for (const [checkoutRequestId, item] of pendingRentStkRequests.entries()) {
      if (normalizeBuildingId(item.buildingId) !== normalizedBuildingId) {
        continue;
      }
      pendingRentStkRequests.delete(checkoutRequestId);
      runtimeQueuesChanged = true;
    }

    for (const [checkoutRequestId, item] of pendingUtilityStkRequests.entries()) {
      if (normalizeBuildingId(item.buildingId) !== normalizedBuildingId) {
        continue;
      }
      pendingUtilityStkRequests.delete(checkoutRequestId);
      runtimeQueuesChanged = true;
    }

    for (const [requestId, item] of residentPasswordRecoveryRequests.entries()) {
      if (normalizeBuildingId(item.buildingId) !== normalizedBuildingId) {
        continue;
      }
      residentPasswordRecoveryRequests.delete(requestId);
      runtimeQueuesChanged = true;
    }

    paymentAccessService.removeBuilding(normalizedBuildingId);
    paymentProfileService.removeBuilding(normalizedBuildingId);
    paymentInstructionService.removeBuilding(normalizedBuildingId);

    if (runtimeQueuesChanged) {
      syncCombinedUtilityChargeDefaultsToService();
      persistRuntimeQueuesState();
    }
  };

  const purgeRuntimeStateForHouse = (buildingId: string, houseNumber: string) => {
    const normalizedBuildingId = normalizeBuildingId(buildingId);
    const normalizedHouseNumber = normalizeHouseNumber(houseNumber);
    const roomKey = memberRegistryKey(normalizedBuildingId, normalizedHouseNumber);
    let runtimeQueuesChanged = false;

    if (householdMembersByUnit.delete(roomKey)) {
      runtimeQueuesChanged = true;
    }

    if (utilityChargeDefaultsByUnit.delete(roomKey)) {
      runtimeQueuesChanged = true;
    }

    for (const [checkoutRequestId, item] of pendingRentStkRequests.entries()) {
      if (
        normalizeBuildingId(item.buildingId) === normalizedBuildingId &&
        normalizeHouseNumber(item.houseNumber) === normalizedHouseNumber
      ) {
        pendingRentStkRequests.delete(checkoutRequestId);
        runtimeQueuesChanged = true;
      }
    }

    for (const [checkoutRequestId, item] of pendingUtilityStkRequests.entries()) {
      if (
        normalizeBuildingId(item.buildingId) === normalizedBuildingId &&
        normalizeHouseNumber(item.houseNumber) === normalizedHouseNumber
      ) {
        pendingUtilityStkRequests.delete(checkoutRequestId);
        runtimeQueuesChanged = true;
      }
    }

    rentLedgerService.purgeHouse(normalizedBuildingId, normalizedHouseNumber);
    utilityBillingService.purgeHouse(normalizedBuildingId, normalizedHouseNumber);

    if (runtimeQueuesChanged) {
      syncCombinedUtilityChargeDefaultsToService();
      persistRuntimeQueuesState();
    }
  };

  const passwordRecoveryRateWindow = new Map<
    string,
    { windowStartMs: number; count: number }
  >();
  const accountPasswordRecoveryRateWindow = new Map<
    string,
    { windowStartMs: number; count: number }
  >();
  const authRouteRateWindow = new Map<string, { windowStartMs: number; count: number }>();
  const secureCookieOverride = parseBooleanEnv(process.env.HOUSING_COOKIE_SECURE);
  const sessionCookieDomain = normalizeCookieDomain(process.env.HOUSING_COOKIE_DOMAIN);
  const allowedCorsOrigins = parseAllowedOrigins(
    process.env.CORS_ORIGIN,
    process.env.BASE_URL
  );
  const configuredBaseUrl = normalizeOriginValue(process.env.BASE_URL);

  const shouldUseSecureCookies = (req: express.Request): boolean => {
    if (secureCookieOverride !== null) {
      return secureCookieOverride;
    }

    if (req.secure) {
      return true;
    }

    const forwardedProto = req.header("x-forwarded-proto");
    if (!forwardedProto) {
      return false;
    }

    return forwardedProto
      .split(",")
      .some((part) => part.trim().toLowerCase() === "https");
  };

  const buildSessionCookieOptions = (
    req: express.Request,
    maxAgeMs: number
  ): express.CookieOptions => ({
    httpOnly: true,
    sameSite: "lax",
    secure: shouldUseSecureCookies(req),
    path: "/",
    maxAge: maxAgeMs,
    ...(sessionCookieDomain ? { domain: sessionCookieDomain } : {})
  });

  const clearSessionCookieOptions = (): express.CookieOptions => ({
    path: "/",
    ...(sessionCookieDomain ? { domain: sessionCookieDomain } : {})
  });

  const consumeWindowRateLimit = (
    bucket: Map<string, { windowStartMs: number; count: number }>,
    key: string,
    windowMs: number,
    maxPerWindow: number
  ): boolean => {
    const now = Date.now();
    const snapshot = bucket.get(key);

    if (!snapshot || now - snapshot.windowStartMs >= windowMs) {
      bucket.set(key, {
        windowStartMs: now,
        count: 1
      });
      return true;
    }

    if (snapshot.count >= maxPerWindow) {
      return false;
    }

    snapshot.count += 1;
    return true;
  };

  const hasCookieBackedSession = (req: express.Request): boolean => {
    const cookies = parseCookies(req.header("cookie"));
    return Boolean(cookies[adminSessionCookieName] || cookies[userSessionCookieName]);
  };

  const normalizeRequestOrigin = (req: express.Request): string | null => {
    const directOrigin = normalizeOriginValue(req.header("origin"));
    if (directOrigin) {
      return directOrigin;
    }

    return normalizeOriginValue(req.header("referer"));
  };

  const expectedOriginsForRequest = (req: express.Request): Set<string> => {
    const expected = new Set<string>(allowedCorsOrigins);
    const host = req.header("host");
    if (!host) {
      return expected;
    }

    const proto = shouldUseSecureCookies(req) ? "https" : "http";
    const normalized = normalizeOriginValue(`${proto}://${host}`);
    if (normalized) {
      expected.add(normalized);
    }

    return expected;
  };

  const resolvePublicRequestOrigin = (req: express.Request): string | null => {
    const host = req.header("host");
    if (host) {
      const normalized = normalizeOriginValue(`${req.protocol}://${host}`);
      if (normalized) {
        return normalized;
      }
    }

    return configuredBaseUrl;
  };

  const createPublicAssetUrl = (req: express.Request, relativePath: string): string => {
    const origin = resolvePublicRequestOrigin(req);
    return origin ? new URL(relativePath, origin).toString() : relativePath;
  };

  const parseMultipartFormData = async (req: express.Request): Promise<FormData> => {
    const origin = resolvePublicRequestOrigin(req) ?? `http://localhost:${port}`;
    const requestInit = {
      method: req.method,
      headers: req.headers as HeadersInit,
      body: Readable.toWeb(req) as unknown as BodyInit,
      duplex: "half"
    } as RequestInit & { duplex: "half" };

    const requestUrl = new URL(req.originalUrl || req.url || "/", origin);
    const webRequest = new Request(requestUrl, requestInit);
    return webRequest.formData();
  };

  const rememberRentStkRequest = (
    checkoutRequestId: string,
    data: PendingRentStkRequest
  ) => {
    pendingRentStkRequests.set(checkoutRequestId, data);

    if (pendingRentStkRequests.size > 1000) {
      const now = Date.now();
      for (const [key, value] of pendingRentStkRequests.entries()) {
        if (now - new Date(value.initiatedAt).getTime() > 24 * 60 * 60 * 1000) {
          pendingRentStkRequests.delete(key);
        }
      }
    }

    persistRuntimeQueuesState();
  };

  const rememberUtilityStkRequest = (
    checkoutRequestId: string,
    data: PendingUtilityStkRequest
  ) => {
    pendingUtilityStkRequests.set(checkoutRequestId, data);

    if (pendingUtilityStkRequests.size > 1000) {
      const now = Date.now();
      for (const [key, value] of pendingUtilityStkRequests.entries()) {
        if (now - new Date(value.initiatedAt).getTime() > 24 * 60 * 60 * 1000) {
          pendingUtilityStkRequests.delete(key);
        }
      }
    }

    persistRuntimeQueuesState();
  };

  const rememberResidentPasswordRecoveryRequest = (
    request: ResidentPasswordRecoveryRequestRecord
  ) => {
    residentPasswordRecoveryRequests.set(request.id, request);

    if (residentPasswordRecoveryRequests.size > 2_000) {
      const entries = [...residentPasswordRecoveryRequests.values()].sort((a, b) =>
        b.requestedAt.localeCompare(a.requestedAt)
      );
      const keep = entries.slice(0, 2_000);
      residentPasswordRecoveryRequests.clear();
      for (const item of keep) {
        residentPasswordRecoveryRequests.set(item.id, item);
      }
    }

    persistRuntimeQueuesState();
  };

  const listResidentPasswordRecoveryRequests = (
    status?: ResidentPasswordRecoveryStatus,
    limit = 500
  ) => {
    const boundedLimit = Math.min(Math.max(Math.floor(limit), 1), 2_000);
    return [...residentPasswordRecoveryRequests.values()]
      .filter((item) => !status || item.status === status)
      .sort((a, b) => b.requestedAt.localeCompare(a.requestedAt))
      .slice(0, boundedLimit);
  };

  const rememberAccountPasswordRecoveryRequest = (
    request: AccountPasswordRecoveryRequestRecord
  ) => {
    accountPasswordRecoveryRequests.set(request.id, request);

    if (accountPasswordRecoveryRequests.size > 2_000) {
      const entries = [...accountPasswordRecoveryRequests.values()].sort((a, b) =>
        b.requestedAt.localeCompare(a.requestedAt)
      );
      const keep = entries.slice(0, 2_000);
      accountPasswordRecoveryRequests.clear();
      for (const item of keep) {
        accountPasswordRecoveryRequests.set(item.id, item);
      }
    }

    persistRuntimeQueuesState();
  };

  const listAccountPasswordRecoveryRequests = (
    status?: AccountPasswordRecoveryStatus,
    limit = 500
  ) => {
    const boundedLimit = Math.min(Math.max(Math.floor(limit), 1), 2_000);
    return [...accountPasswordRecoveryRequests.values()]
      .filter((item) => !status || item.status === status)
      .sort((a, b) => b.requestedAt.localeCompare(a.requestedAt))
      .slice(0, boundedLimit);
  };

  const wifiService = new WifiAccessService({
    callbackToken,
    packages: wifiPackages,
    mikrotik: {
      apiUrl: process.env.MIKROTIK_API_URL,
      username: process.env.MIKROTIK_USERNAME,
      password: process.env.MIKROTIK_PASSWORD,
      hotspotProfile: process.env.MIKROTIK_HOTSPOT_PROFILE
    }
  });

  const adminAuthService = new AdminAuthService({
    landlordToken,
    adminToken,
    rootAdminToken,
    landlordUsername,
    landlordPassword,
    adminUsername,
    adminPassword,
    rootAdminUsername,
    rootAdminPassword
  });
  const userAccountService = repositoryContext.prisma
    ? new UserAccountService(repositoryContext.prisma)
    : null;
  const buildingConfigurationService = repositoryContext.prisma
    ? new BuildingConfigurationService(repositoryContext.prisma)
    : null;
  const buildingWifiPackageService = repositoryContext.prisma
    ? new BuildingWifiPackageService(repositoryContext.prisma)
    : null;
  const userSupportService = new UserSupportService();
  const ownerNotificationService = new OwnerNotificationService();
  const rentLedgerService = new RentLedgerService();
  const utilityBillingService = new UtilityBillingService();
  const paymentAccessService = new PaymentAccessService();
  const paymentProfileService = new PaymentProfileService();
  const paymentInstructionService = new PaymentInstructionService();
  const publicPaymentInstructionValue = (value: string | undefined) => {
    const normalized = String(value ?? "").trim();
    const lower = normalized.toLowerCase();
    if (
      !normalized ||
      lower.includes("your_") ||
      lower.includes("replace_me") ||
      lower.includes("changeme") ||
      lower.includes("change-me") ||
      normalized.includes("<") ||
      normalized.includes(">")
    ) {
      return "";
    }

    return normalized;
  };
  const buildBuildingPaymentInstructionPayload = (input: {
    buildingId: string;
    buildingName?: string;
    houseNumber?: string;
  }) => {
    const record = paymentInstructionService.getForBuilding(input.buildingId);
    const buildingPaymentProfile = paymentProfileService.resolveForBuilding(
      input.buildingId,
      "/api/payments/mpesa/rent-callback"
    );
    const profile = buildingPaymentProfile.publicProfile;
    const profileForAccountReference = profile
      ? {
          ...profile,
          accountReferencePrefix:
            publicPaymentInstructionValue(profile.accountReferencePrefix) || undefined
        }
      : profile;
    const fallbackAccountReference = input.houseNumber
      ? buildRentAccountReference({
          houseNumber: input.houseNumber,
          assignment: buildingPaymentProfile.assignment,
          profile: profileForAccountReference
        })
      : publicPaymentInstructionValue(profile?.accountReferencePrefix) ||
        "Resident house number";
    const mpesaBusinessNumber =
      record.mpesaBusinessNumber ||
      publicPaymentInstructionValue(profile?.partyB) ||
      publicPaymentInstructionValue(profile?.shortCode);
    const mpesaAccountReference =
      record.mpesaAccountReference || fallbackAccountReference;
    const methodLabels: Record<
      BuildingPaymentInstructionsRecord["primaryMethod"],
      string
    > = {
      mpesa: "M-PESA",
      bank: "Bank transfer",
      cash: "Cash",
      manual: "Manual"
    };

    return {
      ...record,
      buildingName: input.buildingName ?? input.buildingId,
      methodLabel: methodLabels[record.primaryMethod],
      effective: {
        mpesaBusinessNumber,
        mpesaAccountReference,
        mpesaAccountName: record.mpesaAccountName || profile?.name || "",
        bankName: record.bankName || "",
        bankAccountName: record.bankAccountName || "",
        bankAccountNumber: record.bankAccountNumber || "",
        bankBranch: record.bankBranch || "",
        bankSwiftCode: record.bankSwiftCode || "",
        cashLocation: record.cashLocation || "",
        instructions: record.instructions || "",
        proofInstructions: record.proofInstructions || ""
      },
      paymentProfile: profile
        ? {
            id: profile.id,
            name: profile.name,
            shortCode: profile.shortCode,
            partyB: profile.partyB,
            isConfigured: profile.isConfigured
          }
        : null
    };
  };
  const residentNotificationPreferenceService =
    new ResidentNotificationPreferenceService();
  const appStateService = repositoryContext.prisma
    ? new AppStateService(repositoryContext.prisma)
    : null;
  const pushNotificationService = new PushNotificationService(
    pushVapidPublicKey && pushVapidPrivateKey && pushVapidSubject
      ? {
          publicKey: pushVapidPublicKey,
          privateKey: pushVapidPrivateKey,
          subject: pushVapidSubject
        }
      : null
  );
  const smsNotificationService = new SmsNotificationService({
    apiKey: africasTalkingApiKey,
    username: africasTalkingUsername,
    senderId: africasTalkingSenderId
  });

  if (
    (pushVapidPublicKey || pushVapidPrivateKey) &&
    !pushNotificationService.isEnabled()
  ) {
    console.warn(
      "Housing web push is disabled because PUSH_VAPID_PUBLIC_KEY/PUSH_VAPID_PRIVATE_KEY are incomplete."
    );
  }

  if (
    (africasTalkingApiKey || africasTalkingUsername) &&
    !smsNotificationService.isEnabled()
  ) {
    console.warn(
      "Housing SMS is disabled because AFRICASTALKING_API_KEY/AFRICASTALKING_USERNAME are incomplete."
    );
  }

  type RoomBillingHoldScope = "rent" | "utilities" | "all";
  type RoomBillingHoldUtilityType = "water" | "electricity";
  type RoomBillingHoldCacheItem = {
    id: string;
    buildingId: string;
    houseNumber: string;
    scope: RoomBillingHoldScope;
    utilityType?: RoomBillingHoldUtilityType;
    startMonth: string;
    endMonth: string;
  };
  type RoomBillingChargeKind = "rent" | "utility";

  let roomBillingHoldCache: RoomBillingHoldCacheItem[] = [];
  let roomBillingHoldCacheLoadedAt = 0;
  const ROOM_BILLING_HOLD_CACHE_TTL_MS = 15_000;

  const normalizeRoomBillingHoldScope = (value: string): RoomBillingHoldScope => {
    const normalized = String(value ?? "").trim();
    if (normalized === "rent" || normalized === "utilities" || normalized === "all") {
      return normalized;
    }
    return "all";
  };

  const normalizeRoomBillingHoldUtilityType = (
    value: string | null | undefined
  ): RoomBillingHoldUtilityType | undefined => {
    const normalized = String(value ?? "").trim();
    if (normalized === "water" || normalized === "electricity") {
      return normalized;
    }
    return undefined;
  };

  const mapRoomBillingHold = (hold: {
    id: string;
    buildingId: string;
    houseNumber: string;
    scope: string;
    utilityType: string | null;
    startMonth: string;
    endMonth: string;
    reason: string | null;
    createdByUserId: string | null;
    createdByRole: string | null;
    createdByName: string | null;
    canceledAt: Date | null;
    canceledByUserId: string | null;
    canceledByRole: string | null;
    canceledByName: string | null;
    cancelReason: string | null;
    createdAt: Date;
    updatedAt: Date;
  }) => ({
    id: hold.id,
    buildingId: hold.buildingId,
    houseNumber: hold.houseNumber,
    scope: normalizeRoomBillingHoldScope(hold.scope),
    utilityType: normalizeRoomBillingHoldUtilityType(hold.utilityType),
    startMonth: hold.startMonth,
    endMonth: hold.endMonth,
    reason: hold.reason ?? undefined,
    active: !hold.canceledAt,
    createdBy: {
      userId: hold.createdByUserId ?? undefined,
      role: hold.createdByRole ?? undefined,
      name: hold.createdByName ?? undefined
    },
    canceledBy: hold.canceledAt
      ? {
          userId: hold.canceledByUserId ?? undefined,
          role: hold.canceledByRole ?? undefined,
          name: hold.canceledByName ?? undefined
        }
      : undefined,
    cancelReason: hold.cancelReason ?? undefined,
    canceledAt: hold.canceledAt?.toISOString(),
    createdAt: hold.createdAt.toISOString(),
    updatedAt: hold.updatedAt.toISOString()
  });

  const roomBillingHoldMatchesCharge = (
    hold: RoomBillingHoldCacheItem,
    input: {
      buildingId: string;
      houseNumber: string;
      kind: RoomBillingChargeKind;
      billingMonth: string;
      utilityType?: RoomBillingHoldUtilityType;
    }
  ) => {
    if (hold.buildingId !== normalizeBuildingId(input.buildingId)) {
      return false;
    }
    if (hold.houseNumber !== normalizeHouseNumber(input.houseNumber)) {
      return false;
    }
    if (input.billingMonth < hold.startMonth || input.billingMonth > hold.endMonth) {
      return false;
    }
    if (input.kind === "rent") {
      return hold.scope === "rent" || hold.scope === "all";
    }
    if (hold.scope !== "utilities" && hold.scope !== "all") {
      return false;
    }
    return !hold.utilityType || hold.utilityType === input.utilityType;
  };

  const isRoomBillingHeld = (input: {
    buildingId: string;
    houseNumber: string;
    kind: RoomBillingChargeKind;
    billingMonth: string;
    utilityType?: RoomBillingHoldUtilityType;
  }) =>
    roomBillingHoldCache.some((hold) => roomBillingHoldMatchesCharge(hold, input));

  const isBillingHoldOverrideRequested = (value: unknown) =>
    (value as { overrideBillingHold?: unknown } | null)?.overrideBillingHold === true;

  const refreshRoomBillingHoldCache = async (force = false) => {
    if (!repositoryContext.prisma) {
      roomBillingHoldCache = [];
      roomBillingHoldCacheLoadedAt = Date.now();
      return;
    }

    const now = Date.now();
    if (
      !force &&
      roomBillingHoldCacheLoadedAt > 0 &&
      now - roomBillingHoldCacheLoadedAt < ROOM_BILLING_HOLD_CACHE_TTL_MS
    ) {
      return;
    }

    try {
      const rows = await repositoryContext.prisma.roomBillingHold.findMany({
        where: {
          canceledAt: null
        },
        select: {
          id: true,
          buildingId: true,
          houseNumber: true,
          scope: true,
          utilityType: true,
          startMonth: true,
          endMonth: true
        }
      });

      roomBillingHoldCache = rows.map((hold) => ({
        id: hold.id,
        buildingId: normalizeBuildingId(hold.buildingId),
        houseNumber: normalizeHouseNumber(hold.houseNumber),
        scope: normalizeRoomBillingHoldScope(hold.scope),
        utilityType: normalizeRoomBillingHoldUtilityType(hold.utilityType),
        startMonth: hold.startMonth,
        endMonth: hold.endMonth
      }));
      roomBillingHoldCacheLoadedAt = now;
    } catch (error) {
      console.warn("Failed to refresh room billing hold cache:", error);
      roomBillingHoldCacheLoadedAt = now;
    }
  };

  rentLedgerService.setBillingHoldPredicate((input) =>
    isRoomBillingHeld({
      buildingId: input.buildingId,
      houseNumber: input.houseNumber,
      kind: "rent",
      billingMonth: input.billingMonth
    })
  );

  utilityBillingService.setBillingHoldPredicate((input) =>
    isRoomBillingHeld({
      buildingId: input.buildingId,
      houseNumber: input.houseNumber,
      kind: "utility",
      billingMonth: input.billingMonth,
      utilityType: input.utilityType
    })
  );

  const serializeCsvCell = (value: unknown): string => {
    const stringValue = String(value ?? "");
    if (!/[",\n]/.test(stringValue)) {
      return stringValue;
    }

    return `"${stringValue.replace(/"/g, '""')}"`;
  };

  const buildUtilityBulkSubmissionAuditCsv = (
    record: UtilityBulkSubmissionAuditRecord
  ): string => {
    const lines = [
      ["Audit ID", record.id],
      ["Created At", record.createdAt],
      ["Building ID", record.buildingId],
      ["Building Name", record.buildingName],
      ["Billing Month", record.billingMonth],
      ["Due Date", record.dueDate],
      ["Default Water Fixed Charge KSh", record.defaultWaterFixedChargeKsh ?? ""],
      [
        "Default Electricity Fixed Charge KSh",
        record.defaultElectricityFixedChargeKsh ?? ""
      ],
      ["Default Combined Charge KSh", record.defaultCombinedUtilityChargeKsh ?? ""],
      ["Monthly Combined Charge KSh", record.monthlyCombinedUtilityChargeKsh ?? ""],
      ["Water Rate Per Unit KSh", record.rateDefaults?.waterRatePerUnitKsh ?? ""],
      [
        "Electricity Rate Per Unit KSh",
        record.rateDefaults?.electricityRatePerUnitKsh ?? ""
      ],
      ["Note", record.note ?? ""],
      ["Status", record.result.status],
      ["Posted Count", record.result.postedCount],
      ["Requested Count", record.result.requestedCount],
      ["Completed At", record.result.completedAt ?? ""]
    ].map((row) => row.map(serializeCsvCell).join(","));

    lines.push("");
    lines.push(
      [
        "House",
        "Household Members",
        "Has Active Resident",
        "Water Meter",
        "Water Previous",
        "Water Current",
        "Water Fixed KSh",
        "Electricity Meter",
        "Electricity Previous",
        "Electricity Current",
        "Electricity Fixed KSh"
      ]
        .map(serializeCsvCell)
        .join(",")
    );

    for (const row of record.rows) {
      lines.push(
        [
          row.houseNumber,
          row.householdMembers ?? "",
          row.hasActiveResident ?? "",
          row.waterMeterNumber ?? "",
          row.waterPreviousReading ?? "",
          row.waterCurrentReading ?? "",
          row.waterFixedChargeKsh ?? "",
          row.electricityMeterNumber ?? "",
          row.electricityPreviousReading ?? "",
          row.electricityCurrentReading ?? "",
          row.electricityFixedChargeKsh ?? ""
        ]
          .map(serializeCsvCell)
          .join(",")
      );
    }

    if (record.result.failures.length > 0) {
      lines.push("");
      lines.push(serializeCsvCell("Failures"));
      for (const failure of record.result.failures) {
        lines.push(serializeCsvCell(failure));
      }
    }

    return lines.join("\n");
  };

  const listUtilityBulkSubmissionAudits = async (
    buildingId: string,
    limit = 20
  ): Promise<UtilityBulkSubmissionAuditRecord[]> => {
    if (!appStateService) {
      return [];
    }

    const state = await appStateService.getJson<UtilityBulkSubmissionAuditState>(
      UTILITY_BULK_SUBMISSION_AUDIT_STATE_KEY
    );
    const normalizedBuildingId = normalizeBuildingId(buildingId);
    const boundedLimit = Math.min(Math.max(Math.trunc(limit), 1), 100);

    return (state?.submissions ?? [])
      .filter((item) => normalizeBuildingId(item.buildingId) === normalizedBuildingId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, boundedLimit);
  };

  const getUtilityBulkSubmissionAudit = async (
    buildingId: string,
    auditId: string
  ): Promise<UtilityBulkSubmissionAuditRecord | null> => {
    if (!appStateService) {
      return null;
    }

    const state = await appStateService.getJson<UtilityBulkSubmissionAuditState>(
      UTILITY_BULK_SUBMISSION_AUDIT_STATE_KEY
    );
    const normalizedBuildingId = normalizeBuildingId(buildingId);

    return (
      (state?.submissions ?? []).find(
        (item) =>
          normalizeBuildingId(item.buildingId) === normalizedBuildingId && item.id === auditId
      ) ?? null
    );
  };

  const createUtilityBulkSubmissionAudit = async (
    building: { id: string; name: string },
    input: LandlordUtilityBulkSubmissionAuditCreateInput,
    actor: { role?: string; userId?: string }
  ): Promise<UtilityBulkSubmissionAuditRecord> => {
    if (!appStateService) {
      throw new Error("Bulk utility audit requires database connection.");
    }

    const createdByRole: UtilityBulkSubmissionAuditRecord["createdByRole"] =
      actor.role === "caretaker" ||
      actor.role === "admin" ||
      actor.role === "root_admin"
        ? actor.role
        : "landlord";

    const record: UtilityBulkSubmissionAuditRecord = {
      id: randomUUID(),
      createdAt: new Date().toISOString(),
      createdByRole,
      createdByUserId: actor.userId,
      buildingId: building.id,
      buildingName: building.name,
      billingMonth: input.billingMonth,
      dueDate: input.dueDate,
      note: input.note?.trim() || undefined,
      defaultWaterFixedChargeKsh:
        input.defaultWaterFixedChargeKsh == null
          ? null
          : Math.max(0, Number(input.defaultWaterFixedChargeKsh)),
      defaultElectricityFixedChargeKsh:
        input.defaultElectricityFixedChargeKsh == null
          ? null
          : Math.max(0, Number(input.defaultElectricityFixedChargeKsh)),
      defaultCombinedUtilityChargeKsh:
        input.defaultCombinedUtilityChargeKsh == null
          ? null
          : Math.max(0, Math.round(input.defaultCombinedUtilityChargeKsh)),
      monthlyCombinedUtilityChargeKsh:
        input.monthlyCombinedUtilityChargeKsh == null
          ? null
          : Math.max(0, Math.round(input.monthlyCombinedUtilityChargeKsh)),
      rateDefaults: input.rateDefaults
        ? {
            waterRatePerUnitKsh:
              input.rateDefaults.waterRatePerUnitKsh == null
                ? undefined
                : Math.max(0, Number(input.rateDefaults.waterRatePerUnitKsh)),
            electricityRatePerUnitKsh:
              input.rateDefaults.electricityRatePerUnitKsh == null
                ? undefined
                : Math.max(0, Number(input.rateDefaults.electricityRatePerUnitKsh))
          }
        : undefined,
      rows: input.rows.map((row) => ({
        houseNumber: normalizeHouseNumber(row.houseNumber),
        householdMembers:
          typeof row.householdMembers === "number" ? Math.max(0, row.householdMembers) : undefined,
        hasActiveResident:
          typeof row.hasActiveResident === "boolean" ? row.hasActiveResident : undefined,
        waterMeterNumber: row.waterMeterNumber?.trim() || undefined,
        waterPreviousReading:
          row.waterPreviousReading == null ? undefined : Number(row.waterPreviousReading),
        waterCurrentReading:
          row.waterCurrentReading == null ? undefined : Number(row.waterCurrentReading),
        waterFixedChargeKsh:
          row.waterFixedChargeKsh == null ? undefined : Number(row.waterFixedChargeKsh),
        electricityMeterNumber: row.electricityMeterNumber?.trim() || undefined,
        electricityPreviousReading:
          row.electricityPreviousReading == null
            ? undefined
            : Number(row.electricityPreviousReading),
        electricityCurrentReading:
          row.electricityCurrentReading == null
            ? undefined
            : Number(row.electricityCurrentReading),
        electricityFixedChargeKsh:
          row.electricityFixedChargeKsh == null
            ? undefined
            : Number(row.electricityFixedChargeKsh)
      })),
      result: {
        status: "pending",
        postedCount: 0,
        requestedCount: 0,
        failures: []
      }
    };

    await appStateService.queueUpdateJson<UtilityBulkSubmissionAuditState>(
      UTILITY_BULK_SUBMISSION_AUDIT_STATE_KEY,
      (current) => ({
        submissions: [record, ...(current?.submissions ?? [])].slice(0, 200)
      })
    );

    return record;
  };

  const finalizeUtilityBulkSubmissionAudit = async (
    buildingId: string,
    auditId: string,
    input: LandlordUtilityBulkSubmissionAuditFinalizeInput
  ): Promise<UtilityBulkSubmissionAuditRecord | null> => {
    if (!appStateService) {
      return null;
    }

    let updatedRecord: UtilityBulkSubmissionAuditRecord | null = null;
    const normalizedBuildingId = normalizeBuildingId(buildingId);
    await appStateService.queueUpdateJson<UtilityBulkSubmissionAuditState>(
      UTILITY_BULK_SUBMISSION_AUDIT_STATE_KEY,
      (current) => {
        const submissions = (current?.submissions ?? []).map((item) => {
          if (
            item.id !== auditId ||
            normalizeBuildingId(item.buildingId) !== normalizedBuildingId
          ) {
            return item;
          }

          updatedRecord = {
            ...item,
            result: {
              status: input.status,
              postedCount: input.postedCount,
              requestedCount: input.requestedCount,
              failures: [...input.failures],
              completedAt: input.completedAt ?? new Date().toISOString()
            }
          };
          return updatedRecord;
        });

        return { submissions };
      }
    );

    return updatedRecord;
  };

  const syncDerivedBuildingConfigurationState = async () => {
    const buildings = await store.listBuildings();
    if (!buildingConfigurationService) {
      utilityBillingService.setCombinedChargeBuildingIds([]);
      utilityBillingService.setCombinedChargeBuildingAmounts([]);
      utilityRateDefaultsByBuilding.clear();
      utilityFixedChargeDefaultsByBuilding.clear();
      return;
    }

    await buildingConfigurationService.ensureDefaultsForBuildings(buildings);
    if (buildingWifiPackageService) {
      await buildingWifiPackageService.ensureDefaultsForBuildings(buildings);
    }

    const legacyPaymentAccessState = paymentAccessService.exportState();
    if (legacyPaymentAccessState.records.length > 0) {
      await buildingConfigurationService.syncLegacyPaymentAccess(
        legacyPaymentAccessState.records
      );
    }

    const configs = await buildingConfigurationService.listForBuildings(
      buildings.map((item) => item.id)
    );

    if (configs.length > 0) {
      paymentAccessService.importState({
        records: configs.map(toPaymentAccessRecord)
      });
    }

    utilityRateDefaultsByBuilding.clear();
    utilityFixedChargeDefaultsByBuilding.clear();
    for (const item of configs) {
      syncUtilityPricingDefaultsForBuilding(item);
    }

    utilityBillingService.setCombinedChargeBuildingIds(
      configs
        .filter((item) => item.utilityBillingMode === "combined_charge")
        .map((item) => item.buildingId)
    );
    utilityBillingService.setCombinedChargeBuildingAmounts(
      configs
        .filter((item) => item.defaultCombinedUtilityChargeKsh != null)
        .map(
          (item): CombinedUtilityChargeBuildingAmount => ({
            buildingId: item.buildingId,
            amountKsh: Number(item.defaultCombinedUtilityChargeKsh)
          })
        )
    );
  };

  const migrateLegacyUtilityRateDefaultsToBuildingConfiguration = async () => {
    if (!buildingConfigurationService || utilityRateDefaultsByBuilding.size === 0) {
      return false;
    }

    const buildings = await store.listBuildings();
    if (buildings.length === 0) {
      utilityRateDefaultsByBuilding.clear();
      return true;
    }

    await buildingConfigurationService.ensureDefaultsForBuildings(buildings);
    const configs = await buildingConfigurationService.listForBuildings(
      buildings.map((item) => item.id)
    );
    const configByBuildingId = new Map(
      configs.map((item) => [normalizeBuildingId(item.buildingId), item])
    );

    let updated = false;
    for (const [buildingId, legacyDefaults] of utilityRateDefaultsByBuilding.entries()) {
      const config = configByBuildingId.get(buildingId);
      if (!config) {
        continue;
      }

      const nextWaterRate =
        Number.isFinite(Number(legacyDefaults.waterRatePerUnitKsh)) &&
        Number(legacyDefaults.waterRatePerUnitKsh) >= 0
          ? Math.max(0, Number(legacyDefaults.waterRatePerUnitKsh))
          : undefined;
      const nextElectricityRate =
        Number.isFinite(Number(legacyDefaults.electricityRatePerUnitKsh)) &&
        Number(legacyDefaults.electricityRatePerUnitKsh) >= 0
          ? Math.max(0, Number(legacyDefaults.electricityRatePerUnitKsh))
          : undefined;

      const shouldUpdateWaterRate =
        nextWaterRate != null &&
        (config.defaultWaterRatePerUnitKsh == null ||
          Number(config.defaultWaterRatePerUnitKsh) === DEFAULT_WATER_RATE_PER_UNIT_KSH);
      const shouldUpdateElectricityRate =
        nextElectricityRate != null && config.defaultElectricityRatePerUnitKsh == null;

      if (!shouldUpdateWaterRate && !shouldUpdateElectricityRate) {
        continue;
      }

      const migrated = await buildingConfigurationService.updateForBuilding(buildingId, {
        defaultWaterRatePerUnitKsh: shouldUpdateWaterRate ? nextWaterRate : undefined,
        defaultElectricityRatePerUnitKsh: shouldUpdateElectricityRate
          ? nextElectricityRate
          : undefined
      });
      configByBuildingId.set(buildingId, migrated);
      updated = true;
    }

    if (utilityRateDefaultsByBuilding.size > 0) {
      utilityRateDefaultsByBuilding.clear();
      updated = true;
    }

    return updated;
  };

  if (appStateService) {
    try {
      const loadAppStateJsonSafely = async <T>(key: string) => {
        try {
          return await appStateService.getJson<T>(key);
        } catch (error) {
          console.error(`Failed to load AppState key ${key}.`, error);
          return null;
        }
      };

      const [
        adminAuthState,
        rentState,
        utilityState,
        userSupportState,
        wifiState,
        paymentAccessState,
        paymentProfileState,
        paymentInstructionsState,
        caretakerAccessState,
        buildingExpenditureState,
        runtimeQueuesState,
        pushSubscriptionState,
        residentNotificationPreferenceState,
        ownerNotificationState
      ] = await Promise.all([
        loadAppStateJsonSafely<AdminAuthPersistedState>(ADMIN_AUTH_STATE_KEY),
        loadAppStateJsonSafely<RentLedgerPersistedState>(RENT_LEDGER_STATE_KEY),
        loadAppStateJsonSafely<UtilityBillingPersistedState>(
          UTILITY_BILLING_STATE_KEY
        ),
        loadAppStateJsonSafely<UserSupportPersistedState>(USER_SUPPORT_STATE_KEY),
        loadAppStateJsonSafely<WifiAccessPersistedState>(WIFI_ACCESS_STATE_KEY),
        loadAppStateJsonSafely<PaymentAccessPersistedState>(
          PAYMENT_ACCESS_STATE_KEY
        ),
        loadAppStateJsonSafely<PaymentProfilePersistedState>(
          PAYMENT_PROFILE_STATE_KEY
        ),
        loadAppStateJsonSafely<PaymentInstructionsPersistedState>(
          PAYMENT_INSTRUCTIONS_STATE_KEY
        ),
        loadAppStateJsonSafely<CaretakerAccessPersistedState>(
          CARETAKER_ACCESS_STATE_KEY
        ),
        loadAppStateJsonSafely<BuildingExpenditurePersistedState>(
          BUILDING_EXPENDITURE_STATE_KEY
        ),
        loadAppStateJsonSafely<RuntimeQueuesPersistedState>(RUNTIME_QUEUES_STATE_KEY),
        loadAppStateJsonSafely<PushSubscriptionPersistedState>(
          PUSH_SUBSCRIPTIONS_STATE_KEY
        ),
        loadAppStateJsonSafely<ResidentNotificationPreferencePersistedState>(
          RESIDENT_NOTIFICATION_PREFERENCES_STATE_KEY
        ),
        loadAppStateJsonSafely<OwnerNotificationPersistedState>(
          OWNER_NOTIFICATIONS_STATE_KEY
        )
      ]);

      adminAuthService.importState(adminAuthState);
      rentLedgerService.importState(rentState);
      const utilityStateNormalized = utilityBillingService.importState(utilityState);
      userSupportService.importState(userSupportState);
      wifiService.importState(wifiState);
      paymentAccessService.importState(paymentAccessState);
      paymentProfileService.importState(paymentProfileState);
      paymentInstructionService.importState(paymentInstructionsState);
      pushNotificationService.importState(pushSubscriptionState);
      residentNotificationPreferenceService.importState(
        residentNotificationPreferenceState
      );
      ownerNotificationService.importState(ownerNotificationState);
      importCaretakerAccessState(caretakerAccessState);
      importBuildingExpenditureState(buildingExpenditureState);
      await syncDerivedBuildingConfigurationState();

      if (runtimeQueuesState) {
        if (Array.isArray(runtimeQueuesState.pendingRentStkRequests)) {
          for (const item of runtimeQueuesState.pendingRentStkRequests) {
            if (!item?.checkoutRequestId || !item?.data) {
              continue;
            }
            pendingRentStkRequests.set(item.checkoutRequestId, {
              ...item.data,
              buildingId: normalizeBuildingId(item.data.buildingId),
              houseNumber: normalizeHouseNumber(item.data.houseNumber)
            });
          }
        }

        if (Array.isArray(runtimeQueuesState.pendingUtilityStkRequests)) {
          for (const item of runtimeQueuesState.pendingUtilityStkRequests) {
            if (!item?.checkoutRequestId || !item?.data) {
              continue;
            }
            pendingUtilityStkRequests.set(item.checkoutRequestId, {
              ...item.data,
              buildingId: normalizeBuildingId(item.data.buildingId),
              houseNumber: normalizeHouseNumber(item.data.houseNumber)
            });
          }
        }

        if (Array.isArray(runtimeQueuesState.residentPasswordRecoveryRequests)) {
          for (const item of runtimeQueuesState.residentPasswordRecoveryRequests) {
            if (!item?.id) {
              continue;
            }
            residentPasswordRecoveryRequests.set(item.id, item);
          }
        }

        if (Array.isArray(runtimeQueuesState.accountPasswordRecoveryRequests)) {
          for (const item of runtimeQueuesState.accountPasswordRecoveryRequests) {
            if (!item?.id) {
              continue;
            }
            accountPasswordRecoveryRequests.set(item.id, item);
          }
        }

        if (Array.isArray(runtimeQueuesState.utilityChargeDefaults)) {
          for (const item of runtimeQueuesState.utilityChargeDefaults) {
            if (!item?.buildingId || !item?.houseNumber) {
              continue;
            }

            const buildingId = normalizeBuildingId(item.buildingId);
            const houseNumber = normalizeHouseNumber(item.houseNumber);
            const waterFixedChargeKsh = Number(item.waterFixedChargeKsh ?? 0);
            const electricityFixedChargeKsh = Number(
              item.electricityFixedChargeKsh ?? 0
            );
            const combinedUtilityChargeKsh = Number(item.combinedUtilityChargeKsh ?? 0);
            utilityChargeDefaultsByUnit.set(memberRegistryKey(buildingId, houseNumber), {
              buildingId,
              houseNumber,
              waterFixedChargeKsh: Number.isFinite(waterFixedChargeKsh)
                ? Math.max(0, waterFixedChargeKsh)
                : 0,
              electricityFixedChargeKsh: Number.isFinite(electricityFixedChargeKsh)
                ? Math.max(0, electricityFixedChargeKsh)
                : 0,
              combinedUtilityChargeKsh: Number.isFinite(combinedUtilityChargeKsh)
                ? Math.max(0, combinedUtilityChargeKsh)
                : 0,
              updatedAt: item.updatedAt || new Date().toISOString()
            });
          }
        }

        if (Array.isArray(runtimeQueuesState.utilityRateDefaults)) {
          for (const item of runtimeQueuesState.utilityRateDefaults) {
            if (!item?.buildingId) {
              continue;
            }

            const buildingId = normalizeBuildingId(item.buildingId);
            const waterRatePerUnitKsh = Number(item.waterRatePerUnitKsh ?? 0);
            const electricityRatePerUnitKsh = Number(item.electricityRatePerUnitKsh ?? 0);

            utilityRateDefaultsByBuilding.set(buildingId, {
              buildingId,
              waterRatePerUnitKsh: Number.isFinite(waterRatePerUnitKsh)
                ? Math.max(0, waterRatePerUnitKsh)
                : 0,
              electricityRatePerUnitKsh: Number.isFinite(electricityRatePerUnitKsh)
                ? Math.max(0, electricityRatePerUnitKsh)
                : 0,
              updatedAt: item.updatedAt || new Date().toISOString()
            });
          }
        }

        if (Array.isArray(runtimeQueuesState.monthlyCombinedUtilityCharges)) {
          for (const item of runtimeQueuesState.monthlyCombinedUtilityCharges) {
            if (!item?.buildingId || !item?.billingMonth) {
              continue;
            }

            const buildingId = normalizeBuildingId(item.buildingId);
            const amountKsh = Number(item.amountKsh ?? 0);
            if (!Number.isFinite(amountKsh) || amountKsh <= 0) {
              continue;
            }

            monthlyCombinedUtilityChargesByMonth.set(
              combinedUtilityChargeMonthKey(buildingId, item.billingMonth),
              {
                buildingId,
                billingMonth: item.billingMonth,
                amountKsh: Math.max(0, Math.round(amountKsh)),
                updatedAt: item.updatedAt || new Date().toISOString()
              }
            );
          }
        }
      }

      if (await migrateLegacyUtilityRateDefaultsToBuildingConfiguration()) {
        await syncDerivedBuildingConfigurationState();
      }

      syncCombinedUtilityChargeDefaultsToService();

      const queuePersist = (key: string, state: unknown) =>
        appStateService.queueSetJson(key, state);

      adminAuthService.setStateChangeHandler((state) =>
        queuePersist(ADMIN_AUTH_STATE_KEY, state)
      );
      rentLedgerService.setStateChangeHandler((state) =>
        queuePersist(RENT_LEDGER_STATE_KEY, state)
      );
      utilityBillingService.setStateChangeHandler((state) =>
        queuePersist(UTILITY_BILLING_STATE_KEY, state)
      );
      userSupportService.setStateChangeHandler((state) =>
        queuePersist(USER_SUPPORT_STATE_KEY, state)
      );
      wifiService.setStateChangeHandler((state) =>
        queuePersist(WIFI_ACCESS_STATE_KEY, state)
      );
      paymentAccessService.setStateChangeHandler((state) =>
        queuePersist(PAYMENT_ACCESS_STATE_KEY, state)
      );
      paymentProfileService.setStateChangeHandler((state) =>
        queuePersist(PAYMENT_PROFILE_STATE_KEY, state)
      );
      paymentInstructionService.setStateChangeHandler((state) =>
        queuePersist(PAYMENT_INSTRUCTIONS_STATE_KEY, state)
      );
      pushNotificationService.setStateChangeHandler((state) =>
        queuePersist(PUSH_SUBSCRIPTIONS_STATE_KEY, state)
      );
      residentNotificationPreferenceService.setStateChangeHandler((state) =>
        queuePersist(RESIDENT_NOTIFICATION_PREFERENCES_STATE_KEY, state)
      );
      ownerNotificationService.setStateChangeHandler((state) =>
        queuePersist(OWNER_NOTIFICATIONS_STATE_KEY, state)
      );

      if (utilityStateNormalized) {
        await appStateService.queueSetJson(
          UTILITY_BILLING_STATE_KEY,
          utilityBillingService.exportState()
        );
      }
      persistCaretakerAccessState = () => {
        void queuePersist(
          CARETAKER_ACCESS_STATE_KEY,
          exportCaretakerAccessState()
        );
      };
      persistBuildingExpenditureState = () => {
        void queuePersist(
          BUILDING_EXPENDITURE_STATE_KEY,
          exportBuildingExpenditureState()
        );
      };
      persistRuntimeQueuesState = () => {
        void queuePersist(RUNTIME_QUEUES_STATE_KEY, exportRuntimeQueuesState());
      };

      // Persist baseline snapshots immediately so AppState is populated even
      // before the first post-start mutation.
      void queuePersist(ADMIN_AUTH_STATE_KEY, adminAuthService.exportState());
      void queuePersist(RENT_LEDGER_STATE_KEY, rentLedgerService.exportState());
      void queuePersist(
        UTILITY_BILLING_STATE_KEY,
        utilityBillingService.exportState()
      );
      void queuePersist(USER_SUPPORT_STATE_KEY, userSupportService.exportState());
      void queuePersist(WIFI_ACCESS_STATE_KEY, wifiService.exportState());
      void queuePersist(
        PAYMENT_ACCESS_STATE_KEY,
        paymentAccessService.exportState()
      );
      void queuePersist(
        PAYMENT_PROFILE_STATE_KEY,
        paymentProfileService.exportState()
      );
      void queuePersist(
        PAYMENT_INSTRUCTIONS_STATE_KEY,
        paymentInstructionService.exportState()
      );
      void queuePersist(
        PUSH_SUBSCRIPTIONS_STATE_KEY,
        pushNotificationService.exportState()
      );
      void queuePersist(
        RESIDENT_NOTIFICATION_PREFERENCES_STATE_KEY,
        residentNotificationPreferenceService.exportState()
      );
      void queuePersist(
        OWNER_NOTIFICATIONS_STATE_KEY,
        ownerNotificationService.exportState()
      );
      persistCaretakerAccessState();
      persistBuildingExpenditureState();
      persistRuntimeQueuesState();
    } catch (error) {
      console.error(
        "Failed to load persisted housing runtime state from database.",
        error
      );
      await syncDerivedBuildingConfigurationState();
    }
  } else {
    console.warn(
      "Runtime state persistence is disabled because Prisma is unavailable (memory mode)."
    );
    await syncDerivedBuildingConfigurationState();
  }

  await refreshRoomBillingHoldCache(true);

  userSupportService.setNotificationInsertHandler((notifications) =>
    notificationDeliveryService.deliverResidentNotifications(notifications)
  );

  if (!userAccountService) {
    console.warn(
      "User account auth is disabled because database-backed repository is unavailable."
    );
  }

  const getAdminSession = (
    req: express.Request,
    res: express.Response,
    minimumRole: AdminRole = "admin"
  ) => {
    const token = readAdminSessionToken(req);
    const session = adminAuthService.getSession(token);

    if (!session) {
      res.status(401).json({ error: "Admin authorization required" });
      return null;
    }

    if (!adminAuthService.hasRole(session, minimumRole)) {
      res.status(403).json({ error: `${minimumRole} role required` });
      return null;
    }

    return session;
  };

  const getResidentSession = async (
    req: express.Request,
    res: express.Response
  ) => {
    if (!userAccountService || !repositoryContext.prisma) {
      res.status(503).json({
        error: "Resident authentication requires database-backed user accounts."
      });
      return null;
    }

    const userSession = await userAccountService.getSession(readUserSessionToken(req));
    if (!userSession) {
      res.status(401).json({ error: "Resident authentication required" });
      return null;
    }
    if (userSession.role !== "tenant") {
      res.status(403).json({
        error:
          "Resident portal is only available for tenant accounts. Sign out and use the correct portal for this account role."
      });
      return null;
    }

    const activeTenancy = userSession.residentTenancyId
      ? await repositoryContext.prisma.tenancy.findFirst({
          where: {
            id: userSession.residentTenancyId,
            userId: userSession.userId,
            active: true
          },
          include: {
            unit: {
              select: { houseNumber: true }
            }
          },
          orderBy: { createdAt: "desc" }
        })
      : await repositoryContext.prisma.tenancy.findFirst({
          where: {
            userId: userSession.userId,
            active: true
          },
          include: {
            unit: {
              select: { houseNumber: true }
            }
          },
          orderBy: { createdAt: "desc" }
        });

    if (!activeTenancy) {
      res.status(403).json({
        error: userSession.residentTenancyId
          ? "This resident session is no longer active for that room. Sign in again."
          : "Tenant approval required before resident access."
      });
      return null;
    }

    const tenantApplication = await repositoryContext.prisma.tenantApplication.findFirst({
      where: {
        userId: userSession.userId,
        buildingId: activeTenancy.buildingId,
        houseNumber: activeTenancy.unit.houseNumber
      },
      select: {
        status: true
      },
      orderBy: { updatedAt: "desc" }
    });
    const verificationStatus = toResidentVerificationStatus(tenantApplication?.status);

    if (verificationStatus === "rejected") {
      res.status(403).json({
        error: "Resident access for this room was rejected. Contact management."
      });
      return null;
    }

    return {
      token: "user-session",
      role: "resident" as const,
      userId: userSession.userId,
      tenancyId: activeTenancy.id,
      buildingId: activeTenancy.buildingId,
      houseNumber: activeTenancy.unit.houseNumber,
      phoneNumber: userSession.phone,
      verificationStatus,
      mustChangePassword: userSession.mustChangePassword,
      residentTenancyId: activeTenancy.id,
      tenancyCreatedAt: activeTenancy.createdAt.toISOString(),
      createdAt: new Date().toISOString(),
      expiresAt: userSession.expiresAt
    };
  };

  const getUserSession = async (
    req: express.Request,
    res: express.Response,
    minimumRole: UserRole = "tenant"
  ) => {
    if (!userAccountService) {
      res.status(503).json({
        error: "User account service unavailable. Database connection is required."
      });
      return null;
    }

    const token = readUserSessionToken(req);
    const session = await userAccountService.getSession(token);
    if (!session) {
      res.status(401).json({ error: "User authentication required" });
      return null;
    }

    if (!hasUserRoleAtLeast(session.role, minimumRole)) {
      res.status(403).json({ error: `${minimumRole} role required` });
      return null;
    }

    return session;
  };

  const resolveOptionalUserSession = async (req: express.Request) => {
    if (!userAccountService) return null;
    return userAccountService.getSession(readUserSessionToken(req));
  };

  const hasAnyActiveAuthSession = async (req: express.Request) => {
    const userSession = await resolveOptionalUserSession(req);
    if (userSession) {
      return true;
    }

    const adminSession = adminAuthService.getSession(readAdminSessionToken(req));
    return Boolean(adminSession);
  };

  const resolveLandlordAccessContext = async (
    req: express.Request,
    res: express.Response
  ) => {
    const userSession = await resolveOptionalUserSession(req);
    if (userSession && hasUserRoleAtLeast(userSession.role, "landlord")) {
      return {
        role: userSession.role,
        userId: userSession.userId,
        userSession
      };
    }

    if (userSession) {
      const caretakerBuildingIds = listCaretakerBuildingIdsForUser(
        userSession.userId
      );
      if (caretakerBuildingIds.size > 0) {
        return {
          role: "caretaker",
          userId: userSession.userId,
          userSession
        };
      }
    }

    const legacySession = adminAuthService.getSession(readAdminSessionToken(req));
    if (legacySession && adminAuthService.hasRole(legacySession, "landlord")) {
      return {
        role: legacySession.role,
        userId: undefined as string | undefined,
        userSession: null
      };
    }

    res.status(401).json({ error: "Landlord authorization required" });
    return null;
  };

  const canManageBuildingFromLandlordContext = async (
    context: {
      role: string;
      userSession: Awaited<ReturnType<typeof resolveOptionalUserSession>>;
    },
    buildingId: string
  ) => {
    const visibleIds = await listVisibleBuildingIdsForLandlordContext(context);
    if (!visibleIds) {
      return true;
    }

    return visibleIds.has(buildingId);
  };

  const listVisibleBuildingIdsForLandlordContext = async (context: {
    role: string;
    userSession: Awaited<ReturnType<typeof resolveOptionalUserSession>>;
  }): Promise<Set<string> | null> => {
    if (context.role === "admin" || context.role === "root_admin") {
      return null;
    }

    if (context.role === "landlord" && !context.userSession) {
      return null;
    }

    if (context.role === "caretaker") {
      if (!context.userSession) {
        return new Set<string>();
      }
      return listCaretakerBuildingIdsForUser(context.userSession.userId);
    }

    if (!context.userSession || !userAccountService) {
      return new Set<string>();
    }

    const visible = await userAccountService.listVisibleBuildingIds(
      context.userSession
    );
    if (!visible) {
      return null;
    }

    const caretakerIds = listCaretakerBuildingIdsForUser(context.userSession.userId);
    caretakerIds.forEach((item) => visible.add(item));
    return visible;
  };

  const listVisibleBuildingsForLandlordContext = async (context: {
    role: string;
    userSession: Awaited<ReturnType<typeof resolveOptionalUserSession>>;
  }) => {
    const rawBuildings = await store.listBuildings();
    const visibleIds = await listVisibleBuildingIdsForLandlordContext(context);
    if (!visibleIds) {
      return rawBuildings;
    }

    return rawBuildings.filter((item) => visibleIds.has(item.id));
  };

  const listVisibleHouseNumbersForBuildings = async (
    buildings: Array<{ id: string; houseNumbers?: string[] }>
  ) => {
    const visibleBuildingIds = new Set(buildings.map((item) => item.id));
    const houses = new Set<string>();

    for (const building of buildings) {
      for (const houseNumber of building.houseNumbers ?? []) {
        const normalized = normalizeHouseNumber(houseNumber);
        if (normalized) {
          houses.add(normalized);
        }
      }
    }

    if (repositoryContext.prisma && visibleBuildingIds.size > 0) {
      const buildingIdList = [...visibleBuildingIds];

      const [activeUnits, activeTenancies] = await Promise.all([
        repositoryContext.prisma.houseUnit.findMany({
          where: {
            buildingId: { in: buildingIdList },
            isActive: true
          },
          select: {
            houseNumber: true
          }
        }),
        repositoryContext.prisma.tenancy.findMany({
          where: {
            buildingId: { in: buildingIdList },
            active: true
          },
          select: {
            unit: {
              select: {
                houseNumber: true
              }
            }
          }
        })
      ]);

      for (const unit of activeUnits) {
        const normalized = normalizeHouseNumber(unit.houseNumber);
        if (normalized) {
          houses.add(normalized);
        }
      }

      for (const tenancy of activeTenancies) {
        const normalized = normalizeHouseNumber(tenancy.unit.houseNumber);
        if (normalized) {
          houses.add(normalized);
        }
      }
    }

    for (const meter of utilityBillingService.listMeters()) {
      if (!visibleBuildingIds.has(meter.buildingId)) {
        continue;
      }
      houses.add(normalizeHouseNumber(meter.houseNumber));
    }

    for (const bill of utilityBillingService.listBills({ limit: 2_000 })) {
      if (!visibleBuildingIds.has(bill.buildingId)) {
        continue;
      }
      houses.add(normalizeHouseNumber(bill.houseNumber));
    }

    for (const payment of utilityBillingService.listPayments({ limit: 2_000 })) {
      if (!visibleBuildingIds.has(payment.buildingId)) {
        continue;
      }
      houses.add(normalizeHouseNumber(payment.houseNumber));
    }

    return houses;
  };

  const listVisibleHouseNumbersForLandlordContext = async (context: {
    role: string;
    userSession: Awaited<ReturnType<typeof resolveOptionalUserSession>>;
  }) => {
    const buildings = await listVisibleBuildingsForLandlordContext(context);
    return listVisibleHouseNumbersForBuildings(buildings);
  };

  const requirePaymentChannelEnabled = (
    res: express.Response,
    session: { buildingId: string; houseNumber: string },
    channel: "rent" | "water" | "electricity"
  ) => {
    const access = paymentAccessService.getForBuilding(session.buildingId);
    const rentConfigured = Boolean(
      rentLedgerService.getRentDue(session.buildingId, session.houseNumber)
    );
    const enabled =
      channel === "rent"
        ? access.rentEnabled && rentConfigured
        : channel === "water"
          ? access.waterEnabled
          : access.electricityEnabled;

    if (enabled) {
      return true;
    }

    if (channel === "rent" && !rentConfigured) {
      res.status(403).json({
        error: "Rent payments are not available until rent is configured for this room."
      });
      return false;
    }

    const label =
      channel === "rent" ? "Rent" : channel === "water" ? "Water" : "Electricity";
    res.status(403).json({
      error: `${label} payments are currently disabled by your landlord for this building.`
    });
    return false;
  };

  const hasResidentBillingAccess = (session: {
    verificationStatus?: string;
  }) => session.verificationStatus === "verified";

  const isResidentBillingNotification = (item: {
    source?: string;
    dedupeKey?: string;
  }) => {
    const dedupeKey = String(item.dedupeKey ?? "").trim();
    return (
      item.source === "rent" ||
      dedupeKey.startsWith("utility-reminder-") ||
      dedupeKey.startsWith("utility-payment-")
    );
  };

  const filterResidentNotificationsForSession = (
    session: { verificationStatus?: string },
    notifications: Array<{
      source?: string;
      dedupeKey?: string;
    }>
  ) => {
    if (hasResidentBillingAccess(session)) {
      return notifications;
    }

    return notifications.filter((item) => !isResidentBillingNotification(item));
  };

  const hasCompleteResidentIdentity = (agreement: {
    identityType?: string | null;
    identityNumber?: string | null;
    identityDocumentUrls?: unknown;
  } | null | undefined) =>
    Boolean(
      String(agreement?.identityType ?? "").trim() &&
        String(agreement?.identityNumber ?? "").trim() &&
        Array.isArray(agreement?.identityDocumentUrls) &&
        agreement.identityDocumentUrls.some((item) => String(item ?? "").trim())
    );

  const buildResidentIdentityRequirement = (
    session: {
      tenancyCreatedAt?: string;
      createdAt?: string;
    },
    agreement: {
      identityType?: string | null;
      identityNumber?: string | null;
      identityDocumentUrls?: unknown;
    } | null | undefined
  ) => {
    const basis = Date.parse(session.tenancyCreatedAt ?? session.createdAt ?? "");
    const startedAtMs = Number.isFinite(basis) ? basis : Date.now();
    const dueAtMs = startedAtMs + RESIDENT_ID_GRACE_PERIOD_MS;
    const complete = hasCompleteResidentIdentity(agreement);
    const remainingMs = Math.max(0, dueAtMs - Date.now());

    return {
      required: true,
      complete,
      status: complete ? "complete" : remainingMs > 0 ? "pending" : "overdue",
      graceHours: RESIDENT_ID_GRACE_PERIOD_HOURS,
      dueAt: new Date(dueAtMs).toISOString(),
      hoursRemaining: Math.ceil(remainingMs / (60 * 60 * 1000))
    };
  };

  const requireResidentBillingAccess = (
    res: express.Response,
    session: { verificationStatus?: string }
  ) => {
    if (hasResidentBillingAccess(session)) {
      return true;
    }

    res.status(403).json({
      error: RESIDENT_BILLING_LOCKED_MESSAGE
    });
    return false;
  };

  const enqueueResidentBillingNotifications = (
    buildingId: string,
    houseNumber: string
  ) => {
    let rentInsertedCount = 0;
    let utilityInsertedCount = 0;

    const rentReminders = rentLedgerService.collectAutoReminders(buildingId, houseNumber);
    if (rentReminders.length > 0) {
      rentInsertedCount = userSupportService.enqueueSystemNotifications(
        buildingId,
        houseNumber,
        rentReminders.map((item) => ({
          title: item.title,
          message: item.message,
          level: item.level,
          source: "rent",
          createdAt: item.createdAt,
          dedupeKey: item.dedupeKey
        }))
      ).length;
    }

    const utilityReminders = utilityBillingService.collectAutoReminders(
      buildingId,
      houseNumber
    );
    if (utilityReminders.length > 0) {
      utilityInsertedCount = userSupportService.enqueueSystemNotifications(
        buildingId,
        houseNumber,
        utilityReminders.map((item) => ({
          title: item.title,
          message: item.message,
          level: item.level,
          source: "system",
          createdAt: item.createdAt,
          dedupeKey: item.dedupeKey
        }))
      ).length;
    }

    return {
      rentInsertedCount,
      utilityInsertedCount,
      insertedCount: rentInsertedCount + utilityInsertedCount
    };
  };

  const resolveTenantByHouseAndPhone = async (input: {
    houseNumber: string;
    phoneNumber: string;
    buildingId?: string;
  }) => {
    if (!repositoryContext.prisma) {
      return null;
    }

    const houseNumber = input.houseNumber.trim().toUpperCase();
    const phoneNumber = normalizeKenyaPhone(input.phoneNumber);

    const matches = await repositoryContext.prisma.tenancy.findMany({
      where: {
        active: true,
        ...(input.buildingId ? { buildingId: input.buildingId } : {}),
        unit: {
          houseNumber
        },
        user: {
          phone: phoneNumber
        }
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            phone: true
          }
        },
        building: {
          select: {
            id: true,
            name: true
          }
        },
        unit: {
          select: {
            houseNumber: true
          }
        }
      },
      orderBy: { createdAt: "desc" },
      take: 5
    });

    if (matches.length === 0) {
      return { type: "none" as const };
    }

    if (matches.length > 1 && !input.buildingId) {
      return {
        type: "ambiguous" as const,
        options: matches.map((item) => ({
          tenantUserId: item.userId,
          tenantName: item.user.fullName,
          buildingId: item.buildingId,
          buildingName: item.building.name,
          houseNumber: item.unit.houseNumber,
          phoneMask: maskPhone(item.user.phone)
        }))
      };
    }

    const match = matches[0];
    return {
      type: "resolved" as const,
      tenantUserId: match.userId,
      tenantName: match.user.fullName,
      buildingId: match.buildingId,
      buildingName: match.building.name,
      houseNumber: match.unit.houseNumber,
      phoneNumber: match.user.phone,
      phoneMask: maskPhone(match.user.phone)
    };
  };

  const resolveResidentNotificationRecipient = async (scope: {
    buildingId: string;
    houseNumber: string;
  }) => {
    if (!repositoryContext.prisma) {
      return null;
    }

    const normalizedBuildingId = normalizeBuildingId(scope.buildingId);
    const normalizedHouseNumber = normalizeHouseNumber(scope.houseNumber);
    const tenancy = await repositoryContext.prisma.tenancy.findFirst({
      where: {
        buildingId: normalizedBuildingId,
        active: true,
        unit: {
          houseNumber: normalizedHouseNumber
        }
      },
      include: {
        user: {
          select: {
            id: true,
            phone: true
          }
        },
        unit: {
          select: {
            houseNumber: true
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    if (!tenancy) {
      return null;
    }

    const tenantApplication = await repositoryContext.prisma.tenantApplication.findFirst({
      where: {
        userId: tenancy.userId,
        buildingId: normalizedBuildingId,
        houseNumber: tenancy.unit.houseNumber
      },
      select: {
        status: true
      },
      orderBy: {
        updatedAt: "desc"
      }
    });

    return {
      userId: tenancy.userId,
      phoneNumber: tenancy.user.phone,
      verificationStatus: toResidentVerificationStatus(tenantApplication?.status)
    };
  };

  const notificationDeliveryService = new NotificationDeliveryService({
    pushNotificationService,
    smsNotificationService,
    residentNotificationPreferenceService,
    resolveRecipient: resolveResidentNotificationRecipient
  });

  const buildLandlordUtilityRegistryRows = async (
    buildingId: string,
    houseNumbers: string[]
  ): Promise<LandlordUtilityRegistryRow[]> => {
    await refreshRoomBillingHoldCache();
    const houseSet = new Set(houseNumbers.map((item) => normalizeHouseNumber(item)).filter(Boolean));
    const meterMap = new Map<
      string,
      {
        waterMeterNumber?: string;
        waterMeterUpdatedAt?: string;
        electricityMeterNumber?: string;
        electricityMeterUpdatedAt?: string;
      }
    >();

    for (const meter of utilityBillingService.listMeters({ buildingId })) {
      const houseNumber = normalizeHouseNumber(meter.houseNumber);
      const current = meterMap.get(houseNumber) ?? {};
      if (meter.utilityType === "water") {
        current.waterMeterNumber = meter.meterNumber;
        current.waterMeterUpdatedAt = meter.updatedAt;
      } else {
        current.electricityMeterNumber = meter.meterNumber;
        current.electricityMeterUpdatedAt = meter.updatedAt;
      }
      meterMap.set(houseNumber, current);
    }

    const residentByHouse = new Map<
      string,
      {
        residentName: string;
        residentPhone: string;
        residentUserId: string;
      }
    >();
    const agreementByHouse = new Map<
      string,
      {
        identityType?: string;
        identityNumber?: string;
        occupationStatus?: string;
        occupationLabel?: string;
        organizationName?: string;
        organizationLocation?: string;
        emergencyContactName?: string;
        emergencyContactPhone?: string;
        monthlyRentKsh?: number;
        paymentDueDay?: number;
        leaseStartDate?: string;
        agreementUpdatedAt?: string;
      }
    >();
    const verificationByHouse = new Map<string, "verified" | "pending_review">();

    if (repositoryContext.prisma) {
      const [units, tenancies, agreements, tenantApplications] = await Promise.all([
        repositoryContext.prisma.houseUnit.findMany({
          where: {
            buildingId,
            isActive: true
          },
          select: {
            houseNumber: true
          }
        }),
        repositoryContext.prisma.tenancy.findMany({
          where: {
            buildingId,
            active: true
          },
          select: {
            userId: true,
            createdAt: true,
            user: {
              select: {
                fullName: true,
                phone: true
              }
            },
            unit: {
              select: {
                houseNumber: true
              }
            }
          },
          orderBy: { createdAt: "desc" }
        }),
        repositoryContext.prisma.tenantAgreement.findMany({
          where: {
            buildingId,
            tenancy: {
              active: true,
              unit: {
                isActive: true
              }
            }
          },
          select: {
            houseNumber: true,
            identityType: true,
            identityNumber: true,
            occupationStatus: true,
            occupationLabel: true,
            organizationName: true,
            organizationLocation: true,
            emergencyContactName: true,
            emergencyContactPhone: true,
            monthlyRentKsh: true,
            paymentDueDay: true,
            leaseStartDate: true,
            updatedAt: true
          },
          orderBy: { updatedAt: "desc" }
        }),
        repositoryContext.prisma.tenantApplication.findMany({
          where: {
            buildingId,
            status: {
              in: ["pending", "approved"]
            }
          },
          select: {
            userId: true,
            houseNumber: true,
            status: true,
            updatedAt: true
          },
          orderBy: { updatedAt: "desc" }
        })
      ]);

      for (const unit of units) {
        const houseNumber = normalizeHouseNumber(unit.houseNumber);
        houseSet.add(houseNumber);
      }

      for (const tenancy of tenancies) {
        const houseNumber = normalizeHouseNumber(tenancy.unit.houseNumber);
        houseSet.add(houseNumber);
        if (residentByHouse.has(houseNumber)) {
          continue;
        }

        residentByHouse.set(houseNumber, {
          residentName: tenancy.user.fullName,
          residentPhone: tenancy.user.phone,
          residentUserId: tenancy.userId
        });
      }

      for (const application of tenantApplications) {
        const houseNumber = normalizeHouseNumber(application.houseNumber);
        const resident = residentByHouse.get(houseNumber);
        if (!resident || resident.residentUserId !== application.userId) {
          continue;
        }

        if (verificationByHouse.has(houseNumber)) {
          continue;
        }

        verificationByHouse.set(
          houseNumber,
          application.status === "pending" ? "pending_review" : "verified"
        );
      }

      for (const agreement of agreements) {
        const houseNumber = normalizeHouseNumber(agreement.houseNumber);
        if (agreementByHouse.has(houseNumber)) {
          continue;
        }

        agreementByHouse.set(houseNumber, {
          identityType: agreement.identityType ?? undefined,
          identityNumber: agreement.identityNumber ?? undefined,
          occupationStatus: agreement.occupationStatus ?? undefined,
          occupationLabel: agreement.occupationLabel ?? undefined,
          organizationName: agreement.organizationName ?? undefined,
          organizationLocation: agreement.organizationLocation ?? undefined,
          emergencyContactName: agreement.emergencyContactName ?? undefined,
          emergencyContactPhone: agreement.emergencyContactPhone ?? undefined,
          monthlyRentKsh: agreement.monthlyRentKsh ?? undefined,
          paymentDueDay: agreement.paymentDueDay ?? undefined,
          leaseStartDate: agreement.leaseStartDate?.toISOString().slice(0, 10),
          agreementUpdatedAt: agreement.updatedAt.toISOString()
        });
      }
    }

    const memberRegistryByHouse = await listHouseholdMembersForBuilding(buildingId);
    const utilityDefaultsByHouse = listUtilityChargeDefaultsForBuilding(buildingId);
    const paymentAccess = paymentAccessService.getForBuilding(buildingId);
    const chargeableExpenditureByHouse = new Map<string, number>();
    for (const item of buildingExpenditures.values()) {
      if (
        item.buildingId !== normalizeBuildingId(buildingId) ||
        !isResidentChargeableExpenditure(item)
      ) {
        continue;
      }

      const houseNumber = normalizeHouseNumber(item.houseNumber ?? "");
      const nextTotal =
        (chargeableExpenditureByHouse.get(houseNumber) ?? 0) +
        Math.max(0, Number(item.amountKsh ?? 0));
      chargeableExpenditureByHouse.set(houseNumber, nextTotal);
    }
    const utilityBalanceByHouse = new Map<
      string,
      {
        currentDueKsh: number;
        arrearsKsh: number;
        totalOpenKsh: number;
        nextDueDate?: string;
      }
    >();
    utilityBillingService.listVisibleRoomBalances(buildingId).forEach((item) => {
      utilityBalanceByHouse.set(normalizeHouseNumber(item.houseNumber), {
        currentDueKsh: Math.max(0, Number(item.currentDueKsh ?? 0)),
        arrearsKsh: Math.max(0, Number(item.arrearsKsh ?? 0)),
        totalOpenKsh: Math.max(0, Number(item.totalOpenKsh ?? 0)),
        nextDueDate: item.nextDueDate
      });
    });

    const rentStatusByHouse = new Map<string, ReturnType<
      RentLedgerService["listCollectionStatus"]
    >[number]>();
    if (paymentAccess.rentEnabled) {
      rentLedgerService.listCollectionStatus(2_000, buildingId).forEach((item) => {
        const houseNumber = normalizeHouseNumber(item.houseNumber);
        const current = rentStatusByHouse.get(houseNumber);
        if (!current || item.buildingId === buildingId) {
          rentStatusByHouse.set(houseNumber, item);
        }
      });
    }
    const normalizedHouses = [...houseSet].sort(compareHouseNumbers);

    return normalizedHouses.map((houseNumber) => {
      const meter = meterMap.get(houseNumber);
      const resident = residentByHouse.get(houseNumber);
      const agreement = agreementByHouse.get(houseNumber);
      const verificationStatus = resident
        ? verificationByHouse.get(houseNumber) ?? "verified"
        : undefined;
      const billingVisible = verificationStatus !== "pending_review";
      const registryRecord = memberRegistryByHouse.get(houseNumber);
      const utilityDefaults = utilityDefaultsByHouse.get(houseNumber);
      const rent = rentStatusByHouse.get(houseNumber);
      const fallbackMonthlyRentKsh = Math.max(0, Number(agreement?.monthlyRentKsh ?? 0));
      const fallbackRentBalanceKsh = fallbackMonthlyRentKsh > 0 ? fallbackMonthlyRentKsh : 0;
      const fallbackRentDueDate =
        fallbackMonthlyRentKsh > 0
          ? buildAgreementFallbackRentDueDate(
              agreement?.paymentDueDay,
              agreement?.leaseStartDate
            )
          : undefined;
      const monthlyRentKsh = paymentAccess.rentEnabled
        ? Math.max(0, Number(rent?.monthlyRentKsh ?? fallbackMonthlyRentKsh))
        : 0;
      const rentBalanceKsh = paymentAccess.rentEnabled
        ? Math.max(0, Number(rent?.balanceKsh ?? fallbackRentBalanceKsh))
        : 0;
      const currentRentDueKsh = paymentAccess.rentEnabled
        ? Math.max(
            0,
            Number(
              rent?.currentMonthOutstandingKsh ??
                (monthlyRentKsh > 0
                  ? Math.min(rentBalanceKsh, monthlyRentKsh)
                  : rentBalanceKsh)
            )
          )
        : 0;
      const currentMonthRentPaidKsh = paymentAccess.rentEnabled
        ? Math.max(
            0,
            Number(
              rent?.currentMonthPaidKsh ??
                (monthlyRentKsh > 0
                  ? Math.max(0, monthlyRentKsh - currentRentDueKsh)
                  : 0)
            )
          )
        : 0;
      const rentArrearsKsh = Math.max(0, rentBalanceKsh - currentRentDueKsh);
      const utilitySummary = utilityBalanceByHouse.get(houseNumber);
      const utilityBalanceKsh = utilitySummary?.totalOpenKsh ?? 0;
      const currentUtilityDueKsh = utilitySummary?.currentDueKsh ?? 0;
      const utilityArrearsKsh = utilitySummary?.arrearsKsh ?? 0;
      const expenseBalanceKsh = chargeableExpenditureByHouse.get(houseNumber) ?? 0;
      const visibleRentPaymentStatus =
        paymentAccess.rentEnabled && billingVisible
          ? rent?.paymentStatus ?? (monthlyRentKsh > 0 ? "NOT_PAID" : undefined)
          : undefined;
      const visibleRentBalanceKsh = billingVisible ? rentBalanceKsh : 0;
      const visibleCurrentRentDueKsh = billingVisible ? currentRentDueKsh : 0;
      const visibleRentArrearsKsh = billingVisible ? rentArrearsKsh : 0;
      const visibleCurrentMonthRentPaidKsh = billingVisible ? currentMonthRentPaidKsh : 0;
      const visibleRentDueDate =
        paymentAccess.rentEnabled && billingVisible
          ? rent?.dueDate ?? fallbackRentDueDate
          : undefined;
      const visibleCurrentUtilityDueKsh = billingVisible ? currentUtilityDueKsh : 0;
      const visibleUtilityArrearsKsh = billingVisible ? utilityArrearsKsh : 0;
      const visibleExpenseBalanceKsh = billingVisible ? expenseBalanceKsh : 0;
      const visibleNextUtilityDueDate = billingVisible ? utilitySummary?.nextDueDate : undefined;
      const visibleLatestRentPaymentReference =
        paymentAccess.rentEnabled && billingVisible
          ? rent?.latestPaymentReference
          : undefined;
      const visibleLatestRentPaymentAt =
        paymentAccess.rentEnabled && billingVisible ? rent?.latestPaymentAt : undefined;
      const visibleTotalRentPaidKsh =
        paymentAccess.rentEnabled && billingVisible
          ? Math.max(0, Number(rent?.totalPaidKsh ?? 0))
          : 0;
      const visibleUtilityBalanceKsh = billingVisible ? utilityBalanceKsh : 0;
      const defaultMembers = resident ? 1 : 0;

      return {
        houseNumber,
        residentName: resident?.residentName,
        residentPhone: resident?.residentPhone,
        residentUserId: resident?.residentUserId,
        verificationStatus,
        identityType: agreement?.identityType,
        identityNumber: agreement?.identityNumber,
        occupationStatus: agreement?.occupationStatus,
        occupationLabel: agreement?.occupationLabel,
        organizationName: agreement?.organizationName,
        organizationLocation: agreement?.organizationLocation,
        emergencyContactName: agreement?.emergencyContactName,
        emergencyContactPhone: agreement?.emergencyContactPhone,
        agreementUpdatedAt: agreement?.agreementUpdatedAt,
        hasActiveResident: Boolean(resident),
        rentEnabled: paymentAccess.rentEnabled,
        monthlyRentKsh,
        rentPaymentStatus: visibleRentPaymentStatus,
        rentBalanceKsh: visibleRentBalanceKsh,
        currentRentDueKsh: visibleCurrentRentDueKsh,
        rentArrearsKsh: visibleRentArrearsKsh,
        rentDueDate: visibleRentDueDate,
        currentMonthRentPaidKsh: visibleCurrentMonthRentPaidKsh,
        currentMonthRentOutstandingKsh: visibleCurrentRentDueKsh,
        totalRentPaidKsh: visibleTotalRentPaidKsh,
        currentUtilityDueKsh: visibleCurrentUtilityDueKsh,
        utilityArrearsKsh: visibleUtilityArrearsKsh,
        expenseBalanceKsh: visibleExpenseBalanceKsh,
        expenseArrearsKsh: visibleExpenseBalanceKsh,
        nextUtilityDueDate: visibleNextUtilityDueDate,
        latestRentPaymentReference: visibleLatestRentPaymentReference,
        latestRentPaymentAt: visibleLatestRentPaymentAt,
        roomBalanceKsh:
          visibleRentBalanceKsh + visibleUtilityBalanceKsh + visibleExpenseBalanceKsh,
        utilityBalanceKsh: visibleUtilityBalanceKsh,
        householdMembers: registryRecord?.members ?? defaultMembers,
        waterFixedChargeKsh: utilityDefaults?.waterFixedChargeKsh ?? 0,
        electricityFixedChargeKsh: utilityDefaults?.electricityFixedChargeKsh ?? 0,
        combinedUtilityChargeKsh: utilityDefaults?.combinedUtilityChargeKsh ?? 0,
        waterMeterNumber: meter?.waterMeterNumber,
        electricityMeterNumber: meter?.electricityMeterNumber,
        waterMeterUpdatedAt: meter?.waterMeterUpdatedAt,
        electricityMeterUpdatedAt: meter?.electricityMeterUpdatedAt
      };
    });
  };

  const listLandlordBuildingSummaries = async (context: {
    role: string;
    userSession: Awaited<ReturnType<typeof resolveOptionalUserSession>>;
  }) => {
    const visibleBuildings = await listVisibleBuildingsForLandlordContext(context);
    const residentCountByBuilding = new Map<string, number>();
    const buildingConfigById = new Map<
      string,
      {
        wifiEnabled?: boolean;
        wifiAccessMode?: string;
      }
    >();

    if (repositoryContext.prisma && visibleBuildings.length > 0) {
      const buildingIds = visibleBuildings.map((item) => item.id);
      const activeTenancies = await repositoryContext.prisma.tenancy.findMany({
        where: {
          active: true,
          buildingId: {
            in: buildingIds
          }
        },
        select: {
          buildingId: true,
          userId: true
        }
      });

      const userSetByBuilding = new Map<string, Set<string>>();
      for (const tenancy of activeTenancies) {
        const set = userSetByBuilding.get(tenancy.buildingId) ?? new Set<string>();
        set.add(tenancy.userId);
        userSetByBuilding.set(tenancy.buildingId, set);
      }

      userSetByBuilding.forEach((set, buildingId) => {
        residentCountByBuilding.set(buildingId, set.size);
      });

      if (buildingConfigurationService) {
        await buildingConfigurationService.ensureDefaultsForBuildings(visibleBuildings);
        const configs = await buildingConfigurationService.listForBuildings(buildingIds);
        configs.forEach((config) => {
          buildingConfigById.set(config.buildingId, config);
        });
      }
    }

    return visibleBuildings
      .map((item) => ({
        wifiEnabled: buildingConfigById.get(item.id)?.wifiEnabled ?? false,
        wifiAccessMode: buildingConfigById.get(item.id)?.wifiAccessMode ?? "disabled",
        id: item.id,
        name: item.name,
        address: item.address,
        county: item.county,
        cctvStatus: item.cctvStatus,
        units: item.units,
        houseNumbers: item.houseNumbers ?? [],
        media: item.media,
        residentUsers: residentCountByBuilding.get(item.id) ?? 0,
        updatedAt: item.updatedAt
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  };

  const listLandlordResidentDirectoryRows = async (
    buildings: Array<{ id: string; name: string; houseNumbers?: string[] }>
  ) => {
    if (buildings.length === 0) {
      return [];
    }

    const rowsByBuilding = await Promise.all(
      buildings.map(async (building) => ({
        building,
        rows: await buildLandlordUtilityRegistryRows(
          building.id,
          building.houseNumbers ?? []
        )
      }))
    );

    return rowsByBuilding.flatMap(({ building, rows }) =>
      rows.map((row) => ({
        ...row,
        buildingId: building.id,
        buildingName: building.name
      }))
    );
  };

  const hasUsableRoomMeterNumber = (value: string | undefined) => {
    const normalized = String(value ?? "").trim();
    if (!normalized) {
      return false;
    }

    return normalized !== "NO-METER" && normalized !== "METER-UNSET";
  };

  const billingMonthFromDate = (value: Date) =>
    `${value.getUTCFullYear()}-${String(value.getUTCMonth() + 1).padStart(2, "0")}`;

  const shiftBillingMonth = (billingMonth: string, delta: number) => {
    const [yearRaw, monthRaw] = billingMonth.split("-");
    const year = Number(yearRaw);
    const month = Number(monthRaw);
    if (!Number.isFinite(year) || !Number.isFinite(month)) {
      return "";
    }

    const cursor = new Date(Date.UTC(year, month - 1 + delta, 1));
    return billingMonthFromDate(cursor);
  };

  const latestVisibleRecurringBillingMonth = (now: Date = new Date()) => {
    const cursor = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
    return billingMonthFromDate(cursor);
  };

  const listMissingRecurringBillingMonths = (
    billingMonths: string[],
    visibleThroughMonth: string
  ) => {
    const normalizedMonths = [...new Set(
      billingMonths
        .map((item) => String(item ?? "").trim())
        .filter(Boolean)
    )].sort();
    if (normalizedMonths.length === 0) {
      return [];
    }

    const latestMonth = normalizedMonths[normalizedMonths.length - 1];
    if (!latestMonth || latestMonth >= visibleThroughMonth) {
      return [];
    }

    const monthSet = new Set(normalizedMonths);
    const results: string[] = [];
    let cursor = shiftBillingMonth(latestMonth, 1);
    while (cursor && cursor <= visibleThroughMonth) {
      if (!monthSet.has(cursor)) {
        results.push(cursor);
      }
      cursor = shiftBillingMonth(cursor, 1);
    }

    return results;
  };

  const sanitizeAuditMetadata = (value: unknown) => {
    if (value === undefined) {
      return undefined;
    }

    return JSON.parse(JSON.stringify(value));
  };

  const mapRoomAccountAuditEvent = (event: {
    id: string;
    buildingId: string;
    houseNumber: string;
    tenancyId: string | null;
    actorUserId: string | null;
    actorRole: string | null;
    actorName: string | null;
    action: string;
    summary: string;
    metadata: unknown;
    createdAt: Date;
  }) => ({
    id: event.id,
    buildingId: event.buildingId,
    houseNumber: event.houseNumber,
    tenancyId: event.tenancyId ?? undefined,
    action: event.action,
    summary: event.summary,
    actor: {
      userId: event.actorUserId ?? undefined,
      role: event.actorRole ?? undefined,
      name: event.actorName ?? undefined
    },
    metadata: event.metadata ?? undefined,
    createdAt: event.createdAt.toISOString()
  });

  const actorFromUserSession = (session: {
    userId?: string;
    role?: string;
    fullName?: string;
  }) => ({
    userId: String(session.userId ?? "").trim() || undefined,
    role: String(session.role ?? "").trim() || undefined,
    name: String(session.fullName ?? "").trim() || undefined
  });

  const actorFromLandlordContext = (context: {
    userId?: string;
    role?: string;
    userSession?: { userId: string; role: UserRole; fullName: string } | null;
  }) => ({
    userId:
      String(context.userSession?.userId ?? context.userId ?? "").trim() || undefined,
    role: String(context.role ?? context.userSession?.role ?? "").trim() || undefined,
    name: String(context.userSession?.fullName ?? "").trim() || undefined
  });

  const buildLandlordRoomUrl = (buildingId?: string, houseNumber?: string) => {
    const normalizedBuildingId = String(buildingId ?? "").trim();
    const normalizedHouseNumber = String(houseNumber ?? "").trim();
    if (!normalizedBuildingId) {
      return "/landlord";
    }
    if (!normalizedHouseNumber) {
      return `/landlord/rooms/${encodeURIComponent(normalizedBuildingId)}`;
    }
    return `/landlord/rooms/${encodeURIComponent(normalizedBuildingId)}/${encodeURIComponent(
      normalizedHouseNumber
    )}`;
  };

  const enqueueOwnerNotificationForManagerAction = async (
    context: {
      role: string;
      userId?: string;
      userSession: Awaited<ReturnType<typeof resolveOptionalUserSession>>;
    },
    input: {
      title: string;
      message: string;
      level?: "info" | "warning" | "success";
      action: string;
      buildingId?: string;
      buildingName?: string;
      houseNumber?: string;
      url?: string;
      dedupeKey?: string;
      metadata?: Record<string, unknown>;
    }
  ) => {
    if (context.role !== "caretaker" || !userAccountService) {
      return null;
    }

    const ownerStaff = await userAccountService.listOwnerStaffUsers();
    const recipientUserIds = ownerStaff.users
      .map((item) => item.id)
      .filter((id) => id !== context.userSession?.userId);
    if (recipientUserIds.length === 0) {
      return null;
    }

    const actor = actorFromLandlordContext(context);
    const notification = ownerNotificationService.enqueue({
      ...input,
      actorUserId: actor.userId,
      actorName: actor.name,
      actorRole: actor.role,
      recipientUserIds,
      url: input.url ?? buildLandlordRoomUrl(input.buildingId, input.houseNumber)
    });

    if (notification) {
      void pushNotificationService.notifyUserIds(recipientUserIds, {
        title: notification.title,
        body: notification.message,
        level: notification.level,
        tag: notification.dedupeKey ?? `owner-alert-${notification.id}`,
        url: notification.url ?? "/landlord"
      });
    }

    return notification;
  };

  const findActiveTenancyIdForRoomAudit = async (
    buildingId: string,
    houseNumber: string
  ) => {
    if (!repositoryContext.prisma) {
      return undefined;
    }

    const tenancy = await repositoryContext.prisma.tenancy.findFirst({
      where: {
        buildingId,
        active: true,
        unit: {
          houseNumber: normalizeHouseNumber(houseNumber)
        }
      },
      select: { id: true },
      orderBy: { createdAt: "desc" }
    });

    return tenancy?.id;
  };

  const recordRoomAccountAuditEvent = async (input: {
    buildingId: string;
    houseNumber: string;
    action: string;
    summary: string;
    tenancyId?: string;
    actor?: {
      userId?: string;
      role?: string;
      name?: string;
    };
    metadata?: unknown;
  }) => {
    if (!repositoryContext.prisma) {
      return null;
    }

    const buildingId = String(input.buildingId ?? "").trim();
    const houseNumber = normalizeHouseNumber(input.houseNumber);
    if (!buildingId || !houseNumber) {
      return null;
    }

    try {
      const tenancyId =
        String(input.tenancyId ?? "").trim() ||
        (await findActiveTenancyIdForRoomAudit(buildingId, houseNumber));
      const event = await repositoryContext.prisma.roomAccountAuditEvent.create({
        data: {
          buildingId,
          houseNumber,
          tenancyId: tenancyId || undefined,
          actorUserId: String(input.actor?.userId ?? "").trim() || undefined,
          actorRole: String(input.actor?.role ?? "").trim() || undefined,
          actorName: String(input.actor?.name ?? "").trim() || undefined,
          action: input.action,
          summary: input.summary,
          metadata: sanitizeAuditMetadata(input.metadata)
        }
      });
      return mapRoomAccountAuditEvent(event);
    } catch (error) {
      console.warn("Failed to record room account audit event:", error);
      return null;
    }
  };

  const listRoomAccountAuditEvents = async (
    buildingId: string,
    houseNumber: string,
    limit = 80
  ) => {
    if (!repositoryContext.prisma) {
      return [];
    }

    try {
      const rows = await repositoryContext.prisma.roomAccountAuditEvent.findMany({
        where: {
          buildingId,
          houseNumber: normalizeHouseNumber(houseNumber)
        },
        orderBy: { createdAt: "desc" },
        take: Math.min(Math.max(Math.trunc(limit), 1), 200)
      });

      return rows.map(mapRoomAccountAuditEvent);
    } catch (error) {
      console.warn("Failed to list room account audit events:", error);
      return [];
    }
  };

  const listRoomBillingHolds = async (
    buildingId: string,
    houseNumber: string,
    limit = 80
  ) => {
    if (!repositoryContext.prisma) {
      return [];
    }

    try {
      const rows = await repositoryContext.prisma.roomBillingHold.findMany({
        where: {
          buildingId,
          houseNumber: normalizeHouseNumber(houseNumber)
        },
        orderBy: [{ canceledAt: "asc" }, { createdAt: "desc" }],
        take: Math.min(Math.max(Math.trunc(limit), 1), 200)
      });

      return rows.map(mapRoomBillingHold);
    } catch (error) {
      console.warn("Failed to list room billing holds:", error);
      return [];
    }
  };

  const buildLandlordRoomLedgerPayload = async (
    building: Awaited<ReturnType<typeof store.getBuilding>>,
    houseNumber: string
  ) => {
    if (!building) {
      throw new Error("Building not found");
    }

    const normalizedHouseNumber = normalizeHouseNumber(houseNumber);
    const [roomRows, visibleHouseNumbers, buildingConfiguration, auditEvents, billingHolds] = await Promise.all([
      buildLandlordUtilityRegistryRows(building.id, [normalizedHouseNumber]),
      listVisibleHouseNumbersForBuildings([building]),
      buildingConfigurationService
        ? buildingConfigurationService.getForBuilding(building.id)
        : Promise.resolve(null),
      listRoomAccountAuditEvents(building.id, normalizedHouseNumber),
      listRoomBillingHolds(building.id, normalizedHouseNumber)
    ]);

    const room =
      roomRows.find((item) => normalizeHouseNumber(item.houseNumber) === normalizedHouseNumber) ??
      null;

    if (!room) {
      throw new Error("Room not found");
    }

    const utilityBills = utilityBillingService
      .listBills({
        buildingId: building.id,
        houseNumber: normalizedHouseNumber,
        limit: 600
      })
      .sort((a, b) =>
        (b.dueDate || b.updatedAt || b.createdAt).localeCompare(
          a.dueDate || a.updatedAt || a.createdAt
        )
      );
    const utilityPayments = utilityBillingService
      .listPayments({
        buildingId: building.id,
        houseNumber: normalizedHouseNumber,
        limit: 600
      })
      .sort((a, b) => (b.paidAt || b.createdAt).localeCompare(a.paidAt || a.createdAt));
    const rentPayments = rentLedgerService
      .listPayments({
        buildingId: building.id,
        houseNumber: normalizedHouseNumber
      })
      .sort((a, b) => (b.paidAt || b.createdAt).localeCompare(a.paidAt || a.createdAt))
      .slice(0, 600);
    const expenditures = [...buildingExpenditures.values()]
      .filter(
        (item) =>
          item.buildingId === normalizeBuildingId(building.id) &&
          normalizeHouseNumber(item.houseNumber ?? "") === normalizedHouseNumber
      )
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const tickets = userSupportService
      .listAllReports({ limit: 300 })
      .filter(
        (item) =>
          item.buildingId === building.id &&
          normalizeHouseNumber(item.houseNumber) === normalizedHouseNumber
      )
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    const visibleThroughBillingMonth = latestVisibleRecurringBillingMonth();
    const monthlyCombinedCharge = getMonthlyCombinedUtilityCharge(
      building.id,
      visibleThroughBillingMonth
    );
    const positiveUtilityBills = utilityBills.filter(
      (item) => Math.max(0, Number(item.amountKsh ?? 0)) > 0
    );
    const postedBillingMonths = [...new Set(
      positiveUtilityBills.map((item) => item.billingMonth).filter(Boolean)
    )].sort();
    const latestPostedBillingMonth =
      postedBillingMonths.length > 0
        ? postedBillingMonths[postedBillingMonths.length - 1]
        : null;
    const latestPostedMonthlyChargeKsh = latestPostedBillingMonth
      ? positiveUtilityBills
          .filter((item) => item.billingMonth === latestPostedBillingMonth)
          .reduce((sum, item) => sum + Math.max(0, Number(item.amountKsh ?? 0)), 0)
      : 0;
    const rawMissingBillingMonths = listMissingRecurringBillingMonths(
      postedBillingMonths,
      visibleThroughBillingMonth
    );
    const heldRecurringBillingMonths = rawMissingBillingMonths.filter((billingMonth) =>
      (["water", "electricity"] as const).every((utilityType) =>
        isRoomBillingHeld({
          buildingId: building.id,
          houseNumber: normalizedHouseNumber,
          kind: "utility",
          utilityType,
          billingMonth
        })
      )
    );
    const possibleMissingBillingMonths = rawMissingBillingMonths.filter(
      (billingMonth) => !heldRecurringBillingMonths.includes(billingMonth)
    );
    const hasBothMeters =
      hasUsableRoomMeterNumber(room.waterMeterNumber) &&
      hasUsableRoomMeterNumber(room.electricityMeterNumber);
    const resolvedWaterFixedChargeKsh =
      Math.max(0, Number(room.waterFixedChargeKsh ?? 0)) ||
      Math.max(0, Number(buildingConfiguration?.defaultWaterFixedChargeKsh ?? 0));
    const resolvedElectricityFixedChargeKsh =
      Math.max(0, Number(room.electricityFixedChargeKsh ?? 0)) ||
      Math.max(0, Number(buildingConfiguration?.defaultElectricityFixedChargeKsh ?? 0));
    const roomCombinedChargeKsh = Math.max(0, Number(room.combinedUtilityChargeKsh ?? 0));
    const buildingDefaultCombinedChargeKsh = Math.max(
      0,
      Number(buildingConfiguration?.defaultCombinedUtilityChargeKsh ?? 0)
    );
    const monthlyCombinedChargeKsh = Math.max(0, Number(monthlyCombinedCharge?.amountKsh ?? 0));
    let estimatedRecurringMonthlyChargeKsh = Math.max(0, latestPostedMonthlyChargeKsh);
    let resolvedChargeSource:
      | "disabled"
      | "metered"
      | "room_custom_combined"
      | "monthly_override_combined"
      | "building_default_combined"
      | "fixed_charge"
      | "unconfigured" = "unconfigured";

    const utilityBillingMode =
      (buildingConfiguration?.utilityBillingMode as string | undefined) ?? "metered";
    if (utilityBillingMode === "disabled") {
      resolvedChargeSource = "disabled";
      estimatedRecurringMonthlyChargeKsh = 0;
    } else if (roomCombinedChargeKsh > 0) {
      resolvedChargeSource = "room_custom_combined";
      if (estimatedRecurringMonthlyChargeKsh <= 0) {
        estimatedRecurringMonthlyChargeKsh = roomCombinedChargeKsh;
      }
    } else if (monthlyCombinedChargeKsh > 0) {
      resolvedChargeSource = "monthly_override_combined";
      if (estimatedRecurringMonthlyChargeKsh <= 0) {
        estimatedRecurringMonthlyChargeKsh = monthlyCombinedChargeKsh;
      }
    } else if (buildingDefaultCombinedChargeKsh > 0) {
      resolvedChargeSource = "building_default_combined";
      if (estimatedRecurringMonthlyChargeKsh <= 0) {
        estimatedRecurringMonthlyChargeKsh = buildingDefaultCombinedChargeKsh;
      }
    } else if (
      resolvedWaterFixedChargeKsh > 0 ||
      resolvedElectricityFixedChargeKsh > 0
    ) {
      resolvedChargeSource = "fixed_charge";
      if (estimatedRecurringMonthlyChargeKsh <= 0) {
        estimatedRecurringMonthlyChargeKsh =
          resolvedWaterFixedChargeKsh + resolvedElectricityFixedChargeKsh;
      }
    } else if (hasBothMeters) {
      resolvedChargeSource = "metered";
    }

    const estimatedRecurringBackfillKsh =
      possibleMissingBillingMonths.length * Math.max(0, estimatedRecurringMonthlyChargeKsh);
    const overappliedBills = utilityBills
      .map((bill) => {
        const paidKsh = (bill.payments ?? []).reduce(
          (sum, payment) => sum + Math.max(0, Number(payment.amountKsh ?? 0)),
          0
        );
        return {
          utilityType: bill.utilityType,
          billingMonth: bill.billingMonth,
          amountKsh: Math.max(0, Number(bill.amountKsh ?? 0)),
          balanceKsh: Math.max(0, Number(bill.balanceKsh ?? 0)),
          paidKsh,
          paymentCount: bill.payments?.length ?? 0
        };
      })
      .filter((item) => item.paidKsh > item.amountKsh && item.amountKsh >= 0);

    return {
      building: {
        id: building.id,
        name: building.name,
        address: building.address,
        county: building.county,
        houseRegistered: (building.houseNumbers ?? [])
          .map((item) => normalizeHouseNumber(item))
          .includes(normalizedHouseNumber),
        visibleToLandlord: visibleHouseNumbers.has(normalizedHouseNumber)
      },
      room: {
        ...room,
        buildingId: building.id,
        buildingName: building.name
      },
      utilityBillingMode,
      chargeSetup: {
        source: resolvedChargeSource,
        hasBothMeters,
        roomCombinedChargeKsh,
        monthlyCombinedChargeKsh,
        buildingDefaultCombinedChargeKsh,
        resolvedWaterFixedChargeKsh,
        resolvedElectricityFixedChargeKsh
      },
      summary: {
        displayedOutstandingKsh: Math.max(0, Number(room.roomBalanceKsh ?? 0)),
        rentOutstandingKsh: Math.max(0, Number(room.rentBalanceKsh ?? 0)),
        utilityOutstandingKsh: Math.max(0, Number(room.utilityBalanceKsh ?? 0)),
        expenseChargesKsh: Math.max(0, Number(room.expenseBalanceKsh ?? 0)),
        currentUtilityDueKsh: Math.max(0, Number(room.currentUtilityDueKsh ?? 0)),
        utilityArrearsKsh: Math.max(0, Number(room.utilityArrearsKsh ?? 0)),
        currentMonthRentPaidKsh: Math.max(0, Number(room.currentMonthRentPaidKsh ?? 0)),
        currentMonthRentOutstandingKsh: Math.max(
          0,
          Number(room.currentMonthRentOutstandingKsh ?? 0)
        ),
        totalRentPaidKsh: Math.max(0, Number(room.totalRentPaidKsh ?? 0)),
        projectedOutstandingKsh:
          Math.max(0, Number(room.roomBalanceKsh ?? 0)) + estimatedRecurringBackfillKsh
      },
      anomalies: {
        visibleThroughBillingMonth,
        postedBillingMonths,
        latestPostedBillingMonth,
        latestPostedMonthlyChargeKsh,
        possibleMissingBillingMonths,
        heldRecurringBillingMonths,
        estimatedRecurringMonthlyChargeKsh,
        estimatedRecurringBackfillKsh,
        overstatedOrphanedRoom: !(
          (building.houseNumbers ?? [])
            .map((item) => normalizeHouseNumber(item))
            .includes(normalizedHouseNumber)
        ),
        overappliedBills
      },
      utilityBills,
      rentPayments,
      utilityPayments,
      expenditures,
      tickets,
      auditEvents,
      billingHolds,
      monthlyCombinedCharge,
      buildingConfiguration
    };
  };

  const listLandlordRentCollectionStatusRows = async (
    visibleBuildingIds: Set<string>,
    limit: number
  ) => {
    await refreshRoomBillingHoldCache();
    const ledgerRows: Array<{
      buildingId: string;
      houseNumber: string;
      paymentStatus: string;
      monthlyRentKsh: number;
      balanceKsh: number;
      paidAmountKsh: number;
      currentMonthPaidKsh: number;
      currentMonthOutstandingKsh: number;
      arrearsKsh: number;
      totalPaidKsh: number;
      dueDate: string;
      latestPaymentReference?: string;
      latestPaymentAt?: string;
      latestPaymentAmountKsh?: number;
    }> = rentLedgerService
      .listCollectionStatus(limit)
      .filter((item) => visibleBuildingIds.has(item.buildingId))
      .filter((item) => paymentAccessService.isEnabled(item.buildingId, "rent"))
      .map((item) => ({
        buildingId: item.buildingId,
        houseNumber: item.houseNumber,
        paymentStatus: item.paymentStatus.toUpperCase(),
        monthlyRentKsh: item.monthlyRentKsh,
        balanceKsh: item.balanceKsh,
        paidAmountKsh: item.paidAmountKsh,
        currentMonthPaidKsh: item.currentMonthPaidKsh,
        currentMonthOutstandingKsh: item.currentMonthOutstandingKsh,
        arrearsKsh: item.arrearsKsh,
        totalPaidKsh: item.totalPaidKsh,
        dueDate: item.dueDate,
        latestPaymentReference: item.latestPaymentReference,
        latestPaymentAt: item.latestPaymentAt,
        latestPaymentAmountKsh: item.latestPaymentAmountKsh
      }));
    const collectionRowsByKey = new Map(
      ledgerRows.map((item) => [
        `${normalizeBuildingId(item.buildingId)}:${normalizeHouseNumber(item.houseNumber)}`,
        item
      ])
    );

    if (repositoryContext.prisma && visibleBuildingIds.size > 0) {
      const agreementRows = await repositoryContext.prisma.tenantAgreement.findMany({
        where: {
          buildingId: {
            in: [...visibleBuildingIds]
          },
          monthlyRentKsh: {
            gt: 0
          },
          tenancy: {
            active: true,
            unit: {
              isActive: true
            }
          }
        },
        select: {
          buildingId: true,
          houseNumber: true,
          monthlyRentKsh: true,
          paymentDueDay: true,
          leaseStartDate: true,
          updatedAt: true
        },
        orderBy: { updatedAt: "desc" }
      });

      for (const agreement of agreementRows) {
        const key = `${normalizeBuildingId(agreement.buildingId)}:${normalizeHouseNumber(
          agreement.houseNumber
        )}`;
        if (collectionRowsByKey.has(key)) {
          continue;
        }

        const monthlyRentKsh = Math.max(0, Number(agreement.monthlyRentKsh ?? 0));
        if (monthlyRentKsh <= 0) {
          continue;
        }

        collectionRowsByKey.set(key, {
          buildingId: agreement.buildingId,
          houseNumber: normalizeHouseNumber(agreement.houseNumber),
          paymentStatus: "NOT_PAID",
          monthlyRentKsh,
          balanceKsh: monthlyRentKsh,
          paidAmountKsh: 0,
          currentMonthPaidKsh: 0,
          currentMonthOutstandingKsh: monthlyRentKsh,
          arrearsKsh: 0,
          totalPaidKsh: 0,
          dueDate: buildAgreementFallbackRentDueDate(
            agreement.paymentDueDay ?? undefined,
            agreement.leaseStartDate
          ),
          latestPaymentReference: undefined,
          latestPaymentAt: undefined,
          latestPaymentAmountKsh: undefined
        });
      }
    }

    return [...collectionRowsByKey.values()].slice(0, limit);
  };

  const STARTUP_RECURRING_UTILITY_BACKFILL_INTERVAL_MS = 10 * 60 * 1000;
  let startupRecurringUtilityBackfillPromise: Promise<unknown> | null = null;
  let startupRecurringUtilityBackfillLastStartedAt = 0;

  function scheduleStartupRecurringUtilityBackfill(reason: string) {
    const now = Date.now();
    if (
      startupRecurringUtilityBackfillPromise ||
      now - startupRecurringUtilityBackfillLastStartedAt <
        STARTUP_RECURRING_UTILITY_BACKFILL_INTERVAL_MS
    ) {
      return;
    }

    startupRecurringUtilityBackfillLastStartedAt = now;
    startupRecurringUtilityBackfillPromise = ensureRecurringUtilityBillsCurrent(reason)
      .catch((error) => {
        console.error("Startup recurring utility backfill failed.", error);
      })
      .finally(() => {
        startupRecurringUtilityBackfillPromise = null;
      });
  }

  const buildLandlordStartupPayload = async (context: {
    role: string;
    userId?: string;
    userSession: Awaited<ReturnType<typeof resolveOptionalUserSession>>;
  }) => {
    scheduleStartupRecurringUtilityBackfill("landlord.startup");
    const buildings = await listLandlordBuildingSummaries(context);
    const visibleBuildingIds = new Set(buildings.map((item) => item.id));
    const applicationStatus: TenantApplicationStatus = "pending";
    const registryBuildingId = buildings[0]?.id ?? "";
    const roomBuildingId = buildings[0]?.id ?? "";

    const applicationsPromise = (async () => {
      if (!userAccountService) {
        throw new Error(
          "User account service unavailable. Database connection is required."
        );
      }
      const session = context.userSession ?? {
        role: context.role as UserRole,
        userId: context.userId ?? null
      };
      return userAccountService.listLandlordApplications(
        {
          ...session,
          role: context.role as UserRole | "caretaker",
          visibleBuildingIds
        },
        applicationStatus
      );
    })();

    const residentDirectoryPromise = listLandlordResidentDirectoryRows(buildings);
    const visibleHouseNumbersPromise = listVisibleHouseNumbersForBuildings(buildings);
    const ticketsPromise = Promise.resolve(
      userSupportService
        .listAllReports({
          limit: 300
        })
        .filter((item) => !visibleBuildingIds.size || visibleBuildingIds.has(item.buildingId))
    );

    const [applications, rentStatus, residentDirectory, visibleHouseNumbers, tickets] =
      await Promise.all([
        applicationsPromise,
        listLandlordRentCollectionStatusRows(visibleBuildingIds, 1_200),
        residentDirectoryPromise,
        visibleHouseNumbersPromise,
        ticketsPromise
      ]);

    const paymentAccess = buildings.map((building) => ({
      ...paymentAccessService.getForBuilding(building.id),
      buildingName: building.name
    }));
    const paymentProfiles = paymentProfileService.listProfiles(
      "/api/payments/mpesa/rent-callback"
    );
    const buildingPaymentProfiles = paymentProfileService
      .listAssignments(
        buildings.map((building) => building.id),
        "/api/payments/mpesa/rent-callback"
      )
      .map((item) => ({
        ...item,
        buildingName:
          buildings.find((building) => building.id === item.buildingId)?.name ??
          item.buildingId
      }));
    const buildingPaymentInstructions = buildings.map((building) =>
      buildBuildingPaymentInstructionPayload({
        buildingId: building.id,
        buildingName: building.name
      })
    );
    const paymentAccessByBuildingId = new Map(
      paymentAccess.map((item) => [item.buildingId, item])
    );
    const rentEnabledBuildings = buildings.filter(
      (building) => paymentAccessByBuildingId.get(building.id)?.rentEnabled !== false
    );
    const rentPaymentBuildingId = rentEnabledBuildings.some(
      (building) => building.id === registryBuildingId
    )
      ? registryBuildingId
      : rentEnabledBuildings[0]?.id ?? "";
    const wifiPackageBuildingId = buildings.find((building) => building.wifiEnabled)?.id ?? "";

    const wifiPackagesPromise = (async () => {
      if (!wifiPackageBuildingId) {
        return {
          wifiPackages: [] as unknown[],
          wifiPackagesUnavailableReason:
            "Wi-Fi is hidden because no building has it enabled."
        };
      }

      if (!buildingWifiPackageService) {
        throw new Error("Wi-Fi package management requires database connection.");
      }

      await buildingWifiPackageService.ensureDefaultsForBuildings([
        { id: wifiPackageBuildingId }
      ]);
      return {
        wifiPackages:
          await buildingWifiPackageService.listForBuilding(wifiPackageBuildingId),
        wifiPackagesUnavailableReason: ""
      };
    })();
    const utilityBuildingConfigurationPromise =
      registryBuildingId && buildingConfigurationService
        ? buildingConfigurationService.getForBuilding(registryBuildingId)
        : Promise.resolve(null);
    const moveOutSettlementsPromise = registryBuildingId
      ? listLandlordMoveOutSettlements({
          context,
          buildingId: registryBuildingId,
          limit: 500
        })
      : Promise.resolve([]);
    const caretakerAccessPromise = (async () => {
      if (!registryBuildingId) {
        return {
          caretakerRequests: [] as Array<
            ReturnType<typeof mapCaretakerAccessRequestWithUser>
          >,
          caretakers: [] as Array<
            CaretakerAccessRecord & {
              user: {
                id: string;
                fullName: string;
                email: string | null;
                phone: string;
                role: string;
                status: string;
              } | null;
            }
          >
        };
      }

      if (!repositoryContext.prisma) {
        throw new Error("Caretaker access management requires database connection.");
      }

      const pendingRequests = listCaretakerAccessRequests({
        buildingId: registryBuildingId,
        status: "pending"
      });
      const caretakerRecords = listCaretakerRecordsForBuilding(registryBuildingId);
      const userIds = [
        ...new Set([
          ...pendingRequests.map((item) => item.userId),
          ...caretakerRecords.map((item) => item.userId)
        ])
      ];

      const users =
        userIds.length > 0
          ? await repositoryContext.prisma.housingUser.findMany({
              where: {
                id: { in: userIds }
              },
              select: {
                id: true,
                fullName: true,
                email: true,
                phone: true,
                role: true,
                status: true
              }
            })
          : [];
      const userById = new Map(users.map((item) => [item.id, item]));

      return {
        caretakerRequests: pendingRequests.map((item) =>
          mapCaretakerAccessRequestWithUser(item, userById.get(item.userId) ?? null)
        ),
        caretakers: caretakerRecords.map((item) => ({
          ...item,
          user: userById.get(item.userId) ?? null
        }))
      };
    })();
    const ownerStaffPromise =
      context.role === "caretaker" || !userAccountService
        ? Promise.resolve({
            users: [],
            limit: OWNER_STAFF_LIMIT,
            remaining: 0
          })
        : userAccountService.listOwnerStaffUsers();

    const registryRows = registryBuildingId
      ? residentDirectory
          .filter((item) => item.buildingId === registryBuildingId)
          .map(({ buildingId: _buildingId, buildingName: _buildingName, ...row }) => row)
      : [];
    const utilityRateDefaults = registryBuildingId
      ? getUtilityRateDefaultsForBuilding(registryBuildingId) ?? { buildingId: registryBuildingId }
      : null;
    if (utilityRateDefaults && !utilityRateDefaults.buildingId) {
      utilityRateDefaults.buildingId = registryBuildingId;
    }

    const meters = registryBuildingId
      ? utilityBillingService
          .listMeters({ buildingId: registryBuildingId })
          .filter((item) => visibleHouseNumbers.has(normalizeHouseNumber(item.houseNumber)))
      : [];
    const bills = registryBuildingId
      ? utilityBillingService
          .listBills({
            buildingId: registryBuildingId,
            limit: 600
          })
          .filter((item) => visibleHouseNumbers.has(normalizeHouseNumber(item.houseNumber)))
      : [];
    const payments = registryBuildingId
      ? utilityBillingService
          .listPayments({
            buildingId: registryBuildingId,
            limit: 600
          })
          .filter((item) => visibleHouseNumbers.has(normalizeHouseNumber(item.houseNumber)))
      : [];
    const expenditures = registryBuildingId
      ? [...buildingExpenditures.values()]
          .filter((item) => item.buildingId === normalizeBuildingId(registryBuildingId))
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
          .slice(0, 500)
      : [];
    const [
      { wifiPackages, wifiPackagesUnavailableReason },
      utilityBuildingConfiguration,
      moveOutSettlements,
      { caretakerRequests, caretakers },
      ownerStaff
    ] = await Promise.all([
      wifiPackagesPromise,
      utilityBuildingConfigurationPromise,
      moveOutSettlementsPromise,
      caretakerAccessPromise,
      ownerStaffPromise
    ]);
    const ownerNotifications =
      context.role !== "caretaker" && context.userId
        ? {
            notifications: ownerNotificationService.listForUser(context.userId, {
              limit: 30
            }),
            unreadCount: ownerNotificationService.countUnreadForUser(context.userId)
          }
        : {
            notifications: [],
            unreadCount: 0
          };

    return {
      selection: {
        roomBuildingId,
        registryBuildingId,
        caretakerBuildingId: registryBuildingId,
        residentsBuildingId: buildings.length > 0 ? "all" : "",
        overviewRoomBuildingId: "all",
        ticketBuildingId: "",
        wifiPackageBuildingId,
        rentPaymentBuildingId
      },
      buildings,
      applications,
      pendingApplicationsCount: applications.length,
      rentStatus,
      paymentAccess,
      paymentProfiles,
      buildingPaymentProfiles,
      buildingPaymentInstructions,
      wifiPackages,
      wifiPackagesUnavailableReason,
      ownerStaff,
      ownerNotifications,
      caretakerRequests,
      caretakers,
      tickets,
      residentDirectory,
      registryRows,
      utilityBuildingConfiguration,
      utilityRateDefaults,
      meters,
      bills,
      payments,
      expenditures,
      moveOutSettlements
    };
  };

  const persistUtilityBillingStateNow = async () => {
    if (!appStateService) {
      return;
    }

    await appStateService.queueSetJson(
      UTILITY_BILLING_STATE_KEY,
      utilityBillingService.exportState()
    );
  };

  const persistRentLedgerStateNow = async () => {
    if (!appStateService) {
      return;
    }

    await appStateService.queueSetJson(
      RENT_LEDGER_STATE_KEY,
      rentLedgerService.exportState()
    );
  };

  const ensureRecurringUtilityBillsCurrent = async (
    reason: string,
    scope: {
      buildingId?: string;
      houseNumber?: string;
      utilityType?: "water" | "electricity";
    } = {}
  ) => {
    await refreshRoomBillingHoldCache();
    const createdBills = utilityBillingService.backfillRecurringBills({
      ...scope,
      visibleThroughDate: new Date(
        Date.now() + RECURRING_UTILITY_VISIBILITY_WINDOW_DAYS * 24 * 60 * 60 * 1000
      )
    });

    if (createdBills.length === 0) {
      return [];
    }

    await persistUtilityBillingStateNow();
    logHousingEvent("utility.recurring_backfill", {
      reason,
      scope,
      createdCount: createdBills.length,
      createdMonths: createdBills.map((item) => ({
        utilityType: item.utilityType,
        buildingId: item.buildingId,
        houseNumber: item.houseNumber,
        billingMonth: item.billingMonth,
        amountKsh: item.amountKsh,
        dueDate: item.dueDate
      }))
    });
    return createdBills;
  };

  const buildResidentMoveOutSettlementSummary = async (
    buildingId: string,
    userId: string
  ) => {
    if (!repositoryContext.prisma) {
      throw new Error("DATABASE_REQUIRED");
    }

    const tenancy = await repositoryContext.prisma.tenancy.findFirst({
      where: {
        buildingId,
        userId,
        active: true
      },
      include: {
        building: {
          select: {
            id: true,
            name: true
          }
        },
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
            phone: true
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    if (!tenancy) {
      throw new Error("TENANCY_NOT_FOUND");
    }

    const normalizedBuildingId = normalizeBuildingId(buildingId);
    const normalizedHouseNumber = normalizeHouseNumber(tenancy.unit.houseNumber);
    await ensureRecurringUtilityBillsCurrent("landlord.move_out_settlement", {
      buildingId: normalizedBuildingId,
      houseNumber: normalizedHouseNumber
    });

    const rentDue = rentLedgerService.getRentDue(
      normalizedBuildingId,
      normalizedHouseNumber
    );
    const rentOutstandingKsh = Math.max(0, Math.round(Number(rentDue?.balanceKsh ?? 0)));
    const utilityBills = utilityBillingService
      .listBills({
        buildingId: normalizedBuildingId,
        houseNumber: normalizedHouseNumber,
        limit: 1_000
      })
      .filter((item) => Math.max(0, Number(item.balanceKsh ?? 0)) > 0)
      .map((item) => ({
        id: item.id,
        utilityType: item.utilityType,
        billingMonth: item.billingMonth,
        amountKsh: Math.max(0, Math.round(Number(item.amountKsh ?? 0))),
        balanceKsh: Math.max(0, Math.round(Number(item.balanceKsh ?? 0))),
        dueDate: item.dueDate
      }));
    const utilityOutstandingKsh = utilityBills.reduce(
      (sum, item) => sum + item.balanceKsh,
      0
    );
    const roomCharges = [...buildingExpenditures.values()]
      .filter(
        (item) =>
          item.buildingId === normalizedBuildingId &&
          normalizeHouseNumber(item.houseNumber ?? "") === normalizedHouseNumber &&
          item.chargeableToResident
      )
      .map((item) => ({
        id: item.id,
        category: item.category,
        title: item.title,
        amountKsh: Math.max(0, Math.round(Number(item.amountKsh ?? 0))),
        createdAt: item.createdAt
      }));
    const roomChargesOutstandingKsh = roomCharges.reduce(
      (sum, item) => sum + item.amountKsh,
      0
    );

    return {
      building: {
        id: tenancy.building.id,
        name: tenancy.building.name
      },
      resident: {
        id: tenancy.user.id,
        fullName: tenancy.user.fullName,
        email: tenancy.user.email,
        phone: tenancy.user.phone
      },
      tenancyId: tenancy.id,
      houseNumber: normalizedHouseNumber,
      rentOutstandingKsh,
      utilityOutstandingKsh,
      roomChargesOutstandingKsh,
      totalOutstandingKsh:
        rentOutstandingKsh + utilityOutstandingKsh + roomChargesOutstandingKsh,
      rent: rentDue
        ? {
            monthlyRentKsh: Math.max(0, Math.round(Number(rentDue.monthlyRentKsh ?? 0))),
            dueDate: rentDue.dueDate,
            balanceKsh: rentOutstandingKsh
          }
        : null,
      utilityBills,
      roomCharges
    };
  };

  const buildEmptyRoomLossSettlementSummary = async (
    buildingId: string,
    houseNumber: string
  ) => {
    const normalizedBuildingId = normalizeBuildingId(buildingId);
    const normalizedHouseNumber = normalizeHouseNumber(houseNumber);
    const building = await store.getBuilding(normalizedBuildingId);
    if (!building) {
      throw new Error("BUILDING_NOT_FOUND");
    }

    await ensureRecurringUtilityBillsCurrent("landlord.empty_room_loss_settlement", {
      buildingId: normalizedBuildingId,
      houseNumber: normalizedHouseNumber
    });

    const rentDue = rentLedgerService.getRentDue(
      normalizedBuildingId,
      normalizedHouseNumber
    );
    const rentOutstandingKsh = Math.max(0, Math.round(Number(rentDue?.balanceKsh ?? 0)));
    const utilityBills = utilityBillingService
      .listBills({
        buildingId: normalizedBuildingId,
        houseNumber: normalizedHouseNumber,
        limit: 1_000
      })
      .filter((item) => Math.max(0, Number(item.balanceKsh ?? 0)) > 0)
      .map((item) => ({
        id: item.id,
        utilityType: item.utilityType,
        billingMonth: item.billingMonth,
        amountKsh: Math.max(0, Math.round(Number(item.amountKsh ?? 0))),
        balanceKsh: Math.max(0, Math.round(Number(item.balanceKsh ?? 0))),
        dueDate: item.dueDate
      }));
    const utilityOutstandingKsh = utilityBills.reduce(
      (sum, item) => sum + item.balanceKsh,
      0
    );
    const roomCharges = [...buildingExpenditures.values()]
      .filter(
        (item) =>
          item.buildingId === normalizedBuildingId &&
          normalizeHouseNumber(item.houseNumber ?? "") === normalizedHouseNumber &&
          item.chargeableToResident
      )
      .map((item) => ({
        id: item.id,
        category: item.category,
        title: item.title,
        amountKsh: Math.max(0, Math.round(Number(item.amountKsh ?? 0))),
        createdAt: item.createdAt
      }));
    const roomChargesOutstandingKsh = roomCharges.reduce(
      (sum, item) => sum + item.amountKsh,
      0
    );

    return {
      building: {
        id: building.id,
        name: building.name
      },
      resident: null,
      tenancyId: null,
      houseNumber: normalizedHouseNumber,
      rentOutstandingKsh,
      utilityOutstandingKsh,
      roomChargesOutstandingKsh,
      totalOutstandingKsh:
        rentOutstandingKsh + utilityOutstandingKsh + roomChargesOutstandingKsh,
      rent: rentDue
        ? {
            monthlyRentKsh: Math.max(0, Math.round(Number(rentDue.monthlyRentKsh ?? 0))),
            dueDate: rentDue.dueDate,
            balanceKsh: rentOutstandingKsh
          }
        : null,
      utilityBills,
      roomCharges
    };
  };

  const settleRoomBalancesForResidentRemoval = async (
    buildingId: string,
    houseNumber: string,
    action: "write_off" | "transfer_to_resident_debt",
    settlementNote?: string
  ) => {
    const normalizedBuildingId = normalizeBuildingId(buildingId);
    const normalizedHouseNumber = normalizeHouseNumber(houseNumber);
    const note =
      settlementNote?.trim() ||
      (action === "transfer_to_resident_debt"
        ? "Transferred to resident debt when resident was removed."
        : "Written off when resident was removed.");
    const rent = rentLedgerService.writeOffHouseBalance(
      normalizedBuildingId,
      normalizedHouseNumber,
      `Outstanding rent ${note.toLowerCase()}`
    );
    const utilities = utilityBillingService.writeOffHouseBalances(
      normalizedBuildingId,
      normalizedHouseNumber,
      `Outstanding utility balance ${note.toLowerCase()}`
    );
    let roomChargesWrittenOffKsh = 0;
    let roomChargeCount = 0;

    for (const [id, item] of buildingExpenditures.entries()) {
      if (
        item.buildingId !== normalizedBuildingId ||
        normalizeHouseNumber(item.houseNumber ?? "") !== normalizedHouseNumber ||
        !item.chargeableToResident
      ) {
        continue;
      }

      const next: BuildingExpenditureRecord = {
        ...item,
        chargeableToResident: false,
        note: item.note?.trim()
          ? `${item.note.trim()} ${note}`
          : note
      };
      buildingExpenditures.set(id, next);
      roomChargesWrittenOffKsh += Math.max(0, Number(item.amountKsh ?? 0));
      roomChargeCount += 1;
    }

    const rentWrittenOffKsh = Math.max(0, Number(rent?.previousBalanceKsh ?? 0));
    const utilityWrittenOffKsh = Math.max(
      0,
      Number(utilities.totalWrittenOffKsh ?? 0)
    );
    const totalWrittenOffKsh =
      rentWrittenOffKsh + utilityWrittenOffKsh + roomChargesWrittenOffKsh;

    if (rentWrittenOffKsh > 0) {
      await persistRentLedgerStateNow();
    }
    if (utilityWrittenOffKsh > 0) {
      await persistUtilityBillingStateNow();
    }
    if (roomChargeCount > 0) {
      persistBuildingExpenditureState();
    }

    return {
      action,
      rentWrittenOffKsh,
      utilityWrittenOffKsh,
      roomChargesWrittenOffKsh,
      rentSettledKsh: rentWrittenOffKsh,
      utilitySettledKsh: utilityWrittenOffKsh,
      roomChargesSettledKsh: roomChargesWrittenOffKsh,
      totalWrittenOffKsh,
      totalSettledKsh: totalWrittenOffKsh,
      rent,
      utilities,
      roomChargeCount
    };
  };

  const recordResidentMoveOutSettlement = async (input: {
    summary: {
      building: { id: string; name: string };
      resident?: {
        id: string;
        fullName: string;
        email: string | null;
        phone: string;
      } | null;
      tenancyId?: string | null;
      houseNumber: string;
      rentOutstandingKsh: number;
      utilityOutstandingKsh: number;
      roomChargesOutstandingKsh: number;
      totalOutstandingKsh: number;
      utilityBills?: unknown;
      roomCharges?: unknown;
    };
    action: "write_off" | "transfer_to_resident_debt";
    reason?: string;
    actor: {
      userId?: string;
      role?: string;
      name?: string;
    };
    settlement: Awaited<ReturnType<typeof settleRoomBalancesForResidentRemoval>>;
  }) => {
    if (!repositoryContext.prisma || input.summary.totalOutstandingKsh <= 0) {
      return null;
    }

    return repositoryContext.prisma.residentMoveOutSettlement.create({
      data: {
        buildingId: input.summary.building.id,
        houseNumber: input.summary.houseNumber,
        residentUserId: input.summary.resident?.id ?? null,
        tenancyId: input.summary.tenancyId ?? null,
        action: input.action,
        status:
          input.action === "transfer_to_resident_debt"
            ? "resident_debt_open"
            : "written_off_loss",
        amountKsh: Math.max(0, Math.round(input.summary.totalOutstandingKsh)),
        rentKsh: Math.max(0, Math.round(input.summary.rentOutstandingKsh)),
        utilityKsh: Math.max(0, Math.round(input.summary.utilityOutstandingKsh)),
        roomChargesKsh: Math.max(
          0,
          Math.round(input.summary.roomChargesOutstandingKsh)
        ),
        reason: input.reason,
        metadata: sanitizeAuditMetadata({
          resident: input.summary.resident,
          settlement: input.settlement,
          utilityBills: input.summary.utilityBills,
          roomCharges: input.summary.roomCharges
        }),
        createdByUserId: input.actor.userId,
        createdByRole: input.actor.role,
        createdByName: input.actor.name
      }
    });
  };

  const mapResidentMoveOutSettlement = (
    settlement: {
      id: string;
      buildingId: string;
      houseNumber: string;
      residentUserId: string | null;
      tenancyId: string | null;
      action: string;
      status: string;
      amountKsh: number;
      rentKsh: number;
      utilityKsh: number;
      roomChargesKsh: number;
      reason: string | null;
      metadata: unknown;
      createdByUserId: string | null;
      createdByRole: string | null;
      createdByName: string | null;
      createdAt: Date;
      updatedAt: Date;
    },
    lookup: {
      building?: { id: string; name: string } | null;
      resident?: {
        id: string;
        fullName: string;
        email: string | null;
        phone: string;
      } | null;
    } = {}
  ) => ({
    id: settlement.id,
    buildingId: settlement.buildingId,
    buildingName: lookup.building?.name,
    houseNumber: settlement.houseNumber,
    residentUserId: settlement.residentUserId ?? undefined,
    residentName: lookup.resident?.fullName,
    residentPhone: lookup.resident?.phone,
    residentEmail: lookup.resident?.email,
    tenancyId: settlement.tenancyId ?? undefined,
    action: settlement.action,
    status: settlement.status,
    amountKsh: Math.max(0, Number(settlement.amountKsh ?? 0)),
    rentKsh: Math.max(0, Number(settlement.rentKsh ?? 0)),
    utilityKsh: Math.max(0, Number(settlement.utilityKsh ?? 0)),
    roomChargesKsh: Math.max(0, Number(settlement.roomChargesKsh ?? 0)),
    reason: settlement.reason ?? undefined,
    metadata: settlement.metadata ?? undefined,
    createdBy: {
      userId: settlement.createdByUserId ?? undefined,
      role: settlement.createdByRole ?? undefined,
      name: settlement.createdByName ?? undefined
    },
    createdAt: settlement.createdAt.toISOString(),
    updatedAt: settlement.updatedAt.toISOString()
  });

  const listLandlordMoveOutSettlements = async (input: {
    context: {
      role: string;
      userId?: string;
      userSession: Awaited<ReturnType<typeof resolveOptionalUserSession>>;
    } | null;
    buildingId?: string;
    limit?: number;
  }) => {
    if (!repositoryContext.prisma || !input.context) {
      return [];
    }

    const requestedBuildingId = String(input.buildingId ?? "").trim()
      ? normalizeBuildingId(input.buildingId)
      : "";
    const visibleIds = await listVisibleBuildingIdsForLandlordContext(input.context);
    if (requestedBuildingId) {
      const building = await store.getBuilding(requestedBuildingId);
      if (!building) {
        throw new Error("BUILDING_NOT_FOUND");
      }
      const hasAccess = await canManageBuildingFromLandlordContext(
        input.context,
        building.id
      );
      if (!hasAccess) {
        throw new Error("BUILDING_ACCESS_DENIED");
      }
    }

    const boundedLimit = Math.min(Math.max(Math.trunc(input.limit ?? 500), 1), 1000);
    const rows = await repositoryContext.prisma.residentMoveOutSettlement.findMany({
      where: {
        ...(requestedBuildingId
          ? { buildingId: requestedBuildingId }
          : visibleIds
            ? { buildingId: { in: [...visibleIds] } }
            : {})
      },
      orderBy: { createdAt: "desc" },
      take: boundedLimit
    });

    const buildingIds = [...new Set(rows.map((item) => item.buildingId))];
    const residentUserIds = [
      ...new Set(rows.map((item) => item.residentUserId).filter(Boolean))
    ] as string[];
    const [buildings, residents] = await Promise.all([
      buildingIds.length > 0
        ? Promise.all(buildingIds.map((id) => store.getBuilding(id)))
        : Promise.resolve([]),
      residentUserIds.length > 0
        ? repositoryContext.prisma.housingUser.findMany({
            where: { id: { in: residentUserIds } },
            select: {
              id: true,
              fullName: true,
              email: true,
              phone: true
            }
          })
        : Promise.resolve([])
    ]);

    const buildingById = new Map(
      buildings
        .filter((item): item is NonNullable<typeof item> => Boolean(item))
        .map((item) => [item.id, { id: item.id, name: item.name }])
    );
    const residentById = new Map(residents.map((item) => [item.id, item]));

    return rows.map((item) =>
      mapResidentMoveOutSettlement(item, {
        building: buildingById.get(item.buildingId) ?? null,
        resident: item.residentUserId
          ? residentById.get(item.residentUserId) ?? null
          : null
      })
    );
  };

  const recordResidentDebtCollection = async (input: {
    context: {
      role: string;
      userId?: string;
      userSession: Awaited<ReturnType<typeof resolveOptionalUserSession>>;
    };
    settlementId: string;
    amountKsh?: number;
    provider: "mpesa" | "cash" | "bank" | "card";
    providerReference?: string;
    paidAt?: string;
    note?: string;
  }) => {
    if (!repositoryContext.prisma) {
      throw new Error("DATABASE_REQUIRED");
    }

    const settlement = await repositoryContext.prisma.residentMoveOutSettlement.findUnique({
      where: { id: input.settlementId }
    });
    if (!settlement) {
      throw new Error("SETTLEMENT_NOT_FOUND");
    }

    const hasAccess = await canManageBuildingFromLandlordContext(
      input.context,
      settlement.buildingId
    );
    if (!hasAccess) {
      throw new Error("BUILDING_ACCESS_DENIED");
    }

    if (settlement.action !== "transfer_to_resident_debt") {
      throw new Error("SETTLEMENT_NOT_RESIDENT_DEBT");
    }
    const residentUserId = settlement.residentUserId;
    if (!residentUserId) {
      throw new Error("SETTLEMENT_RESIDENT_NOT_FOUND");
    }
    if (settlement.status === "resident_debt_closed") {
      throw new Error("RESIDENT_DEBT_ALREADY_CLOSED");
    }
    if (settlement.status !== "resident_debt_open") {
      throw new Error("RESIDENT_DEBT_NOT_OPEN");
    }

    const expectedAmountKsh = Math.max(0, Math.round(Number(settlement.amountKsh ?? 0)));
    const amountKsh =
      input.amountKsh === undefined
        ? expectedAmountKsh
        : Math.max(0, Math.round(Number(input.amountKsh)));
    if (amountKsh !== expectedAmountKsh) {
      throw new Error("RESIDENT_DEBT_AMOUNT_MISMATCH");
    }

    const actor = actorFromLandlordContext(input.context);
    const collectedAt = new Date().toISOString();
    const collection = {
      amountKsh,
      provider: input.provider,
      providerReference: input.providerReference,
      paidAt: input.paidAt ?? collectedAt,
      note: input.note,
      collectedAt,
      collectedBy: actor
    };
    const existingMetadata =
      settlement.metadata &&
      typeof settlement.metadata === "object" &&
      !Array.isArray(settlement.metadata)
        ? { ...(settlement.metadata as Record<string, unknown>) }
        : {};
    const existingCollections = Array.isArray(existingMetadata.debtCollections)
      ? existingMetadata.debtCollections
      : [];
    const metadata = sanitizeAuditMetadata({
      ...existingMetadata,
      debtCollection: collection,
      debtCollections: [...existingCollections, collection]
    });

    const updated = await repositoryContext.prisma.residentMoveOutSettlement.update({
      where: { id: settlement.id },
      data: {
        status: "resident_debt_closed",
        metadata
      }
    });

    await recordRoomAccountAuditEvent({
      buildingId: settlement.buildingId,
      houseNumber: settlement.houseNumber,
      tenancyId: settlement.tenancyId ?? undefined,
      action: "resident.debt.closed",
      summary: `KSh ${amountKsh.toLocaleString("en-US")} resident debt collected after move-out.`,
      actor,
      metadata: {
        settlementRecordId: settlement.id,
        residentUserId,
        collection
      }
    });

    const [building, resident] = await Promise.all([
      store.getBuilding(updated.buildingId),
      repositoryContext.prisma.housingUser.findUnique({
        where: { id: residentUserId },
        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true
        }
      })
    ]);

    return mapResidentMoveOutSettlement(updated, {
      building: building ? { id: building.id, name: building.name } : null,
      resident
    });
  };

  const recordResidentUtilityPaymentAndNotify = async (
    utilityType: "water" | "electricity",
    buildingId: string,
    houseNumber: string,
    input: Parameters<UtilityBillingService["recordPayment"]>[3]
  ) => {
    const data = utilityBillingService.recordPayment(
      utilityType,
      buildingId,
      houseNumber,
      input
    );
    const utilityLabel = utilityType === "water" ? "Water" : "Electricity";
    const appliedBillingMonths = [...new Set(
      data.allocations.map((item) => item.bill.billingMonth)
    )];
    userSupportService.enqueueSystemNotifications(buildingId, houseNumber, [
      {
        title: utilityLabel + " Payment Received",
        message:
          utilityLabel +
          " payment of KSh " +
          Math.round(input.amountKsh).toLocaleString("en-US") +
          " has been applied to your " +
          appliedBillingMonths.join(", ") +
          " bill" +
          (appliedBillingMonths.length === 1 ? "." : "s."),
        level: "success",
        source: "system",
        dedupeKey: "utility-payment-" + utilityType + "-" + data.event.id
      }
    ]);

    await persistUtilityBillingStateNow();
    return data;
  };

  const findRecentPostedUtilityPayment = (pending: PendingUtilityStkRequest) => {
    const initiatedAtMs = Date.parse(pending.initiatedAt);
    const lowerBoundMs = Number.isFinite(initiatedAtMs)
      ? initiatedAtMs - 10 * 60 * 1000
      : Number.NEGATIVE_INFINITY;
    const recentPayments = utilityBillingService
      .listPayments({
        buildingId: pending.buildingId,
        houseNumber: pending.houseNumber,
        utilityType: pending.utilityType,
        limit: 24
      })
      .filter((payment) => {
        const paidAtMs = Date.parse(payment.paidAt);
        return (
          payment.provider === "mpesa" &&
          (!Number.isFinite(lowerBoundMs) ||
            !Number.isFinite(paidAtMs) ||
            paidAtMs >= lowerBoundMs)
        );
      });

    const directMatch = recentPayments.find(
      (payment) =>
        payment.billingMonth === pending.billingMonth &&
        Math.round(Number(payment.amountKsh ?? 0)) ===
          Math.round(Number(pending.amountKsh ?? 0))
    );
    if (directMatch) {
      return directMatch;
    }

    const groupedByReference = new Map<
      string,
      {
        payment: (typeof recentPayments)[number];
        totalAmountKsh: number;
      }
    >();

    for (const payment of recentPayments) {
      const reference = String(payment.providerReference ?? "").trim();
      if (!reference) {
        continue;
      }

      const existing = groupedByReference.get(reference);
      if (existing) {
        existing.totalAmountKsh += Math.round(Number(payment.amountKsh ?? 0));
        continue;
      }

      groupedByReference.set(reference, {
        payment,
        totalAmountKsh: Math.round(Number(payment.amountKsh ?? 0))
      });
    }

    return (
      [...groupedByReference.values()].find(
        (group) =>
          group.totalAmountKsh === Math.round(Number(pending.amountKsh ?? 0))
      )?.payment ?? null
    );
  };

  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin) {
          callback(null, true);
          return;
        }

        const normalizedOrigin = normalizeOriginValue(origin);
        callback(null, Boolean(normalizedOrigin && allowedCorsOrigins.has(normalizedOrigin)));
      },
      credentials: true,
      methods: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: [
        "Content-Type",
        "Authorization",
        "X-Admin-Session",
        "X-User-Session"
      ],
      maxAge: 600
    })
  );
  app.use(express.json({ limit: "1mb" }));
  await mkdir(uploadsDir, { recursive: true });
  app.use("/uploads", express.static(uploadsDir));
  app.get("/admin.html", (_req, res) => {
    return res.redirect("/landlord");
  });
  app.use(express.static(publicDir));
  app.use((req, res, next) => {
    const pathValue = req.path ?? "";
    const shouldLog =
      pathValue === "/api/user/utility-bills" ||
      pathValue === "/api/landlord/startup" ||
      pathValue === "/api/landlord/utilities/bills" ||
      pathValue === "/api/payments/mpesa/rent-callback" ||
      /^\/api\/user\/rent\/payments\/mpesa\/(initialize|verify)$/.test(pathValue) ||
      /^\/api\/user\/utilities\/[^/]+\/payments(?:\/mpesa\/(?:initialize|verify))?$/.test(
        pathValue
      );

    if (!shouldLog) {
      next();
      return;
    }

    const requestId = randomUUID().slice(0, 8);
    const startedAt = Date.now();
    logHousingEvent("request.start", {
      requestId,
      method: req.method,
      path: pathValue,
      ip: req.ip || req.socket.remoteAddress || "unknown"
    });
    res.on("finish", () => {
      logHousingEvent("request.finish", {
        requestId,
        method: req.method,
        path: pathValue,
        statusCode: res.statusCode,
        durationMs: Date.now() - startedAt
      });
    });

    next();
  });
  app.use((req, res, next) => {
    const pathValue = req.path ?? "";
    if (
      req.method === "POST" &&
      AUTH_RATE_LIMITED_PATHS.has(pathValue) &&
      !consumeWindowRateLimit(
        authRouteRateWindow,
        `${pathValue}:${req.ip || req.socket.remoteAddress || "unknown"}`,
        AUTH_ROUTE_RATE_WINDOW_MS,
        AUTH_ROUTE_RATE_MAX_PER_IP
      )
    ) {
      return res.status(429).json({
        error: "Too many authentication attempts from this IP. Please wait before trying again."
      });
    }

    next();
  });
  app.use((req, res, next) => {
    const pathValue = req.path ?? "";
    if (
      !STATE_CHANGING_METHODS.has(req.method) ||
      !COOKIE_PROTECTED_PATH_PREFIXES.some((prefix) => pathValue.startsWith(prefix)) ||
      !hasCookieBackedSession(req)
    ) {
      next();
      return;
    }

    const requestOrigin = normalizeRequestOrigin(req);
    const expectedOrigins = expectedOriginsForRequest(req);
    if (!requestOrigin || !expectedOrigins.has(requestOrigin)) {
      return res.status(403).json({
        error: "Request origin denied for cookie-authenticated action."
      });
    }

    next();
  });
  app.use((req, res, next) => {
    const pathValue = req.path ?? "";
    if (
      pathValue === "/landlord" ||
      pathValue.startsWith("/landlord/rooms/") ||
      pathValue === "/landlord/login" ||
      pathValue === "/resident" ||
      pathValue === "/admin" ||
      pathValue === "/admin/login" ||
      pathValue.startsWith("/api/auth/") ||
      pathValue.startsWith("/api/landlord/") ||
      pathValue.startsWith("/api/user/")
    ) {
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");
    }
    next();
  });

  app.get("/", (_req, res) => {
    res.sendFile(path.join(publicDir, "index.html"));
  });

  app.get("/admin/login", (_req, res) => {
    res.sendFile(path.join(publicDir, "admin-login.html"));
  });

  app.get("/landlord/login", (_req, res) => {
    res.sendFile(path.join(publicDir, "landlord-login.html"));
  });

  app.get("/admin", (req, res) => {
    const token = readAdminSessionToken(req);
    const session = adminAuthService.getSession(token);

    if (!session || !adminAuthService.hasRole(session, "admin")) {
      return res.redirect("/admin/login");
    }

    return res.redirect("/landlord");
  });

  app.get("/landlord", async (req, res) => {
    const token = readAdminSessionToken(req);
    const session = adminAuthService.getSession(token);

    if (session && adminAuthService.hasRole(session, "landlord")) {
      return res.sendFile(path.join(publicDir, "landlord.html"));
    }

    if (userAccountService) {
      const userSession = await userAccountService.getSession(readUserSessionToken(req));
      if (
        userSession &&
        (hasUserRoleAtLeast(userSession.role, "landlord") ||
          listCaretakerBuildingIdsForUser(userSession.userId).size > 0)
      ) {
        return res.sendFile(path.join(publicDir, "landlord.html"));
      }
    }

    return res.redirect("/landlord/login");
  });

  app.get("/landlord/rooms/:buildingId", async (req, res) => {
    const token = readAdminSessionToken(req);
    const session = adminAuthService.getSession(token);

    if (session && adminAuthService.hasRole(session, "landlord")) {
      return res.sendFile(path.join(publicDir, "landlord.html"));
    }

    if (userAccountService) {
      const userSession = await userAccountService.getSession(readUserSessionToken(req));
      if (
        userSession &&
        (hasUserRoleAtLeast(userSession.role, "landlord") ||
          listCaretakerBuildingIdsForUser(userSession.userId).size > 0)
      ) {
        return res.sendFile(path.join(publicDir, "landlord.html"));
      }
    }

    return res.redirect("/landlord/login");
  });

  app.get("/landlord/rooms/:buildingId/:houseNumber", async (req, res) => {
    const token = readAdminSessionToken(req);
    const session = adminAuthService.getSession(token);

    if (session && adminAuthService.hasRole(session, "landlord")) {
      return res.sendFile(path.join(publicDir, "room-account.html"));
    }

    if (userAccountService) {
      const userSession = await userAccountService.getSession(readUserSessionToken(req));
      if (
        userSession &&
        (hasUserRoleAtLeast(userSession.role, "landlord") ||
          listCaretakerBuildingIdsForUser(userSession.userId).size > 0)
      ) {
        return res.sendFile(path.join(publicDir, "room-account.html"));
      }
    }

    return res.redirect("/landlord/login");
  });

  const sendResidentShell = (_req: express.Request, res: express.Response) => {
    res.sendFile(path.join(publicDir, "users.html"), {
      headers: {
        "Cache-Control": "no-store, max-age=0"
      }
    });
  };

  const sendResidentProfileShell = (_req: express.Request, res: express.Response) => {
    res.sendFile(path.join(publicDir, "user.html"), {
      headers: {
        "Cache-Control": "no-store, max-age=0"
      }
    });
  };

  const redirectResidentAlias = (_req: express.Request, res: express.Response) => {
    res.redirect(308, "/resident");
  };

  const redirectResidentProfileAlias = (
    _req: express.Request,
    res: express.Response
  ) => {
    res.redirect(308, "/user");
  };

  app.get("/resident", sendResidentShell);
  app.get("/user", sendResidentProfileShell);
  app.get("/user/", redirectResidentProfileAlias);
  app.get("/users", redirectResidentAlias);
  app.get("/users/", redirectResidentAlias);

  app.get("/health", (_req, res) => {
    res.json({
      status: "ok",
      service: "landlord-housing-api",
      storage: repositoryContext.backend,
      timestamp: new Date().toISOString()
    });
  });

  app.post("/api/tenant/resolve", async (req, res, next) => {
    try {
      if (!repositoryContext.prisma) {
        return res.status(503).json({
          error: "Tenant resolution unavailable. Database connection is required."
        });
      }

      const parsed = tenantResolveSchema.parse(req.body);
      const resolution = await resolveTenantByHouseAndPhone({
        houseNumber: parsed.houseNumber,
        phoneNumber: parsed.phoneNumber,
        buildingId: parsed.buildingId
      });

      if (!resolution || resolution.type === "none") {
        return res.status(404).json({
          error: "Tenant could not be resolved for that house number and phone."
        });
      }

      if (resolution.type === "ambiguous") {
        return res.status(409).json({
          error: "Multiple tenant matches found. Provide buildingId.",
          data: resolution.options
        });
      }

      return res.json({ data: resolution });
    } catch (error) {
      return next(error);
    }
  });

  app.post("/api/auth/caretaker/resolve", async (req, res, next) => {
    try {
      if (!userAccountService || !repositoryContext.prisma) {
        return res.status(503).json({
          error: "Caretaker access requires database-backed user accounts."
        });
      }

      const parsed = caretakerAccessResolveSchema.parse(req.body ?? {});

      try {
        const resolved = await resolveCaretakerAccessByPhoneAndHouse(parsed);
        if (!resolved) {
          return res.status(404).json({
            error:
              "Caretaker access not found for that phone and house number. Ask landlord to approve correctly."
          });
        }

        return res.json({
          data: {
            role: "caretaker",
            caretakerName: resolved.user.fullName,
            buildingId: resolved.building.id,
            buildingName: resolved.building.name,
            houseNumber: resolved.record.verificationHouseNumber || resolved.houseNumber,
            requiresPasswordSetup: !resolved.record.passwordSetupComplete
          }
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unable to resolve caretaker access.";
        if (message === "ACCOUNT_DISABLED") {
          return res.status(403).json({ error: "Account is disabled. Contact support." });
        }
        if (message === "AMBIGUOUS_CARETAKER_BUILDING") {
          return res.status(409).json({
            error:
              "Multiple buildings matched this phone + house. Provide building id for caretaker login."
          });
        }
        throw error;
      }
    } catch (error) {
      return next(error);
    }
  });

  app.post("/api/auth/caretaker/setup-password", async (req, res, next) => {
    try {
      if (!userAccountService || !repositoryContext.prisma) {
        return res.status(503).json({
          error: "Caretaker password setup requires database-backed user accounts."
        });
      }

      const parsed = caretakerPasswordSetupSchema.parse(req.body ?? {});

      try {
        const resolved = await resolveCaretakerAccessByPhoneAndHouse(parsed);
        if (!resolved) {
          return res.status(404).json({
            error:
              "Caretaker access not found for that phone and house number. Ask landlord to approve correctly."
          });
        }

        if (resolved.record.passwordSetupComplete) {
          return res.status(409).json({
            error:
              "Caretaker password is already configured. Sign in with phone, house number, and password."
          });
        }

        await userAccountService.resetPasswordByUserId({
          userId: resolved.user.id,
          temporaryPassword: parsed.newPassword,
          requirePasswordChange: false
        });

        const session = await userAccountService.createSession({
          phoneNumber: parsed.phoneNumber,
          password: parsed.newPassword
        });
        if (!session || session.userId !== resolved.user.id) {
          return res.status(401).json({ error: "Unable to establish caretaker session." });
        }

        markCaretakerPasswordSetupComplete(resolved.building.id, resolved.user.id);

        const expiresAtMs = new Date(session.expiresAt).getTime();
        const maxAgeMs = Math.max(0, expiresAtMs - Date.now());
        res.cookie(userSessionCookieName, session.token, buildSessionCookieOptions(req, maxAgeMs));

        return res.status(201).json({
          data: {
            userId: session.userId,
            role: "caretaker",
            buildingId: resolved.building.id,
            buildingName: resolved.building.name,
            phoneMask: maskPhone(session.phone),
            expiresAt: session.expiresAt
          }
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unable to set caretaker password.";
        if (message === "ACCOUNT_DISABLED") {
          return res.status(403).json({ error: "Account is disabled. Contact support." });
        }
        if (message === "AMBIGUOUS_CARETAKER_BUILDING") {
          return res.status(409).json({
            error:
              "Multiple buildings matched this phone + house. Provide building id for caretaker setup."
          });
        }
        throw error;
      }
    } catch (error) {
      return next(error);
    }
  });

  app.post("/api/auth/caretaker/login-phone", async (req, res, next) => {
    try {
      if (!userAccountService || !repositoryContext.prisma) {
        return res.status(503).json({
          error: "Caretaker login requires database-backed user accounts."
        });
      }

      const parsed = caretakerPhoneLoginSchema.parse(req.body ?? {});

      try {
        const resolved = await resolveCaretakerAccessByPhoneAndHouse(parsed);
        if (!resolved) {
          return res.status(401).json({
            error: "Invalid caretaker phone, house number, or password."
          });
        }

        if (!resolved.record.passwordSetupComplete) {
          return res.status(428).json({
            error:
              "First-time caretaker setup required. Verify phone + house and create a password first."
          });
        }

        const session = await userAccountService.createSession({
          phoneNumber: parsed.phoneNumber,
          password: parsed.password
        });

        if (session.userId !== resolved.user.id) {
          await userAccountService.logout(session.token);
          return res.status(401).json({
            error: "Invalid caretaker phone, house number, or password."
          });
        }

        const expiresAtMs = new Date(session.expiresAt).getTime();
        const maxAgeMs = Math.max(0, expiresAtMs - Date.now());
        res.cookie(userSessionCookieName, session.token, buildSessionCookieOptions(req, maxAgeMs));

        return res.json({
          data: {
            userId: session.userId,
            role: "caretaker",
            buildingId: resolved.building.id,
            buildingName: resolved.building.name,
            phoneMask: maskPhone(session.phone),
            expiresAt: session.expiresAt,
            mustChangePassword: session.mustChangePassword
          }
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unable to login caretaker.";
        if (message === "ACCOUNT_DISABLED") {
          return res.status(403).json({ error: "Account is disabled. Contact support." });
        }
        if (message === "ACCOUNT_NOT_FOUND" || message === "INVALID_PASSWORD") {
          return res.status(401).json({
            error: "Invalid caretaker phone, house number, or password."
          });
        }
        if (message === "LOGIN_RATE_LIMITED") {
          return res.status(429).json({
            error: "Too many login attempts. Try again later."
          });
        }
        if (message === "AMBIGUOUS_CARETAKER_BUILDING") {
          return res.status(409).json({
            error:
              "Multiple buildings matched this phone + house. Provide building id for caretaker login."
          });
        }
        throw error;
      }
    } catch (error) {
      return next(error);
    }
  });

  app.post("/api/auth/register", async (req, res, next) => {
    try {
      if (!userAccountService) {
        return res.status(503).json({
          error: "User account service unavailable. Database connection is required."
        });
      }

      const parsed = userRegisterSchema.parse(req.body);
      if (await hasAnyActiveAuthSession(req)) {
        return res.status(409).json({
          error: "Already signed in. Sign out before creating another account."
        });
      }

      try {
        const data = await userAccountService.register(parsed);
        return res.status(201).json({ data });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unable to register user";
        if (message === "EMAIL_ALREADY_EXISTS") {
          return res.status(409).json({ error: "Email already registered" });
        }
        if (message === "PHONE_ALREADY_EXISTS") {
          return res.status(409).json({ error: "Phone number already registered" });
        }
        throw error;
      }
    } catch (error) {
      return next(error);
    }
  });

  app.post("/api/auth/login", async (req, res, next) => {
    try {
      if (!userAccountService) {
        return res.status(503).json({
          error: "User account service unavailable. Database connection is required."
        });
      }

      const parsed = userLoginSchema.parse(req.body);
      try {
        const session = await userAccountService.createSession(parsed);

        const expiresAtMs = new Date(session.expiresAt).getTime();
        const maxAgeMs = Math.max(0, expiresAtMs - Date.now());
        res.cookie(userSessionCookieName, session.token, buildSessionCookieOptions(req, maxAgeMs));

        return res.json({
          data: {
            userId: session.userId,
            role: session.role,
            fullName: session.fullName,
            email: session.email,
            phoneMask: maskPhone(session.phone),
            expiresAt: session.expiresAt
          }
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unable to login";
        if (message === "LOGIN_RATE_LIMITED") {
          return res.status(429).json({ error: "Too many login attempts. Try again later." });
        }
        if (message === "ACCOUNT_NOT_FOUND") {
          return res.status(404).json({
            error: "No account found for that email or phone number."
          });
        }
        if (message === "INVALID_PASSWORD") {
          return res.status(401).json({
            error: "Incorrect password for this account. Try again or request reset."
          });
        }
        if (message === "ACCOUNT_DISABLED") {
          return res.status(403).json({ error: "Account is disabled. Contact support." });
        }
        throw error;
      }
    } catch (error) {
      return next(error);
    }
  });

  app.post("/api/auth/password-recovery/request", async (req, res, next) => {
    try {
      if (!userAccountService) {
        return res.status(503).json({
          error: "Password recovery requires database-backed user accounts."
        });
      }

      const parsed = accountPasswordRecoveryRequestSchema.parse(req.body ?? {});
      const resolved = await userAccountService.resolveUserByIdentifier(
        parsed.identifier
      );
      if (!resolved.user) {
        return res.status(404).json({
          error: "No account found for that email or phone number."
        });
      }

      if (resolved.user.status !== "active") {
        return res.status(403).json({
          error: "Account is disabled. Contact support."
        });
      }
      const resolvedUser = resolved.user;

      const recoveryKey = `${resolved.identifierType}:${resolved.normalizedIdentifier}`;
      const now = Date.now();
      const rateSnapshot = accountPasswordRecoveryRateWindow.get(recoveryKey);
      if (
        rateSnapshot &&
        now - rateSnapshot.windowStartMs < ACCOUNT_PASSWORD_RECOVERY_RATE_WINDOW_MS
      ) {
        if (rateSnapshot.count >= ACCOUNT_PASSWORD_RECOVERY_RATE_MAX_PER_KEY) {
          return res.status(429).json({
            error: "Too many recovery requests. Please wait before trying again."
          });
        }
        rateSnapshot.count += 1;
      } else {
        accountPasswordRecoveryRateWindow.set(recoveryKey, {
          windowStartMs: now,
          count: 1
        });
      }

      const existingPending = [...accountPasswordRecoveryRequests.values()].find(
        (item) => item.status === "pending" && item.userId === resolvedUser.id
      );
      if (existingPending) {
        return res.status(202).json({
          data: {
            requestId: existingPending.id,
            status: existingPending.status,
            requestedAt: existingPending.requestedAt
          },
          message:
            "Password recovery request already pending. Management will contact you after verification."
        });
      }

      const request: AccountPasswordRecoveryRequestRecord = {
        id: randomUUID(),
        userId: resolvedUser.id,
        identifierType: resolved.identifierType,
        normalizedIdentifier: resolved.normalizedIdentifier,
        fullName: resolvedUser.fullName,
        email: resolvedUser.email,
        phone: resolvedUser.phone,
        role: resolvedUser.role,
        note: parsed.note?.trim() || undefined,
        status: "pending",
        requestedAt: new Date().toISOString()
      };
      rememberAccountPasswordRecoveryRequest(request);

      return res.status(202).json({
        data: {
          requestId: request.id,
          status: request.status,
          requestedAt: request.requestedAt
        },
        message: "Recovery request received. Management will verify and reset your password."
      });
    } catch (error) {
      return next(error);
    }
  });

  app.get("/api/auth/session", async (req, res) => {
    const session = await getUserSession(req, res, "tenant");
    if (!session) {
      return;
    }

    const derivedRole =
      hasUserRoleAtLeast(session.role, "landlord") ||
      session.role === "admin" ||
      session.role === "root_admin"
        ? session.role
        : listCaretakerBuildingIdsForUser(session.userId).size > 0
          ? ("caretaker" as const)
          : session.role;

    return res.json({
      data: {
        userId: session.userId,
        role: derivedRole,
        fullName: session.fullName,
        email: session.email,
        phoneMask: maskPhone(session.phone),
        expiresAt: session.expiresAt
      }
    });
  });

  app.post("/api/auth/logout", async (req, res) => {
    if (userAccountService) {
      await userAccountService.logout(readUserSessionToken(req));
    }
    adminAuthService.revokeSession(readAdminSessionToken(req));
    res.clearCookie(userSessionCookieName, clearSessionCookieOptions());
    res.clearCookie(adminSessionCookieName, clearSessionCookieOptions());
    return res.json({ data: { signedOut: true } });
  });

  app.post("/api/auth/resident/setup-password", (_req, res) => {
    return res.status(410).json({
      error:
        "Resident setup-password flow is deprecated. Use resident sign-in or forgot password recovery."
    });
  });

  app.post("/api/auth/resident/signup", async (req, res, next) => {
    try {
      if (!userAccountService || !repositoryContext.prisma) {
        return res.status(503).json({
          error: "Resident sign-up requires database-backed user accounts."
        });
      }

      if (await hasAnyActiveAuthSession(req)) {
        return res.status(409).json({
          error: "Already signed in. Sign out before creating another account."
        });
      }

      const parsed = residentPasswordSetupSchema.parse(req.body ?? {});
      const application = await userAccountService.submitResidentSignupApplication(parsed);
      const expiresAtMs = new Date(application.session.expiresAt).getTime();
      const maxAgeMs = Math.max(0, expiresAtMs - Date.now());
      res.cookie(
        userSessionCookieName,
        application.session.token,
        buildSessionCookieOptions(req, maxAgeMs)
      );

      return res.status(201).json({
        data: {
          token: application.session.token,
          applicationId: application.id,
          status: application.status,
          verificationStatus: "pending_review",
          role: "resident",
          tenancyId: application.session.residentTenancyId,
          building: application.building,
          buildingId: application.building.id,
          houseNumber: application.houseNumber,
          phoneMask: maskPhone(application.tenant.phone),
          expiresAt: application.session.expiresAt,
          mustChangePassword: application.session.mustChangePassword
        },
        message:
          "Access request submitted. You are signed in now and marked pending landlord review."
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to sign up resident";
      if (message === "HOUSE_NOT_FOUND" || message === "HOUSE_NUMBER_NOT_FOUND") {
        return res.status(404).json({
          error: "House number not found in this building. Confirm house assignment with management."
        });
      }
      if (message === "BUILDING_NOT_FOUND") {
        return res.status(404).json({
          error: "Building not found. Confirm building assignment with management."
        });
      }
      if (message === "HOUSE_OCCUPIED") {
        return res.status(409).json({
          error:
            "This house is already tied to a different phone number. Contact management to update tenant details."
        });
      }
      if (message === "TENANCY_ALREADY_ACTIVE") {
        return res.status(409).json({
          error: "This tenant is already approved for that room. Use sign in instead."
        });
      }
      if (message === "ACCOUNT_DISABLED") {
        return res.status(403).json({ error: "Account is disabled. Contact support." });
      }
      if (message === "RESIDENT_SIGNUP_ROLE_CONFLICT") {
        return res.status(409).json({
          error:
            "This phone belongs to a non-tenant account (landlord/admin). Use a tenant phone, or revoke landlord/admin access first."
        });
      }
      return next(error);
    }
  });

  app.post("/api/auth/resident/login-phone", async (req, res, next) => {
    try {
      if (!userAccountService || !repositoryContext.prisma) {
        return res.status(503).json({
          error: "Resident login requires database-backed user accounts."
        });
      }

      const parsed = residentPhoneLoginSchema.parse(req.body);
      const login = await userAccountService.createResidentPhoneSession(parsed);
      const { session } = login;

      const expiresAtMs = new Date(session.expiresAt).getTime();
      const maxAgeMs = Math.max(0, expiresAtMs - Date.now());
      res.cookie(userSessionCookieName, session.token, buildSessionCookieOptions(req, maxAgeMs));

      return res.json({
        data: {
          token: session.token,
          role: "resident",
          tenancyId: login.tenancyId,
          buildingId: login.buildingId,
          houseNumber: login.houseNumber,
          phoneMask: maskPhone(session.phone),
          verificationStatus: toResidentVerificationStatus(
            (
              await repositoryContext.prisma.tenantApplication.findFirst({
                where: {
                  userId: session.userId,
                  buildingId: login.buildingId,
                  houseNumber: login.houseNumber
                },
                select: { status: true },
                orderBy: { updatedAt: "desc" }
              })
            )?.status
          ),
          expiresAt: session.expiresAt,
          mustChangePassword: session.mustChangePassword
        }
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to login resident";
      if (message === "TENANCY_NOT_FOUND") {
        return res.status(404).json({
          error:
            "No active resident room is linked to those credentials. Confirm the phone number or request access."
        });
      }
      if (message === "RESIDENT_PASSWORD_INCORRECT") {
        return res.status(401).json({
          error: "Incorrect resident password. Try again or use Forgot Password."
        });
      }
      if (message === "LOGIN_RATE_LIMITED") {
        return res.status(429).json({ error: "Too many login attempts. Try again later." });
      }
      if (message === "ACCOUNT_DISABLED") {
        return res.status(403).json({ error: "Account is disabled. Contact support." });
      }
      if (message === "RESIDENT_LOGIN_ROLE_CONFLICT") {
        return res.status(403).json({
          error:
            "This phone belongs to a non-tenant account. Use landlord/admin portal for this account."
        });
      }
      return next(error);
    }
  });

  app.post("/api/auth/resident/password-recovery/request", async (req, res, next) => {
    try {
      if (!userAccountService || !repositoryContext.prisma) {
        return res.status(503).json({
          error: "Password recovery requires database-backed user accounts."
        });
      }

      const parsed = residentPasswordRecoveryRequestSchema.parse(req.body ?? {});
      const building = await store.getBuilding(parsed.buildingId);
      if (!building) {
        return res.status(404).json({ error: "Building not found" });
      }

      const houseNumber = parsed.houseNumber.trim().toUpperCase();
      const phoneNumber = normalizeKenyaPhone(parsed.phoneNumber);
      const hasMatchingTenancy = await userAccountService.hasActiveResidentTenancy({
        buildingId: parsed.buildingId,
        houseNumber,
        phoneNumber
      });

      if (!hasMatchingTenancy) {
        return res.status(404).json({
          error: "Active tenancy not found for the provided building, house number, and phone."
        });
      }

      const recoveryKey = `${parsed.buildingId}:${houseNumber}:${phoneNumber}`;
      const now = Date.now();
      const rateSnapshot = passwordRecoveryRateWindow.get(recoveryKey);
      if (
        rateSnapshot &&
        now - rateSnapshot.windowStartMs < PASSWORD_RECOVERY_RATE_WINDOW_MS
      ) {
        if (rateSnapshot.count >= PASSWORD_RECOVERY_RATE_MAX_PER_KEY) {
          return res.status(429).json({
            error: "Too many recovery requests. Please wait before trying again."
          });
        }
        rateSnapshot.count += 1;
      } else {
        passwordRecoveryRateWindow.set(recoveryKey, {
          windowStartMs: now,
          count: 1
        });
      }

      const existingPending = [...residentPasswordRecoveryRequests.values()].find(
        (item) =>
          item.status === "pending" &&
          item.buildingId === parsed.buildingId &&
          item.houseNumber === houseNumber &&
          item.phoneNumber === phoneNumber
      );

      if (existingPending) {
        return res.status(202).json({
          data: {
            requestId: existingPending.id,
            status: existingPending.status,
            requestedAt: existingPending.requestedAt
          },
          message:
            "Recovery request already pending. Management will contact you after verification."
        });
      }

      const request: ResidentPasswordRecoveryRequestRecord = {
        id: randomUUID(),
        buildingId: parsed.buildingId,
        houseNumber,
        phoneNumber,
        note: parsed.note?.trim() || undefined,
        status: "pending",
        requestedAt: new Date().toISOString()
      };
      rememberResidentPasswordRecoveryRequest(request);

      return res.status(202).json({
        data: {
          requestId: request.id,
          status: request.status,
          requestedAt: request.requestedAt
        },
        message: "Recovery request received. Management will verify and reset your password."
      });
    } catch (error) {
      return next(error);
    }
  });

  app.get("/api/auth/resident/session", async (req, res) => {
    const session = await getResidentSession(req, res);
    if (!session) {
      return;
    }
    const agreementState = await userAccountService?.getActiveTenantAgreement({
      buildingId: session.buildingId,
      houseNumber: session.houseNumber
    });
    const identityRequirement = buildResidentIdentityRequirement(
      session,
      agreementState?.agreement
    );

    return res.json({
      data: {
        role: session.role,
        tenancyId: session.tenancyId,
        buildingId: session.buildingId,
        houseNumber: session.houseNumber,
        phoneMask: maskPhone(session.phoneNumber),
        verificationStatus: session.verificationStatus,
        mustChangePassword: Boolean(session.mustChangePassword),
        tenancyCreatedAt: session.tenancyCreatedAt,
        identityRequirement,
        expiresAt: session.expiresAt
      }
    });
  });

  app.get("/api/resident/profile", async (req, res, next) => {
    try {
      if (!userAccountService) {
        return res.status(503).json({
          error: "Resident profile requires database-backed user accounts."
        });
      }

      const session = await getResidentSession(req, res);
      if (!session) {
        return;
      }

      const building = await store.getBuilding(session.buildingId);
      const data = await userAccountService.getActiveTenantAgreement({
        buildingId: session.buildingId,
        houseNumber: session.houseNumber
      });

      if (!data.hasActiveResident || !data.resident) {
        return res.status(409).json({
          error: "Active tenancy not found for this resident session."
        });
      }

      if (data.resident.userId !== session.userId) {
        return res.status(403).json({
          error: "Resident profile access denied for this tenancy."
        });
      }

      return res.json({
        data: {
          session: {
            role: session.role,
            tenancyId: session.tenancyId,
            buildingId: session.buildingId,
            houseNumber: session.houseNumber,
            phoneMask: maskPhone(session.phoneNumber),
            verificationStatus: session.verificationStatus,
            mustChangePassword: Boolean(session.mustChangePassword),
            tenancyCreatedAt: session.tenancyCreatedAt,
            identityRequirement: buildResidentIdentityRequirement(
              session,
              data.agreement
            ),
            expiresAt: session.expiresAt
          },
          building: building
            ? {
                id: building.id,
                name: building.name,
                address: building.address,
                county: building.county
              }
            : {
                id: session.buildingId,
                name: session.buildingId,
                address: "",
                county: ""
              },
          resident: data.resident,
          agreement: data.agreement,
          identityRequirement: buildResidentIdentityRequirement(
            session,
            data.agreement
          )
        }
      });
    } catch (error) {
      return next(error);
    }
  });

  app.put("/api/resident/profile", async (req, res, next) => {
    try {
      if (!userAccountService) {
        return res.status(503).json({
          error: "Resident profile requires database-backed user accounts."
        });
      }

      const session = await getResidentSession(req, res);
      if (!session) {
        return;
      }

      const parsed = residentTenantProfileUpsertSchema.parse(req.body ?? {});
      const current = await userAccountService.getActiveTenantAgreement({
        buildingId: session.buildingId,
        houseNumber: session.houseNumber
      });

      if (!current.hasActiveResident || !current.resident) {
        return res.status(409).json({
          error: "Active tenancy not found for this resident session."
        });
      }

      if (current.resident.userId !== session.userId) {
        return res.status(403).json({
          error: "Resident profile access denied for this tenancy."
        });
      }

      const currentAgreement = current.agreement;
      await userAccountService.upsertActiveTenantAgreement({
        buildingId: session.buildingId,
        houseNumber: session.houseNumber,
        payload: {
          identityType: parsed.identityType,
          identityNumber: parsed.identityNumber,
          identityDocumentUrls:
            parsed.identityDocumentUrls ??
            currentAgreement?.identityDocumentUrls ??
            undefined,
          occupationStatus: parsed.occupationStatus,
          occupationLabel: parsed.occupationLabel,
          organizationName: parsed.organizationName,
          organizationLocation: parsed.organizationLocation,
          studentRegistrationNumber: parsed.studentRegistrationNumber,
          sponsorName: parsed.sponsorName,
          sponsorPhone: parsed.sponsorPhone,
          emergencyContactName: parsed.emergencyContactName,
          emergencyContactPhone: parsed.emergencyContactPhone,
          leaseStartDate: currentAgreement?.leaseStartDate ?? undefined,
          leaseEndDate: currentAgreement?.leaseEndDate ?? undefined,
          monthlyRentKsh: currentAgreement?.monthlyRentKsh ?? undefined,
          depositKsh: currentAgreement?.depositKsh ?? undefined,
          paymentDueDay: currentAgreement?.paymentDueDay ?? undefined,
          specialTerms: currentAgreement?.specialTerms ?? undefined
        }
      });

      const building = await store.getBuilding(session.buildingId);
      const updated = await userAccountService.getActiveTenantAgreement({
        buildingId: session.buildingId,
        houseNumber: session.houseNumber
      });

      return res.json({
        data: {
          session: {
            role: session.role,
            tenancyId: session.tenancyId,
            buildingId: session.buildingId,
            houseNumber: session.houseNumber,
            phoneMask: maskPhone(session.phoneNumber),
            verificationStatus: session.verificationStatus,
            mustChangePassword: Boolean(session.mustChangePassword),
            tenancyCreatedAt: session.tenancyCreatedAt,
            identityRequirement: buildResidentIdentityRequirement(
              session,
              updated.agreement
            ),
            expiresAt: session.expiresAt
          },
          building: building
            ? {
                id: building.id,
                name: building.name,
                address: building.address,
                county: building.county
              }
            : {
                id: session.buildingId,
                name: session.buildingId,
                address: "",
                county: ""
              },
          resident: updated.resident,
          agreement: updated.agreement,
          identityRequirement: buildResidentIdentityRequirement(
            session,
            updated.agreement
          )
        }
      });
    } catch (error) {
      return next(error);
    }
  });

  app.post("/api/auth/resident/change-password", async (req, res, next) => {
    try {
      if (!userAccountService || !repositoryContext.prisma) {
        return res.status(503).json({
          error: "Resident password change requires database-backed user accounts."
        });
      }

      const session = await getResidentSession(req, res);
      if (!session) {
        return;
      }

      const parsed = residentChangePasswordSchema.parse(req.body ?? {});
      const nextSession = await userAccountService.changeResidentPassword(
        { userId: session.userId, residentTenancyId: session.tenancyId },
        parsed
      );

      const expiresAtMs = new Date(nextSession.expiresAt).getTime();
      const maxAgeMs = Math.max(0, expiresAtMs - Date.now());
      res.cookie(
        userSessionCookieName,
        nextSession.token,
        buildSessionCookieOptions(req, maxAgeMs)
      );

      return res.json({
        data: {
          token: nextSession.token,
          role: "resident",
          tenancyId: session.tenancyId,
          buildingId: session.buildingId,
          houseNumber: session.houseNumber,
          phoneMask: maskPhone(nextSession.phone),
          verificationStatus: session.verificationStatus,
          expiresAt: nextSession.expiresAt,
          mustChangePassword: nextSession.mustChangePassword
        }
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to change password";
      if (message === "ACCOUNT_DISABLED") {
        return res.status(403).json({ error: "Account is disabled. Contact support." });
      }
      return next(error);
    }
  });

  app.post("/api/auth/resident/logout", async (req, res) => {
    if (userAccountService) {
      await userAccountService.logout(readUserSessionToken(req));
    }
    res.clearCookie(userSessionCookieName, clearSessionCookieOptions());
    return res.json({ data: { signedOut: true } });
  });

  app.post("/api/auth/admin/login", (req, res, next) => {
    try {
      const parsed = adminLoginSchema.parse(req.body);
      const session = adminAuthService.login(parsed);

      if (!session || !adminAuthService.hasRole(session, "admin")) {
        return res.status(401).json({ error: "Invalid admin login credentials" });
      }

      const expiresAtMs = new Date(session.expiresAt).getTime();
      const maxAgeMs = Math.max(0, expiresAtMs - Date.now());

      res.cookie(adminSessionCookieName, session.token, buildSessionCookieOptions(req, maxAgeMs));

      return res.json({
        data: {
          role: session.role,
          expiresAt: session.expiresAt
        }
      });
    } catch (error) {
      return next(error);
    }
  });

  app.get("/api/auth/admin/session", (req, res) => {
    const session = getAdminSession(req, res, "admin");
    if (!session) {
      return;
    }

    return res.json({
      data: {
        role: session.role,
        expiresAt: session.expiresAt
      }
    });
  });

  app.get("/api/admin/auth/access", (req, res) => {
    const admin = getAdminSession(req, res, "root_admin");
    if (!admin) {
      return;
    }

    return res.json({
      data: adminAuthService.getAdminCredentialSummary(),
      role: admin.role
    });
  });

  app.patch("/api/admin/auth/access", (req, res, next) => {
    try {
      const admin = getAdminSession(req, res, "root_admin");
      if (!admin) {
        return;
      }

      const parsed = adminAccessCredentialUpdateSchema.parse(req.body ?? {});
      const data = adminAuthService.updateAdminCredentials(parsed);

      logHousingEvent("admin.access_credentials_updated", {
        actorRole: admin.role,
        username: data.username
      });

      return res.json({
        data,
        role: admin.role
      });
    } catch (error) {
      return next(error);
    }
  });

  app.post("/api/auth/admin/logout", (req, res) => {
    adminAuthService.revokeSession(readAdminSessionToken(req));
    res.clearCookie(adminSessionCookieName, clearSessionCookieOptions());
    return res.json({ data: { signedOut: true } });
  });

  app.post("/api/admin/auth/resident/password-reset", async (req, res, next) => {
    try {
      const admin = getAdminSession(req, res, "admin");
      if (!admin) {
        return;
      }

      if (!userAccountService) {
        return res.status(503).json({
          error: "User account service unavailable. Database connection is required."
        });
      }

      const parsed = residentAdminPasswordResetSchema.parse(req.body);
      const data = await userAccountService.resetResidentPasswordByTenancy(parsed);
      return res.json({
        data,
        reviewedByRole: admin.role
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to reset resident password";
      if (message === "TENANCY_NOT_FOUND") {
        return res.status(404).json({
          error: "Active tenancy not found for the provided building, house number, and phone."
        });
      }
      return next(error);
    }
  });

  app.get(
    "/api/admin/auth/resident/password-recovery-requests",
    async (req, res, next) => {
      try {
        const admin = getAdminSession(req, res, "admin");
        if (!admin) {
          return;
        }

        const statusRaw =
          typeof req.query.status === "string" ? req.query.status : undefined;
        const status: ResidentPasswordRecoveryStatus | undefined =
          statusRaw === "pending" ||
          statusRaw === "approved" ||
          statusRaw === "rejected"
            ? statusRaw
            : undefined;

        const limitRaw = Number(req.query.limit ?? 500);
        const limit = Number.isFinite(limitRaw)
          ? Math.min(Math.max(limitRaw, 1), 2_000)
          : 500;

        const data = listResidentPasswordRecoveryRequests(status, limit).map(
          (item) => ({
            ...item,
            phoneMask: maskPhone(item.phoneNumber)
          })
        );

        return res.json({
          data,
          role: admin.role
        });
      } catch (error) {
        return next(error);
      }
    }
  );

  app.patch(
    "/api/admin/auth/resident/password-recovery-requests/:requestId",
    async (req, res, next) => {
      try {
        const admin = getAdminSession(req, res, "admin");
        if (!admin) {
          return;
        }

        if (!userAccountService) {
          return res.status(503).json({
            error: "User account service unavailable. Database connection is required."
          });
        }

        const parsed = residentPasswordRecoveryReviewSchema.parse(req.body ?? {});
        const existing = residentPasswordRecoveryRequests.get(req.params.requestId);
        if (!existing) {
          return res
            .status(404)
            .json({ error: "Password recovery request not found." });
        }

        if (existing.status !== "pending") {
          return res.status(409).json({
            error: "Password recovery request has already been reviewed."
          });
        }

        const reviewerSession = await resolveOptionalUserSession(req);
        const reviewedByUserId =
          reviewerSession && hasUserRoleAtLeast(reviewerSession.role, "admin")
            ? reviewerSession.userId
            : undefined;
        const reviewedAt = new Date().toISOString();

        if (parsed.action === "reject") {
          const updated: ResidentPasswordRecoveryRequestRecord = {
            ...existing,
            status: "rejected",
            reviewedAt,
            reviewedByRole: admin.role,
            reviewedByUserId,
            reviewerNote: parsed.note?.trim() || undefined
          };
          rememberResidentPasswordRecoveryRequest(updated);
          return res.json({
            data: updated,
            role: admin.role
          });
        }

        try {
          const reset = await userAccountService.resetResidentPasswordByTenancy({
            buildingId: existing.buildingId,
            houseNumber: existing.houseNumber,
            phoneNumber: existing.phoneNumber,
            temporaryPassword: parsed.temporaryPassword ?? ""
          });

          const updated: ResidentPasswordRecoveryRequestRecord = {
            ...existing,
            status: "approved",
            reviewedAt,
            reviewedByRole: admin.role,
            reviewedByUserId,
            reviewerNote: parsed.note?.trim() || undefined,
            temporaryPasswordIssuedAt: reviewedAt
          };
          rememberResidentPasswordRecoveryRequest(updated);

          return res.json({
            data: {
              request: updated,
              reset
            },
            role: admin.role
          });
        } catch (error) {
          const message =
            error instanceof Error
              ? error.message
              : "Unable to reset resident password.";
          if (message === "TENANCY_NOT_FOUND") {
            return res.status(404).json({
              error:
                "Active tenancy not found for the provided building, house number, and phone."
            });
          }
          throw error;
        }
      } catch (error) {
        return next(error);
      }
    }
  );

  app.get(
    "/api/admin/auth/account/password-recovery-requests",
    async (req, res, next) => {
      try {
        const admin = getAdminSession(req, res, "admin");
        if (!admin) {
          return;
        }

        const statusRaw =
          typeof req.query.status === "string" ? req.query.status : undefined;
        const status: AccountPasswordRecoveryStatus | undefined =
          statusRaw === "pending" ||
          statusRaw === "approved" ||
          statusRaw === "rejected"
            ? statusRaw
            : undefined;

        const limitRaw = Number(req.query.limit ?? 500);
        const limit = Number.isFinite(limitRaw)
          ? Math.min(Math.max(limitRaw, 1), 2_000)
          : 500;

        const data = listAccountPasswordRecoveryRequests(status, limit).map(
          (item) => ({
            ...item,
            phoneMask: maskPhone(item.phone)
          })
        );

        return res.json({
          data,
          role: admin.role
        });
      } catch (error) {
        return next(error);
      }
    }
  );

  app.patch(
    "/api/admin/auth/account/password-recovery-requests/:requestId",
    async (req, res, next) => {
      try {
        const admin = getAdminSession(req, res, "admin");
        if (!admin) {
          return;
        }

        if (!userAccountService) {
          return res.status(503).json({
            error: "User account service unavailable. Database connection is required."
          });
        }

        const parsed = residentPasswordRecoveryReviewSchema.parse(req.body ?? {});
        const existing = accountPasswordRecoveryRequests.get(req.params.requestId);
        if (!existing) {
          return res
            .status(404)
            .json({ error: "Password recovery request not found." });
        }

        if (existing.status !== "pending") {
          return res.status(409).json({
            error: "Password recovery request has already been reviewed."
          });
        }

        const reviewerSession = await resolveOptionalUserSession(req);
        const reviewedByUserId =
          reviewerSession && hasUserRoleAtLeast(reviewerSession.role, "admin")
            ? reviewerSession.userId
            : undefined;
        const reviewedAt = new Date().toISOString();

        if (parsed.action === "reject") {
          const updated: AccountPasswordRecoveryRequestRecord = {
            ...existing,
            status: "rejected",
            reviewedAt,
            reviewedByRole: admin.role,
            reviewedByUserId,
            reviewerNote: parsed.note?.trim() || undefined
          };
          rememberAccountPasswordRecoveryRequest(updated);
          return res.json({
            data: updated,
            role: admin.role
          });
        }

        try {
          const reset = await userAccountService.resetPasswordByUserId({
            userId: existing.userId,
            temporaryPassword: parsed.temporaryPassword ?? "",
            requirePasswordChange: true
          });

          const updated: AccountPasswordRecoveryRequestRecord = {
            ...existing,
            status: "approved",
            reviewedAt,
            reviewedByRole: admin.role,
            reviewedByUserId,
            reviewerNote: parsed.note?.trim() || undefined,
            temporaryPasswordIssuedAt: reviewedAt
          };
          rememberAccountPasswordRecoveryRequest(updated);

          return res.json({
            data: {
              request: updated,
              reset
            },
            role: admin.role
          });
        } catch (error) {
          const message =
            error instanceof Error
              ? error.message
              : "Unable to reset account password.";
          if (message === "USER_NOT_FOUND") {
            return res.status(404).json({
              error: "Account for this recovery request no longer exists."
            });
          }
          if (message === "ACCOUNT_DISABLED") {
            return res.status(403).json({
              error: "Account is disabled. Contact support."
            });
          }
          throw error;
        }
      } catch (error) {
        return next(error);
      }
    }
  );

  app.post("/api/auth/landlord/login", (req, res, next) => {
    try {
      const parsed = adminLoginSchema.parse(req.body);
      const session = adminAuthService.login(parsed);

      if (!session || !adminAuthService.hasRole(session, "landlord")) {
        return res.status(401).json({ error: "Invalid landlord login credentials" });
      }

      const expiresAtMs = new Date(session.expiresAt).getTime();
      const maxAgeMs = Math.max(0, expiresAtMs - Date.now());

      res.cookie(adminSessionCookieName, session.token, buildSessionCookieOptions(req, maxAgeMs));

      return res.json({
        data: {
          role: session.role,
          expiresAt: session.expiresAt
        }
      });
    } catch (error) {
      return next(error);
    }
  });

  app.get("/api/auth/landlord/session", async (req, res) => {
    const legacySession = adminAuthService.getSession(readAdminSessionToken(req));
    if (legacySession && adminAuthService.hasRole(legacySession, "landlord")) {
      return res.json({
        data: {
          role: legacySession.role,
          expiresAt: legacySession.expiresAt
        }
      });
    }

    if (userAccountService) {
      const userSession = await userAccountService.getSession(readUserSessionToken(req));
      const hasCaretakerAccess = userSession
        ? listCaretakerBuildingIdsForUser(userSession.userId).size > 0
        : false;
      if (
        userSession &&
        (hasUserRoleAtLeast(userSession.role, "landlord") || hasCaretakerAccess)
      ) {
        return res.json({
          data: {
            role: hasUserRoleAtLeast(userSession.role, "landlord")
              ? userSession.role
              : "caretaker",
            expiresAt: userSession.expiresAt
          }
        });
      }
    }

    return res.status(401).json({ error: "Landlord authentication required" });
  });

  app.post("/api/auth/landlord/logout", (req, res) => {
    adminAuthService.revokeSession(readAdminSessionToken(req));
    res.clearCookie(adminSessionCookieName, clearSessionCookieOptions());
    return res.json({ data: { signedOut: true } });
  });

  app.get("/api/buildings", async (req, res, next) => {
    try {
      const raw = await store.listBuildings();
      const buildings = raw.map((building) => ({
        id: building.id,
        name: building.name,
        address: building.address,
        county: building.county,
        cctvStatus: building.cctvStatus,
        units: building.units,
        houseNumbers: building.houseNumbers ?? [],
        updatedAt: building.updatedAt
      }));

      return res.json({ data: buildings });
    } catch (error) {
      return next(error);
    }
  });

  app.get("/api/admin/buildings", async (req, res, next) => {
    try {
      const admin = getAdminSession(req, res, "admin");
      if (!admin) {
        return;
      }

      const raw = await store.listBuildings();
      const ownerById = new Map<
        string,
        { id: string; fullName: string; phone: string; role: UserRole }
      >();

      if (repositoryContext.prisma) {
        const ownerIds = [
          ...new Set(raw.map((item) => item.landlordUserId).filter(Boolean))
        ] as string[];
        if (ownerIds.length > 0) {
          const owners = await repositoryContext.prisma.housingUser.findMany({
            where: { id: { in: ownerIds } },
            select: {
              id: true,
              fullName: true,
              phone: true,
              role: true
            }
          });
          owners.forEach((owner) => {
            ownerById.set(owner.id, owner);
          });
        }
      }

      const data = raw.map((building) => {
        const owner = building.landlordUserId
          ? ownerById.get(building.landlordUserId)
          : undefined;
        return {
          id: building.id,
          name: building.name,
          address: building.address,
          county: building.county,
          cctvStatus: building.cctvStatus,
          units: building.units,
          houseNumbers: building.houseNumbers ?? [],
          landlordUserId: building.landlordUserId ?? null,
          landlordOwnerName: owner?.fullName ?? null,
          landlordOwnerPhone: owner?.phone ?? null,
          landlordOwnerRole: owner?.role ?? null,
          updatedAt: building.updatedAt
        };
      });

      return res.json({ data, role: admin.role });
    } catch (error) {
      return next(error);
    }
  });

  app.patch("/api/admin/buildings/:buildingId/landlord", async (req, res, next) => {
    try {
      if (isPlatformLandlordGovernanceDisabled()) {
        return res.status(410).json({
          error: "Building landlord assignment is disabled for this dedicated app."
        });
      }

      const admin = getAdminSession(req, res, "admin");
      if (!admin) {
        return;
      }

      if (!repositoryContext.prisma || !userAccountService) {
        return res.status(503).json({
          error: "Database-backed user accounts are required for landlord assignment."
        });
      }

      const buildingId = req.params.buildingId?.trim();
      if (!buildingId) {
        return res.status(400).json({ error: "Building id is required." });
      }

      const building = await store.getBuilding(buildingId);
      if (!building) {
        return res.status(404).json({ error: "Building not found." });
      }

      const parsed = adminAssignBuildingLandlordSchema.parse(req.body ?? {});
      const resolved = await userAccountService.resolveUserByIdentifier(
        parsed.identifier
      );
      if (!resolved.user) {
        return res.status(404).json({
          error: "No user account found for that phone/email identifier."
        });
      }

      if (resolved.user.role !== "landlord") {
        return res.status(409).json({
          error: "Selected user does not have landlord role."
        });
      }

      await repositoryContext.prisma.building.update({
        where: { id: building.id },
        data: {
          landlordUserId: resolved.user.id
        }
      });

      if (isCaptynWalletConfigured()) {
        try {
          await syncLandlordPayoutProfileInWallet({
            landlordUserId: resolved.user.id,
            buildingId: building.id,
            reason: "landlord_assignment"
          });
        } catch (profileError) {
          console.warn("Housing wallet payout profile sync failed during landlord assignment:", profileError);
        }
      }

      return res.json({
        data: {
          building: {
            id: building.id,
            name: building.name
          },
          landlord: {
            id: resolved.user.id,
            fullName: resolved.user.fullName,
            phone: resolved.user.phone
          },
          assignedAt: new Date().toISOString()
        },
        role: admin.role
      });
    } catch (error) {
      return next(error);
    }
  });

  app.get("/api/landlord/startup", async (req, res, next) => {
    try {
      const context = await resolveLandlordAccessContext(req, res);
      if (!context) {
        return;
      }

      const data = await buildLandlordStartupPayload(context);
      return res.json({ data, role: context.role });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to load landlord data.";
      if (message === "Landlord authentication required") {
        return res.status(401).json({ error: message });
      }
      if (
        message.includes("database connection") ||
        message.includes("Database connection") ||
        message.includes("unavailable")
      ) {
        return res.status(503).json({ error: message });
      }
      return next(error);
    }
  });

  app.get("/api/landlord/notifications", async (req, res, next) => {
    try {
      const context = await resolveLandlordAccessContext(req, res);
      if (!context) {
        return;
      }

      if (context.role === "caretaker") {
        return res.status(403).json({
          error: "House manager accounts do not receive owner alerts."
        });
      }
      if (!context.userId) {
        return res.status(403).json({
          error: "Owner alerts require an owner/staff user session."
        });
      }

      const limitRaw = Number(req.query.limit ?? 50);
      const limit = Number.isFinite(limitRaw)
        ? Math.min(Math.max(Math.trunc(limitRaw), 1), 200)
        : 50;
      const notifications = ownerNotificationService.listForUser(context.userId, {
        limit
      });

      return res.json({
        data: {
          notifications,
          unreadCount: ownerNotificationService.countUnreadForUser(context.userId)
        },
        role: context.role
      });
    } catch (error) {
      return next(error);
    }
  });

  app.post("/api/landlord/notifications/read", async (req, res, next) => {
    try {
      const context = await resolveLandlordAccessContext(req, res);
      if (!context) {
        return;
      }

      if (context.role === "caretaker") {
        return res.status(403).json({
          error: "House manager accounts do not receive owner alerts."
        });
      }
      if (!context.userId) {
        return res.status(403).json({
          error: "Owner alerts require an owner/staff user session."
        });
      }

      const parsed = ownerNotificationReadSchema.parse(req.body ?? {});
      const readCount = ownerNotificationService.markRead(
        context.userId,
        parsed.notificationIds
      );

      return res.json({
        data: {
          readCount,
          notifications: ownerNotificationService.listForUser(context.userId, {
            limit: 50
          }),
          unreadCount: ownerNotificationService.countUnreadForUser(context.userId)
        },
        role: context.role
      });
    } catch (error) {
      return next(error);
    }
  });

  app.get("/api/landlord/push/config", async (req, res) => {
    const context = await resolveLandlordAccessContext(req, res);
    if (!context) {
      return;
    }

    if (context.role === "caretaker" || !context.userId) {
      return res.json({
        data: {
          enabled: false,
          publicKey: null,
          scope: "/",
          startUrl: "/landlord"
        },
        role: context.role
      });
    }

    return res.json({
      data: {
        enabled: pushNotificationService.isEnabled(),
        publicKey: pushNotificationService.getPublicKey(),
        scope: "/",
        startUrl: "/landlord"
      },
      role: context.role
    });
  });

  app.post("/api/landlord/push-subscriptions", async (req, res, next) => {
    try {
      const context = await resolveLandlordAccessContext(req, res);
      if (!context) {
        return;
      }

      if (context.role === "caretaker" || !context.userId) {
        return res.status(403).json({
          error: "Owner browser alerts require an owner/staff user session."
        });
      }
      if (!pushNotificationService.isEnabled()) {
        return res.status(503).json({
          error: "Browser push notifications are not configured on this server."
        });
      }

      const parsed = residentPushSubscriptionSchema.parse(req.body);
      const record = pushNotificationService.upsertLandlordSubscription(
        { userId: context.userId },
        parsed,
        req.get("user-agent")
      );

      return res.status(201).json({
        data: {
          endpoint: record.endpoint,
          createdAt: record.createdAt,
          updatedAt: record.updatedAt
        },
        role: context.role
      });
    } catch (error) {
      return next(error);
    }
  });

  app.delete("/api/landlord/push-subscriptions", async (req, res, next) => {
    try {
      const context = await resolveLandlordAccessContext(req, res);
      if (!context) {
        return;
      }

      if (context.role === "caretaker" || !context.userId) {
        return res.status(403).json({
          error: "Owner browser alerts require an owner/staff user session."
        });
      }

      const parsed = deleteResidentPushSubscriptionSchema.parse(req.body);
      const removed = pushNotificationService.removeSubscription(parsed.endpoint);
      return res.json({ data: { removed }, role: context.role });
    } catch (error) {
      return next(error);
    }
  });

  app.get("/api/landlord/staff", async (req, res, next) => {
    try {
      const context = await resolveLandlordAccessContext(req, res);
      if (!context) {
        return;
      }

      if (context.role === "caretaker") {
        return res.status(403).json({
          error: "House manager accounts cannot manage owner/staff access."
        });
      }

      if (!userAccountService) {
        return res.status(503).json({
          error: "User account service unavailable. Database connection is required."
        });
      }

      const data = await userAccountService.listOwnerStaffUsers();
      return res.json({ data, role: context.role });
    } catch (error) {
      return next(error);
    }
  });

  app.post("/api/landlord/staff", async (req, res, next) => {
    try {
      const context = await resolveLandlordAccessContext(req, res);
      if (!context) {
        return;
      }

      if (context.role === "caretaker") {
        return res.status(403).json({
          error: "House manager accounts cannot manage owner/staff access."
        });
      }

      if (!userAccountService) {
        return res.status(503).json({
          error: "User account service unavailable. Database connection is required."
        });
      }

      const parsed = ownerStaffCreateSchema.parse(req.body ?? {});
      try {
        const staff = await userAccountService.createOwnerStaffUser(parsed);
        const data = await userAccountService.listOwnerStaffUsers();
        return res.status(201).json({
          data: {
            staff,
            ownerStaff: data
          },
          role: context.role
        });
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Unable to create owner/staff account.";
        if (message === "OWNER_STAFF_LIMIT_REACHED") {
          return res.status(409).json({
            error: `Owner/staff limit reached. This dedicated app allows ${OWNER_STAFF_LIMIT} active owner/staff accounts.`
          });
        }
        if (message === "EMAIL_ALREADY_EXISTS") {
          return res.status(409).json({ error: "Email is already registered." });
        }
        if (message === "PHONE_ALREADY_EXISTS") {
          return res.status(409).json({ error: "Phone number is already registered." });
        }
        throw error;
      }
    } catch (error) {
      return next(error);
    }
  });

  app.delete("/api/landlord/staff/:userId", async (req, res, next) => {
    try {
      const context = await resolveLandlordAccessContext(req, res);
      if (!context) {
        return;
      }

      if (context.role === "caretaker") {
        return res.status(403).json({
          error: "House manager accounts cannot manage owner/staff access."
        });
      }

      if (!userAccountService) {
        return res.status(503).json({
          error: "User account service unavailable. Database connection is required."
        });
      }

      const userId = req.params.userId?.trim();
      if (!userId) {
        return res.status(400).json({ error: "Staff user id is required." });
      }

      const parsed = ownerStaffDisableSchema.parse(req.body ?? {});
      try {
        const staff = await userAccountService.disableOwnerStaffUser(userId, {
          ...parsed,
          actorUserId: context.userId
        });
        const data = await userAccountService.listOwnerStaffUsers();
        return res.json({
          data: {
            staff,
            ownerStaff: data
          },
          role: context.role
        });
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Unable to disable owner/staff account.";
        if (message === "OWNER_STAFF_USER_NOT_FOUND") {
          return res.status(404).json({ error: "Owner/staff account not found." });
        }
        if (message === "OWNER_STAFF_CONFIRMATION_MISMATCH") {
          return res.status(400).json({
            error: "Confirmation user id does not match the selected account."
          });
        }
        if (message === "OWNER_STAFF_SELF_DISABLE_DENIED") {
          return res.status(409).json({
            error: "You cannot disable your own owner/staff account while signed in."
          });
        }
        if (message === "OWNER_STAFF_LAST_OWNER") {
          return res.status(409).json({
            error: "At least one active owner/staff account must remain."
          });
        }
        throw error;
      }
    } catch (error) {
      return next(error);
    }
  });

  app.get("/api/landlord/buildings", async (req, res, next) => {
    try {
      const context = await resolveLandlordAccessContext(req, res);
      if (!context) {
        return;
      }

      const data = await listLandlordBuildingSummaries(context);
      return res.json({ data, role: context.role });
    } catch (error) {
      return next(error);
    }
  });

  app.patch("/api/landlord/buildings/:buildingId/media", async (req, res, next) => {
    try {
      const context = await resolveLandlordAccessContext(req, res);
      if (!context) {
        return;
      }

      if (context.role === "caretaker") {
        return res.status(403).json({
          error: "Caretaker accounts cannot update building profile photos."
        });
      }

      const buildingId = req.params.buildingId?.trim();
      if (!buildingId) {
        return res.status(400).json({ error: "Building id is required" });
      }

      const hasAccess = await canManageBuildingFromLandlordContext(
        context,
        buildingId
      );
      if (!hasAccess) {
        return res.status(403).json({ error: "Building access denied" });
      }

      const parsed = buildingMediaUpdateSchema.parse(req.body ?? {});
      const updated = await store.updateBuildingMedia(buildingId, parsed);
      if (!updated) {
        return res.status(404).json({ error: "Building not found" });
      }

      return res.json({ data: updated, role: context.role });
    } catch (error) {
      return next(error);
    }
  });

  app.get("/api/landlord/payment-access-controls", async (req, res, next) => {
    try {
      const context = await resolveLandlordAccessContext(req, res);
      if (!context) {
        return;
      }

      const queryBuildingId =
        typeof req.query.buildingId === "string" ? req.query.buildingId.trim() : "";
      const requestedBuildingId = queryBuildingId || undefined;

      let visibleBuildings = await listVisibleBuildingsForLandlordContext(context);

      if (requestedBuildingId) {
        visibleBuildings = visibleBuildings.filter(
          (item) => item.id === requestedBuildingId
        );
      }

      const data = visibleBuildings.map((building) => ({
        ...paymentAccessService.getForBuilding(building.id),
        buildingName: building.name
      }));

      return res.json({
        data,
        role: context.role
      });
    } catch (error) {
      return next(error);
    }
  });

  app.get("/api/landlord/payment-profiles", async (req, res, next) => {
    try {
      const context = await resolveLandlordAccessContext(req, res);
      if (!context) {
        return;
      }

      const queryBuildingId =
        typeof req.query.buildingId === "string" ? req.query.buildingId.trim() : "";
      const requestedBuildingId = queryBuildingId || undefined;

      let visibleBuildings = await listVisibleBuildingsForLandlordContext(context);

      if (requestedBuildingId) {
        visibleBuildings = visibleBuildings.filter(
          (item) => item.id === requestedBuildingId
        );
      }

      const profiles = paymentProfileService.listProfiles(
        "/api/payments/mpesa/rent-callback"
      );
      const assignments = paymentProfileService
        .listAssignments(
          visibleBuildings.map((building) => building.id),
          "/api/payments/mpesa/rent-callback"
        )
        .map((item) => ({
          ...item,
          buildingName:
            visibleBuildings.find((building) => building.id === item.buildingId)?.name ??
            item.buildingId
        }));

      return res.json({
        data: {
          profiles,
          assignments
        },
        role: context.role
      });
    } catch (error) {
      return next(error);
    }
  });

  app.get("/api/landlord/payment-instructions", async (req, res, next) => {
    try {
      const context = await resolveLandlordAccessContext(req, res);
      if (!context) {
        return;
      }

      const queryBuildingId =
        typeof req.query.buildingId === "string" ? req.query.buildingId.trim() : "";
      const requestedBuildingId = queryBuildingId || undefined;

      let visibleBuildings = await listVisibleBuildingsForLandlordContext(context);

      if (requestedBuildingId) {
        visibleBuildings = visibleBuildings.filter(
          (item) => item.id === requestedBuildingId
        );
      }

      const data = visibleBuildings.map((building) =>
        buildBuildingPaymentInstructionPayload({
          buildingId: building.id,
          buildingName: building.name
        })
      );

      return res.json({
        data,
        role: context.role
      });
    } catch (error) {
      return next(error);
    }
  });

  app.get(
    "/api/landlord/buildings/:buildingId/configuration",
    async (req, res, next) => {
      try {
        const context = await resolveLandlordAccessContext(req, res);
        if (!context) {
          return;
        }

        if (!buildingConfigurationService) {
          return res.status(503).json({
            error: "Building configuration requires database connection."
          });
        }

        const buildingId = req.params.buildingId?.trim();
        const building = buildingId ? await store.getBuilding(buildingId) : null;
        if (!building) {
          return res.status(404).json({ error: "Building not found" });
        }

        const hasAccess = await canManageBuildingFromLandlordContext(
          context,
          building.id
        );
        if (!hasAccess) {
          return res.status(403).json({ error: "Building access denied" });
        }

        await buildingConfigurationService.ensureDefaultsForBuildings([building]);
        const data = await buildingConfigurationService.getForBuilding(building.id);
        if (!data) {
          return res.status(404).json({ error: "Building configuration not found" });
        }

        return res.json({
          data: {
            ...data,
            buildingName: building.name
          },
          role: context.role
        });
      } catch (error) {
        return next(error);
      }
    }
  );

  app.patch(
    "/api/landlord/buildings/:buildingId/configuration",
    async (req, res, next) => {
      try {
        const context = await resolveLandlordAccessContext(req, res);
        if (!context) {
          return;
        }

        if (context.role === "caretaker") {
          return res.status(403).json({
            error: "Caretaker accounts cannot change building configuration."
          });
        }

        if (!buildingConfigurationService) {
          return res.status(503).json({
            error: "Building configuration requires database connection."
          });
        }

        const buildingId = req.params.buildingId?.trim();
        const building = buildingId ? await store.getBuilding(buildingId) : null;
        if (!building) {
          return res.status(404).json({ error: "Building not found" });
        }

        const hasAccess = await canManageBuildingFromLandlordContext(
          context,
          building.id
        );
        if (!hasAccess) {
          return res.status(403).json({ error: "Building access denied" });
        }

        const parsed = landlordBuildingConfigurationUpdateSchema.parse(req.body ?? {});
        const data = await buildingConfigurationService.updateForBuilding(
          building.id,
          {
            rentEnabled: parsed.rentEnabled,
            waterEnabled: parsed.waterEnabled,
            electricityEnabled: parsed.electricityEnabled,
            wifiEnabled: parsed.wifiEnabled,
            tenantApplicationsEnabled: parsed.tenantApplicationsEnabled,
            tenantAgreementsEnabled: parsed.tenantAgreementsEnabled,
            incidentsEnabled: parsed.incidentsEnabled,
            maintenanceEnabled: parsed.maintenanceEnabled,
            caretakerEnabled: parsed.caretakerEnabled,
            expenditureTrackingEnabled: parsed.expenditureTrackingEnabled,
            utilityBillingMode: parsed.utilityBillingMode,
            defaultWaterRatePerUnitKsh: parsed.defaultWaterRatePerUnitKsh,
            defaultElectricityRatePerUnitKsh: parsed.defaultElectricityRatePerUnitKsh,
            defaultWaterFixedChargeKsh: parsed.defaultWaterFixedChargeKsh,
            defaultElectricityFixedChargeKsh: parsed.defaultElectricityFixedChargeKsh,
            defaultCombinedUtilityChargeKsh: parsed.defaultCombinedUtilityChargeKsh,
            utilityBalanceVisibleDays: parsed.utilityBalanceVisibleDays,
            rentGraceDays: parsed.rentGraceDays,
            allowManualRentPosting: parsed.allowManualRentPosting,
            allowManualUtilityPosting: parsed.allowManualUtilityPosting,
            wifiAccessMode: parsed.wifiAccessMode,
            note: parsed.note
          },
          {
            role: context.role,
            userId: context.userId
          }
        );

        paymentAccessService.updateForBuilding(
          building.id,
          {
            rentEnabled: data.rentEnabled,
            waterEnabled: data.waterEnabled,
            electricityEnabled: data.electricityEnabled,
            note: data.note
          },
          {
            role: context.role,
            userId: context.userId
          }
        );
        await syncDerivedBuildingConfigurationState();

        return res.json({
          data: {
            ...data,
            buildingName: building.name
          },
          role: context.role
        });
      } catch (error) {
        return next(error);
      }
    }
  );

  app.get(
    "/api/landlord/buildings/:buildingId/wifi/packages",
    async (req, res, next) => {
      try {
        const context = await resolveLandlordAccessContext(req, res);
        if (!context) {
          return;
        }

        if (!buildingWifiPackageService) {
          return res.status(503).json({
            error: "Wi-Fi package management requires database connection."
          });
        }

        const buildingId = req.params.buildingId?.trim();
        const building = buildingId ? await store.getBuilding(buildingId) : null;
        if (!building) {
          return res.status(404).json({ error: "Building not found" });
        }

        const hasAccess = await canManageBuildingFromLandlordContext(
          context,
          building.id
        );
        if (!hasAccess) {
          return res.status(403).json({ error: "Building access denied" });
        }

        await buildingWifiPackageService.ensureDefaultsForBuildings([building]);
        const data = await buildingWifiPackageService.listForBuilding(building.id);
        return res.json({
          data,
          building: {
            id: building.id,
            name: building.name
          },
          role: context.role
        });
      } catch (error) {
        return next(error);
      }
    }
  );

  app.patch(
    "/api/landlord/buildings/:buildingId/wifi/packages/:packageId",
    async (req, res, next) => {
      try {
        const context = await resolveLandlordAccessContext(req, res);
        if (!context) {
          return;
        }

        if (context.role === "caretaker") {
          return res.status(403).json({
            error: "Caretaker accounts cannot change Wi-Fi packages."
          });
        }

        if (!buildingWifiPackageService) {
          return res.status(503).json({
            error: "Wi-Fi package management requires database connection."
          });
        }

        const buildingId = req.params.buildingId?.trim();
        const building = buildingId ? await store.getBuilding(buildingId) : null;
        if (!building) {
          return res.status(404).json({ error: "Building not found" });
        }

        const hasAccess = await canManageBuildingFromLandlordContext(
          context,
          building.id
        );
        if (!hasAccess) {
          return res.status(403).json({ error: "Building access denied" });
        }

        const packageId = wifiPackageIdSchema.parse(req.params.packageId);
        const parsed = updateWifiPackageSchema.parse(req.body ?? {});
        await buildingWifiPackageService.ensureDefaultsForBuildings([building]);
        const data = await buildingWifiPackageService.updateForBuilding(
          building.id,
          packageId,
          parsed
        );

        if (!data) {
          return res.status(404).json({ error: "Package not found" });
        }

        return res.json({
          data,
          building: {
            id: building.id,
            name: building.name
          },
          role: context.role
        });
      } catch (error) {
        return next(error);
      }
    }
  );

  app.get("/api/landlord/caretaker-access-requests", async (req, res, next) => {
    try {
      const context = await resolveLandlordAccessContext(req, res);
      if (!context) {
        return;
      }

      if (!repositoryContext.prisma) {
        return res.status(503).json({
          error: "Caretaker access management requires database connection."
        });
      }

      const status = parseCaretakerAccessRequestStatus(req.query.status);
      const requestedBuildingId =
        typeof req.query.buildingId === "string" ? req.query.buildingId.trim() : "";
      const visibleIds = await listVisibleBuildingIdsForLandlordContext(context);

      if (requestedBuildingId && visibleIds && !visibleIds.has(requestedBuildingId)) {
        return res.status(403).json({ error: "Building access denied" });
      }

      const requests = listCaretakerAccessRequests({
        buildingId: requestedBuildingId || undefined,
        status
      }).filter((item) => !visibleIds || visibleIds.has(item.buildingId));

      if (requests.length === 0) {
        return res.json({ data: [], role: context.role });
      }

      const users = await repositoryContext.prisma.housingUser.findMany({
        where: {
          id: { in: [...new Set(requests.map((item) => item.userId))] }
        },
        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
          role: true,
          status: true
        }
      });
      const userById = new Map(users.map((item) => [item.id, item]));

      return res.json({
        data: requests.map((item) =>
          mapCaretakerAccessRequestWithUser(item, userById.get(item.userId) ?? null)
        ),
        role: context.role
      });
    } catch (error) {
      return next(error);
    }
  });

  app.patch(
    "/api/landlord/caretaker-access-requests/:requestId",
    async (req, res, next) => {
      try {
        const context = await resolveLandlordAccessContext(req, res);
        if (!context) {
          return;
        }

        if (context.role === "caretaker") {
          return res.status(403).json({
            error: "House manager accounts cannot review house manager requests."
          });
        }

        if (!repositoryContext.prisma) {
          return res.status(503).json({
            error: "Caretaker access management requires database connection."
          });
        }

        const requestId = String(req.params.requestId || "").trim();
        const existing = requestId ? caretakerAccessRequests.get(requestId) : null;
        if (!existing) {
          return res.status(404).json({ error: "House manager request not found" });
        }

        if (existing.status !== "pending") {
          return res.status(409).json({
            error: "House manager request has already been reviewed."
          });
        }

        const building = await store.getBuilding(existing.buildingId);
        if (!building) {
          return res.status(404).json({ error: "Building not found" });
        }

        const hasAccess = await canManageBuildingFromLandlordContext(context, building.id);
        if (!hasAccess) {
          return res.status(403).json({ error: "Building access denied" });
        }

        const canApproveCaretaker =
          context.role === "admin" ||
          context.role === "root_admin" ||
          (context.role === "landlord" && context.userId === building.landlordUserId);
        if (!canApproveCaretaker) {
          return res.status(403).json({
            error: "Only building owner/management admin can review house manager requests."
          });
        }

        const parsed = reviewCaretakerAccessRequestSchema.parse(req.body ?? {});
        const targetUser = await repositoryContext.prisma.housingUser.findUnique({
          where: { id: existing.userId },
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            role: true,
            status: true
          }
        });
        if (!targetUser) {
          return res.status(404).json({ error: "Requested account not found" });
        }

        if (parsed.action === "approve") {
          try {
            await approveCaretakerUserForBuilding({
              building,
              targetUser,
              verificationHouseNumber: existing.houseNumber,
              approvedByRole: context.role,
              approvedByUserId: context.userId,
              note: parsed.note ?? existing.note
            });
          } catch (error) {
            const message =
              error instanceof Error ? error.message : "Unable to approve house manager request.";
            if (message === "CARETAKER_TARGET_NOT_ACTIVE") {
              return res.status(409).json({
                error: "Only active users can be assigned as house manager."
              });
            }
            if (message === "CARETAKER_TARGET_ROLE_CONFLICT") {
              return res.status(409).json({
                error: "Admin/root accounts do not require house manager assignment."
              });
            }
            return res.status(409).json({ error: message });
          }
        }

        const reviewed = reviewCaretakerAccessRequest({
          requestId: existing.id,
          status: parsed.action === "approve" ? "approved" : "rejected",
          reviewedByRole: context.role,
          reviewedByUserId: context.userId,
          reviewerNote: parsed.note
        });

        return res.json({
          data: mapCaretakerAccessRequestWithUser(reviewed ?? existing, targetUser),
          role: context.role
        });
      } catch (error) {
        return next(error);
      }
    }
  );

  app.get(
    "/api/landlord/buildings/:buildingId/caretakers",
    async (req, res, next) => {
      try {
        const context = await resolveLandlordAccessContext(req, res);
        if (!context) {
          return;
        }

        if (!repositoryContext.prisma) {
          return res.status(503).json({
            error: "Caretaker access management requires database connection."
          });
        }

        const buildingId = req.params.buildingId?.trim();
        const building = buildingId ? await store.getBuilding(buildingId) : null;
        if (!building) {
          return res.status(404).json({ error: "Building not found" });
        }

        const hasAccess = await canManageBuildingFromLandlordContext(
          context,
          building.id
        );
        if (!hasAccess) {
          return res.status(403).json({ error: "Building access denied" });
        }

        const records = listCaretakerRecordsForBuilding(building.id);
        if (records.length === 0) {
          return res.json({ data: [], role: context.role });
        }

        const users = await repositoryContext.prisma.housingUser.findMany({
          where: {
            id: { in: records.map((item) => item.userId) }
          },
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            role: true,
            status: true
          }
        });
        const userById = new Map(users.map((item) => [item.id, item]));

        const data = records.map((item) => ({
          ...item,
          user: userById.get(item.userId) ?? null
        }));
        return res.json({ data, role: context.role });
      } catch (error) {
        return next(error);
      }
    }
  );

  app.post(
    "/api/landlord/buildings/:buildingId/caretakers",
    async (req, res, next) => {
      try {
        const context = await resolveLandlordAccessContext(req, res);
        if (!context) {
          return;
        }

        if (context.role === "caretaker") {
          return res.status(403).json({
            error: "Caretaker accounts cannot approve other caretakers."
          });
        }

        if (!repositoryContext.prisma) {
          return res.status(503).json({
            error: "Caretaker access management requires database connection."
          });
        }

        const buildingId = req.params.buildingId?.trim();
        const building = buildingId ? await store.getBuilding(buildingId) : null;
        if (!building) {
          return res.status(404).json({ error: "Building not found" });
        }

        const hasAccess = await canManageBuildingFromLandlordContext(
          context,
          building.id
        );
        if (!hasAccess) {
          return res.status(403).json({ error: "Building access denied" });
        }

        const canApproveCaretaker =
          context.role === "admin" ||
          context.role === "root_admin" ||
          (context.role === "landlord" && context.userId === building.landlordUserId);
        if (!canApproveCaretaker) {
          return res.status(403).json({
            error: "Only building owner/management admin can approve caretakers."
          });
        }

        const parsed = landlordAssignCaretakerSchema.parse(req.body ?? {});
        const identifier = parsed.identifier.trim();
        const verificationHouseNumber = normalizeHouseNumber(parsed.houseNumber);
        const allowedHouseSet = new Set(
          (building.houseNumbers ?? [])
            .map((item) => normalizeHouseNumber(item))
            .filter(Boolean)
        );
        const hasConfiguredHouse =
          allowedHouseSet.has(verificationHouseNumber) ||
          Boolean(
            await repositoryContext.prisma.houseUnit.findFirst({
              where: {
                buildingId: building.id,
                houseNumber: verificationHouseNumber,
                isActive: true
              },
              select: { id: true }
            })
          );
        if (!hasConfiguredHouse) {
          return res.status(404).json({
            error: `House ${verificationHouseNumber} is not registered in ${building.id}.`
          });
        }

        const email =
          identifier.includes("@") && identifier.includes(".")
            ? identifier.toLowerCase()
            : undefined;
        const phone =
          identifier.startsWith("+") ||
          identifier.startsWith("0") ||
          identifier.startsWith("254")
          ? normalizeKenyaPhone(identifier)
          : undefined;

        let targetUser = await repositoryContext.prisma.housingUser.findFirst({
          where: {
            OR: [
              { id: identifier },
              ...(email ? [{ email }] : []),
              ...(phone ? [{ phone }] : [])
            ]
          },
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            role: true,
            status: true
          }
        });

        if (!targetUser) {
          if (phone && userAccountService) {
            const phoneDigits = phone.replace(/\D/g, "");
            const caretakerEmail = `caretaker.${phoneDigits || "user"}.${randomUUID().slice(0, 8)}@caretaker.captyn.local`;
            const bootstrapPassword = `${randomUUID()}${randomUUID()}`;

            try {
              await userAccountService.register({
                fullName: `Caretaker ${verificationHouseNumber}`,
                email: caretakerEmail,
                phoneNumber: phone,
                password: bootstrapPassword
              });
            } catch (error) {
              const message =
                error instanceof Error
                  ? error.message
                  : "Unable to create caretaker account.";
              if (message !== "PHONE_ALREADY_EXISTS") {
                throw error;
              }
            }

            targetUser = await repositoryContext.prisma.housingUser.findUnique({
              where: { phone },
              select: {
                id: true,
                fullName: true,
                email: true,
                phone: true,
                role: true,
                status: true
              }
            });
          }
        }

        if (!targetUser) {
          return res.status(404).json({
            error:
              "User not found. Use exact phone (+254...) or email. Phone-based caretaker approval can auto-create account."
          });
        }

        let data;
        try {
          data = await approveCaretakerUserForBuilding({
            building,
            targetUser,
            verificationHouseNumber,
            approvedByRole: context.role,
            approvedByUserId: context.userId,
            note: parsed.note
          });
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Unable to approve caretaker.";
          if (message === "CARETAKER_TARGET_NOT_ACTIVE") {
            return res.status(409).json({
              error: "Only active users can be assigned as caretaker."
            });
          }
          if (message === "CARETAKER_TARGET_ROLE_CONFLICT") {
            return res.status(409).json({
              error: "Admin/root accounts do not require caretaker assignment."
            });
          }
          return res.status(409).json({ error: message });
        }

        for (const request of caretakerAccessRequests.values()) {
          if (
            request.userId === targetUser.id &&
            request.buildingId === building.id &&
            request.houseNumber === verificationHouseNumber &&
            request.status === "pending"
          ) {
            reviewCaretakerAccessRequest({
              requestId: request.id,
              status: "approved",
              reviewedByRole: context.role,
              reviewedByUserId: context.userId,
              reviewerNote: parsed.note
            });
          }
        }

        return res.status(201).json({
          data: {
            ...data,
            user: targetUser
          },
          role: context.role
        });
      } catch (error) {
        return next(error);
      }
    }
  );

  app.delete(
    "/api/landlord/buildings/:buildingId/caretakers/:userId",
    async (req, res, next) => {
      try {
        const context = await resolveLandlordAccessContext(req, res);
        if (!context) {
          return;
        }

        if (context.role === "caretaker") {
          return res.status(403).json({
            error: "Caretaker accounts cannot revoke caretaker access."
          });
        }

        const buildingId = req.params.buildingId?.trim();
        const userId = req.params.userId?.trim();
        const building = buildingId ? await store.getBuilding(buildingId) : null;
        if (!building || !userId) {
          return res.status(404).json({ error: "Caretaker assignment not found" });
        }

        const hasAccess = await canManageBuildingFromLandlordContext(
          context,
          building.id
        );
        if (!hasAccess) {
          return res.status(403).json({ error: "Building access denied" });
        }

        const canRevokeCaretaker =
          context.role === "admin" ||
          context.role === "root_admin" ||
          (context.role === "landlord" && context.userId === building.landlordUserId);
        if (!canRevokeCaretaker) {
          return res.status(403).json({
            error: "Only building owner/management admin can revoke caretakers."
          });
        }

        const revoked = revokeCaretakerAccess(building.id, userId);
        if (!revoked) {
          return res.status(404).json({ error: "Caretaker assignment not found" });
        }

        return res.json({ data: revoked, role: context.role });
      } catch (error) {
        return next(error);
      }
    }
  );

  app.patch(
    "/api/landlord/payment-access-controls/:buildingId",
    async (req, res, next) => {
      try {
        const context = await resolveLandlordAccessContext(req, res);
        if (!context) {
          return;
        }

        if (context.role === "caretaker") {
          return res.status(403).json({
            error: "Caretaker accounts cannot change payment access controls."
          });
        }

        const buildingId = req.params.buildingId?.trim();
        const building = buildingId ? await store.getBuilding(buildingId) : null;
        if (!building) {
          return res.status(404).json({ error: "Building not found" });
        }

        const hasAccess = await canManageBuildingFromLandlordContext(
          context,
          building.id
        );
        if (!hasAccess) {
          return res.status(403).json({ error: "Building access denied" });
        }

        const parsed = landlordPaymentAccessUpdateSchema.parse(req.body ?? {});
        if (buildingConfigurationService) {
          await buildingConfigurationService.updateForBuilding(
            building.id,
            {
              rentEnabled: parsed.rentEnabled,
              waterEnabled: parsed.waterEnabled,
              electricityEnabled: parsed.electricityEnabled,
              note: parsed.note
            },
            {
              role: context.role,
              userId: context.userId
            }
          );
        }
        const data = paymentAccessService.updateForBuilding(
          building.id,
          {
            rentEnabled: parsed.rentEnabled,
            waterEnabled: parsed.waterEnabled,
            electricityEnabled: parsed.electricityEnabled,
            note: parsed.note
          },
          {
            role: context.role,
            userId: context.userId
          }
        );

        return res.json({
          data: {
            ...data,
            buildingName: building.name
          },
          role: context.role
        });
      } catch (error) {
        return next(error);
      }
    }
  );

  app.patch(
    "/api/landlord/payment-profiles/:buildingId",
    async (req, res, next) => {
      try {
        const context = await resolveLandlordAccessContext(req, res);
        if (!context) {
          return;
        }

        if (context.role === "caretaker") {
          return res.status(403).json({
            error: "Caretaker accounts cannot change payment routing."
          });
        }

        const buildingId = req.params.buildingId?.trim();
        const building = buildingId ? await store.getBuilding(buildingId) : null;
        if (!building) {
          return res.status(404).json({ error: "Building not found" });
        }

        const hasAccess = await canManageBuildingFromLandlordContext(
          context,
          building.id
        );
        if (!hasAccess) {
          return res.status(403).json({ error: "Building access denied" });
        }

        const parsed = landlordPaymentProfileUpdateSchema.parse(req.body ?? {});
        let assignment;
        try {
          assignment = paymentProfileService.updateAssignment(
            building.id,
            {
              profileId: parsed.profileId,
              accountReference: parsed.accountReference,
              note: parsed.note
            },
            {
              role: context.role,
              userId: context.userId
            },
            "/api/payments/mpesa/rent-callback"
          );
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Unable to update payment profile.";
          if (message === "PAYMENT_PROFILE_NOT_FOUND") {
            return res.status(404).json({ error: "Payment profile not found." });
          }
          throw error;
        }

        const resolved = paymentProfileService.resolveForBuilding(
          building.id,
          "/api/payments/mpesa/rent-callback"
        );

        return res.json({
          data: {
            ...assignment,
            buildingName: building.name,
            profile: resolved.publicProfile,
            effectiveProfileId: resolved.publicProfile?.id ?? "default"
          },
          role: context.role
        });
      } catch (error) {
        return next(error);
      }
    }
  );

  app.patch(
    "/api/landlord/payment-instructions/:buildingId",
    async (req, res, next) => {
      try {
        const context = await resolveLandlordAccessContext(req, res);
        if (!context) {
          return;
        }

        if (context.role === "caretaker") {
          return res.status(403).json({
            error: "Caretaker accounts cannot change payment instructions."
          });
        }

        const buildingId = req.params.buildingId?.trim();
        const building = buildingId ? await store.getBuilding(buildingId) : null;
        if (!building) {
          return res.status(404).json({ error: "Building not found" });
        }

        const hasAccess = await canManageBuildingFromLandlordContext(
          context,
          building.id
        );
        if (!hasAccess) {
          return res.status(403).json({ error: "Building access denied" });
        }

        const parsed = landlordPaymentInstructionsUpdateSchema.parse(req.body ?? {});
        paymentInstructionService.updateForBuilding(
          building.id,
          {
            primaryMethod: parsed.primaryMethod,
            mpesaBusinessNumber: parsed.mpesaBusinessNumber,
            mpesaAccountReference: parsed.mpesaAccountReference,
            mpesaAccountName: parsed.mpesaAccountName,
            bankName: parsed.bankName,
            bankAccountName: parsed.bankAccountName,
            bankAccountNumber: parsed.bankAccountNumber,
            bankBranch: parsed.bankBranch,
            bankSwiftCode: parsed.bankSwiftCode,
            cashLocation: parsed.cashLocation,
            instructions: parsed.instructions,
            proofInstructions: parsed.proofInstructions,
            note: parsed.note
          },
          {
            role: context.role,
            userId: context.userId
          }
        );

        return res.json({
          data: buildBuildingPaymentInstructionPayload({
            buildingId: building.id,
            buildingName: building.name
          }),
          role: context.role
        });
      } catch (error) {
        return next(error);
      }
    }
  );

  app.get("/api/buildings/:buildingId", async (req, res, next) => {
    try {
      const userSession = await resolveOptionalUserSession(req);
      const legacyAdminSession = adminAuthService.getSession(readAdminSessionToken(req));
      const hasLegacyAdmin = legacyAdminSession
        ? adminAuthService.hasRole(legacyAdminSession, "admin")
        : false;
      if (!userSession && !hasLegacyAdmin) {
        res.status(401).json({ error: "Authorization required" });
        return;
      }

      if (userSession && userAccountService) {
        const hasAccess = await userAccountService.canAccessBuilding(
          userSession,
          req.params.buildingId
        );
        if (!hasAccess) {
          return res.status(403).json({ error: "Building access denied" });
        }
      }

      const building = await store.getBuilding(req.params.buildingId);
      if (!building) {
        return res.status(404).json({ error: "Building not found" });
      }

      return res.json({ data: building });
    } catch (error) {
      return next(error);
    }
  });

  app.post("/api/tenant/applications", async (req, res, next) => {
    try {
      const session = await getUserSession(req, res, "tenant");
      if (!session) {
        return;
      }

      if (!userAccountService) {
        return res.status(503).json({
          error: "User account service unavailable. Database connection is required."
        });
      }

      const parsed = tenantApplicationSchema.parse(req.body);

      try {
        const data = await userAccountService.createTenantApplication(session, parsed);
        return res.status(201).json({ data });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unable to submit tenant application";
        if (message === "TENANT_ROLE_REQUIRED") {
          return res.status(403).json({ error: "tenant role required" });
        }
        if (message === "BUILDING_NOT_FOUND") {
          return res.status(404).json({ error: "Building not found" });
        }
        if (message === "HOUSE_NUMBER_NOT_FOUND") {
          return res.status(404).json({ error: "House number not found in this building" });
        }
        if (message === "TENANCY_ALREADY_ACTIVE") {
          return res.status(409).json({ error: "Tenant is already active for this unit" });
        }
        if (message === "HOUSE_OCCUPIED") {
          return res.status(409).json({ error: "This room is already occupied." });
        }
        throw error;
      }
    } catch (error) {
      return next(error);
    }
  });

  app.get("/api/tenant/applications", async (req, res, next) => {
    try {
      const session = await getUserSession(req, res, "tenant");
      if (!session) {
        return;
      }

      if (!userAccountService) {
        return res.status(503).json({
          error: "User account service unavailable. Database connection is required."
        });
      }

      const data = await userAccountService.listMyApplications(session);
      return res.json({ data });
    } catch (error) {
      return next(error);
    }
  });

  app.post("/api/user/landlord-access-requests", async (req, res, next) => {
    try {
      return res.status(410).json({
        error: "Public landlord access requests are disabled for this dedicated app."
      });
    } catch (error) {
      return next(error);
    }
  });

  app.get("/api/user/landlord-access-requests", async (req, res, next) => {
    try {
      return res.status(410).json({
        error: "Public landlord access requests are disabled for this dedicated app."
      });
    } catch (error) {
      return next(error);
    }
  });

  app.get("/api/landlord/tenant-applications", async (req, res, next) => {
    try {
      const context = await resolveLandlordAccessContext(req, res);
      if (!context) {
        return;
      }

      const session = context.userSession;
      if (!userAccountService) {
        return res.status(503).json({
          error: "User account service unavailable. Database connection is required."
        });
      }

      const status = parseTenantApplicationStatus(req.query.status);
      const visibleBuildingIds = await listVisibleBuildingIdsForLandlordContext(context);
      const actor = session ?? {
        role: context.role as UserRole,
        userId: context.userId ?? null
      };
      const data = await userAccountService.listLandlordApplications(
        {
          ...actor,
          role: context.role as UserRole | "caretaker",
          visibleBuildingIds
        },
        status
      );
      return res.json({ data, role: context.role });
    } catch (error) {
      return next(error);
    }
  });

  app.patch("/api/landlord/tenant-applications/:applicationId", async (req, res, next) => {
    try {
      const context = await resolveLandlordAccessContext(req, res);
      if (!context) {
        return;
      }

      const session = context.userSession;
      if (!userAccountService) {
        return res.status(503).json({
          error: "User account service unavailable. Database connection is required."
        });
      }

      const parsed = landlordDecisionSchema.parse(req.body);
      const visibleBuildingIds = await listVisibleBuildingIdsForLandlordContext(context);
      const actor = session ?? {
        role: context.role as UserRole,
        userId: context.userId ?? null
      };
      try {
        const data = await userAccountService.reviewTenantApplication(
          {
            ...actor,
            role: context.role as UserRole | "caretaker",
            visibleBuildingIds
          },
          req.params.applicationId,
          parsed
        );
        await enqueueOwnerNotificationForManagerAction(context, {
          title:
            data.status === "approved"
              ? "Resident Request Approved"
              : "Resident Request Rejected",
          message: `${actorFromLandlordContext(context).name || "House manager"} ${data.status === "approved" ? "approved" : "rejected"} ${data.tenant?.fullName ?? "a resident"} for ${data.building.name} house ${data.houseNumber}.`,
          level: data.status === "approved" ? "success" : "warning",
          action:
            data.status === "approved"
              ? "tenant_application.approved"
              : "tenant_application.rejected",
          buildingId: data.building.id,
          buildingName: data.building.name,
          houseNumber: data.houseNumber,
          dedupeKey: `manager-tenant-application-${data.id}-${data.status}-${data.reviewedAt ?? Date.now()}`,
          metadata: {
            applicationId: data.id,
            tenantUserId: data.tenant?.id,
            reviewedAt: data.reviewedAt
          }
        });
        return res.json({ data });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unable to review application";
        if (message === "APPLICATION_NOT_FOUND") {
          return res.status(404).json({ error: "Tenant application not found" });
        }
        if (message === "BUILDING_ACCESS_DENIED") {
          return res.status(403).json({ error: "Application is outside this landlord's buildings" });
        }
        if (message === "HOUSE_NUMBER_NOT_FOUND") {
          return res.status(404).json({ error: "House number is no longer active for this application" });
        }
        if (message === "HOUSE_OCCUPIED") {
          return res.status(409).json({ error: "This room is already occupied." });
        }
        throw error;
      }
    } catch (error) {
      return next(error);
    }
  });

  app.get("/api/landlord/expenditures", async (req, res, next) => {
    try {
      const context = await resolveLandlordAccessContext(req, res);
      if (!context) {
        return;
      }

      const buildingId =
        typeof req.query.buildingId === "string"
          ? normalizeBuildingId(req.query.buildingId)
          : "";

      if (buildingId) {
        const building = await store.getBuilding(buildingId);
        if (!building) {
          return res.status(404).json({ error: "Building not found" });
        }

        const hasAccess = await canManageBuildingFromLandlordContext(context, building.id);
        if (!hasAccess) {
          return res.status(403).json({ error: "Building access denied" });
        }
      }

      const visibleIds = await listVisibleBuildingIdsForLandlordContext(context);
      const data = [...buildingExpenditures.values()]
        .filter((item) => {
          if (buildingId && item.buildingId !== buildingId) {
            return false;
          }
          if (!visibleIds) {
            return true;
          }
          return visibleIds.has(item.buildingId);
        })
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, 500);

      return res.json({ data, role: context.role });
    } catch (error) {
      return next(error);
    }
  });

  app.get("/api/landlord/move-out-settlements", async (req, res, next) => {
    try {
      const context = await resolveLandlordAccessContext(req, res);
      if (!context) {
        return;
      }

      if (!repositoryContext.prisma) {
        return res.status(503).json({
          error: "Move-out settlement reporting requires database connection."
        });
      }

      const buildingId =
        typeof req.query.buildingId === "string"
          ? req.query.buildingId.trim()
          : "";
      const limitRaw = Number(req.query.limit ?? 500);
      const limit = Number.isFinite(limitRaw) ? limitRaw : 500;
      const data = await listLandlordMoveOutSettlements({
        context,
        buildingId,
        limit
      });

      return res.json({ data, role: context.role });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to load move-out settlements.";
      if (message === "BUILDING_NOT_FOUND") {
        return res.status(404).json({ error: "Building not found" });
      }
      if (message === "BUILDING_ACCESS_DENIED") {
        return res.status(403).json({ error: "Building access denied" });
      }
      return next(error);
    }
  });

  app.post(
    "/api/landlord/move-out-settlements/:settlementId/collect",
    async (req, res, next) => {
      try {
        const context = await resolveLandlordAccessContext(req, res);
        if (!context) {
          return;
        }

        const settlementId = String(req.params.settlementId ?? "").trim();
        if (!settlementId) {
          return res.status(400).json({ error: "Settlement id is required." });
        }

        const parsed = residentDebtCollectionSchema.parse(req.body ?? {});
        const data = await recordResidentDebtCollection({
          context,
          settlementId,
          amountKsh: parsed.amountKsh,
          provider: parsed.provider,
          providerReference: parsed.providerReference,
          paidAt: parsed.paidAt,
          note: parsed.note
        });

        return res.json({ data, role: context.role });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unable to record resident debt collection.";
        if (message === "DATABASE_REQUIRED") {
          return res.status(503).json({
            error: "Resident debt collection requires database connection."
          });
        }
        if (message === "SETTLEMENT_NOT_FOUND") {
          return res.status(404).json({ error: "Move-out settlement not found." });
        }
        if (message === "BUILDING_ACCESS_DENIED") {
          return res.status(403).json({ error: "Building access denied" });
        }
        if (message === "SETTLEMENT_NOT_RESIDENT_DEBT") {
          return res.status(409).json({
            error: "Only resident debt settlements can be collected."
          });
        }
        if (message === "RESIDENT_DEBT_ALREADY_CLOSED") {
          return res.status(409).json({
            error: "Resident debt is already closed."
          });
        }
        if (message === "RESIDENT_DEBT_NOT_OPEN") {
          return res.status(409).json({
            error: "Resident debt is not open for collection."
          });
        }
        if (message === "RESIDENT_DEBT_AMOUNT_MISMATCH") {
          return res.status(409).json({
            error: "Collection amount must match the open resident debt total."
          });
        }
        return next(error);
      }
    }
  );

  app.post("/api/landlord/expenditures", async (req, res, next) => {
    try {
      const context = await resolveLandlordAccessContext(req, res);
      if (!context) {
        return;
      }

      const parsed = landlordExpenditureCreateSchema.parse(req.body ?? {});
      const building = await store.getBuilding(parsed.buildingId);
      if (!building) {
        return res.status(404).json({ error: "Building not found" });
      }

      const hasAccess = await canManageBuildingFromLandlordContext(context, building.id);
      if (!hasAccess) {
        return res.status(403).json({ error: "Building access denied" });
      }

      const houseNumber = parsed.houseNumber
        ? normalizeHouseNumber(parsed.houseNumber)
        : undefined;
      if (houseNumber) {
        const knownHouses = new Set(
          (building.houseNumbers ?? []).map((item) => normalizeHouseNumber(item))
        );
        if (!knownHouses.has(houseNumber)) {
          return res.status(404).json({
            error: "House number not found in this building."
          });
        }
      }

      const createdAt = new Date().toISOString();
      const data: BuildingExpenditureRecord = {
        id: randomUUID(),
        buildingId: building.id,
        houseNumber,
        category: parsed.category,
        title: parsed.title,
        amountKsh: parsed.amountKsh,
        chargeableToResident: Boolean(parsed.chargeableToResident),
        note: parsed.note,
        createdAt,
        createdByRole:
          context.role === "caretaker"
            ? "caretaker"
            : context.role === "root_admin"
              ? "root_admin"
              : context.role === "admin"
                ? "admin"
                : "landlord",
        createdByUserId: context.userId,
        createdByName: context.userSession?.fullName ?? undefined
      };

      buildingExpenditures.set(data.id, data);
      persistBuildingExpenditureState();

      return res.status(201).json({ data, role: context.role });
    } catch (error) {
      return next(error);
    }
  });

  app.delete("/api/landlord/expenditures/:expenditureId", async (req, res, next) => {
    try {
      const context = await resolveLandlordAccessContext(req, res);
      if (!context) {
        return;
      }

      if (context.role === "caretaker") {
        return res.status(403).json({
          error: "House managers cannot delete expenditure entries."
        });
      }

      const expenditureId = String(req.params.expenditureId || "").trim();
      const existing = buildingExpenditures.get(expenditureId);
      if (!existing) {
        return res.status(404).json({ error: "Expenditure not found" });
      }

      const hasAccess = await canManageBuildingFromLandlordContext(
        context,
        existing.buildingId
      );
      if (!hasAccess) {
        return res.status(403).json({ error: "Building access denied" });
      }

      buildingExpenditures.delete(expenditureId);
      persistBuildingExpenditureState();

      return res.json({ data: existing, role: context.role });
    } catch (error) {
      return next(error);
    }
  });

  app.get("/api/wifi/packages", async (req, res, next) => {
    try {
      const buildingId =
        typeof req.query.buildingId === "string" ? req.query.buildingId.trim() : "";

      if (!buildingId) {
        if (!buildingWifiPackageService) {
          const data = wifiService.listPackages().map((item) => ({
            id: item.id,
            name: item.name,
            hours: item.hours,
            priceKsh: item.priceKsh,
            profile: item.profile
          }));

          return res.json({ data });
        }

        return res.json({ data: [] });
      }

      const building = await store.getBuilding(buildingId);
      if (!building) {
        return res.status(404).json({ error: "Building not found" });
      }

      if (!buildingWifiPackageService) {
        const data = wifiService.listPackages().map((item) => ({
          id: item.id,
          name: item.name,
          hours: item.hours,
          priceKsh: item.priceKsh,
          profile: item.profile
        }));

        return res.json({ data });
      }

      await buildingWifiPackageService.ensureDefaultsForBuildings([building]);
      const config = buildingConfigurationService
        ? await buildingConfigurationService.getForBuilding(building.id)
        : null;
      if (
        config &&
        (!config.wifiEnabled || config.wifiAccessMode === "disabled")
      ) {
        return res.json({ data: [] });
      }

      const data = await buildingWifiPackageService.listForBuilding(building.id, {
        enabledOnly: true
      });

      return res.json({
        data: data.map((item) => ({
          id: item.id,
          name: item.name,
          hours: item.hours,
          priceKsh: item.priceKsh,
          profile: item.profile
        }))
      });
    } catch (error) {
      return next(error);
    }
  });

  app.post("/api/wifi/payments", async (req, res, next) => {
    try {
      const parsed = createWifiPaymentSchema.parse(req.body);
      const building = await store.getBuilding(parsed.buildingId);

      if (!building) {
        return res.status(404).json({ error: "Building not found" });
      }

      if (buildingConfigurationService) {
        await buildingConfigurationService.ensureDefaultsForBuildings([building]);
        const config = await buildingConfigurationService.getForBuilding(building.id);
        if (config && (!config.wifiEnabled || config.wifiAccessMode === "disabled")) {
          return res.status(403).json({
            error: "Wi-Fi billing is disabled for this building."
          });
        }
      }

      const selectedPackage = buildingWifiPackageService
        ? await (async () => {
            await buildingWifiPackageService.ensureDefaultsForBuildings([building]);
            return buildingWifiPackageService.getForBuildingPackage(
              building.id,
              parsed.packageId
            );
          })()
        : null;

      if (buildingWifiPackageService) {
        if (!selectedPackage) {
          return res.status(404).json({ error: "Wi-Fi package not found" });
        }

        if (!selectedPackage.enabled) {
          return res.status(403).json({ error: "Wi-Fi package is disabled" });
        }
      }

      const payment = wifiService.createPayment(parsed, {
        id: building.id,
        name: building.name
      }, selectedPackage ?? undefined);

      return res.status(202).json({ data: payment });
    } catch (error) {
      return next(error);
    }
  });

  app.post("/api/media/upload", async (req, res, next) => {
    try {
      const formData = await parseMultipartFormData(req);
      const parsed = mediaUploadSignatureRequestSchema.parse({
        category: formData.get("category"),
        buildingId: String(formData.get("buildingId") ?? "").trim() || undefined
      });
      const fileEntry = formData.get("file");

      if (!isMultipartFileLike(fileEntry)) {
        return res.status(400).json({ error: "Image file is required." });
      }

      const mimeType = String(fileEntry.type ?? "")
        .trim()
        .toLowerCase();
      const extension = resolveMediaUploadExtension(fileEntry.name, mimeType);
      if (!extension) {
        return res.status(400).json({
          error: "Only JPEG, PNG, and WebP images are supported."
        });
      }

      const sizeBytes = Math.round(Number(fileEntry.size ?? 0));
      if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) {
        return res.status(400).json({ error: "Uploaded image is empty." });
      }

      if (sizeBytes > LOCAL_MEDIA_UPLOAD_MAX_BYTES) {
        return res.status(400).json({
          error: "Image is larger than 10 MB."
        });
      }

      let targetDirectorySegments = ["misc"];

      if (
        parsed.category === "support_evidence" ||
        parsed.category === "resident_identity"
      ) {
        const session = await getResidentSession(req, res);
        if (!session) {
          return;
        }

        if (
          parsed.category === "support_evidence" &&
          session.verificationStatus !== "verified"
        ) {
          return res.status(403).json({
            error: "Support requests unlock after landlord verification."
          });
        }

        targetDirectorySegments =
          parsed.category === "resident_identity"
            ? [
                "identity",
                normalizeUploadFolderSegment(session.buildingId, "building"),
                normalizeUploadFolderSegment(session.houseNumber, "house"),
                normalizeUploadFolderSegment(session.userId, "resident")
              ]
            : [
                "support",
                normalizeUploadFolderSegment(session.buildingId, "building"),
                normalizeUploadFolderSegment(session.houseNumber, "house")
              ];
      } else {
        const context = await resolveLandlordAccessContext(req, res);
        if (!context) {
          return;
        }

        if (context.role === "caretaker") {
          return res.status(403).json({
            error: "Caretaker accounts cannot update building profile photos."
          });
        }

        if (parsed.buildingId) {
          const hasAccess = await canManageBuildingFromLandlordContext(
            context,
            parsed.buildingId
          );
          if (!hasAccess) {
            return res.status(403).json({ error: "Building access denied" });
          }
        }

        targetDirectorySegments = [
          "buildings",
          normalizeUploadFolderSegment(parsed.buildingId, "pending")
        ];
      }

      const targetDirectory = path.join(uploadsDir, ...targetDirectorySegments);
      await mkdir(targetDirectory, { recursive: true });

      const filename = `${Date.now().toString(36)}-${randomUUID().slice(0, 8)}.${extension}`;
      const filePath = path.join(targetDirectory, filename);
      const buffer = Buffer.from(await fileEntry.arrayBuffer());

      await writeFile(filePath, buffer);

      const relativeUrl = `/${path.posix.join(
        "uploads",
        ...targetDirectorySegments,
        filename
      )}`;
      const url = createPublicAssetUrl(req, relativeUrl);

      logHousingEvent("media.uploaded", {
        category: parsed.category,
        buildingId: parsed.buildingId ?? null,
        relativeUrl,
        sizeBytes: buffer.byteLength,
        mimeType
      });

      return res.status(201).json({
        data: {
          url,
          relativeUrl,
          mimeType,
          sizeBytes: buffer.byteLength
        }
      });
    } catch (error) {
      return next(error);
    }
  });

  app.get("/api/wifi/payments/:checkoutReference", (req, res) => {
    const payment = wifiService.getPayment(req.params.checkoutReference);
    if (!payment) {
      return res.status(404).json({ error: "Payment not found" });
    }

    return res.json({ data: payment });
  });

  app.post("/api/user/reports", async (req, res, next) => {
    try {
      const session = await getResidentSession(req, res);
      if (!session) {
        return;
      }

      if (session.verificationStatus !== "verified") {
        return res.status(403).json({
          error: "Support requests unlock after landlord verification."
        });
      }

      const parsed = createUserReportSchema.parse(req.body);
      const building = await store.getBuilding(session.buildingId);

      if (!building) {
        return res.status(404).json({ error: "Building not found" });
      }

      const data = userSupportService.createReport(
        parsed,
        {
          id: building.id,
          name: building.name,
          cctvStatus: building.cctvStatus
        },
        {
          houseNumber: session.houseNumber,
          phoneNumber: session.phoneNumber
        }
      );

      return res.status(201).json({ data });
    } catch (error) {
      return next(error);
    }
  });

  app.get("/api/user/reports", async (req, res) => {
    const session = await getResidentSession(req, res);
    if (!session) {
      return;
    }

    if (session.verificationStatus !== "verified") {
      return res.json({
        data: [],
        message: "Support requests unlock after landlord verification."
      });
    }

    const data = userSupportService.listReports(
      session.houseNumber,
      session.buildingId
    );
    return res.json({ data });
  });

  app.get("/api/user/push/config", async (req, res) => {
    const session = await getResidentSession(req, res);
    if (!session) {
      return;
    }

    return res.json({
      data: {
        enabled: pushNotificationService.isEnabled(),
        publicKey: pushNotificationService.getPublicKey(),
        scope: "/",
        startUrl: "/resident"
      }
    });
  });

  app.post("/api/user/push-subscriptions", async (req, res, next) => {
    try {
      const session = await getResidentSession(req, res);
      if (!session) {
        return;
      }

      if (!pushNotificationService.isEnabled()) {
        return res.status(503).json({
          error: "Browser push notifications are not configured on this server."
        });
      }

      const parsed = residentPushSubscriptionSchema.parse(req.body);
      const record = pushNotificationService.upsertResidentSubscription(
        {
          userId: session.userId,
          buildingId: session.buildingId,
          houseNumber: session.houseNumber
        },
        parsed,
        req.get("user-agent")
      );

      return res.status(201).json({
        data: {
          endpoint: record.endpoint,
          createdAt: record.createdAt,
          updatedAt: record.updatedAt
        }
      });
    } catch (error) {
      return next(error);
    }
  });

  app.delete("/api/user/push-subscriptions", async (req, res, next) => {
    try {
      const session = await getResidentSession(req, res);
      if (!session) {
        return;
      }

      const parsed = deleteResidentPushSubscriptionSchema.parse(req.body);
      const removed = pushNotificationService.removeSubscription(parsed.endpoint);
      return res.json({ data: { removed } });
    } catch (error) {
      return next(error);
    }
  });

  app.get("/api/user/notifications", async (req, res) => {
    const session = await getResidentSession(req, res);
    if (!session) {
      return;
    }

    if (hasResidentBillingAccess(session)) {
      enqueueResidentBillingNotifications(session.buildingId, session.houseNumber);
    }

    const data = filterResidentNotificationsForSession(
      session,
      userSupportService.listNotifications(session.houseNumber, session.buildingId)
    );
    return res.json({ data });
  });

  app.get("/api/user/startup", async (req, res, next) => {
    try {
      const session = await getResidentSession(req, res);
      if (!session) {
        return;
      }

      const billingVisible = hasResidentBillingAccess(session);
      if (billingVisible) {
        enqueueResidentBillingNotifications(session.buildingId, session.houseNumber);
      }
      const profileAgreementState = await userAccountService?.getActiveTenantAgreement({
        buildingId: session.buildingId,
        houseNumber: session.houseNumber
      });
      const identityRequirement = buildResidentIdentityRequirement(
        session,
        profileAgreementState?.agreement
      );

      const notifications = filterResidentNotificationsForSession(
        session,
        userSupportService.listNotifications(session.houseNumber, session.buildingId)
      );
      const reports = billingVisible
        ? userSupportService.listReports(session.houseNumber, session.buildingId)
        : [];

      const configuredRent = rentLedgerService.getRentDue(
        session.buildingId,
        session.houseNumber
      );
      const basePaymentAccess = paymentAccessService.getForBuilding(session.buildingId);
      const sessionBuilding = await store.getBuilding(session.buildingId);
      const paymentInstructions = buildBuildingPaymentInstructionPayload({
        buildingId: session.buildingId,
        buildingName: sessionBuilding?.name,
        houseNumber: session.houseNumber
      });
      const paymentAccess = billingVisible
        ? {
            ...basePaymentAccess,
            rentConfigured: Boolean(configuredRent),
            rentEnabled: basePaymentAccess.rentEnabled && Boolean(configuredRent),
            locked: false
          }
        : {
            rentEnabled: false,
            waterEnabled: false,
            electricityEnabled: false,
            rentConfigured: false,
            locked: true
          };

      let rentDue: Record<string, unknown> | null = null;
      let rentDueMessage: string | undefined;
      let rentPayments = [] as ReturnType<typeof rentLedgerService.listPayments>;
      let rentPaymentsMessage: string | undefined;
      let utilityBills: ReturnType<typeof utilityBillingService.listResidentVisibleBillsForHouse> =
        [];
      let utilityMeters: ReturnType<typeof utilityBillingService.listMeters> = [];
      let utilityLatestReadings: ReturnType<
        typeof utilityBillingService.listLatestReadingsForHouse
      > = [];
      let utilitiesMessage: string | undefined;
      let utilityPayments = [] as ReturnType<typeof utilityBillingService.listPayments>;
      let utilityPaymentsMessage: string | undefined;

      if (!billingVisible) {
        rentDueMessage = RESIDENT_BILLING_LOCKED_MESSAGE;
        rentPaymentsMessage = RESIDENT_BILLING_LOCKED_MESSAGE;
        utilitiesMessage = RESIDENT_BILLING_LOCKED_MESSAGE;
        utilityPaymentsMessage = RESIDENT_BILLING_LOCKED_MESSAGE;
      } else {
        if (!basePaymentAccess.rentEnabled) {
          rentDueMessage = "Rent is currently disabled by your landlord for this building.";
          rentPaymentsMessage =
            "Rent is currently disabled by your landlord for this building.";
        } else {
          const expenseBalanceKsh = [...buildingExpenditures.values()].reduce((sum, item) => {
            const itemHouseNumber = item.houseNumber
              ? normalizeHouseNumber(item.houseNumber)
              : "";
            if (
              item.buildingId !== normalizeBuildingId(session.buildingId) ||
              !isResidentChargeableExpenditure(item) ||
              itemHouseNumber !== normalizeHouseNumber(session.houseNumber)
            ) {
              return sum;
            }

            return sum + Math.max(0, Number(item.amountKsh ?? 0));
          }, 0);
          const due = configuredRent;
          rentDue = due
            ? {
                ...due,
                expenseBalanceKsh,
                expenseArrearsKsh: expenseBalanceKsh,
                totalRoomBalanceKsh:
                  Math.max(0, Number(due.balanceKsh ?? 0)) + expenseBalanceKsh
              }
            : null;
          rentDueMessage = rentDue
            ? undefined
            : "Rent profile is not configured yet for this house number.";
          rentPayments = rentLedgerService.listPayments({
            buildingId: session.buildingId,
            houseNumber: session.houseNumber
          });
        }

        await ensureRecurringUtilityBillsCurrent("resident.startup", {
          buildingId: session.buildingId,
          houseNumber: session.houseNumber
        });

        utilityBills = utilityBillingService.listResidentVisibleBillsForHouse(
          session.buildingId,
          session.houseNumber,
          undefined,
          24
        );
        const hasHiddenUpcomingBalances = utilityBillingService.hasHiddenUpcomingBalancesForHouse(
          session.buildingId,
          session.houseNumber
        );
        utilityMeters = utilityBillingService.listMeters({
          buildingId: session.buildingId,
          houseNumber: session.houseNumber
        });
        utilityLatestReadings = utilityBillingService.listLatestReadingsForHouse(
          session.buildingId,
          session.houseNumber
        );
        utilitiesMessage =
          utilityBills.length > 0
            ? undefined
            : hasHiddenUpcomingBalances
              ? "Your next utility bill will appear one week before the due date."
              : "Utility bills are not configured yet for this house number.";
        utilityPayments = utilityBillingService.listPayments({
          buildingId: session.buildingId,
          houseNumber: session.houseNumber,
          limit: 120
        });
      }

      return res.json({
        data: {
          paymentAccess,
          reports,
          notifications,
          paymentInstructions,
          rentDue,
          rentPayments,
          utilityBills,
          utilityMeters,
          utilityLatestReadings,
          utilityPayments,
          identityRequirement
        },
        messages: {
          rentDue: rentDueMessage,
          rentPayments: rentPaymentsMessage,
          utilities: utilitiesMessage,
          utilityPayments: utilityPaymentsMessage
        }
      });
    } catch (error) {
      return next(error);
    }
  });

  app.get("/api/user/rent-due", async (req, res) => {
    const session = await getResidentSession(req, res);
    if (!session) {
      return;
    }

    if (!hasResidentBillingAccess(session)) {
      return res.json({
        data: null,
        message: RESIDENT_BILLING_LOCKED_MESSAGE
      });
    }

    const paymentAccess = paymentAccessService.getForBuilding(session.buildingId);
    if (!paymentAccess.rentEnabled) {
      return res.json({
        data: null,
        message: "Rent is currently disabled by your landlord for this building."
      });
    }

    enqueueResidentBillingNotifications(session.buildingId, session.houseNumber);

    const rentDue = rentLedgerService.getRentDue(
      session.buildingId,
      session.houseNumber
    );
    const expenseBalanceKsh = [...buildingExpenditures.values()].reduce((sum, item) => {
      const itemHouseNumber = item.houseNumber
        ? normalizeHouseNumber(item.houseNumber)
        : "";
      if (
        item.buildingId !== normalizeBuildingId(session.buildingId) ||
        !isResidentChargeableExpenditure(item) ||
        itemHouseNumber !== normalizeHouseNumber(session.houseNumber)
      ) {
        return sum;
      }

      return sum + Math.max(0, Number(item.amountKsh ?? 0));
    }, 0);
    const data = rentDue
      ? {
          ...rentDue,
          expenseBalanceKsh,
          expenseArrearsKsh: expenseBalanceKsh,
          totalRoomBalanceKsh: Math.max(0, Number(rentDue.balanceKsh ?? 0)) + expenseBalanceKsh
        }
      : null;
    return res.json({
      data,
      message: data
        ? undefined
        : "Rent profile is not configured yet for this house number."
    });
  });

  app.get("/api/user/notification-preferences", async (req, res) => {
    const session = await getResidentSession(req, res);
    if (!session) {
      return;
    }

    return res.json({
      data: {
        sms: {
          enabled: smsNotificationService.isEnabled(),
          senderId: smsNotificationService.getSenderId(),
          phoneMask: maskPhone(session.phoneNumber),
          preferences: residentNotificationPreferenceService.getForUser(session.userId)
        }
      }
    });
  });

  app.patch("/api/user/notification-preferences", async (req, res, next) => {
    try {
      const session = await getResidentSession(req, res);
      if (!session) {
        return;
      }

      const parsed = updateResidentNotificationPreferencesSchema.parse(req.body);
      const preferences = residentNotificationPreferenceService.updateForUser(
        session.userId,
        parsed
      );

      return res.json({
        data: {
          sms: {
            enabled: smsNotificationService.isEnabled(),
            senderId: smsNotificationService.getSenderId(),
            phoneMask: maskPhone(session.phoneNumber),
            preferences
          }
        }
      });
    } catch (error) {
      return next(error);
    }
  });

  app.post("/api/internal/notifications/billing/sweep", async (_req, res, next) => {
    try {
      const providedToken = String(
        _req.header("x-notification-sweep-token") ?? ""
      ).trim();
      if (!notificationSweepToken) {
        return res.status(503).json({
          error: "Notification sweep token is not configured on this server."
        });
      }

      if (providedToken !== notificationSweepToken) {
        return res.status(401).json({ error: "Invalid notification sweep token." });
      }

      const scopeKeys = new Set<string>();
      for (const item of rentLedgerService.listCollectionStatus(5_000)) {
        scopeKeys.add(`${item.buildingId}::${item.houseNumber}`);
      }
      for (const item of utilityBillingService.listBills({ limit: 5_000 })) {
        scopeKeys.add(`${item.buildingId}::${item.houseNumber}`);
      }

      let rentNotificationsCreated = 0;
      let utilityNotificationsCreated = 0;
      for (const scopeKey of scopeKeys) {
        const separator = scopeKey.indexOf("::");
        const buildingId = scopeKey.slice(0, separator);
        const houseNumber = scopeKey.slice(separator + 2);
        const outcome = enqueueResidentBillingNotifications(buildingId, houseNumber);
        rentNotificationsCreated += outcome.rentInsertedCount;
        utilityNotificationsCreated += outcome.utilityInsertedCount;
      }

      return res.json({
        data: {
          scopesChecked: scopeKeys.size,
          rentNotificationsCreated,
          utilityNotificationsCreated,
          notificationsCreated:
            rentNotificationsCreated + utilityNotificationsCreated
        }
      });
    } catch (error) {
      return next(error);
    }
  });

  app.get("/api/user/payment-access-controls", async (req, res) => {
    const session = await getResidentSession(req, res);
    if (!session) {
      return;
    }

    if (!hasResidentBillingAccess(session)) {
      return res.json({
        data: {
          rentEnabled: false,
          waterEnabled: false,
          electricityEnabled: false,
          rentConfigured: false,
          locked: true
        },
        message: RESIDENT_BILLING_LOCKED_MESSAGE
      });
    }

    const configuredRent = rentLedgerService.getRentDue(
      session.buildingId,
      session.houseNumber
    );
    const baseAccess = paymentAccessService.getForBuilding(session.buildingId);
    const data = {
      ...baseAccess,
      rentConfigured: Boolean(configuredRent),
      rentEnabled: baseAccess.rentEnabled && Boolean(configuredRent)
    };
    return res.json({ data });
  });

  app.post("/api/user/rent/payments/mpesa/initialize", async (req, res, next) => {
    try {
      const session = await getResidentSession(req, res);
      if (!session) {
        return;
      }

      if (!requireResidentBillingAccess(res, session)) {
        return;
      }

      if (!requirePaymentChannelEnabled(res, session, "rent")) {
        return;
      }

      const parsed = initializeRentMpesaPaymentSchema.parse(req.body);
      const buildingPaymentProfile = paymentProfileService.resolveForBuilding(
        session.buildingId,
        "/api/payments/mpesa/rent-callback"
      );
      const mpesaConfig = buildingPaymentProfile.config;
      if (!buildingPaymentProfile.publicProfile || !mpesaConfig) {
        return res.status(503).json({
          error:
            "M-PESA payment profile is not available for this building. Ask management to update payment routing."
        });
      }

      if (!mpesaConfig.enabled) {
        return res.status(503).json({
          error: "M-PESA STK is disabled for this building payment profile."
        });
      }

      if (!mpesaConfig.isConfigured) {
        return res.status(503).json({
          error: "M-PESA STK is not fully configured for this building payment profile.",
          missing: mpesaConfig.missing
        });
      }

      const paymentPhone = parsed.phoneNumber?.trim() || session.phoneNumber;
      const formattedPhone = formatDarajaMsisdn(paymentPhone);
      if (!formattedPhone) {
        return res.status(400).json({
          error: "Invalid Kenyan phone number for M-PESA STK push."
        });
      }

      const initiatedAt = new Date().toISOString();
      const billingMonth =
        parsed.billingMonth ??
        `${new Date(initiatedAt).getUTCFullYear()}-${String(
          new Date(initiatedAt).getUTCMonth() + 1
        ).padStart(2, "0")}`;

      const callbackUrl = mpesaConfig.callbackUrl.includes("token=")
        ? mpesaConfig.callbackUrl
        : appendQueryParam(mpesaConfig.callbackUrl, "token", mpesaRentCallbackToken);

      const building = await store.getBuilding(session.buildingId);
      const buildingLabel =
        building?.name?.trim() || session.buildingId?.trim() || "Rent";
      const accountReference = buildRentAccountReference({
        houseNumber: session.houseNumber,
        assignment: buildingPaymentProfile.assignment,
        profile: buildingPaymentProfile.publicProfile
      });
      const client = new DarajaClient(mpesaConfig);
      const result = await client.initiateStkPush({
        amount: Math.round(parsed.amountKsh),
        phoneNumber: formattedPhone,
        accountReference,
        transactionDesc: `${buildingLabel} Rent ${billingMonth}`.slice(0, 80),
        callbackUrl
      });

      const checkoutRequestId =
        typeof result.CheckoutRequestID === "string"
          ? result.CheckoutRequestID.trim()
          : "";
      if (!checkoutRequestId) {
        return res.status(502).json({
          error: "M-PESA did not return a checkout request ID."
        });
      }

      const userSession = userAccountService
        ? await userAccountService.getSession(readUserSessionToken(req))
        : null;

      rememberRentStkRequest(checkoutRequestId, {
        buildingId: session.buildingId,
        houseNumber: session.houseNumber,
        phoneNumber: normalizeKenyaPhone(paymentPhone),
        amountKsh: Math.round(parsed.amountKsh),
        billingMonth,
        initiatedAt,
        tenantUserId: userSession?.userId,
        tenantName: userSession?.fullName,
        paymentProfileId: buildingPaymentProfile.publicProfile.id,
        paymentProfileName: buildingPaymentProfile.publicProfile.name,
        paymentAccountReference: accountReference,
        paymentShortCode: buildingPaymentProfile.publicProfile.shortCode
      });

      return res.status(202).json({
        data: {
          paymentMethod: parsed.paymentMethod,
          checkoutRequestId,
          merchantRequestId:
            typeof result.MerchantRequestID === "string"
              ? result.MerchantRequestID
              : undefined,
          responseCode: result.ResponseCode,
          responseDescription: result.ResponseDescription,
          customerMessage: result.CustomerMessage,
          billingMonth,
          amountKsh: Math.round(parsed.amountKsh),
          phoneMask: maskPhone(normalizeKenyaPhone(paymentPhone)),
          paymentProfile: {
            id: buildingPaymentProfile.publicProfile.id,
            name: buildingPaymentProfile.publicProfile.name,
            shortCode: buildingPaymentProfile.publicProfile.shortCode,
            partyB: buildingPaymentProfile.publicProfile.partyB,
            accountReference
          }
        }
      });
    } catch (error) {
      return next(error);
    }
  });

  app.post("/api/user/rent/payments/mpesa/verify", async (req, res, next) => {
    try {
      const session = await getResidentSession(req, res);
      if (!session) {
        return;
      }

      if (!requireResidentBillingAccess(res, session)) {
        return;
      }

      const parsed = verifyRentMpesaPaymentSchema.parse(req.body);
      const pending = pendingRentStkRequests.get(parsed.checkoutRequestId);
      if (!pending || pending.houseNumber !== session.houseNumber) {
        return res.status(200).json({
          data: {
            checkoutRequestId: parsed.checkoutRequestId,
            status: "unknown"
          },
          message:
            "Payment request was not found in active verification queue. Refresh your rent ledger."
        });
      }

      const throttleKey = `${session.houseNumber}:${parsed.checkoutRequestId}`;
      const now = Date.now();
      const rateSnapshot = mpesaVerifyWindow.get(throttleKey);
      if (
        rateSnapshot &&
        now - rateSnapshot.windowStartMs < MPESA_VERIFY_RATE_WINDOW_MS
      ) {
        if (rateSnapshot.count >= MPESA_VERIFY_RATE_MAX_PER_ID) {
          return res.status(429).json({
            error: "Too many M-PESA verification attempts. Please wait a moment."
          });
        }
        rateSnapshot.count += 1;
      } else {
        mpesaVerifyWindow.set(throttleKey, {
          windowStartMs: now,
          count: 1
        });
      }

      const paymentProfile = paymentProfileService.resolveProfile(
        pending.paymentProfileId,
        "/api/payments/mpesa/rent-callback"
      );
      const mpesaConfig = paymentProfile.config;
      if (!paymentProfile.publicProfile || !mpesaConfig) {
        return res.status(503).json({
          error: "M-PESA payment profile is not available for this request."
        });
      }
      if (!mpesaConfig.enabled || !mpesaConfig.isConfigured) {
        return res.status(503).json({
          error: "M-PESA STK is not configured for this payment profile.",
          missing: mpesaConfig.missing
        });
      }

      const client = new DarajaClient(mpesaConfig);
      const queryResult = await client.queryStkPush(parsed.checkoutRequestId);
      const resultCode = Number(queryResult?.ResultCode ?? Number.NaN);
      const resultDesc = String(
        queryResult?.ResultDesc || queryResult?.ResponseDescription || ""
      );

      if (Number.isFinite(resultCode) && resultCode === 0) {
        mpesaVerifyWindow.delete(throttleKey);

        return res.json({
          data: {
            checkoutRequestId: parsed.checkoutRequestId,
            status: "paid",
            billingMonth: pending.billingMonth,
            amountKsh: pending.amountKsh,
            resultCode,
            resultDesc: resultDesc || "Payment confirmed."
          },
          message:
            "M-PESA confirmed. Your rent ledger updates automatically when callback is processed."
        });
      }

      if (
        Number.isFinite(resultCode) &&
        TERMINAL_MPESA_FAILURE_CODES.has(resultCode)
      ) {
        pendingRentStkRequests.delete(parsed.checkoutRequestId);
        persistRuntimeQueuesState();
        mpesaVerifyWindow.delete(throttleKey);

        return res.status(200).json({
          data: {
            checkoutRequestId: parsed.checkoutRequestId,
            status: "failed",
            billingMonth: pending.billingMonth,
            amountKsh: pending.amountKsh,
            resultCode,
            resultDesc: resultDesc || "Payment was not completed."
          }
        });
      }

      return res.status(200).json({
        data: {
          checkoutRequestId: parsed.checkoutRequestId,
          status: "pending",
          billingMonth: pending.billingMonth,
          amountKsh: pending.amountKsh,
          resultCode: Number.isFinite(resultCode) ? resultCode : undefined,
          resultDesc: resultDesc || "Awaiting M-PESA callback."
        }
      });
    } catch (error) {
      return next(error);
    }
  });

  app.post("/api/user/rent/payments", async (req, res, next) => {
    try {
      const session = await getResidentSession(req, res);
      if (!session) {
        return;
      }

      if (!requireResidentBillingAccess(res, session)) {
        return;
      }

      if (!requirePaymentChannelEnabled(res, session, "rent")) {
        return;
      }

      const parsed = createRentPaymentSchema.parse(req.body);
      const userSession = userAccountService
        ? await userAccountService.getSession(readUserSessionToken(req))
        : null;

      let tenantUserId: string | undefined;
      let tenantName: string | undefined;

      if (userSession) {
        tenantUserId = userSession.userId;
        tenantName = userSession.fullName;
      } else {
        const resolution = await resolveTenantByHouseAndPhone({
          houseNumber: session.houseNumber,
          phoneNumber: session.phoneNumber,
          buildingId: session.buildingId
        });

        if (!resolution || resolution.type === "none") {
          return res.status(404).json({
            error: "Tenant could not be resolved for this house/phone."
          });
        }

        if (resolution.type === "ambiguous") {
          return res.status(409).json({
            error: "Tenant resolution is ambiguous for this payment."
          });
        }

        tenantUserId = resolution.tenantUserId;
        tenantName = resolution.tenantName;
      }

      const paidAt = parsed.paidAt ?? new Date().toISOString();
      const billingMonth =
        parsed.billingMonth ??
        `${new Date(paidAt).getUTCFullYear()}-${String(
          new Date(paidAt).getUTCMonth() + 1
        ).padStart(2, "0")}`;
      const buildingPaymentProfile = paymentProfileService.resolveForBuilding(
        session.buildingId,
        "/api/payments/mpesa/rent-callback"
      );

      const outcome = rentLedgerService.recordMpesaPayment({
        buildingId: session.buildingId,
        houseNumber: session.houseNumber,
        amountKsh: parsed.amountKsh,
        providerReference: parsed.providerReference,
        phoneNumber: session.phoneNumber,
        billingMonth,
        paidAt,
        tenantUserId,
        tenantName,
        paymentProfileId: buildingPaymentProfile.publicProfile?.id,
        paymentProfileName: buildingPaymentProfile.publicProfile?.name,
        paymentAccountReference: buildingPaymentProfile.assignment.accountReference
      });

      userSupportService.enqueueSystemNotifications(session.buildingId, session.houseNumber, [
        {
          title: "Rent Payment Received",
          message: `M-PESA payment ${outcome.event.providerReference} of KSh ${outcome.event.amountKsh.toLocaleString("en-US")} has been posted.`,
          level: "success",
          source: "rent",
          dedupeKey: `rent-payment-${outcome.event.providerReference}`
        }
      ]);

      const paymentStatus = outcome.snapshot
        ? outcome.snapshot.paymentStatus.toUpperCase()
        : "PENDING_PROFILE";

      return res.status(outcome.applied ? 201 : 202).json({
        data: {
          tenant: {
            userId: tenantUserId,
            name: tenantName
          },
          houseNumber: outcome.event.houseNumber,
          amountKsh: outcome.event.amountKsh,
          month: outcome.event.billingMonth,
          transactionReference: outcome.event.providerReference,
          timestamp: outcome.event.paidAt,
          receiptReference: outcome.event.providerReference,
          rentStatus: paymentStatus,
          applied: outcome.applied
        }
      });
    } catch (error) {
      return next(error);
    }
  });

  app.get("/api/user/rent-payments", async (req, res) => {
    const session = await getResidentSession(req, res);
    if (!session) {
      return;
    }

    if (!hasResidentBillingAccess(session)) {
      return res.json({
        data: [],
        message: RESIDENT_BILLING_LOCKED_MESSAGE
      });
    }

    const paymentAccess = paymentAccessService.getForBuilding(session.buildingId);
    if (!paymentAccess.rentEnabled) {
      return res.json({
        data: [],
        message: "Rent is currently disabled by your landlord for this building."
      });
    }

    const data = rentLedgerService.listPayments({
      buildingId: session.buildingId,
      houseNumber: session.houseNumber
    });
    return res.json({ data });
  });

  app.get("/api/user/utilities", async (req, res, next) => {
    try {
      const session = await getResidentSession(req, res);
      if (!session) {
        return;
      }

      if (!hasResidentBillingAccess(session)) {
        return res.json({
          data: [],
          meters: [],
          latestReadings: [],
          message: RESIDENT_BILLING_LOCKED_MESSAGE
        });
      }

      const utilityType =
        typeof req.query.utilityType === "string"
          ? utilityTypeSchema.parse(req.query.utilityType)
          : undefined;

      await ensureRecurringUtilityBillsCurrent("resident.utility_bills", {
        buildingId: session.buildingId,
        houseNumber: session.houseNumber,
        utilityType
      });

      const data = utilityBillingService.listResidentVisibleBillsForHouse(
        session.buildingId,
        session.houseNumber,
        utilityType,
        24
      );
      const hasHiddenUpcomingBalances = utilityBillingService.hasHiddenUpcomingBalancesForHouse(
        session.buildingId,
        session.houseNumber,
        utilityType
      );
      const meters = utilityBillingService.listMeters({
        buildingId: session.buildingId,
        houseNumber: session.houseNumber
      });
      const latestReadings = utilityBillingService.listLatestReadingsForHouse(
        session.buildingId,
        session.houseNumber
      );

      return res.json({
        data,
        meters,
        latestReadings,
        message:
          data.length > 0
            ? undefined
            : hasHiddenUpcomingBalances
              ? "Your next utility bill will appear one week before the due date."
            : "Utility bills are not configured yet for this house number."
      });
    } catch (error) {
      return next(error);
    }
  });

  app.get("/api/user/utility-payments", async (req, res, next) => {
    try {
      const session = await getResidentSession(req, res);
      if (!session) {
        return;
      }

      if (!hasResidentBillingAccess(session)) {
        return res.json({
          data: [],
          message: RESIDENT_BILLING_LOCKED_MESSAGE
        });
      }

      const utilityType =
        typeof req.query.utilityType === "string"
          ? utilityTypeSchema.parse(req.query.utilityType)
          : undefined;

      const data = utilityBillingService.listPayments({
        buildingId: session.buildingId,
        houseNumber: session.houseNumber,
        utilityType,
        limit: 120
      });

      return res.json({ data });
    } catch (error) {
      return next(error);
    }
  });

  app.post(
    "/api/user/utilities/:utilityType/payments/mpesa/initialize",
    async (req, res, next) => {
      try {
        const session = await getResidentSession(req, res);
        if (!session) {
          return;
        }

        if (!requireResidentBillingAccess(res, session)) {
          return;
        }

        const utilityType = utilityTypeSchema.parse(req.params.utilityType);
        if (!requirePaymentChannelEnabled(res, session, utilityType)) {
          return;
        }

        const parsed = initializeUtilityMpesaPaymentSchema.parse(req.body);
        await ensureRecurringUtilityBillsCurrent("resident.utility_mpesa_initialize", {
          buildingId: session.buildingId,
          houseNumber: session.houseNumber,
          utilityType
        });

        let preview;
        try {
          preview = utilityBillingService.previewPayment(
            utilityType,
            session.buildingId,
            session.houseNumber,
            {
              billingMonth: parsed.billingMonth,
              amountKsh: parsed.amountKsh
            }
          );
        } catch (error) {
          const message = error instanceof Error ? error.message : "Utility payment unavailable.";
          const status = message.includes("No ") ? 404 : 409;
          logHousingEvent("utility.mpesa_initialize.rejected", {
            buildingId: session.buildingId,
            houseNumber: session.houseNumber,
            utilityType,
            requestedBillingMonth: parsed.billingMonth ?? null,
            requestedAmountKsh: Math.round(parsed.amountKsh),
            reason: message
          });
          return res.status(status).json({ error: message });
        }

        const amountKsh = Math.round(parsed.amountKsh);
        const targetBill = preview.targetBill;
        const effectiveBill = preview.effectiveBill;
        const availableBalanceKsh = preview.availableBalanceKsh;

        if (amountKsh > availableBalanceKsh) {
          logHousingEvent("utility.mpesa_initialize.over_limit", {
            buildingId: session.buildingId,
            houseNumber: session.houseNumber,
            utilityType,
            requestedBillingMonth: parsed.billingMonth ?? null,
            requestedAmountKsh: amountKsh,
            availableBalanceKsh,
            candidateBillingMonths: preview.candidateBills.map((item) => ({
              billingMonth: item.billingMonth,
              balanceKsh: Math.round(Number(item.balanceKsh ?? 0))
            }))
          });
          return res.status(400).json({
            error: `Amount exceeds remaining ${utilityType} balance of KSh ${Math.round(
              availableBalanceKsh
            ).toLocaleString("en-US")}.`
          });
        }

        logHousingEvent("utility.mpesa_initialize.accepted", {
          buildingId: session.buildingId,
          houseNumber: session.houseNumber,
          utilityType,
          requestedBillingMonth: parsed.billingMonth ?? null,
          appliedStartingMonth: effectiveBill.billingMonth,
          requestedAmountKsh: amountKsh,
          availableBalanceKsh,
          candidateBillingMonths: preview.candidateBills.map((item) => ({
            billingMonth: item.billingMonth,
            balanceKsh: Math.round(Number(item.balanceKsh ?? 0))
          }))
        });

        const buildingPaymentProfile = paymentProfileService.resolveForBuilding(
          session.buildingId,
          "/api/payments/mpesa/rent-callback"
        );
        const mpesaConfig = buildingPaymentProfile.config;
        if (!buildingPaymentProfile.publicProfile || !mpesaConfig) {
          return res.status(503).json({
            error:
              "M-PESA payment profile is not available for this building. Ask management to update payment routing."
          });
        }

        if (!mpesaConfig.enabled) {
          return res.status(503).json({
            error: "M-PESA STK is disabled for this building payment profile."
          });
        }

        if (!mpesaConfig.isConfigured) {
          return res.status(503).json({
            error: "M-PESA STK is not fully configured for this building payment profile.",
            missing: mpesaConfig.missing
          });
        }

        const paymentPhone = parsed.phoneNumber?.trim() || session.phoneNumber;
        const formattedPhone = formatDarajaMsisdn(paymentPhone);
        if (!formattedPhone) {
          return res.status(400).json({
            error: "Invalid Kenyan phone number for M-PESA STK push."
          });
        }

        const callbackUrl = mpesaConfig.callbackUrl.includes("token=")
          ? mpesaConfig.callbackUrl
          : appendQueryParam(mpesaConfig.callbackUrl, "token", mpesaRentCallbackToken);
        const initiatedAt = new Date().toISOString();
        const billingMonth = parsed.billingMonth ?? effectiveBill.billingMonth;
        const utilityRef = utilityType === "water" ? "WATER" : "POWER";
        const baseAccountReference = buildRentAccountReference({
          houseNumber: session.houseNumber,
          assignment: buildingPaymentProfile.assignment,
          profile: buildingPaymentProfile.publicProfile
        });
        const accountReference = buildingPaymentProfile.assignment.accountReference
          ? baseAccountReference
          : `${utilityRef}${baseAccountReference}`.slice(0, 12);
        const building = await store.getBuilding(session.buildingId);
        const buildingLabel =
          building?.name?.trim() || session.buildingId?.trim() || "Utility";

        const client = new DarajaClient(mpesaConfig);
        const result = await client.initiateStkPush({
          amount: amountKsh,
          phoneNumber: formattedPhone,
          accountReference,
          transactionDesc: `${buildingLabel} ${utilityRef} ${billingMonth}`.slice(0, 80),
          callbackUrl
        });

        const checkoutRequestId =
          typeof result.CheckoutRequestID === "string"
            ? result.CheckoutRequestID.trim()
            : "";
        if (!checkoutRequestId) {
          return res.status(502).json({
            error: "M-PESA did not return a checkout request ID."
          });
        }

        rememberUtilityStkRequest(checkoutRequestId, {
          utilityType,
          buildingId: session.buildingId,
          houseNumber: session.houseNumber,
          phoneNumber: normalizeKenyaPhone(paymentPhone),
          amountKsh,
          billingMonth,
          initiatedAt,
          paymentProfileId: buildingPaymentProfile.publicProfile.id,
          paymentProfileName: buildingPaymentProfile.publicProfile.name,
          paymentAccountReference: accountReference,
          paymentShortCode: buildingPaymentProfile.publicProfile.shortCode
        });

        return res.status(202).json({
          data: {
            paymentMethod: parsed.paymentMethod,
            utilityType,
            checkoutRequestId,
            merchantRequestId:
              typeof result.MerchantRequestID === "string"
                ? result.MerchantRequestID
                : undefined,
            responseCode: result.ResponseCode,
            responseDescription: result.ResponseDescription,
            customerMessage: result.CustomerMessage,
            billingMonth,
            amountKsh,
            targetBalanceKsh: Math.round(targetBill.balanceKsh),
            phoneMask: maskPhone(normalizeKenyaPhone(paymentPhone)),
            paymentProfile: {
              id: buildingPaymentProfile.publicProfile.id,
              name: buildingPaymentProfile.publicProfile.name,
              shortCode: buildingPaymentProfile.publicProfile.shortCode,
              partyB: buildingPaymentProfile.publicProfile.partyB,
              accountReference
            }
          }
        });
      } catch (error) {
        return next(error);
      }
    }
  );

  app.post(
    "/api/user/utilities/:utilityType/payments/mpesa/verify",
    async (req, res, next) => {
      try {
        const session = await getResidentSession(req, res);
        if (!session) {
          return;
        }

        if (!requireResidentBillingAccess(res, session)) {
          return;
        }

        const utilityType = utilityTypeSchema.parse(req.params.utilityType);
        const parsed = verifyUtilityMpesaPaymentSchema.parse(req.body);
        const pending = pendingUtilityStkRequests.get(parsed.checkoutRequestId);
        if (
          !pending ||
          pending.buildingId !== session.buildingId ||
          pending.houseNumber !== session.houseNumber ||
          pending.utilityType !== utilityType
        ) {
          return res.status(200).json({
            data: {
              checkoutRequestId: parsed.checkoutRequestId,
              status: "unknown"
            },
            message:
              "Payment request was not found in active verification queue. Refresh utility balances."
          });
        }

        const throttleKey = `${session.buildingId}:${session.houseNumber}:${utilityType}:${parsed.checkoutRequestId}`;
        const now = Date.now();
        const rateSnapshot = mpesaVerifyWindow.get(throttleKey);
        if (
          rateSnapshot &&
          now - rateSnapshot.windowStartMs < MPESA_VERIFY_RATE_WINDOW_MS
        ) {
          if (rateSnapshot.count >= MPESA_VERIFY_RATE_MAX_PER_ID) {
            return res.status(429).json({
              error: "Too many M-PESA verification attempts. Please wait a moment."
            });
          }
          rateSnapshot.count += 1;
        } else {
          mpesaVerifyWindow.set(throttleKey, {
            windowStartMs: now,
            count: 1
          });
        }

        const paymentProfile = paymentProfileService.resolveProfile(
          pending.paymentProfileId,
          "/api/payments/mpesa/rent-callback"
        );
        const mpesaConfig = paymentProfile.config;
        if (!paymentProfile.publicProfile || !mpesaConfig) {
          return res.status(503).json({
            error: "M-PESA payment profile is not available for this request."
          });
        }

        if (!mpesaConfig.enabled || !mpesaConfig.isConfigured) {
          return res.status(503).json({
            error: "M-PESA STK is not configured for this payment profile.",
            missing: mpesaConfig.missing
          });
        }

        const client = new DarajaClient(mpesaConfig);
        let queryResult;
        try {
          queryResult = await client.queryStkPush(parsed.checkoutRequestId);
        } catch (error) {
          const postedPayment = findRecentPostedUtilityPayment(pending);
          if (postedPayment) {
            pendingUtilityStkRequests.delete(parsed.checkoutRequestId);
            persistRuntimeQueuesState();
            mpesaVerifyWindow.delete(throttleKey);

            return res.status(200).json({
              data: {
                checkoutRequestId: parsed.checkoutRequestId,
                status: "paid",
                billingMonth: pending.billingMonth,
                utilityType,
                amountKsh: postedPayment.amountKsh,
                receiptReference: postedPayment.providerReference ?? parsed.checkoutRequestId,
                resultCode: 0,
                resultDesc: "Payment confirmed from your utility ledger."
              }
            });
          }

          const message =
            error instanceof Error
              ? error.message
              : "Live M-PESA verification is temporarily unavailable.";
          return res.status(200).json({
            data: {
              checkoutRequestId: parsed.checkoutRequestId,
              status: "pending",
              utilityType,
              billingMonth: pending.billingMonth,
              amountKsh: pending.amountKsh,
              resultDesc: message
            },
            message: "Live verification is temporarily unavailable. Check status again shortly."
          });
        }
        const resultCode = Number(queryResult?.ResultCode ?? Number.NaN);
        const resultDesc = String(
          queryResult?.ResultDesc || queryResult?.ResponseDescription || ""
        );

        if (Number.isFinite(resultCode) && resultCode === 0) {
          const receiptReference =
            typeof queryResult?.MpesaReceiptNumber === "string" &&
            queryResult.MpesaReceiptNumber.trim().length > 0
              ? queryResult.MpesaReceiptNumber.trim()
              : parsed.checkoutRequestId;

          mpesaVerifyWindow.delete(throttleKey);

          return res.json({
            data: {
              checkoutRequestId: parsed.checkoutRequestId,
              status: "paid",
              billingMonth: pending.billingMonth,
              utilityType,
              amountKsh: pending.amountKsh,
              receiptReference,
              resultCode,
              resultDesc:
                resultDesc ||
                "Payment confirmed. Utility ledger will update when callback is processed."
            }
          });
        }

        if (
          Number.isFinite(resultCode) &&
          TERMINAL_MPESA_FAILURE_CODES.has(resultCode)
        ) {
          pendingUtilityStkRequests.delete(parsed.checkoutRequestId);
          persistRuntimeQueuesState();
          mpesaVerifyWindow.delete(throttleKey);

          return res.status(200).json({
            data: {
              checkoutRequestId: parsed.checkoutRequestId,
              status: "failed",
              utilityType,
              billingMonth: pending.billingMonth,
              amountKsh: pending.amountKsh,
              resultCode,
              resultDesc: resultDesc || "Payment was not completed."
            }
          });
        }

        return res.status(200).json({
          data: {
            checkoutRequestId: parsed.checkoutRequestId,
            status: "pending",
            utilityType,
            billingMonth: pending.billingMonth,
            amountKsh: pending.amountKsh,
            resultCode: Number.isFinite(resultCode) ? resultCode : undefined,
            resultDesc: resultDesc || "Awaiting M-PESA callback."
          }
        });
      } catch (error) {
        return next(error);
      }
    }
  );

  app.post("/api/user/utilities/:utilityType/payments", async (req, res, next) => {
    try {
      const session = await getResidentSession(req, res);
      if (!session) {
        return;
      }

      if (!requireResidentBillingAccess(res, session)) {
        return;
      }

      const utilityType = utilityTypeSchema.parse(req.params.utilityType);
      if (!requirePaymentChannelEnabled(res, session, utilityType)) {
        return;
      }

      const parsed = recordUtilityPaymentSchema.parse(req.body);
      await ensureRecurringUtilityBillsCurrent("resident.utility_payment_direct", {
        buildingId: session.buildingId,
        houseNumber: session.houseNumber,
        utilityType
      });
      const data = await recordResidentUtilityPaymentAndNotify(
        utilityType,
        session.buildingId,
        session.houseNumber,
        parsed
      );

      return res.status(201).json({ data });
    } catch (error) {
      return next(error);
    }
  });

  app.post("/api/wifi/payments/:checkoutReference/confirm", async (req, res, next) => {
    try {
      const token = req.header("x-wifi-callback-token");
      if (!wifiService.isValidCallbackToken(token ?? undefined)) {
        return res.status(401).json({ error: "Invalid callback token" });
      }

      const parsed = confirmWifiPaymentSchema.parse(req.body);
      const payment = await wifiService.confirmPayment(
        req.params.checkoutReference,
        parsed
      );

      if (!payment) {
        return res.status(404).json({ error: "Payment not found" });
      }

      return res.json({ data: payment });
    } catch (error) {
      return next(error);
    }
  });

  app.post("/api/payments/mpesa/rent-callback", async (req, res, next) => {
    try {
      if (!callbackTokenMatches(req, mpesaRentCallbackToken)) {
        return res.status(401).json({ error: "Invalid M-PESA callback token" });
      }

      const extracted = parseMpesaCallbackPayload(req.body);
      const pendingRentFromInit = extracted.checkoutRequestId
        ? pendingRentStkRequests.get(extracted.checkoutRequestId)
        : undefined;
      const pendingUtilityFromInit = extracted.checkoutRequestId
        ? pendingUtilityStkRequests.get(extracted.checkoutRequestId)
        : undefined;
      if (extracted.resultCode !== 0) {
        if (extracted.checkoutRequestId) {
          pendingRentStkRequests.delete(extracted.checkoutRequestId);
          pendingUtilityStkRequests.delete(extracted.checkoutRequestId);
          persistRuntimeQueuesState();
        }
        return res.status(202).json({
          received: true,
          applied: false,
          resultCode: extracted.resultCode,
          message: extracted.resultDesc ?? "M-PESA callback indicates non-success result."
        });
      }

      if (pendingUtilityFromInit) {
        const providerReference =
          extracted.providerReference ?? extracted.checkoutRequestId ?? randomUUID();
        const utilityData = await recordResidentUtilityPaymentAndNotify(
          pendingUtilityFromInit.utilityType,
          pendingUtilityFromInit.buildingId,
          pendingUtilityFromInit.houseNumber,
          {
            billingMonth: pendingUtilityFromInit.billingMonth,
            amountKsh: pendingUtilityFromInit.amountKsh,
            provider: "mpesa",
            providerReference,
            paidAt: extracted.paidAt ?? new Date().toISOString(),
            note: "M-PESA callback payment"
          }
        );

        if (extracted.checkoutRequestId) {
          pendingUtilityStkRequests.delete(extracted.checkoutRequestId);
          persistRuntimeQueuesState();
        }

        return res.status(200).json({
          data: {
            event: utilityData.event,
            bill: utilityData.bill,
            utilityType: pendingUtilityFromInit.utilityType,
            receiptReference: providerReference
          },
          message: "Utility payment applied."
        });
      }

      const paidAt = extracted.paidAt ?? new Date().toISOString();
      const billingMonth =
        pendingRentFromInit?.billingMonth ??
        `${new Date(paidAt).getUTCFullYear()}-${String(
          new Date(paidAt).getUTCMonth() + 1
        ).padStart(2, "0")}`;

      let tenantUserId: string | undefined;
      let tenantName: string | undefined;
      let resolvedBuildingId: string | undefined;
      if (extracted.houseNumber && extracted.phoneNumber) {
        const resolution = await resolveTenantByHouseAndPhone({
          houseNumber: extracted.houseNumber,
          phoneNumber: extracted.phoneNumber,
          buildingId: pendingRentFromInit?.buildingId
        });
        if (resolution && resolution.type === "resolved") {
          tenantUserId = resolution.tenantUserId;
          tenantName = resolution.tenantName;
          resolvedBuildingId = resolution.buildingId;
        }
      }

      tenantUserId = tenantUserId ?? pendingRentFromInit?.tenantUserId;
      tenantName = tenantName ?? pendingRentFromInit?.tenantName;

      if (
        !extracted.houseNumber &&
        !pendingRentFromInit?.houseNumber &&
        extracted.checkoutRequestId
      ) {
        return res.status(202).json({
          received: true,
          applied: false,
          resultCode: extracted.resultCode,
          message: "No active rent/utility STK request matched this callback."
        });
      }

      const normalized = rentMpesaCallbackSchema.parse({
        buildingId: pendingRentFromInit?.buildingId ?? resolvedBuildingId,
        houseNumber: extracted.houseNumber ?? pendingRentFromInit?.houseNumber,
        amountKsh: extracted.amountKsh ?? pendingRentFromInit?.amountKsh,
        providerReference:
          extracted.providerReference ?? extracted.checkoutRequestId,
        phoneNumber: extracted.phoneNumber ?? pendingRentFromInit?.phoneNumber,
        paidAt,
        billingMonth,
        tenantUserId,
        tenantName,
        paymentProfileId: pendingRentFromInit?.paymentProfileId,
        paymentProfileName: pendingRentFromInit?.paymentProfileName,
        paymentAccountReference: pendingRentFromInit?.paymentAccountReference,
        rawPayload: req.body
      });

      const outcome = rentLedgerService.recordMpesaPayment(normalized);
      const settlementBuildingId =
        normalized.buildingId ?? pendingRentFromInit?.buildingId ?? resolvedBuildingId;

      try {
        if (!settlementBuildingId) {
          throw new Error("Building ID is required for wallet settlement.");
        }
        await settleRentPaymentInWallet({
          buildingId: settlementBuildingId,
          houseNumber: normalized.houseNumber,
          amountKsh: normalized.amountKsh,
          providerReference: normalized.providerReference,
          billingMonth,
          paidAt,
          phoneNumber: normalized.phoneNumber,
          tenantUserId: normalized.tenantUserId,
          tenantName: normalized.tenantName
        });
      } catch (walletError) {
        console.error("Housing wallet settlement failed for rent payment:", walletError);
        return res.status(502).json({
          received: true,
          applied: Boolean(outcome.applied),
          resultCode: extracted.resultCode,
          message:
            walletError instanceof Error
              ? walletError.message
              : "Rent payment was posted locally but wallet settlement failed."
        });
      }

      if (extracted.checkoutRequestId) {
        pendingRentStkRequests.delete(extracted.checkoutRequestId);
        persistRuntimeQueuesState();
      }

      const notificationBuildingId =
        pendingRentFromInit?.buildingId ?? resolvedBuildingId ?? normalized.buildingId;
      if (outcome.applied && notificationBuildingId) {
        userSupportService.enqueueSystemNotifications(
          notificationBuildingId,
          normalized.houseNumber,
          [
            {
              title: "Rent Payment Received",
              message: `M-PESA payment ${normalized.providerReference} of KSh ${normalized.amountKsh.toLocaleString("en-US")} has been posted to your rent ledger.`,
              level: "success",
              source: "rent",
              dedupeKey: `rent-payment-${normalized.providerReference}`
            }
          ]
        );
      }

      return res.status(outcome.applied ? 200 : 202).json({
        data: {
          event: outcome.event,
          applied: outcome.applied,
          snapshot: outcome.snapshot,
          rentStatus: outcome.snapshot
            ? outcome.snapshot.paymentStatus.toUpperCase()
            : "PENDING_PROFILE",
          receiptReference: outcome.event.providerReference
        },
        message: outcome.applied
          ? "Payment applied to rent ledger."
          : "Payment stored and pending rent profile setup."
      });
    } catch (error) {
      return next(error);
    }
  });

  app.get("/api/admin/landlord-access-requests", async (req, res, next) => {
    try {
      if (isPlatformLandlordGovernanceDisabled()) {
        return res.status(410).json({
          error: "Landlord access approvals are disabled for this dedicated app."
        });
      }

      const admin = getAdminSession(req, res, "admin");
      if (!admin) {
        return;
      }

      if (!userAccountService) {
        return res.status(503).json({
          error: "User account service unavailable. Database connection is required."
        });
      }

      const status = parseLandlordAccessRequestStatus(req.query.status);
      const limitRaw = Number(req.query.limit ?? 300);
      const limit = Number.isFinite(limitRaw)
        ? Math.min(Math.max(limitRaw, 1), 2_000)
        : 300;
      const data = await userAccountService.listLandlordAccessRequests(status, limit);

      return res.json({
        data,
        role: admin.role
      });
    } catch (error) {
      return next(error);
    }
  });

  app.patch(
    "/api/admin/landlord-access-requests/:requestId",
    async (req, res, next) => {
      try {
        if (isPlatformLandlordGovernanceDisabled()) {
          return res.status(410).json({
            error: "Landlord access approvals are disabled for this dedicated app."
          });
        }

        const admin = getAdminSession(req, res, "admin");
        if (!admin) {
          return;
        }

        if (!userAccountService) {
          return res.status(503).json({
            error: "User account service unavailable. Database connection is required."
          });
        }

        const parsed = reviewLandlordAccessRequestSchema.parse(req.body ?? {});
        const reviewerSession = await resolveOptionalUserSession(req);
        const reviewerUserId =
          reviewerSession && hasUserRoleAtLeast(reviewerSession.role, "admin")
            ? reviewerSession.userId
            : undefined;

        try {
          const data = await userAccountService.reviewLandlordAccessRequest(
            req.params.requestId,
            parsed,
            reviewerUserId
          );
          return res.json({ data, role: admin.role });
        } catch (error) {
          const message =
            error instanceof Error
              ? error.message
              : "Unable to review landlord access request";
          if (message === "LANDLORD_ACCESS_REQUEST_NOT_FOUND") {
            return res.status(404).json({ error: "Landlord access request not found" });
          }
          if (message === "LANDLORD_ACCESS_REQUEST_ALREADY_REVIEWED") {
            return res.status(409).json({
              error: "Landlord access request has already been reviewed"
            });
          }
          throw error;
        }
      } catch (error) {
        return next(error);
      }
    }
  );

  app.delete("/api/admin/landlord-users/:userId", async (req, res, next) => {
    try {
      if (isPlatformLandlordGovernanceDisabled()) {
        return res.status(410).json({
          error: "Landlord revocation is disabled for this dedicated app."
        });
      }

      const admin = getAdminSession(req, res, "admin");
      if (!admin) {
        return;
      }

      if (!userAccountService) {
        return res.status(503).json({
          error: "User account service unavailable. Database connection is required."
        });
      }

      const userId = req.params.userId?.trim();
      if (!userId) {
        return res.status(400).json({ error: "User id is required." });
      }

      const parsed = adminRevokeLandlordSchema.parse(req.body ?? {});
      if (parsed.confirmUserId && parsed.confirmUserId.trim() !== userId) {
        return res.status(400).json({
          error: "Confirmation user id does not match the selected landlord."
        });
      }

      const reviewerSession = await resolveOptionalUserSession(req);
      const reviewerUserId =
        reviewerSession && hasUserRoleAtLeast(reviewerSession.role, "admin")
          ? reviewerSession.userId
          : undefined;

      try {
        const data = await userAccountService.revokeLandlordRole(userId, {
          ...parsed,
          reviewerUserId
        });
        return res.json({ data, role: admin.role });
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Unable to remove landlord access for this user.";
        if (message === "LANDLORD_USER_NOT_FOUND") {
          return res.status(404).json({ error: "Landlord user not found." });
        }
        if (message === "LANDLORD_ROLE_NOT_ASSIGNED") {
          return res.status(409).json({
            error: "Selected user is not currently a landlord."
          });
        }
        throw error;
      }
    } catch (error) {
      return next(error);
    }
  });

  app.get("/api/admin/overview", async (req, res, next) => {
    try {
      const admin = getAdminSession(req, res, "admin");
      if (!admin) {
        return;
      }

      const buildings = await store.listBuildings();
      const residentRecoveryPending = listResidentPasswordRecoveryRequests(
        "pending",
        5_000
      );
      const accountRecoveryPending = listAccountPasswordRecoveryRequests(
        "pending",
        5_000
      );
      const trackedUnits = buildings.reduce(
        (sum, item) => sum + (typeof item.units === "number" ? item.units : 0),
        0
      );

      return res.json({
        data: {
          buildings: buildings.length,
          trackedUnits,
          ownerMode: true,
          assignedBuildings: buildings.length,
          activeLandlords: 1,
          unassignedBuildings: 0,
          pendingLandlordAccess: 0,
          residentPasswordRecoveryPending: residentRecoveryPending.length,
          accountPasswordRecoveryPending: accountRecoveryPending.length
        },
        role: admin.role
      });
    } catch (error) {
      return next(error);
    }
  });

  app.get("/api/admin/wifi/packages", async (req, res, next) => {
    try {
      const admin = getAdminSession(req, res, "admin");
      if (!admin) {
        return;
      }

      const buildingId =
        typeof req.query.buildingId === "string" ? req.query.buildingId.trim() : "";

      if (!buildingWifiPackageService) {
        return res.json({ data: wifiService.listPackages(), role: admin.role });
      }

      if (!buildingId) {
        return res.json({ data: [], role: admin.role });
      }

      const building = await store.getBuilding(buildingId);
      if (!building) {
        return res.status(404).json({ error: "Building not found" });
      }

      await buildingWifiPackageService.ensureDefaultsForBuildings([building]);
      const data = await buildingWifiPackageService.listForBuilding(building.id);

      return res.json({
        data,
        building: {
          id: building.id,
          name: building.name
        },
        role: admin.role
      });
    } catch (error) {
      return next(error);
    }
  });

  app.patch("/api/admin/wifi/packages/:packageId", async (req, res, next) => {
    try {
      const admin = getAdminSession(req, res, "admin");
      if (!admin) {
        return;
      }

      const packageId = wifiPackageIdSchema.parse(req.params.packageId);
      const buildingId =
        typeof req.query.buildingId === "string" ? req.query.buildingId.trim() : "";
      const parsed = updateWifiPackageSchema.parse(req.body);

      if (!buildingWifiPackageService) {
        const updated = wifiService.updatePackage(packageId, parsed);

        if (!updated) {
          return res.status(404).json({ error: "Package not found" });
        }

        return res.json({ data: updated, role: admin.role });
      }

      if (!buildingId) {
        return res.status(400).json({ error: "buildingId is required" });
      }

      const building = await store.getBuilding(buildingId);
      if (!building) {
        return res.status(404).json({ error: "Building not found" });
      }

      await buildingWifiPackageService.ensureDefaultsForBuildings([building]);
      const updated = await buildingWifiPackageService.updateForBuilding(
        building.id,
        packageId,
        parsed
      );

      if (!updated) {
        return res.status(404).json({ error: "Package not found" });
      }

      return res.json({
        data: updated,
        building: {
          id: building.id,
          name: building.name
        },
        role: admin.role
      });
    } catch (error) {
      return next(error);
    }
  });

  app.get("/api/admin/wifi/payments", (req, res) => {
    const admin = getAdminSession(req, res, "admin");
    if (!admin) {
      return;
    }

    const limitRaw = req.query.limit;
    const parsedLimit = Number(limitRaw);
    const limit = Number.isFinite(parsedLimit)
      ? Math.min(Math.max(parsedLimit, 1), 300)
      : 100;

    const data = wifiService.listPayments().slice(0, limit);
    return res.json({ data, role: admin.role });
  });

  app.get("/api/admin/rent-due", (req, res, next) => {
    try {
      const admin = getAdminSession(req, res, "admin");
      if (!admin) {
        return;
      }

      const query = houseNumberQuerySchema.parse(req.query);
      const buildingId =
        typeof req.query.buildingId === "string" ? req.query.buildingId : "";
      const data = rentLedgerService.getRentDue(buildingId, query.houseNumber);

      if (!data) {
        return res.status(404).json({ error: "Rent profile not configured" });
      }

      return res.json({ data, role: admin.role });
    } catch (error) {
      return next(error);
    }
  });

  app.put("/api/admin/rent-due/:houseNumber", (req, res, next) => {
    try {
      const admin = getAdminSession(req, res, "admin");
      if (!admin) {
        return;
      }

      const params = houseNumberQuerySchema.parse(req.params);
      const parsed = upsertRentDueSchema.parse(req.body);
      const buildingId =
        typeof req.body?.buildingId === "string"
          ? req.body.buildingId
          : typeof req.query.buildingId === "string"
            ? req.query.buildingId
            : "";
      const data = rentLedgerService.upsertRentDue(buildingId, params.houseNumber, parsed);
      return res.json({ data, role: admin.role });
    } catch (error) {
      return next(error);
    }
  });

  app.get("/api/admin/rent-payments", (req, res) => {
    const admin = getAdminSession(req, res, "admin");
    if (!admin) {
      return;
    }

    const buildingId =
      typeof req.query.buildingId === "string" ? req.query.buildingId : undefined;
    const houseNumber =
      typeof req.query.houseNumber === "string"
        ? req.query.houseNumber
        : undefined;

    const data = rentLedgerService.listPayments({
      buildingId,
      houseNumber
    });
    return res.json({ data, role: admin.role });
  });

  app.get("/api/admin/rent-ledger", (req, res) => {
    const admin = getAdminSession(req, res, "admin");
    if (!admin) {
      return;
    }

    const limitRaw = Number(req.query.limit ?? 500);
    const limit = Number.isFinite(limitRaw)
      ? Math.min(Math.max(limitRaw, 1), 1_000)
      : 500;

    const buildingId =
      typeof req.query.buildingId === "string" ? req.query.buildingId : undefined;
    const data = rentLedgerService.listRentDueRecords(limit, buildingId);
    return res.json({ data, role: admin.role });
  });

  app.get("/api/admin/rent-collection-status", (req, res) => {
    const admin = getAdminSession(req, res, "admin");
    if (!admin) {
      return;
    }

    const limitRaw = Number(req.query.limit ?? 500);
    const limit = Number.isFinite(limitRaw)
      ? Math.min(Math.max(limitRaw, 1), 2_000)
      : 500;

    const buildingId =
      typeof req.query.buildingId === "string" ? req.query.buildingId : undefined;
      const data = rentLedgerService.listCollectionStatus(limit, buildingId).map((item) => ({
      buildingId: item.buildingId,
      houseNumber: item.houseNumber,
      paymentStatus: item.paymentStatus.toUpperCase(),
      monthlyRentKsh: item.monthlyRentKsh,
      balanceKsh: item.balanceKsh,
      paidAmountKsh: item.paidAmountKsh,
      totalPaidKsh: item.totalPaidKsh,
      dueDate: item.dueDate,
      latestPaymentReference: item.latestPaymentReference,
      latestPaymentAt: item.latestPaymentAt,
      latestPaymentAmountKsh: item.latestPaymentAmountKsh
    }))
      .filter((item) => paymentAccessService.isEnabled(item.buildingId, "rent"));

    return res.json({ data, role: admin.role });
  });

  app.get(
    "/api/admin/buildings/:buildingId/utility-registry",
    async (req, res, next) => {
      try {
        const admin = getAdminSession(req, res, "admin");
        if (!admin) {
          return;
        }

        const buildingId = req.params.buildingId?.trim();
        const building = buildingId ? await store.getBuilding(buildingId) : null;
        if (!building) {
          return res.status(404).json({ error: "Building not found" });
        }

        const data = await buildLandlordUtilityRegistryRows(
          building.id,
          building.houseNumbers ?? []
        );
        const buildingConfiguration = buildingConfigurationService
          ? await buildingConfigurationService.getForBuilding(building.id)
          : null;
        const rateDefaults =
          utilityRateDefaultsByBuilding.get(normalizeBuildingId(building.id)) ?? null;

        return res.json({
          data,
          buildingConfiguration,
          rateDefaults,
          role: admin.role
        });
      } catch (error) {
        return next(error);
      }
    }
  );

  app.put(
    "/api/admin/buildings/:buildingId/utility-registry",
    async (req, res, next) => {
      try {
        const admin = getAdminSession(req, res, "admin");
        if (!admin) {
          return;
        }

        const buildingId = req.params.buildingId?.trim();
        const building = buildingId ? await store.getBuilding(buildingId) : null;
        if (!building) {
          return res.status(404).json({ error: "Building not found" });
        }

        const parsed = landlordUtilityRegistryUpsertSchema.parse(req.body ?? {});
        const rateDefaults = parsed.rateDefaults;
        const allowedHouseSet = new Set(
          (building.houseNumbers ?? [])
            .map((item) => normalizeHouseNumber(item))
            .filter(Boolean)
        );

        const householdMemberRows: Array<{ houseNumber: string; members: number }> = [];
        const utilityChargeRows: Array<{
          houseNumber: string;
          waterFixedChargeKsh?: number;
          electricityFixedChargeKsh?: number;
          combinedUtilityChargeKsh?: number;
        }> = [];

        for (const row of parsed.rows) {
          const normalizedHouse = normalizeHouseNumber(
            houseNumberQuerySchema.parse({ houseNumber: row.houseNumber }).houseNumber
          );

          if (!allowedHouseSet.has(normalizedHouse)) {
            return res.status(404).json({
              error: `House number ${normalizedHouse} is not registered in building ${building.id}.`
            });
          }

          const waterMeterNumber = row.waterMeterNumber?.trim();
          if (waterMeterNumber) {
            utilityBillingService.upsertMeter("water", building.id, normalizedHouse, {
              meterNumber: waterMeterNumber
            });
          }

          const electricityMeterNumber = row.electricityMeterNumber?.trim();
          if (electricityMeterNumber) {
            utilityBillingService.upsertMeter("electricity", building.id, normalizedHouse, {
              meterNumber: electricityMeterNumber
            });
          }

          if (typeof row.householdMembers === "number") {
            householdMemberRows.push({
              houseNumber: normalizedHouse,
              members: row.householdMembers
            });
          }

          utilityChargeRows.push({
            houseNumber: normalizedHouse,
            waterFixedChargeKsh: row.waterFixedChargeKsh,
            electricityFixedChargeKsh: row.electricityFixedChargeKsh,
            combinedUtilityChargeKsh: row.combinedUtilityChargeKsh
          });
        }

        await upsertHouseholdMembersForBuilding(building.id, householdMemberRows);
        upsertUtilityChargeDefaultsForBuilding(building.id, utilityChargeRows);
        await upsertUtilityRateDefaultsForBuilding(building.id, rateDefaults ?? {});
        await persistUtilityBillingStateNow();

        const data = await buildLandlordUtilityRegistryRows(
          building.id,
          building.houseNumbers ?? []
        );
        const buildingConfiguration = buildingConfigurationService
          ? await buildingConfigurationService.getForBuilding(building.id)
          : null;

        return res.json({
          data,
          updatedRows: parsed.rows.length,
          buildingConfiguration,
          rateDefaults: utilityRateDefaultsByBuilding.get(normalizeBuildingId(building.id)) ?? null,
          role: admin.role
        });
      } catch (error) {
        const mapped = mapUtilityDomainError(error);
        if (mapped) {
          return res.status(mapped.status).json({ error: mapped.message });
        }
        return next(error);
      }
    }
  );

  app.get(
    "/api/admin/buildings/:buildingId/monthly-combined-utility-charge",
    async (req, res, next) => {
      try {
        const admin = getAdminSession(req, res, "admin");
        if (!admin) {
          return;
        }

        const buildingId = req.params.buildingId?.trim();
        const building = buildingId ? await store.getBuilding(buildingId) : null;
        if (!building) {
          return res.status(404).json({ error: "Building not found" });
        }

        const billingMonth = billingMonthSchema.parse(
          typeof req.query.billingMonth === "string" ? req.query.billingMonth : ""
        );
        const data = getMonthlyCombinedUtilityCharge(building.id, billingMonth);

        return res.json({
          data: data
            ? {
                ...data,
                buildingName: building.name
              }
            : {
                buildingId: building.id,
                buildingName: building.name,
                billingMonth,
                amountKsh: null
              },
          role: admin.role
        });
      } catch (error) {
        return next(error);
      }
    }
  );

  app.put(
    "/api/admin/buildings/:buildingId/monthly-combined-utility-charge",
    async (req, res, next) => {
      try {
        const admin = getAdminSession(req, res, "admin");
        if (!admin) {
          return;
        }

        const buildingId = req.params.buildingId?.trim();
        const building = buildingId ? await store.getBuilding(buildingId) : null;
        if (!building) {
          return res.status(404).json({ error: "Building not found" });
        }

        const parsed = landlordMonthlyCombinedUtilityChargeSchema.parse(req.body ?? {});
        const data = upsertMonthlyCombinedUtilityCharge(
          building.id,
          parsed.billingMonth,
          parsed.amountKsh
        );

        return res.json({
          data: {
            ...data,
            buildingName: building.name
          },
          role: admin.role
        });
      } catch (error) {
        return next(error);
      }
    }
  );

  app.get("/api/landlord/rent-collection-status", async (req, res, next) => {
    try {
      const context = await resolveLandlordAccessContext(req, res);
      if (!context) {
        return;
      }

      const limitRaw = Number(req.query.limit ?? 500);
      const limit = Number.isFinite(limitRaw)
        ? Math.min(Math.max(limitRaw, 1), 2_000)
        : 500;

      const visibleBuildings = await listVisibleBuildingsForLandlordContext(context);
      const data = await listLandlordRentCollectionStatusRows(
        new Set(visibleBuildings.map((item) => item.id)),
        limit
      );

      return res.json({
        data,
        role: context.role
      });
    } catch (error) {
      return next(error);
    }
  });

  app.get(
    "/api/landlord/buildings/:buildingId/rent-bulk-sheet",
    async (req, res, next) => {
      try {
        const context = await resolveLandlordAccessContext(req, res);
        if (!context) {
          return;
        }

        const buildingId = req.params.buildingId?.trim();
        const building = buildingId ? await store.getBuilding(buildingId) : null;
        if (!building) {
          return res.status(404).json({ error: "Building not found" });
        }

        const hasAccess = await canManageBuildingFromLandlordContext(context, building.id);
        if (!hasAccess) {
          return res.status(403).json({ error: "Building access denied" });
        }

        const billingMonth =
          typeof req.query.billingMonth === "string" && req.query.billingMonth.trim()
            ? billingMonthSchema.parse(req.query.billingMonth)
            : billingMonthFromDate(new Date());
        const registryRows = await buildLandlordUtilityRegistryRows(
          building.id,
          building.houseNumbers ?? []
        );

        return res.json({
          data: {
            buildingId: building.id,
            buildingName: building.name,
            billingMonth,
            rentEnabled: paymentAccessService.isEnabled(building.id, "rent"),
            rows: registryRows.map((row) => ({
              houseNumber: row.houseNumber,
              residentName: row.residentName,
              residentPhone: row.residentPhone,
              residentUserId: row.residentUserId,
              hasActiveResident: row.hasActiveResident,
              verificationStatus: row.verificationStatus,
              monthlyRentKsh: row.monthlyRentKsh,
              balanceKsh: row.rentBalanceKsh,
              currentMonthOutstandingKsh: row.currentMonthRentOutstandingKsh,
              currentMonthPaidKsh: row.currentMonthRentPaidKsh,
              arrearsKsh: row.rentArrearsKsh,
              dueDate: row.rentDueDate,
              paymentStatus: row.rentPaymentStatus
            }))
          },
          role: context.role
        });
      } catch (error) {
        return next(error);
      }
    }
  );

  app.put(
    "/api/landlord/buildings/:buildingId/rent-bulk-sheet",
    async (req, res, next) => {
      try {
        const context = await resolveLandlordAccessContext(req, res);
        if (!context) {
          return;
        }

        if (context.role === "caretaker") {
          return res.status(403).json({
            error: "House manager accounts cannot change rent charges."
          });
        }

        const buildingId = req.params.buildingId?.trim();
        const building = buildingId ? await store.getBuilding(buildingId) : null;
        if (!building) {
          return res.status(404).json({ error: "Building not found" });
        }

        if (!paymentAccessService.isEnabled(building.id, "rent")) {
          return res.status(403).json({
            error: "Rent billing is disabled for this building."
          });
        }

        const hasAccess = await canManageBuildingFromLandlordContext(context, building.id);
        if (!hasAccess) {
          return res.status(403).json({ error: "Building access denied" });
        }

        const parsed = landlordRentBulkSheetSchema.parse(req.body ?? {});
        const registryRows = await buildLandlordUtilityRegistryRows(
          building.id,
          building.houseNumbers ?? []
        );
        const roomRowsByHouse = new Map(
          registryRows.map((row) => [normalizeHouseNumber(row.houseNumber), row])
        );
        const updated = [];

        for (const row of parsed.rows) {
          const houseNumber = normalizeHouseNumber(row.houseNumber);
          if (!roomRowsByHouse.has(houseNumber)) {
            return res.status(400).json({
              error: `House ${houseNumber || row.houseNumber} is not registered in ${building.name}.`
            });
          }

          const existing = rentLedgerService.getRentDue(building.id, houseNumber);
          const balanceKsh =
            row.balanceKsh == null
              ? Math.max(
                  0,
                  Number(existing?.balanceKsh ?? (row.monthlyRentKsh > 0 ? row.monthlyRentKsh : 0))
                )
              : Math.max(0, Math.round(row.balanceKsh));
          const snapshot = rentLedgerService.upsertRentDue(building.id, houseNumber, {
            monthlyRentKsh: Math.max(0, Math.round(row.monthlyRentKsh)),
            balanceKsh,
            dueDate: parsed.dueDate,
            note:
              parsed.note?.trim() ||
              `Bulk rent sheet for ${building.name} (${parsed.billingMonth}).`
          });

          updated.push(snapshot);

          await recordRoomAccountAuditEvent({
            buildingId: building.id,
            houseNumber,
            action: "rent.profile.bulk_updated",
            summary: `Monthly rent set to KSh ${snapshot.monthlyRentKsh.toLocaleString("en-US")} for ${parsed.billingMonth}.`,
            actor: actorFromLandlordContext(context),
            metadata: {
              billingMonth: parsed.billingMonth,
              dueDate: parsed.dueDate,
              monthlyRentKsh: snapshot.monthlyRentKsh,
              balanceKsh: snapshot.balanceKsh,
              balanceOverridden: row.balanceKsh != null
            }
          });
        }

        await persistRentLedgerStateNow();
        const refreshedRows = await buildLandlordUtilityRegistryRows(
          building.id,
          building.houseNumbers ?? []
        );

        return res.json({
          data: {
            buildingId: building.id,
            buildingName: building.name,
            billingMonth: parsed.billingMonth,
            updatedCount: updated.length,
            rows: refreshedRows.map((row) => ({
              houseNumber: row.houseNumber,
              residentName: row.residentName,
              residentPhone: row.residentPhone,
              residentUserId: row.residentUserId,
              hasActiveResident: row.hasActiveResident,
              verificationStatus: row.verificationStatus,
              monthlyRentKsh: row.monthlyRentKsh,
              balanceKsh: row.rentBalanceKsh,
              currentMonthOutstandingKsh: row.currentMonthRentOutstandingKsh,
              currentMonthPaidKsh: row.currentMonthRentPaidKsh,
              arrearsKsh: row.rentArrearsKsh,
              dueDate: row.rentDueDate,
              paymentStatus: row.rentPaymentStatus
            }))
          },
          role: context.role
        });
      } catch (error) {
        return next(error);
      }
    }
  );

  app.put("/api/landlord/rent-due/:houseNumber", async (req, res, next) => {
    try {
      const context = await resolveLandlordAccessContext(req, res);
      if (!context) {
        return;
      }

      if (context.role === "caretaker") {
        return res.status(403).json({
          error: "House manager accounts cannot change rent settings."
        });
      }

      const { houseNumber } = houseNumberQuerySchema.parse({
        houseNumber: req.params.houseNumber
      });
      const normalizedHouseNumber = normalizeHouseNumber(houseNumber);
      const parsed = upsertRentDueSchema.parse(req.body);
      const buildingId =
        typeof req.body?.buildingId === "string"
          ? req.body.buildingId
          : typeof req.query.buildingId === "string"
            ? req.query.buildingId
            : "";

      if (!buildingId.trim()) {
        return res.status(400).json({
          error: "Building ID is required to update rent settings."
        });
      }

      if (!paymentAccessService.isEnabled(buildingId, "rent")) {
        return res.status(403).json({
          error: "Rent billing is disabled for this building."
        });
      }

      const building = await store.getBuilding(buildingId);
      if (!building) {
        return res.status(404).json({ error: "Building not found" });
      }

      const hasAccess = await canManageBuildingFromLandlordContext(context, building.id);
      if (!hasAccess) {
        return res.status(403).json({ error: "Building access denied" });
      }

      const visibleHouseNumbers = new Set(
        (building.houseNumbers ?? []).map((item) => normalizeHouseNumber(item))
      );
      if (
        visibleHouseNumbers.size > 0 &&
        !visibleHouseNumbers.has(normalizedHouseNumber)
      ) {
        return res.status(400).json({
          error: `House ${normalizedHouseNumber} is not registered in ${building.name}.`
        });
      }

      const data = rentLedgerService.upsertRentDue(
        building.id,
        normalizedHouseNumber,
        parsed
      );
      await persistRentLedgerStateNow();
      await recordRoomAccountAuditEvent({
        buildingId: building.id,
        houseNumber: normalizedHouseNumber,
        action: "rent.profile.updated",
        summary: `Rent settings updated. Monthly rent KSh ${data.monthlyRentKsh.toLocaleString("en-US")}.`,
        actor: actorFromLandlordContext(context),
        metadata: {
          monthlyRentKsh: data.monthlyRentKsh,
          balanceKsh: data.balanceKsh,
          dueDate: data.dueDate
        }
      });

      return res.json({ data, role: context.role });
    } catch (error) {
      return next(error);
    }
  });

  app.post("/api/landlord/rent/:houseNumber/payments", async (req, res, next) => {
    try {
      const context = await resolveLandlordAccessContext(req, res);
      if (!context) {
        return;
      }

      const { houseNumber } = houseNumberQuerySchema.parse({
        houseNumber: req.params.houseNumber
      });
      const parsed = recordAdminRentPaymentSchema.parse(req.body);
      const buildingId =
        typeof req.body?.buildingId === "string"
          ? req.body.buildingId
          : typeof req.query.buildingId === "string"
            ? req.query.buildingId
            : "";

      if (!buildingId.trim()) {
        return res.status(400).json({
          error: "Building ID is required to record a rent payment."
        });
      }

      if (!paymentAccessService.isEnabled(buildingId, "rent")) {
        return res.status(403).json({
          error: "Rent billing is disabled for this building."
        });
      }

      const providerReference =
        parsed.providerReference?.trim() ||
        (parsed.provider === "cash"
          ? buildManualRentPaymentReference(parsed.provider, buildingId, houseNumber)
          : "");

      if (!providerReference) {
        return res.status(400).json({
          error: "Reference is required for non-cash rent payments."
        });
      }

      const hasAccess = await canManageBuildingFromLandlordContext(context, buildingId);
      if (!hasAccess) {
        return res.status(403).json({ error: "Building access denied" });
      }

      if (!rentLedgerService.getRentDue(buildingId, houseNumber) && userAccountService) {
        const agreementState = await userAccountService.getActiveTenantAgreement({
          buildingId,
          houseNumber
        });
        const agreement = agreementState.agreement;
        const monthlyRentKsh = Math.max(0, Number(agreement?.monthlyRentKsh ?? 0));

        if (agreementState.hasActiveResident && agreement && monthlyRentKsh > 0) {
          const now = new Date();
          const leaseStart = agreement.leaseStartDate
            ? new Date(`${agreement.leaseStartDate}T00:00:00.000Z`)
            : null;
          const fallbackDay = Number.isFinite(agreement.paymentDueDay)
            ? Number(agreement.paymentDueDay)
            : leaseStart && !Number.isNaN(leaseStart.getTime())
              ? leaseStart.getUTCDate()
              : now.getUTCDate();
          const lastDayOfMonth = new Date(
            Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0)
          ).getUTCDate();
          const dueDay = Math.min(Math.max(Math.trunc(fallbackDay), 1), lastDayOfMonth);
          const dueDate = new Date(
            Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), dueDay, 0, 0, 0, 0)
          ).toISOString();

          rentLedgerService.upsertRentDue(buildingId, houseNumber, {
            monthlyRentKsh,
            balanceKsh: monthlyRentKsh,
            dueDate,
            note: "Initialized from tenant agreement."
          });
        }
      }

      const buildingPaymentProfile = paymentProfileService.resolveForBuilding(
        buildingId,
        "/api/payments/mpesa/rent-callback"
      );
      const outcome = rentLedgerService.recordPayment({
        buildingId,
        houseNumber,
        amountKsh: parsed.amountKsh,
        provider: parsed.provider,
        providerReference,
        phoneNumber: parsed.phoneNumber,
        billingMonth: parsed.billingMonth,
        paidAt: parsed.paidAt,
        source: "manual",
        paymentProfileId: buildingPaymentProfile.publicProfile?.id,
        paymentProfileName: buildingPaymentProfile.publicProfile?.name,
        paymentAccountReference: buildingPaymentProfile.assignment.accountReference
      });

      const providerLabel =
        parsed.provider === "mpesa"
          ? "M-PESA"
          : parsed.provider === "cash"
            ? "Cash"
            : parsed.provider === "bank"
              ? "Bank"
              : "Card";

      userSupportService.enqueueSystemNotifications(buildingId, houseNumber, [
        {
          title: "Rent Payment Received",
          message: `${providerLabel} payment ${outcome.event.providerReference} of KSh ${outcome.event.amountKsh.toLocaleString("en-US")} has been posted.`,
          level: "success",
          source: "rent",
          dedupeKey: `rent-payment-${outcome.event.providerReference}`
        }
      ]);

      await persistRentLedgerStateNow();
      await recordRoomAccountAuditEvent({
        buildingId,
        houseNumber,
        action: "rent.payment.recorded",
        summary: `${providerLabel} rent payment of KSh ${outcome.event.amountKsh.toLocaleString("en-US")} recorded.`,
        actor: actorFromLandlordContext(context),
        metadata: {
          paymentId: outcome.event.id,
          provider: outcome.event.provider,
          providerReference: outcome.event.providerReference,
          amountKsh: outcome.event.amountKsh,
          billingMonth: outcome.event.billingMonth,
          paidAt: outcome.event.paidAt,
          applied: outcome.applied
        }
      });
      const notificationBuilding =
        context.role === "caretaker" ? await store.getBuilding(buildingId) : null;
      await enqueueOwnerNotificationForManagerAction(context, {
        title: "Rent Payment Recorded",
        message: `${actorFromLandlordContext(context).name || "House manager"} recorded ${providerLabel} rent of KSh ${outcome.event.amountKsh.toLocaleString("en-US")} for ${notificationBuilding?.name ?? buildingId} house ${houseNumber}.`,
        level: "success",
        action: "rent.payment.recorded",
        buildingId,
        buildingName: notificationBuilding?.name,
        houseNumber,
        dedupeKey: `manager-rent-payment-${outcome.event.id}`,
        metadata: {
          paymentId: outcome.event.id,
          provider: outcome.event.provider,
          providerReference: outcome.event.providerReference,
          amountKsh: outcome.event.amountKsh,
          billingMonth: outcome.event.billingMonth,
          paidAt: outcome.event.paidAt,
          applied: outcome.applied
        }
      });
      return res.status(outcome.applied ? 201 : 202).json({
        data: {
          buildingId: outcome.event.buildingId,
          houseNumber: outcome.event.houseNumber,
          amountKsh: outcome.event.amountKsh,
          provider: outcome.event.provider,
          providerReference: outcome.event.providerReference,
          paidAt: outcome.event.paidAt,
          applied: outcome.applied,
          rentStatus: outcome.snapshot?.paymentStatus.toUpperCase() ?? "PENDING_PROFILE"
        },
        role: context.role
      });
    } catch (error) {
      return next(error);
    }
  });

  const handleLandlordUnrecordRentPayment = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
      try {
        const context = await resolveLandlordAccessContext(req, res);
        if (!context) {
          return;
        }

        if (context.role === "caretaker") {
          return res.status(403).json({
            error: "House manager accounts cannot unrecord rent payments."
          });
        }

        const { houseNumber } = houseNumberQuerySchema.parse({
          houseNumber: req.params.houseNumber
        });
        const paymentId = String(req.params.paymentId ?? "").trim();
        const buildingId =
          typeof req.query.buildingId === "string"
            ? req.query.buildingId
            : typeof req.body?.buildingId === "string"
              ? req.body.buildingId
              : "";

        if (!paymentId) {
          return res.status(400).json({ error: "Payment ID is required." });
        }

        if (!buildingId.trim()) {
          return res.status(400).json({
            error: "Building ID is required to unrecord a rent payment."
          });
        }

        const hasAccess = await canManageBuildingFromLandlordContext(context, buildingId);
        if (!hasAccess) {
          return res.status(403).json({ error: "Building access denied" });
        }

        const outcome = rentLedgerService.unrecordCashPayment({
          buildingId,
          houseNumber,
          paymentId
        });
        if (!outcome) {
          return res.status(404).json({ error: "Rent payment not found." });
        }

        await persistRentLedgerStateNow();
        await recordRoomAccountAuditEvent({
          buildingId,
          houseNumber,
          action: "rent.payment.unrecorded",
          summary: `Rent payment of KSh ${outcome.event.amountKsh.toLocaleString("en-US")} unrecorded.`,
          actor: actorFromLandlordContext(context),
          metadata: {
            paymentId: outcome.event.id,
            provider: outcome.event.provider,
            providerReference: outcome.event.providerReference,
            amountKsh: outcome.event.amountKsh,
            applied: outcome.applied
          }
        });
        return res.json({
          data: {
            buildingId: outcome.event.buildingId,
            houseNumber: outcome.event.houseNumber,
            paymentId: outcome.event.id,
            amountKsh: outcome.event.amountKsh,
            provider: outcome.event.provider,
            providerReference: outcome.event.providerReference,
            applied: outcome.applied,
            rentStatus: outcome.snapshot?.paymentStatus.toUpperCase() ?? "PENDING_PROFILE"
          },
          role: context.role
        });
      } catch (error) {
        if (
          error instanceof Error &&
          error.message.includes("Only manually recorded")
        ) {
          return res.status(400).json({ error: error.message });
        }
        return next(error);
      }
    };

  app.delete(
    "/api/landlord/rent/:houseNumber/payments/:paymentId",
    handleLandlordUnrecordRentPayment
  );
  app.post(
    "/api/landlord/rent/:houseNumber/payments/:paymentId/unrecord",
    handleLandlordUnrecordRentPayment
  );

  app.get(
    "/api/landlord/buildings/:buildingId/houses/:houseNumber/agreement",
    async (req, res, next) => {
      try {
        const context = await resolveLandlordAccessContext(req, res);
        if (!context) {
          return;
        }

        if (!userAccountService) {
          return res.status(503).json({
            error: "User account service unavailable. Database connection is required."
          });
        }

        const buildingId = req.params.buildingId?.trim();
        const building = buildingId ? await store.getBuilding(buildingId) : null;
        if (!building) {
          return res.status(404).json({ error: "Building not found" });
        }

        const hasAccess = await canManageBuildingFromLandlordContext(
          context,
          building.id
        );
        if (!hasAccess) {
          return res.status(403).json({ error: "Building access denied" });
        }

        const houseNumber = normalizeHouseNumber(
          houseNumberQuerySchema.parse({
            houseNumber: req.params.houseNumber
          }).houseNumber
        );

        const data = await userAccountService.getActiveTenantAgreement({
          buildingId: building.id,
          houseNumber
        });

        return res.json({
          data,
          role: context.role
        });
      } catch (error) {
        return next(error);
      }
    }
  );

  app.put(
    "/api/landlord/buildings/:buildingId/houses/:houseNumber/agreement",
    async (req, res, next) => {
      try {
        const context = await resolveLandlordAccessContext(req, res);
        if (!context) {
          return;
        }

        if (context.role === "caretaker") {
          return res.status(403).json({
            error: "Caretaker access is read-only for tenant agreements."
          });
        }

        if (!userAccountService) {
          return res.status(503).json({
            error: "User account service unavailable. Database connection is required."
          });
        }

        const buildingId = req.params.buildingId?.trim();
        const building = buildingId ? await store.getBuilding(buildingId) : null;
        if (!building) {
          return res.status(404).json({ error: "Building not found" });
        }

        const hasAccess = await canManageBuildingFromLandlordContext(
          context,
          building.id
        );
        if (!hasAccess) {
          return res.status(403).json({ error: "Building access denied" });
        }

        const houseNumber = normalizeHouseNumber(
          houseNumberQuerySchema.parse({
            houseNumber: req.params.houseNumber
          }).houseNumber
        );

        const parsed = tenantAgreementUpsertSchema.parse(req.body ?? {});

        try {
          const data = await userAccountService.upsertActiveTenantAgreement({
            buildingId: building.id,
            houseNumber,
            payload: parsed
          });

          return res.json({
            data,
            role: context.role
          });
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Unable to save tenant agreement";
          if (message === "ACTIVE_TENANCY_NOT_FOUND") {
            return res.status(409).json({
              error: "An active resident is required before saving a tenant agreement."
            });
          }
          throw error;
        }
      } catch (error) {
        return next(error);
      }
    }
  );

  app.get(
    "/api/landlord/buildings/:buildingId/monthly-combined-utility-charge",
    async (req, res, next) => {
      try {
        const context = await resolveLandlordAccessContext(req, res);
        if (!context) {
          return;
        }

        const buildingId = req.params.buildingId?.trim();
        const building = buildingId ? await store.getBuilding(buildingId) : null;
        if (!building) {
          return res.status(404).json({ error: "Building not found" });
        }

        const hasAccess = await canManageBuildingFromLandlordContext(
          context,
          building.id
        );
        if (!hasAccess) {
          return res.status(403).json({ error: "Building access denied" });
        }

        const billingMonth = billingMonthSchema.parse(
          typeof req.query.billingMonth === "string" ? req.query.billingMonth : ""
        );
        const data = getMonthlyCombinedUtilityCharge(building.id, billingMonth);

        return res.json({
          data: data
            ? {
                ...data,
                buildingName: building.name
              }
            : {
                buildingId: building.id,
                buildingName: building.name,
                billingMonth,
                amountKsh: null
              },
          role: context.role
        });
      } catch (error) {
        return next(error);
      }
    }
  );

  app.put(
    "/api/landlord/buildings/:buildingId/monthly-combined-utility-charge",
    async (req, res, next) => {
      try {
        const context = await resolveLandlordAccessContext(req, res);
        if (!context) {
          return;
        }

        if (context.role === "caretaker") {
          return res.status(403).json({
            error: "House manager accounts cannot change monthly combined charges."
          });
        }

        const buildingId = req.params.buildingId?.trim();
        const building = buildingId ? await store.getBuilding(buildingId) : null;
        if (!building) {
          return res.status(404).json({ error: "Building not found" });
        }

        const hasAccess = await canManageBuildingFromLandlordContext(
          context,
          building.id
        );
        if (!hasAccess) {
          return res.status(403).json({ error: "Building access denied" });
        }

        const parsed = landlordMonthlyCombinedUtilityChargeSchema.parse(req.body ?? {});
        const data = upsertMonthlyCombinedUtilityCharge(
          building.id,
          parsed.billingMonth,
          parsed.amountKsh
        );

        return res.json({
          data: {
            ...data,
            buildingName: building.name
          },
          role: context.role
        });
      } catch (error) {
        return next(error);
      }
    }
  );

  app.get(
    "/api/landlord/buildings/:buildingId/utility-bulk-audits",
    async (req, res, next) => {
      try {
        const context = await resolveLandlordAccessContext(req, res);
        if (!context) {
          return;
        }

        if (!appStateService) {
          return res.status(503).json({
            error: "Bulk utility audit requires database connection."
          });
        }

        const buildingId = req.params.buildingId?.trim();
        const building = buildingId ? await store.getBuilding(buildingId) : null;
        if (!building) {
          return res.status(404).json({ error: "Building not found" });
        }

        const hasAccess = await canManageBuildingFromLandlordContext(
          context,
          building.id
        );
        if (!hasAccess) {
          return res.status(403).json({ error: "Building access denied" });
        }

        const requestedLimit =
          typeof req.query.limit === "string" ? Number(req.query.limit) : 20;
        const data = await listUtilityBulkSubmissionAudits(building.id, requestedLimit);

        return res.json({ data, role: context.role });
      } catch (error) {
        return next(error);
      }
    }
  );

  app.post(
    "/api/landlord/buildings/:buildingId/utility-bulk-audits",
    async (req, res, next) => {
      try {
        const context = await resolveLandlordAccessContext(req, res);
        if (!context) {
          return;
        }

        if (!appStateService) {
          return res.status(503).json({
            error: "Bulk utility audit requires database connection."
          });
        }

        const buildingId = req.params.buildingId?.trim();
        const building = buildingId ? await store.getBuilding(buildingId) : null;
        if (!building) {
          return res.status(404).json({ error: "Building not found" });
        }

        const hasAccess = await canManageBuildingFromLandlordContext(
          context,
          building.id
        );
        if (!hasAccess) {
          return res.status(403).json({ error: "Building access denied" });
        }

        const parsed = landlordUtilityBulkSubmissionAuditCreateSchema.parse(req.body ?? {});
        const data = await createUtilityBulkSubmissionAudit(building, parsed, {
          role: context.role,
          userId: context.userId
        });

        return res.status(201).json({ data, role: context.role });
      } catch (error) {
        return next(error);
      }
    }
  );

  app.patch(
    "/api/landlord/buildings/:buildingId/utility-bulk-audits/:auditId",
    async (req, res, next) => {
      try {
        const context = await resolveLandlordAccessContext(req, res);
        if (!context) {
          return;
        }

        if (!appStateService) {
          return res.status(503).json({
            error: "Bulk utility audit requires database connection."
          });
        }

        const buildingId = req.params.buildingId?.trim();
        const building = buildingId ? await store.getBuilding(buildingId) : null;
        if (!building) {
          return res.status(404).json({ error: "Building not found" });
        }

        const hasAccess = await canManageBuildingFromLandlordContext(
          context,
          building.id
        );
        if (!hasAccess) {
          return res.status(403).json({ error: "Building access denied" });
        }

        const auditId = String(req.params.auditId ?? "").trim();
        if (!auditId) {
          return res.status(400).json({ error: "Audit ID is required." });
        }

        const parsed = landlordUtilityBulkSubmissionAuditFinalizeSchema.parse(
          req.body ?? {}
        );
        const data = await finalizeUtilityBulkSubmissionAudit(
          building.id,
          auditId,
          parsed
        );
        if (!data) {
          return res.status(404).json({ error: "Bulk utility audit not found" });
        }

        return res.json({ data, role: context.role });
      } catch (error) {
        return next(error);
      }
    }
  );

  app.get(
    "/api/landlord/buildings/:buildingId/utility-bulk-audits/:auditId/export.csv",
    async (req, res, next) => {
      try {
        const context = await resolveLandlordAccessContext(req, res);
        if (!context) {
          return;
        }

        if (!appStateService) {
          return res.status(503).json({
            error: "Bulk utility audit requires database connection."
          });
        }

        const buildingId = req.params.buildingId?.trim();
        const building = buildingId ? await store.getBuilding(buildingId) : null;
        if (!building) {
          return res.status(404).json({ error: "Building not found" });
        }

        const hasAccess = await canManageBuildingFromLandlordContext(
          context,
          building.id
        );
        if (!hasAccess) {
          return res.status(403).json({ error: "Building access denied" });
        }

        const auditId = String(req.params.auditId ?? "").trim();
        if (!auditId) {
          return res.status(400).json({ error: "Audit ID is required." });
        }

        const data = await getUtilityBulkSubmissionAudit(building.id, auditId);
        if (!data) {
          return res.status(404).json({ error: "Bulk utility audit not found" });
        }

        const filename = [
          "captyn-housing",
          normalizeBuildingId(building.id).toLowerCase(),
          data.billingMonth,
          "bulk-utility-audit.csv"
        ].join("-");
        res.setHeader("content-type", "text/csv; charset=utf-8");
        res.setHeader("content-disposition", `attachment; filename="${filename}"`);
        return res.send(buildUtilityBulkSubmissionAuditCsv(data));
      } catch (error) {
        return next(error);
      }
    }
  );

  app.get(
    "/api/landlord/resident-directory",
    async (req, res, next) => {
      try {
        const context = await resolveLandlordAccessContext(req, res);
        if (!context) {
          return;
        }

        const requestedBuildingId = String(req.query.buildingId ?? "").trim();
        let buildings = await listVisibleBuildingsForLandlordContext(context);

        if (requestedBuildingId) {
          const building = buildings.find((item) => item.id === requestedBuildingId);
          if (!building) {
            const existingBuilding = await store.getBuilding(requestedBuildingId);
            return res
              .status(existingBuilding ? 403 : 404)
              .json({ error: existingBuilding ? "Building access denied" : "Building not found" });
          }

          buildings = [building];
        }

        const data = await listLandlordResidentDirectoryRows(buildings);

        return res.json({
          data,
          role: context.role
        });
      } catch (error) {
        return next(error);
      }
    }
  );

  app.get(
    "/api/landlord/buildings/:buildingId/rooms/:houseNumber/ledger",
    async (req, res, next) => {
      try {
        const context = await resolveLandlordAccessContext(req, res);
        if (!context) {
          return;
        }

        const buildingId = req.params.buildingId?.trim();
        const normalizedHouseNumber = houseNumberQuerySchema.parse({
          houseNumber: req.params.houseNumber
        }).houseNumber;
        const building = buildingId ? await store.getBuilding(buildingId) : null;
        if (!building) {
          return res.status(404).json({ error: "Building not found" });
        }

        const hasAccess = await canManageBuildingFromLandlordContext(context, building.id);
        if (!hasAccess) {
          return res.status(403).json({ error: "Building access denied" });
        }

        await ensureRecurringUtilityBillsCurrent("landlord.room_ledger", {
          buildingId: building.id,
          houseNumber: normalizedHouseNumber
        });

        const visibleHouseNumbers = await listVisibleHouseNumbersForBuildings([building]);
        if (
          !visibleHouseNumbers.has(normalizeHouseNumber(normalizedHouseNumber)) &&
          !(building.houseNumbers ?? [])
            .map((item) => normalizeHouseNumber(item))
            .includes(normalizeHouseNumber(normalizedHouseNumber))
        ) {
          return res.status(404).json({ error: "Room not found" });
        }

        const data = await buildLandlordRoomLedgerPayload(
          building,
          normalizedHouseNumber
        );

        return res.json({
          data,
          role: context.role
        });
      } catch (error) {
        return next(error);
      }
    }
  );

  app.get(
    "/api/landlord/buildings/:buildingId/rooms/:houseNumber/billing-holds",
    async (req, res, next) => {
      try {
        const context = await resolveLandlordAccessContext(req, res);
        if (!context) {
          return;
        }

        const buildingId = req.params.buildingId?.trim();
        const normalizedHouseNumber = houseNumberQuerySchema.parse({
          houseNumber: req.params.houseNumber
        }).houseNumber;
        const building = buildingId ? await store.getBuilding(buildingId) : null;
        if (!building) {
          return res.status(404).json({ error: "Building not found" });
        }

        const hasAccess = await canManageBuildingFromLandlordContext(context, building.id);
        if (!hasAccess) {
          return res.status(403).json({ error: "Building access denied" });
        }

        const data = await listRoomBillingHolds(building.id, normalizedHouseNumber);
        return res.json({ data, role: context.role });
      } catch (error) {
        return next(error);
      }
    }
  );

  app.post(
    "/api/landlord/buildings/:buildingId/rooms/:houseNumber/billing-holds",
    async (req, res, next) => {
      try {
        const context = await resolveLandlordAccessContext(req, res);
        if (!context) {
          return;
        }

        if (context.role === "caretaker") {
          return res.status(403).json({
            error: "House manager accounts cannot pause room billing."
          });
        }

        if (!repositoryContext.prisma) {
          return res.status(503).json({
            error: "Billing holds require database connection."
          });
        }

        const buildingId = req.params.buildingId?.trim();
        const normalizedHouseNumber = normalizeHouseNumber(
          houseNumberQuerySchema.parse({
            houseNumber: req.params.houseNumber
          }).houseNumber
        );
        const building = buildingId ? await store.getBuilding(buildingId) : null;
        if (!building) {
          return res.status(404).json({ error: "Building not found" });
        }

        const hasAccess = await canManageBuildingFromLandlordContext(context, building.id);
        if (!hasAccess) {
          return res.status(403).json({ error: "Building access denied" });
        }

        const registeredHouseNumbers = new Set(
          (building.houseNumbers ?? []).map((item) => normalizeHouseNumber(item))
        );
        const visibleHouseNumbers = await listVisibleHouseNumbersForBuildings([building]);
        if (
          !registeredHouseNumbers.has(normalizedHouseNumber) &&
          !visibleHouseNumbers.has(normalizedHouseNumber)
        ) {
          return res.status(404).json({ error: "Room not found" });
        }

        const parsed = createRoomBillingHoldSchema.parse(req.body ?? {});
        const actor = actorFromLandlordContext(context);
        const data = mapRoomBillingHold(
          await repositoryContext.prisma.roomBillingHold.create({
            data: {
              buildingId: building.id,
              houseNumber: normalizedHouseNumber,
              scope: parsed.scope,
              utilityType: parsed.utilityType,
              startMonth: parsed.startMonth,
              endMonth: parsed.endMonth,
              reason: parsed.reason,
              createdByUserId: actor.userId,
              createdByRole: actor.role,
              createdByName: actor.name
            }
          })
        );

        await refreshRoomBillingHoldCache(true);
        await recordRoomAccountAuditEvent({
          buildingId: building.id,
          houseNumber: normalizedHouseNumber,
          action: "billing.hold.created",
          summary: `Billing hold added for ${data.scope.replaceAll("_", " ")} from ${data.startMonth} to ${data.endMonth}.`,
          actor,
          metadata: {
            billingHoldId: data.id,
            scope: data.scope,
            utilityType: data.utilityType,
            startMonth: data.startMonth,
            endMonth: data.endMonth,
            reason: data.reason
          }
        });

        return res.status(201).json({ data, role: context.role });
      } catch (error) {
        return next(error);
      }
    }
  );

  const handleCancelRoomBillingHold = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const context = await resolveLandlordAccessContext(req, res);
      if (!context) {
        return;
      }

      if (context.role === "caretaker") {
        return res.status(403).json({
          error: "House manager accounts cannot resume room billing."
        });
      }

      if (!repositoryContext.prisma) {
        return res.status(503).json({
          error: "Billing holds require database connection."
        });
      }

      const buildingId = req.params.buildingId?.trim();
      const normalizedHouseNumber = normalizeHouseNumber(
        houseNumberQuerySchema.parse({
          houseNumber: req.params.houseNumber
        }).houseNumber
      );
      const building = buildingId ? await store.getBuilding(buildingId) : null;
      if (!building) {
        return res.status(404).json({ error: "Building not found" });
      }

      const hasAccess = await canManageBuildingFromLandlordContext(context, building.id);
      if (!hasAccess) {
        return res.status(403).json({ error: "Building access denied" });
      }

      const holdId = String(req.params.holdId ?? "").trim();
      if (!holdId) {
        return res.status(400).json({ error: "Billing hold ID is required." });
      }

      const existing = await repositoryContext.prisma.roomBillingHold.findFirst({
        where: {
          id: holdId,
          buildingId: building.id,
          houseNumber: normalizedHouseNumber
        }
      });
      if (!existing) {
        return res.status(404).json({ error: "Billing hold not found." });
      }

      const parsed = cancelRoomBillingHoldSchema.parse(req.body ?? {});
      const actor = actorFromLandlordContext(context);
      const data = existing.canceledAt
        ? mapRoomBillingHold(existing)
        : mapRoomBillingHold(
            await repositoryContext.prisma.roomBillingHold.update({
              where: { id: existing.id },
              data: {
                canceledAt: new Date(),
                canceledByUserId: actor.userId,
                canceledByRole: actor.role,
                canceledByName: actor.name,
                cancelReason: parsed.reason
              }
            })
          );

      await refreshRoomBillingHoldCache(true);
      await recordRoomAccountAuditEvent({
        buildingId: building.id,
        houseNumber: normalizedHouseNumber,
        action: "billing.hold.canceled",
        summary: `Billing hold resumed for ${data.scope.replaceAll("_", " ")} from ${data.startMonth} to ${data.endMonth}.`,
        actor,
        metadata: {
          billingHoldId: data.id,
          scope: data.scope,
          utilityType: data.utilityType,
          startMonth: data.startMonth,
          endMonth: data.endMonth,
          reason: parsed.reason
        }
      });

      return res.json({ data, role: context.role });
    } catch (error) {
      return next(error);
    }
  };

  app.delete(
    "/api/landlord/buildings/:buildingId/rooms/:houseNumber/billing-holds/:holdId",
    handleCancelRoomBillingHold
  );
  app.post(
    "/api/landlord/buildings/:buildingId/rooms/:houseNumber/billing-holds/:holdId/cancel",
    handleCancelRoomBillingHold
  );

  app.get(
    "/api/landlord/buildings/:buildingId/utility-registry",
    async (req, res, next) => {
      try {
        const context = await resolveLandlordAccessContext(req, res);
        if (!context) {
          return;
        }

        const buildingId = req.params.buildingId?.trim();
        const building = buildingId ? await store.getBuilding(buildingId) : null;
        if (!building) {
          return res.status(404).json({ error: "Building not found" });
        }

        const hasAccess = await canManageBuildingFromLandlordContext(
          context,
          building.id
        );
        if (!hasAccess) {
          return res.status(403).json({ error: "Building access denied" });
        }

        const data = await buildLandlordUtilityRegistryRows(
          building.id,
          building.houseNumbers ?? []
        );
        const rateDefaults = getUtilityRateDefaultsForBuilding(building.id);
        const buildingConfiguration = buildingConfigurationService
          ? await buildingConfigurationService.getForBuilding(building.id)
          : null;

        return res.json({
          data,
          building: {
            id: building.id,
            name: building.name
          },
          buildingConfiguration,
          rateDefaults,
          role: context.role
        });
      } catch (error) {
        return next(error);
      }
    }
  );

  app.put(
    "/api/landlord/buildings/:buildingId/utility-registry",
    async (req, res, next) => {
      try {
        const context = await resolveLandlordAccessContext(req, res);
        if (!context) {
          return;
        }

        const buildingId = req.params.buildingId?.trim();
        const building = buildingId ? await store.getBuilding(buildingId) : null;
        if (!building) {
          return res.status(404).json({ error: "Building not found" });
        }

        const hasAccess = await canManageBuildingFromLandlordContext(
          context,
          building.id
        );
        if (!hasAccess) {
          return res.status(403).json({ error: "Building access denied" });
        }

        const parsed = landlordUtilityRegistryUpsertSchema.parse(req.body ?? {});
        const rateDefaults = parsed.rateDefaults;
        const allowedHouseSet = new Set(
          (building.houseNumbers ?? [])
            .map((item) => normalizeHouseNumber(item))
            .filter(Boolean)
        );

        const touchedHouses = new Set<string>();
        const householdMemberRows: Array<{ houseNumber: string; members: number }> = [];
        const utilityChargeRows: Array<{
          houseNumber: string;
          waterFixedChargeKsh?: number;
          electricityFixedChargeKsh?: number;
          combinedUtilityChargeKsh?: number;
        }> = [];
        for (const row of parsed.rows) {
          const normalizedHouse = normalizeHouseNumber(
            houseNumberQuerySchema.parse({ houseNumber: row.houseNumber }).houseNumber
          );

          if (!allowedHouseSet.has(normalizedHouse)) {
            return res.status(404).json({
              error: `House number ${normalizedHouse} is not registered in building ${building.id}.`
            });
          }

          const waterMeterNumber = row.waterMeterNumber?.trim();
          if (waterMeterNumber) {
            utilityBillingService.upsertMeter("water", building.id, normalizedHouse, {
              meterNumber: waterMeterNumber
            });
          }

          const electricityMeterNumber = row.electricityMeterNumber?.trim();
          if (electricityMeterNumber) {
            utilityBillingService.upsertMeter(
              "electricity",
              building.id,
              normalizedHouse,
              {
                meterNumber: electricityMeterNumber
              }
            );
          }

          if (typeof row.householdMembers === "number") {
            householdMemberRows.push({
              houseNumber: normalizedHouse,
              members: row.householdMembers
            });
          }
          utilityChargeRows.push({
            houseNumber: normalizedHouse,
            waterFixedChargeKsh: row.waterFixedChargeKsh,
            electricityFixedChargeKsh: row.electricityFixedChargeKsh,
            combinedUtilityChargeKsh: row.combinedUtilityChargeKsh
          });

          touchedHouses.add(normalizedHouse);
        }

        await upsertHouseholdMembersForBuilding(building.id, householdMemberRows);
        upsertUtilityChargeDefaultsForBuilding(building.id, utilityChargeRows);
        await upsertUtilityRateDefaultsForBuilding(building.id, rateDefaults ?? {});
        await persistUtilityBillingStateNow();

        const data = await buildLandlordUtilityRegistryRows(
          building.id,
          building.houseNumbers ?? []
        );
        const buildingConfiguration = buildingConfigurationService
          ? await buildingConfigurationService.getForBuilding(building.id)
          : null;

        return res.json({
          data,
          updatedRows: parsed.rows.length,
          touchedHouses: [...touchedHouses].sort(compareHouseNumbers),
          buildingConfiguration,
          rateDefaults: getUtilityRateDefaultsForBuilding(building.id),
          role: context.role
        });
      } catch (error) {
        return next(error);
      }
    }
  );

  app.get("/api/landlord/utilities/meters", async (req, res, next) => {
    try {
      const context = await resolveLandlordAccessContext(req, res);
      if (!context) {
        return;
      }

      const visibleHouseNumbers = await listVisibleHouseNumbersForLandlordContext(
        context
      );

      const utilityType =
        typeof req.query.utilityType === "string"
          ? utilityTypeSchema.parse(req.query.utilityType)
          : undefined;
      const houseNumber =
        typeof req.query.houseNumber === "string"
          ? houseNumberQuerySchema.parse({
              houseNumber: req.query.houseNumber
            }).houseNumber
          : undefined;
      const buildingId =
        typeof req.query.buildingId === "string" ? req.query.buildingId : undefined;

      if (houseNumber && !visibleHouseNumbers.has(normalizeHouseNumber(houseNumber))) {
        return res.status(403).json({ error: "House access denied" });
      }

      const data = utilityBillingService
        .listMeters({ utilityType, buildingId, houseNumber })
        .filter((item) =>
          visibleHouseNumbers.has(normalizeHouseNumber(item.houseNumber))
        );
      return res.json({ data, role: context.role });
    } catch (error) {
      return next(error);
    }
  });

  app.put(
    "/api/landlord/utilities/:utilityType/:houseNumber/meter",
    async (req, res, next) => {
      try {
        const context = await resolveLandlordAccessContext(req, res);
        if (!context) {
          return;
        }

        const visibleHouseNumbers = await listVisibleHouseNumbersForLandlordContext(
          context
        );
        const utilityType = utilityTypeSchema.parse(req.params.utilityType);
        const { houseNumber } = houseNumberQuerySchema.parse({
          houseNumber: req.params.houseNumber
        });
        if (!visibleHouseNumbers.has(normalizeHouseNumber(houseNumber))) {
          return res.status(403).json({ error: "House access denied" });
        }
        const parsed = upsertUtilityMeterSchema.parse(req.body);
        const buildingId =
          typeof req.body?.buildingId === "string"
            ? req.body.buildingId
            : typeof req.query.buildingId === "string"
              ? req.query.buildingId
              : "";

        const data = utilityBillingService.upsertMeter(
          utilityType,
          buildingId,
          houseNumber,
          parsed
        );
        await persistUtilityBillingStateNow();
        return res.json({ data, role: context.role });
      } catch (error) {
        return next(error);
      }
    }
  );

  app.post(
    "/api/landlord/utilities/:utilityType/:houseNumber/bills",
    async (req, res, next) => {
      try {
        const context = await resolveLandlordAccessContext(req, res);
        if (!context) {
          return;
        }

        const visibleHouseNumbers = await listVisibleHouseNumbersForLandlordContext(
          context
        );
        const utilityType = utilityTypeSchema.parse(req.params.utilityType);
        const { houseNumber } = houseNumberQuerySchema.parse({
          houseNumber: req.params.houseNumber
        });
        if (!visibleHouseNumbers.has(normalizeHouseNumber(houseNumber))) {
          return res.status(403).json({ error: "House access denied" });
        }
        const buildingId =
          typeof req.body?.buildingId === "string"
            ? req.body.buildingId
            : typeof req.query.buildingId === "string"
              ? req.query.buildingId
              : "";

        const parsed = createUtilityBillSchema.parse(
          applyUtilityBillDefaults(
            utilityType,
            buildingId,
            houseNumber,
            req.body ?? {}
          )
        );
        await refreshRoomBillingHoldCache();
        if (
          !isBillingHoldOverrideRequested(req.body) &&
          isRoomBillingHeld({
            buildingId,
            houseNumber,
            kind: "utility",
            utilityType,
            billingMonth: parsed.billingMonth
          })
        ) {
          return res.status(409).json({
            error:
              "Utility billing is paused for this room and month. Resume billing from the room account before posting this charge."
          });
        }
        const data = utilityBillingService.createBill(
          utilityType,
          buildingId,
          houseNumber,
          parsed
        );
        await persistUtilityBillingStateNow();
        const utilityLabel = utilityType === "water" ? "Water" : "Electricity";
        const notificationBuilding =
          context.role === "caretaker" ? await store.getBuilding(buildingId) : null;
        await enqueueOwnerNotificationForManagerAction(context, {
          title: `${utilityLabel} Bill Posted`,
          message: `${actorFromLandlordContext(context).name || "House manager"} posted ${utilityLabel.toLowerCase()} bill of KSh ${data.amountKsh.toLocaleString("en-US")} for ${notificationBuilding?.name ?? buildingId} house ${houseNumber} (${data.billingMonth}).`,
          level: "info",
          action: "utility.bill.posted",
          buildingId,
          buildingName: notificationBuilding?.name,
          houseNumber,
          dedupeKey: `manager-utility-bill-${data.id}`,
          metadata: {
            utilityType,
            billId: data.id,
            amountKsh: data.amountKsh,
            billingMonth: data.billingMonth,
            dueDate: data.dueDate
          }
        });
        return res.status(201).json({ data, role: context.role });
      } catch (error) {
        const mapped = mapUtilityDomainError(error);
        if (mapped) {
          return res.status(mapped.status).json({ error: mapped.message });
        }
        return next(error);
      }
    }
  );

  app.get("/api/landlord/utilities/bills", async (req, res, next) => {
    try {
      const context = await resolveLandlordAccessContext(req, res);
      if (!context) {
        return;
      }

      const visibleHouseNumbers = await listVisibleHouseNumbersForLandlordContext(
        context
      );

      const utilityType =
        typeof req.query.utilityType === "string"
          ? utilityTypeSchema.parse(req.query.utilityType)
          : undefined;
      const houseNumber =
        typeof req.query.houseNumber === "string"
          ? houseNumberQuerySchema.parse({
              houseNumber: req.query.houseNumber
            }).houseNumber
          : undefined;
      const billingMonth =
        typeof req.query.billingMonth === "string"
          ? billingMonthSchema.parse(req.query.billingMonth)
          : undefined;
      const buildingId =
        typeof req.query.buildingId === "string" ? req.query.buildingId : undefined;
      if (houseNumber && !visibleHouseNumbers.has(normalizeHouseNumber(houseNumber))) {
        return res.status(403).json({ error: "House access denied" });
      }

      const limitRaw = Number(req.query.limit ?? 500);
      const limit = Number.isFinite(limitRaw)
        ? Math.min(Math.max(limitRaw, 1), 2_000)
        : 500;

      await ensureRecurringUtilityBillsCurrent("landlord.utility_bills", {
        buildingId,
        houseNumber,
        utilityType
      });

      const data = utilityBillingService.listBills({
        utilityType,
        buildingId,
        houseNumber,
        billingMonth,
        limit
      });
      const filtered = data.filter((item) =>
        visibleHouseNumbers.has(normalizeHouseNumber(item.houseNumber))
      );

      return res.json({ data: filtered, role: context.role });
    } catch (error) {
      return next(error);
    }
  });

  app.get("/api/landlord/utilities/payments", async (req, res, next) => {
    try {
      const context = await resolveLandlordAccessContext(req, res);
      if (!context) {
        return;
      }

      const visibleHouseNumbers = await listVisibleHouseNumbersForLandlordContext(
        context
      );

      const utilityType =
        typeof req.query.utilityType === "string"
          ? utilityTypeSchema.parse(req.query.utilityType)
          : undefined;
      const houseNumber =
        typeof req.query.houseNumber === "string"
          ? houseNumberQuerySchema.parse({
              houseNumber: req.query.houseNumber
            }).houseNumber
          : undefined;
      const buildingId =
        typeof req.query.buildingId === "string" ? req.query.buildingId : undefined;
      if (houseNumber && !visibleHouseNumbers.has(normalizeHouseNumber(houseNumber))) {
        return res.status(403).json({ error: "House access denied" });
      }

      const limitRaw = Number(req.query.limit ?? 500);
      const limit = Number.isFinite(limitRaw)
        ? Math.min(Math.max(limitRaw, 1), 2_000)
        : 500;

      const data = utilityBillingService.listPayments({
        utilityType,
        buildingId,
        houseNumber,
        limit
      });
      const filtered = data.filter((item) =>
        visibleHouseNumbers.has(normalizeHouseNumber(item.houseNumber))
      );

      return res.json({ data: filtered, role: context.role });
    } catch (error) {
      return next(error);
    }
  });

  app.post(
    "/api/landlord/utilities/:utilityType/:houseNumber/payments",
    async (req, res, next) => {
      try {
        const context = await resolveLandlordAccessContext(req, res);
        if (!context) {
          return;
        }

        const utilityType = utilityTypeSchema.parse(req.params.utilityType);
        const { houseNumber } = houseNumberQuerySchema.parse({
          houseNumber: req.params.houseNumber
        });
        const parsed = recordUtilityPaymentSchema.parse(req.body);
        const buildingId =
          typeof req.body?.buildingId === "string"
            ? req.body.buildingId
            : typeof req.query.buildingId === "string"
              ? req.query.buildingId
              : "";

        if (!buildingId.trim()) {
          return res.status(400).json({
            error: "Building ID is required to record a utility payment."
          });
        }

        const hasAccess = await canManageBuildingFromLandlordContext(context, buildingId);
        if (!hasAccess) {
          return res.status(403).json({ error: "Building access denied" });
        }

        const data = await recordResidentUtilityPaymentAndNotify(
          utilityType,
          buildingId,
          houseNumber,
          {
            ...parsed,
            source: "manual"
          }
        );

        await recordRoomAccountAuditEvent({
          buildingId,
          houseNumber,
          action: "utility.payment.recorded",
          summary: `${utilityType === "water" ? "Water" : "Electricity"} payment of KSh ${data.event.amountKsh.toLocaleString("en-US")} recorded.`,
          actor: actorFromLandlordContext(context),
          metadata: {
            utilityType,
            paymentId: data.event.id,
            provider: data.event.provider,
            providerReference: data.event.providerReference,
            amountKsh: data.event.amountKsh,
            billingMonth: data.event.billingMonth,
            paidAt: data.event.paidAt,
            allocations: data.allocations.map((item) => ({
              billingMonth: item.bill.billingMonth,
              amountKsh: item.appliedAmountKsh,
              balanceKsh: item.bill.balanceKsh
            }))
          }
        });
        const utilityLabel = utilityType === "water" ? "Water" : "Electricity";
        const notificationBuilding =
          context.role === "caretaker" ? await store.getBuilding(buildingId) : null;
        await enqueueOwnerNotificationForManagerAction(context, {
          title: `${utilityLabel} Payment Recorded`,
          message: `${actorFromLandlordContext(context).name || "House manager"} recorded ${utilityLabel.toLowerCase()} payment of KSh ${data.event.amountKsh.toLocaleString("en-US")} for ${notificationBuilding?.name ?? buildingId} house ${houseNumber}.`,
          level: "success",
          action: "utility.payment.recorded",
          buildingId,
          buildingName: notificationBuilding?.name,
          houseNumber,
          dedupeKey: `manager-utility-payment-${data.event.id}`,
          metadata: {
            utilityType,
            paymentId: data.event.id,
            provider: data.event.provider,
            providerReference: data.event.providerReference,
            amountKsh: data.event.amountKsh,
            billingMonth: data.event.billingMonth,
            paidAt: data.event.paidAt
          }
        });
        return res.status(201).json({ data, role: context.role });
      } catch (error) {
        const mapped = mapUtilityDomainError(error);
        if (mapped) {
          return res.status(mapped.status).json({ error: mapped.message });
        }
        return next(error);
      }
    }
  );

  const handleLandlordUnrecordUtilityPayment = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
      try {
        const context = await resolveLandlordAccessContext(req, res);
        if (!context) {
          return;
        }

        if (context.role === "caretaker") {
          return res.status(403).json({
            error: "House manager accounts cannot unrecord utility payments."
          });
        }

        const utilityType = utilityTypeSchema.parse(req.params.utilityType);
        const { houseNumber } = houseNumberQuerySchema.parse({
          houseNumber: req.params.houseNumber
        });
        const paymentId = String(req.params.paymentId ?? "").trim();
        const buildingId =
          typeof req.query.buildingId === "string"
            ? req.query.buildingId
            : typeof req.body?.buildingId === "string"
              ? req.body.buildingId
              : "";

        if (!paymentId) {
          return res.status(400).json({ error: "Payment ID is required." });
        }

        if (!buildingId.trim()) {
          return res.status(400).json({
            error: "Building ID is required to unrecord a utility payment."
          });
        }

        const hasAccess = await canManageBuildingFromLandlordContext(context, buildingId);
        if (!hasAccess) {
          return res.status(403).json({ error: "Building access denied" });
        }

        const outcome = utilityBillingService.unrecordCashPayment(
          utilityType,
          buildingId,
          houseNumber,
          paymentId
        );
        if (!outcome) {
          return res.status(404).json({ error: "Utility payment not found." });
        }

        await persistUtilityBillingStateNow();
        await recordRoomAccountAuditEvent({
          buildingId,
          houseNumber,
          action: "utility.payment.unrecorded",
          summary: `${utilityType === "water" ? "Water" : "Electricity"} payment of KSh ${outcome.totalAmountKsh.toLocaleString("en-US")} unrecorded.`,
          actor: actorFromLandlordContext(context),
          metadata: {
            utilityType,
            paymentIds: outcome.events.map((event) => event.id),
            amountKsh: outcome.totalAmountKsh,
            allocations: outcome.allocations.map((item) => ({
              paymentId: item.event.id,
              billingMonth: item.bill.billingMonth,
              amountKsh: item.appliedAmountKsh,
              balanceKsh: item.bill.balanceKsh
            }))
          }
        });
        return res.json({
          data: {
            utilityType,
            buildingId,
            houseNumber,
            paymentIds: outcome.events.map((event) => event.id),
            amountKsh: outcome.totalAmountKsh,
            allocations: outcome.allocations.map((item) => ({
              paymentId: item.event.id,
              billingMonth: item.bill.billingMonth,
              amountKsh: item.appliedAmountKsh,
              balanceKsh: item.bill.balanceKsh
            }))
          },
          role: context.role
        });
      } catch (error) {
        const mapped = mapUtilityDomainError(error);
        if (mapped) {
          return res.status(mapped.status).json({ error: mapped.message });
        }
        return next(error);
      }
    };

  app.delete(
    "/api/landlord/utilities/:utilityType/:houseNumber/payments/:paymentId",
    handleLandlordUnrecordUtilityPayment
  );
  app.post(
    "/api/landlord/utilities/:utilityType/:houseNumber/payments/:paymentId/unrecord",
    handleLandlordUnrecordUtilityPayment
  );

  app.get("/api/admin/utilities/meters", (req, res, next) => {
    try {
      const admin = getAdminSession(req, res, "admin");
      if (!admin) {
        return;
      }

      const utilityType =
        typeof req.query.utilityType === "string"
          ? utilityTypeSchema.parse(req.query.utilityType)
          : undefined;
      const houseNumber =
        typeof req.query.houseNumber === "string"
          ? houseNumberQuerySchema.parse({
              houseNumber: req.query.houseNumber
            }).houseNumber
          : undefined;
      const buildingId =
        typeof req.query.buildingId === "string" ? req.query.buildingId : undefined;

      const data = utilityBillingService.listMeters({
        utilityType,
        buildingId,
        houseNumber
      });
      return res.json({ data, role: admin.role });
    } catch (error) {
      return next(error);
    }
  });

  app.put("/api/admin/utilities/:utilityType/:houseNumber/meter", async (req, res, next) => {
    try {
      const admin = getAdminSession(req, res, "admin");
      if (!admin) {
        return;
      }

      const utilityType = utilityTypeSchema.parse(req.params.utilityType);
      const { houseNumber } = houseNumberQuerySchema.parse({
        houseNumber: req.params.houseNumber
      });
      const parsed = upsertUtilityMeterSchema.parse(req.body);
      const buildingId =
        typeof req.body?.buildingId === "string"
          ? req.body.buildingId
          : typeof req.query.buildingId === "string"
            ? req.query.buildingId
            : "";

      const data = utilityBillingService.upsertMeter(
        utilityType,
        buildingId,
        houseNumber,
        parsed
      );
      await persistUtilityBillingStateNow();
      return res.json({ data, role: admin.role });
    } catch (error) {
      return next(error);
    }
  });

  app.post("/api/admin/utilities/:utilityType/:houseNumber/bills", async (req, res, next) => {
    try {
      const admin = getAdminSession(req, res, "admin");
      if (!admin) {
        return;
      }

      const utilityType = utilityTypeSchema.parse(req.params.utilityType);
      const { houseNumber } = houseNumberQuerySchema.parse({
        houseNumber: req.params.houseNumber
      });
      const buildingId =
        typeof req.body?.buildingId === "string"
          ? req.body.buildingId
          : typeof req.query.buildingId === "string"
            ? req.query.buildingId
            : "";

      const parsed = createUtilityBillSchema.parse(
        applyUtilityBillDefaults(
          utilityType,
          buildingId,
          houseNumber,
          req.body ?? {}
        )
      );
      await refreshRoomBillingHoldCache();
      if (
        !isBillingHoldOverrideRequested(req.body) &&
        isRoomBillingHeld({
          buildingId,
          houseNumber,
          kind: "utility",
          utilityType,
          billingMonth: parsed.billingMonth
        })
      ) {
        return res.status(409).json({
          error:
            "Utility billing is paused for this room and month. Resume billing from the room account before posting this charge."
        });
      }
      const data = utilityBillingService.createBill(
        utilityType,
        buildingId,
        houseNumber,
        parsed
      );
      await persistUtilityBillingStateNow();
      return res.status(201).json({ data, role: admin.role });
    } catch (error) {
      const mapped = mapUtilityDomainError(error);
      if (mapped) {
        return res.status(mapped.status).json({ error: mapped.message });
      }
      return next(error);
    }
  });

  app.post("/api/admin/utilities/:utilityType/:houseNumber/payments", async (req, res, next) => {
    try {
      const admin = getAdminSession(req, res, "admin");
      if (!admin) {
        return;
      }

      const utilityType = utilityTypeSchema.parse(req.params.utilityType);
      const { houseNumber } = houseNumberQuerySchema.parse({
        houseNumber: req.params.houseNumber
      });
      const parsed = recordUtilityPaymentSchema.parse(req.body);
      const buildingId =
        typeof req.body?.buildingId === "string"
          ? req.body.buildingId
          : typeof req.query.buildingId === "string"
            ? req.query.buildingId
            : "";

      const data = await recordResidentUtilityPaymentAndNotify(
        utilityType,
        buildingId,
        houseNumber,
        {
          ...parsed,
          source: "manual"
        }
      );
      return res.status(201).json({ data, role: admin.role });
    } catch (error) {
      const mapped = mapUtilityDomainError(error);
      if (mapped) {
        return res.status(mapped.status).json({ error: mapped.message });
      }
      return next(error);
    }
  });

  app.get("/api/admin/utilities/bills", (req, res, next) => {
    try {
      const admin = getAdminSession(req, res, "admin");
      if (!admin) {
        return;
      }

      const utilityType =
        typeof req.query.utilityType === "string"
          ? utilityTypeSchema.parse(req.query.utilityType)
          : undefined;
      const houseNumber =
        typeof req.query.houseNumber === "string"
          ? houseNumberQuerySchema.parse({
              houseNumber: req.query.houseNumber
            }).houseNumber
          : undefined;
      const buildingId =
        typeof req.query.buildingId === "string" ? req.query.buildingId : undefined;

      const limitRaw = Number(req.query.limit ?? 500);
      const limit = Number.isFinite(limitRaw)
        ? Math.min(Math.max(limitRaw, 1), 2_000)
        : 500;

      const data = utilityBillingService.listBills({
        utilityType,
        buildingId,
        houseNumber,
        limit
      });
      return res.json({ data, role: admin.role });
    } catch (error) {
      return next(error);
    }
  });

  app.get("/api/admin/utilities/payments", (req, res, next) => {
    try {
      const admin = getAdminSession(req, res, "admin");
      if (!admin) {
        return;
      }

      const utilityType =
        typeof req.query.utilityType === "string"
          ? utilityTypeSchema.parse(req.query.utilityType)
          : undefined;
      const houseNumber =
        typeof req.query.houseNumber === "string"
          ? houseNumberQuerySchema.parse({
              houseNumber: req.query.houseNumber
            }).houseNumber
          : undefined;
      const buildingId =
        typeof req.query.buildingId === "string" ? req.query.buildingId : undefined;

      const limitRaw = Number(req.query.limit ?? 500);
      const limit = Number.isFinite(limitRaw)
        ? Math.min(Math.max(limitRaw, 1), 2_000)
        : 500;

      const data = utilityBillingService.listPayments({
        utilityType,
        buildingId,
        houseNumber,
        limit
      });

      return res.json({ data, role: admin.role });
    } catch (error) {
      return next(error);
    }
  });

  app.get("/api/landlord/tickets", async (req, res) => {
    const context = await resolveLandlordAccessContext(req, res);
    if (!context) {
      return;
    }

    const status = parseTicketStatusFilter(req.query.status);
    const queue =
      req.query.queue === "maintenance" || req.query.queue === "security"
        ? req.query.queue
        : undefined;
    const houseNumber =
      typeof req.query.houseNumber === "string"
        ? req.query.houseNumber
        : undefined;
    const requestedBuildingId =
      typeof req.query.buildingId === "string"
        ? req.query.buildingId
        : undefined;

    const limitValue = Number(req.query.limit ?? 200);
    const limit = Number.isFinite(limitValue)
      ? Math.min(Math.max(limitValue, 1), 800)
      : 200;

    const visibleIds = await listVisibleBuildingIdsForLandlordContext(context);
    if (
      requestedBuildingId &&
      visibleIds &&
      !visibleIds.has(requestedBuildingId)
    ) {
      return res.status(403).json({ error: "Building access denied" });
    }

    const data = userSupportService
      .listAllReports({
        status,
        queue,
        houseNumber,
        buildingId: requestedBuildingId,
        limit
      })
      .filter((item) => !visibleIds || visibleIds.has(item.buildingId));

    return res.json({ data, role: context.role });
  });

  app.patch("/api/landlord/tickets/:ticketId/status", async (req, res, next) => {
    try {
      const context = await resolveLandlordAccessContext(req, res);
      if (!context) {
        return;
      }

      const parsed = landlordUpdateTicketStatusSchema.parse(req.body);
      const current = userSupportService.getReportById(req.params.ticketId);
      if (!current) {
        return res.status(404).json({ error: "Ticket not found" });
      }

      const visibleIds = await listVisibleBuildingIdsForLandlordContext(context);
      if (visibleIds && !visibleIds.has(current.buildingId)) {
        return res.status(403).json({ error: "Ticket is outside your buildings." });
      }

      const actor = context.role === "caretaker" ? "caretaker" : "landlord";
      const updated = userSupportService.updateReportStatus(
        req.params.ticketId,
        parsed,
        actor
      );

      if (!updated) {
        return res.status(404).json({ error: "Ticket not found" });
      }

      const notificationBuilding =
        context.role === "caretaker" ? await store.getBuilding(current.buildingId) : null;
      await enqueueOwnerNotificationForManagerAction(context, {
        title: "Support Ticket Updated",
        message: `${actorFromLandlordContext(context).name || "House manager"} moved ticket ${current.id.slice(0, 8)} for ${notificationBuilding?.name ?? current.buildingId} house ${current.houseNumber} to ${updated.report.status.replace(/_/g, " ")}.`,
        level: updated.report.status === "resolved" ? "success" : "info",
        action: "support_ticket.status_updated",
        buildingId: current.buildingId,
        buildingName: notificationBuilding?.name,
        houseNumber: current.houseNumber,
        dedupeKey: `manager-ticket-${current.id}-${updated.report.status}-${updated.report.statusUpdatedAt}`,
        metadata: {
          ticketId: current.id,
          status: updated.report.status,
          queue: updated.report.queue,
          statusUpdatedAt: updated.report.statusUpdatedAt
        }
      });
      return res.json({ data: updated, role: context.role });
    } catch (error) {
      return next(error);
    }
  });

  app.get("/api/admin/tickets", (req, res) => {
    const admin = getAdminSession(req, res, "admin");
    if (!admin) {
      return;
    }

    return res.status(403).json({
      error:
        "Complaints are managed in the landlord portal for the building owner. Admin can oversee access and registry only."
    });
  });

  app.patch("/api/admin/tickets/:ticketId/status", (req, res, next) => {
    try {
      const admin = getAdminSession(req, res, "admin");
      if (!admin) {
        return;
      }

      return res.status(403).json({
        error:
          "Complaints are managed in the landlord portal for the building owner. Admin can oversee access and registry only."
      });
    } catch (error) {
      return next(error);
    }
  });

  app.post("/api/buildings", async (req, res, next) => {
    try {
      const userSession = await resolveOptionalUserSession(req);
      const legacyAdminSession = adminAuthService.getSession(readAdminSessionToken(req));
      const hasLegacyBuildingManager = legacyAdminSession
        ? adminAuthService.hasRole(legacyAdminSession, "landlord")
        : false;

      if (!userSession && !hasLegacyBuildingManager) {
        return res.status(401).json({ error: "Authorization required" });
      }

      if (userSession && !hasUserRoleAtLeast(userSession.role, "landlord")) {
        return res.status(403).json({ error: "landlord role required" });
      }

      const parsed = createBuildingSchema.parse(req.body);
      if (
        userSession &&
        userSession.role === "landlord" &&
        (!parsed.houseNumbers || parsed.houseNumbers.length === 0)
      ) {
        return res.status(400).json({
          error: "Landlord building creation requires houseNumbers."
        });
      }

      const building = await store.createBuilding(parsed, {
        landlordUserId:
          userSession && userSession.role === "landlord"
            ? userSession.userId
            : undefined
      });
      await syncDerivedBuildingConfigurationState();
      return res.status(201).json({
        data: building,
        role: userSession?.role ?? legacyAdminSession?.role ?? "admin"
      });
    } catch (error) {
      return next(error);
    }
  });

  app.delete("/api/admin/buildings/:buildingId", async (req, res, next) => {
    try {
      const userSession = await resolveOptionalUserSession(req);
      const legacyAdminSession = adminAuthService.getSession(readAdminSessionToken(req));
      const hasLegacyAdmin = legacyAdminSession
        ? adminAuthService.hasRole(legacyAdminSession, "admin")
        : false;

      if (!userSession && !hasLegacyAdmin) {
        return res.status(401).json({ error: "Authorization required" });
      }

      if (userSession && !hasUserRoleAtLeast(userSession.role, "admin")) {
        return res.status(403).json({ error: "admin role required" });
      }

      const buildingId = req.params.buildingId?.trim();
      if (!buildingId) {
        return res.status(400).json({ error: "Building id is required." });
      }

      const parsed = deleteBuildingSchema.parse(req.body ?? {});
      if (
        parsed.confirmBuildingId &&
        parsed.confirmBuildingId.trim() !== buildingId
      ) {
        return res.status(400).json({
          error: "Confirmation building id does not match the selected building."
        });
      }

      const deleted = await store.deleteBuilding(buildingId);
      if (!deleted) {
        return res.status(404).json({ error: "Building not found" });
      }

      purgeRuntimeStateForBuilding(deleted.id);
      await syncDerivedBuildingConfigurationState();

      return res.json({
        data: {
          id: deleted.id,
          name: deleted.name,
          deletedAt: new Date().toISOString()
        },
        role: userSession?.role ?? legacyAdminSession?.role ?? "admin"
      });
    } catch (error) {
      return next(error);
    }
  });

  app.delete("/api/landlord/buildings/:buildingId", async (req, res, next) => {
    try {
      const context = await resolveLandlordAccessContext(req, res);
      if (!context) {
        return;
      }

      if (context.role === "caretaker") {
        return res.status(403).json({
          error: "Caretaker accounts cannot delete buildings."
        });
      }

      const buildingId = req.params.buildingId?.trim();
      if (!buildingId) {
        return res.status(400).json({ error: "Building id is required." });
      }

      const hasAccess = await canManageBuildingFromLandlordContext(
        context,
        buildingId
      );
      if (!hasAccess) {
        return res.status(403).json({ error: "Building access denied" });
      }

      const parsed = deleteBuildingSchema.parse(req.body ?? {});
      if (
        parsed.confirmBuildingId &&
        parsed.confirmBuildingId.trim() !== buildingId
      ) {
        return res.status(400).json({
          error: "Confirmation building id does not match the selected building."
        });
      }

      const deleted = await store.deleteBuilding(buildingId);
      if (!deleted) {
        return res.status(404).json({ error: "Building not found" });
      }

      purgeRuntimeStateForBuilding(deleted.id);
      await syncDerivedBuildingConfigurationState();
      logHousingEvent("building.delete", {
        buildingId: deleted.id,
        actorRole: context.role,
        actorUserId: context.userId ?? null
      });

      return res.json({
        data: {
          id: deleted.id,
          name: deleted.name,
          deletedAt: new Date().toISOString()
        },
        role: context.role
      });
    } catch (error) {
      return next(error);
    }
  });

  app.post("/api/landlord/buildings/:buildingId/houses", async (req, res, next) => {
    try {
      const context = await resolveLandlordAccessContext(req, res);
      if (!context) {
        return;
      }

      if (context.role === "caretaker") {
        return res.status(403).json({
          error: "House manager accounts cannot add rooms."
        });
      }

      const buildingId = req.params.buildingId?.trim();
      if (!buildingId) {
        return res.status(400).json({ error: "Building id is required." });
      }

      const hasAccess = await canManageBuildingFromLandlordContext(context, buildingId);
      if (!hasAccess) {
        return res.status(403).json({ error: "Building access denied" });
      }

      const parsed = landlordAddBuildingHousesSchema.parse(req.body ?? {});
      const updated = await store.addHouseUnits(buildingId, parsed);
      if (!updated) {
        return res.status(404).json({ error: "Building not found" });
      }

      return res.status(200).json({
        data: {
          building: updated.building,
          addedHouseNumbers: updated.addedHouseNumbers,
          addedCount: updated.addedHouseNumbers.length
        },
        role: context.role
      });
    } catch (error) {
      return next(error);
    }
  });

  const handleLandlordRemoveHouse = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const context = await resolveLandlordAccessContext(req, res);
      if (!context) {
        return;
      }

      if (context.role === "caretaker") {
        return res.status(403).json({
          error: "House manager accounts cannot remove rooms."
        });
      }

      const buildingId = req.params.buildingId?.trim();
      const houseNumberParam = req.params.houseNumber?.trim();
      if (!buildingId || !houseNumberParam) {
        return res
          .status(400)
          .json({ error: "Building id and house number are required." });
      }

      const hasAccess = await canManageBuildingFromLandlordContext(context, buildingId);
      if (!hasAccess) {
        return res.status(403).json({ error: "Building access denied" });
      }

      const parsed = landlordRemoveBuildingHouseSchema.parse(req.body ?? {});
      const { houseNumber } = houseNumberQuerySchema.parse({
        houseNumber: houseNumberParam
      });

      if (
        parsed.confirmHouseNumber &&
        parsed.confirmHouseNumber.trim().toUpperCase() !== houseNumber
      ) {
        return res.status(400).json({
          error: "Confirmation house number does not match the selected room."
        });
      }

      const updated = await store.removeHouseUnit(buildingId, houseNumber);
      if (!updated) {
        return res.status(404).json({ error: "Room not found." });
      }

      purgeRuntimeStateForHouse(buildingId, houseNumber);
      await recordRoomAccountAuditEvent({
        buildingId,
        houseNumber,
        action: "room.removed",
        summary: `Room ${houseNumber} removed from ${updated.building.name}.`,
        actor: actorFromLandlordContext(context),
        metadata: {
          removedHouseNumber: updated.removedHouseNumber
        }
      });

      return res.status(200).json({
        data: {
          building: updated.building,
          removedHouseNumber: updated.removedHouseNumber
        },
        role: context.role
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes("tenancy")) {
        return res.status(409).json({ error: error.message });
      }
      return next(error);
    }
  };

  app.post(
    "/api/landlord/buildings/:buildingId/houses/:houseNumber/write-off-balances",
    async (req, res, next) => {
      try {
        const context = await resolveLandlordAccessContext(req, res);
        if (!context) {
          return;
        }

        if (context.role === "caretaker") {
          return res.status(403).json({
            error: "House manager accounts cannot clear room balances."
          });
        }

        if (!repositoryContext.prisma) {
          return res.status(503).json({
            error: "Room balance write-off requires database connection."
          });
        }

        const buildingId = req.params.buildingId?.trim();
        const houseNumberParam = req.params.houseNumber?.trim();
        if (!buildingId || !houseNumberParam) {
          return res
            .status(400)
            .json({ error: "Building id and house number are required." });
        }

        const building = await store.getBuilding(buildingId);
        if (!building) {
          return res.status(404).json({ error: "Building not found" });
        }

        const hasAccess = await canManageBuildingFromLandlordContext(
          context,
          building.id
        );
        if (!hasAccess) {
          return res.status(403).json({ error: "Building access denied" });
        }

        const { houseNumber } = houseNumberQuerySchema.parse({
          houseNumber: houseNumberParam
        });
        const registeredHouseNumbers = new Set(
          (building.houseNumbers ?? []).map((item) => normalizeHouseNumber(item))
        );
        const visibleHouseNumbers = await listVisibleHouseNumbersForBuildings([building]);
        if (
          !registeredHouseNumbers.has(houseNumber) &&
          !visibleHouseNumbers.has(houseNumber)
        ) {
          return res.status(404).json({ error: "Room not found" });
        }

        const activeTenancy = await repositoryContext.prisma.tenancy.findFirst({
          where: {
            buildingId: building.id,
            active: true,
            unit: {
              houseNumber
            }
          },
          select: {
            id: true,
            userId: true
          }
        });
        if (activeTenancy) {
          return res.status(409).json({
            error:
              "This room has an active resident. Use Clear Resident so the settlement is tied to that resident."
          });
        }

        const parsed = landlordWriteOffRoomBalanceSchema.parse(req.body ?? {});
        const summary = await buildEmptyRoomLossSettlementSummary(
          building.id,
          houseNumber
        );
        if (summary.totalOutstandingKsh <= 0) {
          return res.json({
            data: {
              summary,
              settlement: null,
              recordId: null
            }
          });
        }

        const actor = actorFromLandlordContext(context);
        const settlement = await settleRoomBalancesForResidentRemoval(
          building.id,
          houseNumber,
          "write_off",
          "Written off when empty room balance was cleared."
        );
        const record = await recordResidentMoveOutSettlement({
          summary,
          action: "write_off",
          reason: parsed.reason || "Empty room balance cleared",
          actor,
          settlement
        });

        await recordRoomAccountAuditEvent({
          buildingId: building.id,
          houseNumber,
          action: "room.balance.writeoff",
          summary: `KSh ${settlement.totalSettledKsh.toLocaleString("en-US")} in pending room balances written off for empty room ${houseNumber}.`,
          actor,
          metadata: {
            settlementRecordId: record?.id,
            reason: parsed.reason,
            rentKsh: settlement.rentSettledKsh,
            utilityKsh: settlement.utilitySettledKsh,
            roomChargesKsh: settlement.roomChargesSettledKsh,
            utilityBills: settlement.utilities.bills,
            roomChargeCount: settlement.roomChargeCount
          }
        });

        return res.json({
          data: {
            summary,
            settlement,
            recordId: record?.id
          }
        });
      } catch (error) {
        return next(error);
      }
    }
  );

  app.delete(
    "/api/landlord/buildings/:buildingId/houses/:houseNumber",
    handleLandlordRemoveHouse
  );

  app.post(
    "/api/landlord/buildings/:buildingId/houses/:houseNumber/remove",
    handleLandlordRemoveHouse
  );

  app.get(
    "/api/landlord/buildings/:buildingId/users/:userId/move-out-settlement",
    async (req, res, next) => {
      try {
        const context = await resolveLandlordAccessContext(req, res);
        if (!context) {
          return;
        }

        const session = context.userSession;
        if (!session) {
          return res.status(403).json({
            error:
              "Move-out settlement requires a database-backed owner/staff account."
          });
        }

        if (!userAccountService || !repositoryContext.prisma) {
          return res.status(503).json({
            error: "Move-out settlement requires database connection."
          });
        }

        const buildingId = req.params.buildingId?.trim();
        const userId = req.params.userId?.trim();
        if (!buildingId || !userId) {
          return res.status(400).json({ error: "Building id and user id are required." });
        }

        const hasAccess = await canManageBuildingFromLandlordContext(context, buildingId);
        if (!hasAccess) {
          return res.status(403).json({ error: "Building access denied" });
        }

        const data = await buildResidentMoveOutSettlementSummary(buildingId, userId);
        return res.json({ data, role: session.role });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unable to load move-out settlement.";
        if (message === "TENANCY_NOT_FOUND") {
          return res.status(404).json({
            error: "Resident is not active in this building."
          });
        }
        return next(error);
      }
    }
  );

  const handleLandlordRemoveResident = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const context = await resolveLandlordAccessContext(req, res);
      if (!context) {
        return;
      }

      const session = context.userSession;
      if (!session) {
        return res.status(403).json({
          error: "Clearing a resident requires a database-backed owner/staff account."
        });
      }

      if (!userAccountService) {
        return res.status(503).json({
          error: "User account service unavailable. Database connection is required."
        });
      }

      const buildingId = req.params.buildingId?.trim();
      const userId = req.params.userId?.trim();
      if (!buildingId || !userId) {
        return res.status(400).json({ error: "Building id and user id are required." });
      }

      const parsed = landlordRemoveBuildingUserSchema.parse(req.body ?? {});
      if (parsed.confirmUserId && parsed.confirmUserId.trim() !== userId) {
        return res.status(400).json({
          error: "Confirmation user id does not match the selected resident."
        });
      }

      try {
        const visibleBuildingIds = await listVisibleBuildingIdsForLandlordContext(context);
        if (visibleBuildingIds && !visibleBuildingIds.has(buildingId)) {
          return res.status(403).json({ error: "Building access denied" });
        }
        if (context.role === "caretaker" && parsed.settlementAction === "write_off") {
          return res.status(403).json({
            error:
              "House manager accounts cannot write off resident balances. Transfer the balance to resident debt or keep the resident active until paid."
          });
        }

        const settlementSummary = await buildResidentMoveOutSettlementSummary(
          buildingId,
          userId
        );
        if (
          typeof parsed.confirmedOutstandingKsh === "number" &&
          parsed.confirmedOutstandingKsh !== settlementSummary.totalOutstandingKsh
        ) {
          return res.status(409).json({
            error:
              "The move-out balance changed while you were reviewing it. Refresh the settlement and try again.",
            data: settlementSummary
          });
        }

        if (
          parsed.settlementAction === "collect_before_move_out" &&
          settlementSummary.totalOutstandingKsh > 0
        ) {
          return res.status(409).json({
            error:
              "Collect the outstanding balance before clearing this resident, or choose write-off/transfer debt.",
            data: settlementSummary
          });
        }

        const data = await userAccountService.removeResidentFromBuilding(session, {
          buildingId,
          userId,
          note: parsed.note,
          actorRole: context.role as UserRole | "caretaker",
          visibleBuildingIds
        });
        const actor = actorFromLandlordContext(context);
        const billingSettlement =
          parsed.settlementAction === "write_off" ||
          parsed.settlementAction === "transfer_to_resident_debt"
            ? await settleRoomBalancesForResidentRemoval(
                buildingId,
                data.houseNumber,
                parsed.settlementAction
              )
            : {
                action: parsed.settlementAction,
                rentWrittenOffKsh: 0,
                utilityWrittenOffKsh: 0,
                roomChargesWrittenOffKsh: 0,
                rentSettledKsh: 0,
                utilitySettledKsh: 0,
                roomChargesSettledKsh: 0,
                totalWrittenOffKsh: 0,
                totalSettledKsh: 0,
                rent: null,
                utilities: { totalWrittenOffKsh: 0, bills: [] },
                roomChargeCount: 0
              };
        const settlementRecord =
          parsed.settlementAction === "write_off" ||
          parsed.settlementAction === "transfer_to_resident_debt"
            ? await recordResidentMoveOutSettlement({
                summary: settlementSummary,
                action: parsed.settlementAction,
                reason: parsed.settlementReason || parsed.note,
                actor,
                settlement: billingSettlement as Awaited<
                  ReturnType<typeof settleRoomBalancesForResidentRemoval>
                >
              })
            : null;

        if (billingSettlement.totalSettledKsh > 0) {
          const transferred = parsed.settlementAction === "transfer_to_resident_debt";
          await recordRoomAccountAuditEvent({
            buildingId,
            houseNumber: data.houseNumber,
            tenancyId: data.tenancyId,
            action: transferred
              ? "resident.debt.transferred"
              : "resident.balance.writeoff",
            summary: transferred
              ? `KSh ${billingSettlement.totalSettledKsh.toLocaleString("en-US")} moved to resident debt when ${data.user.fullName} was removed.`
              : `KSh ${billingSettlement.totalSettledKsh.toLocaleString("en-US")} in pending room balances written off when ${data.user.fullName} was removed.`,
            actor,
            metadata: {
              removedUserId: data.user.id,
              settlementAction: parsed.settlementAction,
              settlementReason: parsed.settlementReason,
              settlementRecordId: settlementRecord?.id,
              rentKsh: billingSettlement.rentSettledKsh,
              utilityKsh: billingSettlement.utilitySettledKsh,
              roomChargesKsh: billingSettlement.roomChargesSettledKsh,
              utilityBills: billingSettlement.utilities.bills,
              roomChargeCount: billingSettlement.roomChargeCount
            }
          });
        }
        await recordRoomAccountAuditEvent({
          buildingId,
          houseNumber: data.houseNumber,
          tenancyId: data.tenancyId,
          action: "resident.removed",
          summary: `${data.user.fullName} removed from house ${data.houseNumber}.`,
          actor,
          metadata: {
            removedUserId: data.user.id,
            residentPhone: data.user.phone,
            note: data.note,
            settlementAction: parsed.settlementAction,
            settlementReason: parsed.settlementReason,
            removedAt: data.removedAt,
            billingSettlement
          }
        });
        await enqueueOwnerNotificationForManagerAction(context, {
          title: "Resident Cleared",
          message: `${actor.name || "House manager"} cleared ${data.user.fullName} from ${data.building.name} house ${data.houseNumber}. Settlement: ${parsed.settlementAction.replace(/_/g, " ")}.`,
          level:
            billingSettlement.totalSettledKsh > 0 || parsed.settlementAction === "collect_before_move_out"
              ? "warning"
              : "info",
          action: "resident.removed",
          buildingId,
          buildingName: data.building.name,
          houseNumber: data.houseNumber,
          dedupeKey: `manager-resident-removed-${data.tenancyId}-${data.removedAt}`,
          metadata: {
            removedUserId: data.user.id,
            residentPhone: data.user.phone,
            settlementAction: parsed.settlementAction,
            settlementReason: parsed.settlementReason,
            settlementRecordId: settlementRecord?.id,
            totalSettledKsh: billingSettlement.totalSettledKsh,
            removedAt: data.removedAt
          }
        });
        return res.json({
          data: {
            ...data,
            settlement: {
              action: parsed.settlementAction,
              reason: parsed.settlementReason,
              summary: settlementSummary,
              recordId: settlementRecord?.id,
              result: billingSettlement
            },
            billingWriteOff:
              parsed.settlementAction === "write_off" ? billingSettlement : undefined
          }
        });
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Unable to remove resident from this building";
        if (message === "BUILDING_NOT_FOUND") {
          return res.status(404).json({ error: "Building not found" });
        }
        if (message === "BUILDING_ACCESS_DENIED") {
          return res.status(403).json({ error: "Building access denied" });
        }
        if (message === "TENANCY_NOT_FOUND") {
          return res.status(404).json({
            error: "Resident is not active in this building."
          });
        }
        if (message === "TARGET_USER_NOT_RESIDENT") {
          return res.status(409).json({
            error: "Only active resident accounts can be removed by landlord."
          });
        }
        throw error;
      }
    } catch (error) {
      return next(error);
    }
  };

  app.delete(
    "/api/landlord/buildings/:buildingId/users/:userId",
    handleLandlordRemoveResident
  );

  app.post(
    "/api/landlord/buildings/:buildingId/users/:userId/remove",
    handleLandlordRemoveResident
  );

  app.post("/api/buildings/:buildingId/incidents", async (req, res, next) => {
    try {
      const userSession = await resolveOptionalUserSession(req);
      const legacyLandlordSession = adminAuthService.getSession(readAdminSessionToken(req));
      const hasLegacyLandlord = legacyLandlordSession
        ? adminAuthService.hasRole(legacyLandlordSession, "landlord")
        : false;

      if (!userSession && !hasLegacyLandlord) {
        return res.status(401).json({ error: "Authorization required" });
      }

      if (userSession && userAccountService) {
        const hasAccess = await userAccountService.canAccessBuilding(
          userSession,
          req.params.buildingId
        );
        if (!hasAccess) {
          return res.status(403).json({ error: "Building access denied" });
        }
      }

      const parsed = createIncidentSchema.parse(req.body);
      const incident = await store.addIncident(req.params.buildingId, parsed);

      if (!incident) {
        return res.status(404).json({ error: "Building not found" });
      }

      return res.status(201).json({ data: incident });
    } catch (error) {
      return next(error);
    }
  });

  app.patch(
    "/api/buildings/:buildingId/incidents/:incidentId/resolve",
    async (req, res, next) => {
      try {
        const userSession = await resolveOptionalUserSession(req);
        const legacyLandlordSession = adminAuthService.getSession(readAdminSessionToken(req));
        const hasLegacyLandlord = legacyLandlordSession
          ? adminAuthService.hasRole(legacyLandlordSession, "landlord")
          : false;

        if (!userSession && !hasLegacyLandlord) {
          return res.status(401).json({ error: "Authorization required" });
        }

        if (userSession) {
          if (!hasUserRoleAtLeast(userSession.role, "landlord")) {
            return res.status(403).json({ error: "landlord role required" });
          }
          if (userAccountService) {
            const hasAccess = await userAccountService.canAccessBuilding(
              userSession,
              req.params.buildingId
            );
            if (!hasAccess) {
              return res.status(403).json({ error: "Building access denied" });
            }
          }
        }

        const parsed = resolveIncidentSchema.parse(req.body);
        const incident = await store.resolveIncident(
          req.params.buildingId,
          req.params.incidentId,
          parsed
        );

        if (!incident) {
          return res
            .status(404)
            .json({ error: "Building or incident not found" });
        }

        return res.json({ data: incident });
      } catch (error) {
        return next(error);
      }
    }
  );

  app.post(
    "/api/buildings/:buildingId/vacancy-snapshots",
    async (req, res, next) => {
      try {
        const userSession = await resolveOptionalUserSession(req);
        const legacyLandlordSession = adminAuthService.getSession(readAdminSessionToken(req));
        const hasLegacyLandlord = legacyLandlordSession
          ? adminAuthService.hasRole(legacyLandlordSession, "landlord")
          : false;

        if (!userSession && !hasLegacyLandlord) {
          return res.status(401).json({ error: "Authorization required" });
        }

        if (userSession) {
          if (!hasUserRoleAtLeast(userSession.role, "landlord")) {
            return res.status(403).json({ error: "landlord role required" });
          }
          if (userAccountService) {
            const hasAccess = await userAccountService.canAccessBuilding(
              userSession,
              req.params.buildingId
            );
            if (!hasAccess) {
              return res.status(403).json({ error: "Building access denied" });
            }
          }
        }

        const parsed = createVacancySnapshotSchema.parse(req.body);
        const snapshot = await store.addVacancySnapshot(
          req.params.buildingId,
          parsed
        );

        if (!snapshot) {
          return res.status(404).json({ error: "Building not found" });
        }

        return res.status(201).json({ data: snapshot });
      } catch (error) {
        return next(error);
      }
    }
  );

  app.use("/api", (req, res) =>
    res.status(404).json({
      error: "API route not found",
      path: req.path
    })
  );

  app.use(
    (
      error: unknown,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction
    ) => {
      if (error instanceof ZodError) {
        return res.status(400).json({
          error: "Validation failed",
          issues: error.issues.map((issue) => ({
            path: issue.path.join("."),
            message: issue.message
          }))
        });
      }

      if (error instanceof Error) {
        const maybeMessage = error.message || "Internal server error";
        if (maybeMessage.includes("Invalid ticket transition")) {
          return res.status(400).json({ error: maybeMessage });
        }
      }

      console.error(error);
      return res.status(500).json({ error: "Internal server error" });
    }
  );

  const server = app.listen(port, () => {
    console.log(
      `Dedicated landlord housing API running on port ${port} with ${repositoryContext.backend} storage`
    );
  });

  const shutdown = async () => {
    await repositoryContext.close();
    server.close();
  };

  process.on("SIGINT", () => {
    void shutdown();
  });
  process.on("SIGTERM", () => {
    void shutdown();
  });
}

void bootstrap().catch((error) => {
  console.error("Failed to start dedicated landlord housing API", error);
  process.exit(1);
});
