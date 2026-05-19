type WalletRecord = {
  id: string;
  owner_type: string;
  owner_id: string;
  currency: string;
  status: string;
  created_at: string;
};

type WalletTransactionEntry = {
  account_id: string;
  direction: string;
  amount_minor: number;
  currency: string;
  memo?: string | null;
};

type WalletTransaction = {
  id: string;
  idempotency_key: string;
  transaction_type: string;
  status: string;
  service: string;
  reference_type: string;
  reference_id: string;
  description?: string | null;
  metadata?: Record<string, unknown> | null;
  created_at: string;
  posted_at: string;
  entries: WalletTransactionEntry[];
};

type WalletPayoutProfile = {
  id: string;
  beneficiary_wallet_id: string;
  destination_type: string;
  destination_reference: string;
  beneficiary_name?: string | null;
  status: string;
  verification_status: string;
  payout_schedule: string;
  metadata?: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

type WalletOwnerPayload = {
  ownerType: string;
  ownerId: string;
  currency: string;
};

type ProviderCollectionSettlementPayload = {
  beneficiaryWalletId: string;
  grossAmountMinor: number;
  feeAmountMinor: number;
  currency: string;
  idempotencyKey: string;
  service: string;
  referenceType: string;
  referenceId: string;
  description?: string;
  sourceAccountCode?: string;
  metadata?: Record<string, unknown>;
};

type PayoutProfilePayload = {
  walletId: string;
  destinationType: string;
  destinationReference: string;
  beneficiaryName?: string;
  status?: string;
  verificationStatus?: string;
  payoutSchedule?: string;
  metadata?: Record<string, unknown>;
};

function getWalletBaseUrl() {
  return String(process.env.CAPTYN_WALLET_URL || "").trim().replace(/\/+$/, "");
}

function getWalletApiKey() {
  return String(process.env.CAPTYN_WALLET_API_KEY || "").trim();
}

export function isCaptynWalletConfigured() {
  return Boolean(getWalletBaseUrl() && getWalletApiKey());
}

async function walletRequest<T>(path: string, init: RequestInit): Promise<T> {
  const baseUrl = getWalletBaseUrl();
  const apiKey = getWalletApiKey();

  if (!baseUrl || !apiKey) {
    throw new Error("CAPTYN Wallet service is not configured.");
  }

  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "x-internal-api-key": apiKey,
      ...(init.headers || {})
    }
  });

  const raw = await response.text();
  let data: any = {};
  try {
    data = raw ? JSON.parse(raw) : {};
  } catch {
    data = { detail: raw || `Wallet request failed with HTTP ${response.status}` };
  }

  if (!response.ok) {
    throw new Error(
      data?.detail || data?.error || `CAPTYN Wallet request failed with HTTP ${response.status}`
    );
  }

  return data as T;
}

export async function ensureCaptynWallet(payload: WalletOwnerPayload): Promise<WalletRecord> {
  return walletRequest<WalletRecord>("/v1/wallets/ensure", {
    method: "POST",
    body: JSON.stringify({
      owner_type: payload.ownerType,
      owner_id: payload.ownerId,
      currency: payload.currency
    })
  });
}

export async function postProviderCollectionSettlement(
  payload: ProviderCollectionSettlementPayload
): Promise<WalletTransaction> {
  return walletRequest<WalletTransaction>("/v1/transactions/provider-collection-settlement", {
    method: "POST",
    body: JSON.stringify({
      beneficiary_wallet_id: payload.beneficiaryWalletId,
      gross_amount_minor: payload.grossAmountMinor,
      fee_amount_minor: payload.feeAmountMinor,
      currency: payload.currency,
      idempotency_key: payload.idempotencyKey,
      service: payload.service,
      reference_type: payload.referenceType,
      reference_id: payload.referenceId,
      description: payload.description,
      source_account_code: payload.sourceAccountCode,
      metadata: payload.metadata
    })
  });
}

export async function upsertCaptynPayoutProfile(
  payload: PayoutProfilePayload
): Promise<WalletPayoutProfile> {
  return walletRequest<WalletPayoutProfile>(`/v1/wallets/${payload.walletId}/payout-profile`, {
    method: "PUT",
    body: JSON.stringify({
      destination_type: payload.destinationType,
      destination_reference: payload.destinationReference,
      beneficiary_name: payload.beneficiaryName,
      status: payload.status,
      verification_status: payload.verificationStatus,
      payout_schedule: payload.payoutSchedule,
      metadata: payload.metadata
    })
  });
}
