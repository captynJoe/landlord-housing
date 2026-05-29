interface SmsClient {
  send(input: {
    to: string[];
    message: string;
    senderId?: string;
  }): Promise<unknown>;
}

export type SmsProvider = "africastalking" | "talksasa";

export interface SmsNotificationServiceConfig {
  provider?: string;
  apiKey?: string;
  username?: string;
  senderId?: string;
  talksasaApiToken?: string;
  talksasaProxyApiKey?: string;
  talksasaSenderId?: string;
  talksasaBaseUrl?: string;
  talksasaSendPath?: string;
  talksasaTimeoutMs?: number;
  fetchImpl?: typeof fetch;
}

export interface SendSmsInput {
  to: string;
  message: string;
  tag?: string;
}

function normalizeConfigValue(value: string | undefined): string | undefined {
  const normalized = String(value ?? "").trim();
  return normalized || undefined;
}

function normalizeProvider(value: string | undefined, hasTalkSasaConfig: boolean): SmsProvider {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (normalized === "talksasa") {
    return "talksasa";
  }
  if (normalized === "africastalking" || normalized === "africas_talking") {
    return "africastalking";
  }

  return hasTalkSasaConfig ? "talksasa" : "africastalking";
}

function normalizeSmsText(value: string): string {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeTalkSasaRecipient(value: string): string {
  const compact = String(value ?? "")
    .trim()
    .replace(/[^\d+]/g, "");

  if (compact.startsWith("+")) {
    return compact.slice(1);
  }

  if (/^0[17]\d{8}$/.test(compact)) {
    return `254${compact.slice(1)}`;
  }

  if (/^[17]\d{8}$/.test(compact)) {
    return `254${compact}`;
  }

  return compact;
}

function normalizeBaseUrl(value: string | undefined): string {
  return (normalizeConfigValue(value) ?? "https://bulksms.talksasa.com/api/v3").replace(/\/+$/g, "");
}

function normalizeSendPath(value: string | undefined): string {
  const normalized = normalizeConfigValue(value) ?? "/sms/send";
  return normalized.startsWith("/") ? normalized : `/${normalized}`;
}

function normalizeTimeoutMs(value: number | undefined): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.min(Math.max(Math.round(parsed), 1000), 60000) : 12000;
}

function trimTalkSasaMessage(value: string): string {
  return value.length > 160 ? value.slice(0, 157).trimEnd() + "..." : value;
}

export class SmsNotificationService {
  private readonly provider: SmsProvider;
  private readonly apiKey?: string;
  private readonly username?: string;
  private readonly senderId?: string;
  private readonly talksasaApiToken?: string;
  private readonly talksasaSenderId?: string;
  private readonly talksasaBaseUrl: string;
  private readonly talksasaSendPath: string;
  private readonly talksasaTimeoutMs: number;
  private readonly fetchImpl: typeof fetch;
  private clientPromise?: Promise<SmsClient | null>;

  constructor(config: SmsNotificationServiceConfig = {}) {
    this.talksasaApiToken =
      normalizeConfigValue(config.talksasaApiToken) ??
      normalizeConfigValue(config.talksasaProxyApiKey);
    this.provider = normalizeProvider(config.provider, Boolean(this.talksasaApiToken));
    this.apiKey = normalizeConfigValue(config.apiKey);
    this.username = normalizeConfigValue(config.username);
    this.senderId = normalizeConfigValue(config.senderId);
    this.talksasaSenderId =
      normalizeConfigValue(config.talksasaSenderId) ?? this.senderId;
    this.talksasaBaseUrl = normalizeBaseUrl(config.talksasaBaseUrl);
    this.talksasaSendPath = normalizeSendPath(config.talksasaSendPath);
    this.talksasaTimeoutMs = normalizeTimeoutMs(config.talksasaTimeoutMs);
    this.fetchImpl = config.fetchImpl ?? fetch;
  }

  isEnabled(): boolean {
    if (this.provider === "talksasa") {
      return Boolean(this.talksasaApiToken && this.talksasaSenderId);
    }

    return Boolean(this.apiKey && this.username);
  }

  getProvider(): SmsProvider {
    return this.provider;
  }

  getSenderId(): string | null {
    return this.provider === "talksasa"
      ? this.talksasaSenderId ?? null
      : this.senderId ?? null;
  }

  async send(input: SendSmsInput): Promise<void> {
    if (!this.isEnabled()) {
      return;
    }

    const to = normalizeConfigValue(input.to);
    const message = normalizeSmsText(input.message);
    if (!to || !message) {
      return;
    }

    if (this.provider === "talksasa") {
      await this.sendTalkSasa({
        to,
        message,
        tag: input.tag
      });
      return;
    }

    const client = await this.getClient();
    if (!client) {
      return;
    }

    try {
      await client.send({
        to: [to],
        message,
        ...(this.senderId ? { senderId: this.senderId } : {})
      });
    } catch (error) {
      console.error("Failed to send housing SMS notification", {
        to,
        tag: input.tag,
        error
      });
      throw error;
    }
  }

  private async sendTalkSasa(
    input: Required<Pick<SendSmsInput, "to" | "message">> & Pick<SendSmsInput, "tag">
  ): Promise<void> {
    const recipient = normalizeTalkSasaRecipient(input.to);
    const message = trimTalkSasaMessage(normalizeSmsText(input.message));
    if (!recipient || !message || !this.talksasaApiToken || !this.talksasaSenderId) {
      return;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.talksasaTimeoutMs);

    try {
      const response = await this.fetchImpl(`${this.talksasaBaseUrl}${this.talksasaSendPath}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.talksasaApiToken}`,
          Accept: "application/json",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          recipient,
          sender_id: this.talksasaSenderId,
          type: "plain",
          message
        }),
        signal: controller.signal
      });

      if (!response.ok) {
        const responseBody = await response.text().catch(() => "");
        throw new Error(
          `TalkSasa SMS failed (${response.status})${
            responseBody ? `: ${responseBody.slice(0, 300)}` : ""
          }`
        );
      }
    } catch (error) {
      console.error("Failed to send housing SMS notification via TalkSasa", {
        to: recipient,
        tag: input.tag,
        error
      });
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  private async getClient(): Promise<SmsClient | null> {
    if (!this.isEnabled()) {
      return null;
    }

    if (!this.clientPromise) {
      this.clientPromise = (async () => {
        const moduleName = "africastalking";
        const imported = await import(moduleName);
        const factory = (imported.default ?? imported) as (credentials: {
          apiKey: string;
          username: string;
        }) => { SMS: SmsClient };

        return factory({
          apiKey: this.apiKey as string,
          username: this.username as string
        }).SMS;
      })();
    }

    return this.clientPromise;
  }
}
