import type { MpesaConfig } from "./config.js";

export interface StkPushRequest {
  amount: number;
  phoneNumber: string;
  accountReference: string;
  transactionDesc: string;
  callbackUrl?: string;
}

export interface DarajaStkPushResponse {
  MerchantRequestID?: string;
  CheckoutRequestID?: string;
  ResponseCode?: string;
  ResponseDescription?: string;
  CustomerMessage?: string;
  [key: string]: unknown;
}

export interface DarajaStkQueryResponse {
  ResponseCode?: string;
  ResponseDescription?: string;
  MerchantRequestID?: string;
  CheckoutRequestID?: string;
  ResultCode?: string;
  ResultDesc?: string;
  [key: string]: unknown;
}

const MPESA_DEBUG_LOGS = process.env.MPESA_DEBUG_LOGS === "true";
const DARAJA_HTTP_TIMEOUT_MS = Number.parseInt(
  process.env.MPESA_HTTP_TIMEOUT_MS || "12000",
  10
);

let cachedAccessToken: { token: string; expiresAtMs: number } | null = null;

async function parseJsonSafely<T>(response: Response): Promise<T | null> {
  const raw = await response.text();
  if (!raw) return null;

  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function toTimestamp(date: Date = new Date()): string {
  const yyyy = String(date.getFullYear());
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  const ss = String(date.getSeconds()).padStart(2, "0");
  return `${yyyy}${mm}${dd}${hh}${min}${ss}`;
}

export function formatDarajaMsisdn(input: string): string | null {
  if (!input) return null;
  const cleaned = input.replace(/[^\d+]/g, "");

  if (cleaned.startsWith("+254") && cleaned.length === 13) {
    return cleaned.slice(1);
  }

  if (cleaned.startsWith("254") && cleaned.length === 12) {
    return cleaned;
  }

  if (cleaned.startsWith("0") && cleaned.length === 10) {
    return `254${cleaned.slice(1)}`;
  }

  return null;
}

export class DarajaClient {
  constructor(private readonly config: MpesaConfig) {}

  private async getAccessToken(): Promise<string> {
    const now = Date.now();
    if (cachedAccessToken && now < cachedAccessToken.expiresAtMs) {
      return cachedAccessToken.token;
    }

    const auth = Buffer.from(
      `${this.config.consumerKey}:${this.config.consumerSecret}`
    ).toString("base64");

    const response = await fetch(
      `${this.config.baseUrl}/oauth/v1/generate?grant_type=client_credentials`,
      {
        method: "GET",
        headers: {
          Authorization: `Basic ${auth}`
        },
        signal: AbortSignal.timeout(DARAJA_HTTP_TIMEOUT_MS)
      }
    );

    const payload = await parseJsonSafely<{
      access_token?: string;
      expires_in?: number | string;
      errorMessage?: string;
      error_description?: string;
    }>(response);

    if (MPESA_DEBUG_LOGS) {
      console.info("M-PESA oauth response", {
        status: response.status,
        hasAccessToken: Boolean(payload?.access_token),
        errorMessage: payload?.errorMessage || payload?.error_description || null
      });
    }

    if (!response.ok || !payload?.access_token) {
      throw new Error(
        payload?.errorMessage ||
          payload?.error_description ||
          `Failed to obtain Daraja access token (HTTP ${response.status})`
      );
    }

    const expiresInSeconds = Math.max(
      60,
      Number.parseInt(String(payload.expires_in || 3600), 10) || 3600
    );

    cachedAccessToken = {
      token: payload.access_token,
      expiresAtMs: Date.now() + Math.max(60, expiresInSeconds - 60) * 1000
    };

    return payload.access_token;
  }

  private buildPassword(timestamp: string): string {
    return Buffer.from(
      `${this.config.shortCode}${this.config.passkey}${timestamp}`
    ).toString("base64");
  }

  async initiateStkPush(request: StkPushRequest): Promise<DarajaStkPushResponse> {
    const token = await this.getAccessToken();
    const timestamp = toTimestamp();

    const payload = {
      BusinessShortCode: this.config.shortCode,
      Password: this.buildPassword(timestamp),
      Timestamp: timestamp,
      TransactionType: this.config.transactionType,
      Amount: Math.round(request.amount),
      PartyA: request.phoneNumber,
      PartyB: this.config.partyB || this.config.shortCode,
      PhoneNumber: request.phoneNumber,
      CallBackURL: request.callbackUrl || this.config.callbackUrl,
      AccountReference: request.accountReference,
      TransactionDesc: request.transactionDesc
    };

    if (MPESA_DEBUG_LOGS) {
      console.info("M-PESA STK processrequest payload", {
        businessShortCode: payload.BusinessShortCode,
        transactionType: payload.TransactionType,
        amount: payload.Amount,
        partyA: payload.PartyA,
        partyB: payload.PartyB,
        accountReference: payload.AccountReference,
        transactionDesc: payload.TransactionDesc,
        callbackUrl: payload.CallBackURL
      });
    }

    const response = await fetch(
      `${this.config.baseUrl}/mpesa/stkpush/v1/processrequest`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(DARAJA_HTTP_TIMEOUT_MS)
      }
    );

    const result = await parseJsonSafely<DarajaStkPushResponse>(response);

    if (MPESA_DEBUG_LOGS) {
      console.info("M-PESA STK processrequest response", {
        status: response.status,
        responseCode: result?.ResponseCode || null,
        responseDescription:
          result?.ResponseDescription ||
          (result as { errorMessage?: string } | null)?.errorMessage ||
          (result as { error_description?: string } | null)?.error_description ||
          null,
        merchantRequestId: result?.MerchantRequestID || null,
        checkoutRequestId: result?.CheckoutRequestID || null
      });
    }

    if (!response.ok) {
      throw new Error(
        result?.ResponseDescription ||
          (result as { errorMessage?: string } | null)?.errorMessage ||
          (result as { error_description?: string } | null)?.error_description ||
          `Daraja STK push request failed (HTTP ${response.status})`
      );
    }

    return (result || {}) as DarajaStkPushResponse;
  }

  async queryStkPush(checkoutRequestId: string): Promise<DarajaStkQueryResponse> {
    const token = await this.getAccessToken();
    const timestamp = toTimestamp();

    const payload = {
      BusinessShortCode: this.config.shortCode,
      Password: this.buildPassword(timestamp),
      Timestamp: timestamp,
      CheckoutRequestID: checkoutRequestId
    };

    if (MPESA_DEBUG_LOGS) {
      console.info("M-PESA STK query payload", {
        businessShortCode: payload.BusinessShortCode,
        checkoutRequestId: payload.CheckoutRequestID
      });
    }

    const response = await fetch(`${this.config.baseUrl}/mpesa/stkpushquery/v1/query`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(DARAJA_HTTP_TIMEOUT_MS)
    });

    const result = await parseJsonSafely<DarajaStkQueryResponse>(response);

    if (MPESA_DEBUG_LOGS) {
      console.info("M-PESA STK query response", {
        status: response.status,
        responseCode: result?.ResponseCode || null,
        resultCode: result?.ResultCode || null,
        resultDesc: result?.ResultDesc || result?.ResponseDescription || null,
        merchantRequestId: result?.MerchantRequestID || null,
        checkoutRequestId: result?.CheckoutRequestID || checkoutRequestId
      });
    }

    if (!response.ok) {
      throw new Error(
        result?.ResponseDescription ||
          (result as { errorMessage?: string } | null)?.errorMessage ||
          (result as { error_description?: string } | null)?.error_description ||
          `Daraja STK query failed (HTTP ${response.status})`
      );
    }

    return (result || {}) as DarajaStkQueryResponse;
  }
}
