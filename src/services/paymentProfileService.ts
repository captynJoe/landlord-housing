import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { MpesaConfig } from "../lib/mpesa/config.js";
import { getMpesaConfig } from "../lib/mpesa/config.js";

type PaymentProfileEnvironment = "sandbox" | "production";

export interface PaymentProfileAssignment {
  buildingId: string;
  profileId?: string;
  accountReference?: string;
  note?: string;
  updatedAt: string;
  updatedByRole?: string;
  updatedByUserId?: string;
}

export interface PaymentProfilePersistedState {
  assignments: PaymentProfileAssignment[];
}

export interface PaymentProfilePublicRecord {
  id: string;
  name: string;
  enabled: boolean;
  isConfigured: boolean;
  missing: string[];
  environment: PaymentProfileEnvironment;
  baseUrl: string;
  shortCode: string;
  partyB: string;
  transactionType: string;
  callbackUrl: string;
  accountReferencePrefix?: string;
  isDefault: boolean;
}

export interface BuildingPaymentProfileRecord extends PaymentProfileAssignment {
  buildingName?: string;
  profile: PaymentProfilePublicRecord | null;
  effectiveProfileId: string;
}

type PaymentProfileStateChangeHandler = (
  state: PaymentProfilePersistedState
) => void | Promise<void>;

interface RawMpesaPaymentProfile {
  id?: unknown;
  name?: unknown;
  enabled?: unknown;
  environment?: unknown;
  baseUrl?: unknown;
  consumerKey?: unknown;
  consumerSecret?: unknown;
  passkey?: unknown;
  consumerKeyEnv?: unknown;
  consumerSecretEnv?: unknown;
  passkeyEnv?: unknown;
  shortCode?: unknown;
  businessShortCode?: unknown;
  partyB?: unknown;
  callbackUrl?: unknown;
  transactionType?: unknown;
  accountReferencePrefix?: unknown;
}

interface ResolvedPaymentProfile {
  id: string;
  name: string;
  enabled: boolean;
  environment: PaymentProfileEnvironment;
  baseUrl: string;
  consumerKey: string;
  consumerSecret: string;
  shortCode: string;
  partyB: string;
  passkey: string;
  callbackUrl: string;
  transactionType: string;
  accountReferencePrefix?: string;
}

export interface ResolvedBuildingPaymentProfile {
  assignment: PaymentProfileAssignment;
  publicProfile: PaymentProfilePublicRecord | null;
  config: MpesaConfig | null;
}

const DEFAULT_PROFILE_ID = "default";

function normalizeBuildingId(value: string | undefined): string {
  return String(value ?? "").trim();
}

function normalizeProfileId(value: string | undefined): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function normalizeOptionalString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.trim();
  return normalized || undefined;
}

function isPlaceholder(value: string | undefined): boolean {
  if (!value) return true;
  const normalized = value.trim().toLowerCase();
  return (
    normalized.length === 0 ||
    normalized.includes("your_") ||
    normalized.includes("replace_me") ||
    normalized.includes("changeme") ||
    normalized.includes("change-me") ||
    normalized.includes("<") ||
    normalized.includes(">")
  );
}

function normalizeEnvironment(value: unknown): PaymentProfileEnvironment {
  return String(value ?? "").trim().toLowerCase() === "production"
    ? "production"
    : "sandbox";
}

function defaultBaseUrl(environment: PaymentProfileEnvironment): string {
  return environment === "production"
    ? "https://api.safaricom.co.ke"
    : "https://sandbox.safaricom.co.ke";
}

function stripTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

function readEnvValue(env: NodeJS.ProcessEnv, key: string | undefined): string {
  if (!key) {
    return "";
  }

  return env[key]?.trim() || "";
}

function missingProfileFields(
  config: Pick<
    ResolvedPaymentProfile,
    "consumerKey" | "consumerSecret" | "shortCode" | "passkey" | "callbackUrl"
  >
): string[] {
  const requiredFields: Array<[string, string]> = [
    ["consumerKey", config.consumerKey],
    ["consumerSecret", config.consumerSecret],
    ["shortCode", config.shortCode],
    ["passkey", config.passkey],
    ["callbackUrl", config.callbackUrl]
  ];

  return requiredFields
    .filter(([, value]) => isPlaceholder(value))
    .map(([key]) => key);
}

function toPublicProfile(
  profile: ResolvedPaymentProfile,
  isDefault: boolean
): PaymentProfilePublicRecord {
  const missing = missingProfileFields(profile);
  return {
    id: profile.id,
    name: profile.name,
    enabled: profile.enabled,
    isConfigured: profile.enabled && missing.length === 0,
    missing,
    environment: profile.environment,
    baseUrl: profile.baseUrl,
    shortCode: profile.shortCode,
    partyB: profile.partyB,
    transactionType: profile.transactionType,
    callbackUrl: profile.callbackUrl,
    accountReferencePrefix: profile.accountReferencePrefix,
    isDefault
  };
}

function toMpesaConfig(profile: ResolvedPaymentProfile): MpesaConfig {
  const missing = missingProfileFields(profile);
  return {
    enabled: profile.enabled,
    environment: profile.environment,
    baseUrl: profile.baseUrl,
    consumerKey: profile.consumerKey,
    consumerSecret: profile.consumerSecret,
    shortCode: profile.shortCode,
    partyB: profile.partyB,
    passkey: profile.passkey,
    callbackUrl: profile.callbackUrl,
    transactionType: profile.transactionType,
    missing: missing.map((field) => `MPESA_PAYMENT_PROFILES_JSON.${profile.id}.${field}`),
    isConfigured: profile.enabled && missing.length === 0
  };
}

function defaultProfileFromConfig(config: MpesaConfig): ResolvedPaymentProfile {
  return {
    id: DEFAULT_PROFILE_ID,
    name: "Default M-PESA account",
    enabled: config.enabled,
    environment: config.environment,
    baseUrl: config.baseUrl,
    consumerKey: config.consumerKey,
    consumerSecret: config.consumerSecret,
    shortCode: config.shortCode,
    partyB: config.partyB,
    passkey: config.passkey,
    callbackUrl: config.callbackUrl,
    transactionType: config.transactionType
  };
}

export class PaymentProfileService {
  private readonly filePath: string;
  private readonly env: NodeJS.ProcessEnv;
  private readonly assignments = new Map<string, PaymentProfileAssignment>();
  private stateChangeHandler?: PaymentProfileStateChangeHandler;

  constructor(
    options: {
      filePath?: string;
      env?: NodeJS.ProcessEnv;
    } = {}
  ) {
    this.filePath =
      options.filePath ??
      path.resolve(process.cwd(), "data", "payment-profile-assignments.json");
    this.env = options.env ?? process.env;
    this.loadFromDisk();
  }

  setStateChangeHandler(handler?: PaymentProfileStateChangeHandler): void {
    this.stateChangeHandler = handler;
  }

  exportState(): PaymentProfilePersistedState {
    return {
      assignments: [...this.assignments.values()]
        .map((item) => ({ ...item }))
        .sort((a, b) => a.buildingId.localeCompare(b.buildingId))
    };
  }

  importState(state: PaymentProfilePersistedState | null | undefined): void {
    this.assignments.clear();

    if (!state || !Array.isArray(state.assignments)) {
      return;
    }

    for (const row of state.assignments) {
      const buildingId = normalizeBuildingId(row?.buildingId);
      if (!buildingId) {
        continue;
      }

      this.assignments.set(buildingId, {
        buildingId,
        profileId: normalizeProfileId(row.profileId) || undefined,
        accountReference: normalizeOptionalString(row.accountReference),
        note: normalizeOptionalString(row.note),
        updatedAt: normalizeOptionalString(row.updatedAt) ?? new Date(0).toISOString(),
        updatedByRole: normalizeOptionalString(row.updatedByRole),
        updatedByUserId: normalizeOptionalString(row.updatedByUserId)
      });
    }

    this.persistToDisk();
  }

  listProfiles(defaultCallbackPath: string): PaymentProfilePublicRecord[] {
    const defaultConfig = getMpesaConfig(defaultCallbackPath, this.env);
    const defaultProfile = defaultProfileFromConfig(defaultConfig);
    return [
      toPublicProfile(defaultProfile, true),
      ...this.listEnvProfiles(defaultCallbackPath).map((profile) =>
        toPublicProfile(profile, false)
      )
    ];
  }

  listAssignments(
    buildingIds: string[],
    defaultCallbackPath: string
  ): BuildingPaymentProfileRecord[] {
    return buildingIds.map((buildingId) => {
      const resolved = this.resolveForBuilding(buildingId, defaultCallbackPath);
      return {
        ...resolved.assignment,
        profile: resolved.publicProfile,
        effectiveProfileId: resolved.publicProfile?.id ?? DEFAULT_PROFILE_ID
      };
    });
  }

  getAssignment(buildingId: string): PaymentProfileAssignment {
    const normalizedBuildingId = normalizeBuildingId(buildingId);
    const current = this.assignments.get(normalizedBuildingId);
    return (
      current ?? {
        buildingId: normalizedBuildingId,
        profileId: DEFAULT_PROFILE_ID,
        updatedAt: new Date(0).toISOString()
      }
    );
  }

  updateAssignment(
    buildingId: string,
    input: {
      profileId?: string;
      accountReference?: string;
      note?: string;
    },
    actor?: {
      role?: string;
      userId?: string;
    },
    defaultCallbackPath = "/api/payments/mpesa/rent-callback"
  ): PaymentProfileAssignment {
    const normalizedBuildingId = normalizeBuildingId(buildingId);
    const profileId = normalizeProfileId(input.profileId) || DEFAULT_PROFILE_ID;
    const knownProfileIds = new Set(
      this.listProfiles(defaultCallbackPath).map((profile) => profile.id)
    );
    if (!knownProfileIds.has(profileId)) {
      throw new Error("PAYMENT_PROFILE_NOT_FOUND");
    }

    const updated: PaymentProfileAssignment = {
      buildingId: normalizedBuildingId,
      profileId,
      accountReference: normalizeOptionalString(input.accountReference),
      note: normalizeOptionalString(input.note),
      updatedAt: new Date().toISOString(),
      updatedByRole: actor?.role,
      updatedByUserId: actor?.userId
    };

    this.assignments.set(normalizedBuildingId, updated);
    this.persistToDisk();
    this.emitStateChange();
    return updated;
  }

  removeBuilding(buildingId: string): boolean {
    const normalizedBuildingId = normalizeBuildingId(buildingId);
    const deleted = this.assignments.delete(normalizedBuildingId);
    if (!deleted) {
      return false;
    }

    this.persistToDisk();
    this.emitStateChange();
    return true;
  }

  resolveForBuilding(
    buildingId: string,
    defaultCallbackPath: string
  ): ResolvedBuildingPaymentProfile {
    const assignment = this.getAssignment(buildingId);
    const profileId = normalizeProfileId(assignment.profileId) || DEFAULT_PROFILE_ID;
    const resolved = this.resolveProfile(profileId, defaultCallbackPath);

    return {
      assignment,
      publicProfile: resolved.publicProfile,
      config: resolved.config
    };
  }

  resolveProfile(
    profileId: string | undefined,
    defaultCallbackPath: string
  ): {
    publicProfile: PaymentProfilePublicRecord | null;
    config: MpesaConfig | null;
  } {
    const normalizedProfileId = normalizeProfileId(profileId) || DEFAULT_PROFILE_ID;

    if (normalizedProfileId === DEFAULT_PROFILE_ID) {
      const defaultConfig = getMpesaConfig(defaultCallbackPath, this.env);
      const defaultProfile = defaultProfileFromConfig(defaultConfig);
      return {
        publicProfile: toPublicProfile(defaultProfile, true),
        config: defaultConfig
      };
    }

    const profile = this
      .listEnvProfiles(defaultCallbackPath)
      .find((item) => item.id === normalizedProfileId);
    if (!profile) {
      return {
        publicProfile: null,
        config: null
      };
    }

    return {
      publicProfile: toPublicProfile(profile, false),
      config: toMpesaConfig(profile)
    };
  }

  private listEnvProfiles(defaultCallbackPath: string): ResolvedPaymentProfile[] {
    const raw = this.env.MPESA_PAYMENT_PROFILES_JSON?.trim() || "";
    if (!raw) {
      return [];
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (error) {
      console.error("Failed to parse MPESA_PAYMENT_PROFILES_JSON.", error);
      return [];
    }

    if (!Array.isArray(parsed)) {
      console.error("MPESA_PAYMENT_PROFILES_JSON must be a JSON array.");
      return [];
    }

    const appBaseUrl = this.env.BASE_URL?.trim() || "";
    const defaultCallbackUrl = appBaseUrl
      ? `${stripTrailingSlash(appBaseUrl)}${
          defaultCallbackPath.startsWith("/")
            ? defaultCallbackPath
            : `/${defaultCallbackPath}`
        }`
      : "";

    const profiles: ResolvedPaymentProfile[] = [];
    const seen = new Set<string>();

    for (const rawProfile of parsed as RawMpesaPaymentProfile[]) {
      const id = normalizeProfileId(normalizeOptionalString(rawProfile?.id));
      if (!id || id === DEFAULT_PROFILE_ID || seen.has(id)) {
        continue;
      }

      const environment = normalizeEnvironment(rawProfile.environment ?? this.env.MPESA_ENVIRONMENT);
      const baseUrl =
        normalizeOptionalString(rawProfile.baseUrl) ||
        this.env.MPESA_BASE_URL?.trim() ||
        defaultBaseUrl(environment);
      const shortCode =
        normalizeOptionalString(rawProfile.shortCode) ||
        normalizeOptionalString(rawProfile.businessShortCode) ||
        "";
      const partyB = normalizeOptionalString(rawProfile.partyB) || shortCode;
      const consumerKey =
        normalizeOptionalString(rawProfile.consumerKey) ||
        readEnvValue(this.env, normalizeOptionalString(rawProfile.consumerKeyEnv));
      const consumerSecret =
        normalizeOptionalString(rawProfile.consumerSecret) ||
        readEnvValue(this.env, normalizeOptionalString(rawProfile.consumerSecretEnv));
      const passkey =
        normalizeOptionalString(rawProfile.passkey) ||
        readEnvValue(this.env, normalizeOptionalString(rawProfile.passkeyEnv));

      profiles.push({
        id,
        name: normalizeOptionalString(rawProfile.name) || id,
        enabled: rawProfile.enabled === false ? false : true,
        environment,
        baseUrl: stripTrailingSlash(baseUrl),
        consumerKey,
        consumerSecret,
        shortCode,
        partyB,
        passkey,
        callbackUrl: normalizeOptionalString(rawProfile.callbackUrl) || defaultCallbackUrl,
        transactionType:
          normalizeOptionalString(rawProfile.transactionType) ||
          this.env.MPESA_STK_TRANSACTION_TYPE?.trim() ||
          this.env.MPESA_TRANSACTION_TYPE?.trim() ||
          "CustomerPayBillOnline",
        accountReferencePrefix: normalizeOptionalString(
          rawProfile.accountReferencePrefix
        )
      });
      seen.add(id);
    }

    return profiles;
  }

  private emitStateChange(): void {
    if (!this.stateChangeHandler) {
      return;
    }

    const snapshot = this.exportState();
    void Promise.resolve(this.stateChangeHandler(snapshot)).catch((error) => {
      console.error("Failed to persist payment profile assignments", error);
    });
  }

  private loadFromDisk(): void {
    try {
      const raw = readFileSync(this.filePath, "utf8");
      const parsed = JSON.parse(raw) as PaymentProfilePersistedState;
      this.importState(parsed);
    } catch {
      // Missing local fallback file is normal when AppState persistence is used.
    }
  }

  private persistToDisk(): void {
    try {
      mkdirSync(path.dirname(this.filePath), { recursive: true });
      const tmpPath = `${this.filePath}.tmp`;
      writeFileSync(tmpPath, JSON.stringify(this.exportState(), null, 2), "utf8");
      renameSync(tmpPath, this.filePath);
    } catch (error) {
      console.error("Failed to persist payment profile assignments to disk", error);
    }
  }
}

export function buildRentAccountReference(input: {
  houseNumber: string;
  assignment?: PaymentProfileAssignment;
  profile?: PaymentProfilePublicRecord | null;
}): string {
  const explicitReference = input.assignment?.accountReference?.trim();
  if (explicitReference) {
    return explicitReference.replace(/[^A-Za-z0-9]/g, "").slice(0, 12) || "RENTPAY";
  }

  const prefix = input.profile?.accountReferencePrefix?.trim();
  const base = prefix || input.houseNumber;
  return base.replace(/[^A-Za-z0-9]/g, "").slice(0, 12) || "RENTPAY";
}
