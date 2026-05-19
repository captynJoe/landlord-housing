export interface MpesaConfig {
  enabled: boolean;
  environment: "sandbox" | "production";
  baseUrl: string;
  consumerKey: string;
  consumerSecret: string;
  shortCode: string;
  partyB: string;
  passkey: string;
  callbackUrl: string;
  transactionType: string;
  missing: string[];
  isConfigured: boolean;
}

function toBool(value: string | undefined): boolean {
  if (!value) return false;
  return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
}

function isPlaceholder(value: string | undefined): boolean {
  if (!value) return true;
  const normalized = value.trim().toLowerCase();
  return (
    normalized.length === 0 ||
    normalized.includes("your_") ||
    normalized.includes("replace_me") ||
    normalized.includes("changeme") ||
    normalized.includes("change-me")
  );
}

function stripTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

function resolveTransactionType(rawType: string | undefined): string {
  const configured = rawType?.trim();
  if (configured) return configured;
  return "CustomerPayBillOnline";
}

export function getMpesaConfig(defaultCallbackPath: string): MpesaConfig {
  const enabled = toBool(process.env.MPESA_STK_ENABLED);
  const environment =
    process.env.MPESA_ENVIRONMENT?.toLowerCase() === "production"
      ? "production"
      : "sandbox";

  const baseUrl =
    process.env.MPESA_BASE_URL?.trim() ||
    (environment === "production"
      ? "https://api.safaricom.co.ke"
      : "https://sandbox.safaricom.co.ke");

  const baseCallbackUrl = process.env.MPESA_CALLBACK_URL?.trim() || "";
  const appBaseUrl = process.env.BASE_URL?.trim() || "";
  const callbackUrl =
    baseCallbackUrl ||
    (appBaseUrl
      ? `${stripTrailingSlash(appBaseUrl)}${
          defaultCallbackPath.startsWith("/") ? defaultCallbackPath : `/${defaultCallbackPath}`
        }`
      : "");

  const shortCode =
    process.env.MPESA_BUSINESS_SHORT_CODE?.trim() ||
    process.env.MPESA_BUSINESS_SHORTCODE?.trim() ||
    process.env.MPESA_SHORT_CODE?.trim() ||
    process.env.MPESA_SHORTCODE?.trim() ||
    "";
  const partyB =
    process.env.MPESA_PARTY_B?.trim() ||
    process.env.MPESA_PARTYB?.trim() ||
    process.env.MPESA_STORE_NUMBER?.trim() ||
    shortCode;

  const config: MpesaConfig = {
    enabled,
    environment,
    baseUrl: stripTrailingSlash(baseUrl),
    consumerKey: process.env.MPESA_CONSUMER_KEY?.trim() || "",
    consumerSecret: process.env.MPESA_CONSUMER_SECRET?.trim() || "",
    shortCode,
    partyB,
    passkey:
      process.env.MPESA_PASSKEY?.trim() ||
      process.env.MPESA_STK_PASSKEY?.trim() ||
      "",
    callbackUrl,
    transactionType: resolveTransactionType(
      process.env.MPESA_STK_TRANSACTION_TYPE || process.env.MPESA_TRANSACTION_TYPE
    ),
    missing: [],
    isConfigured: false
  };

  const requiredFields: Array<[string, string]> = [
    ["MPESA_CONSUMER_KEY", config.consumerKey],
    ["MPESA_CONSUMER_SECRET", config.consumerSecret],
    ["MPESA_BUSINESS_SHORT_CODE (or MPESA_SHORTCODE)", config.shortCode],
    ["MPESA_PASSKEY", config.passkey],
    ["MPESA_CALLBACK_URL or BASE_URL", config.callbackUrl]
  ];

  config.missing = requiredFields
    .filter(([, value]) => isPlaceholder(value))
    .map(([key]) => key);

  config.isConfigured = config.enabled && config.missing.length === 0;
  return config;
}
