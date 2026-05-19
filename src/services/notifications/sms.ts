interface SmsClient {
  send(input: {
    to: string[];
    message: string;
    senderId?: string;
  }): Promise<unknown>;
}

export interface SmsNotificationServiceConfig {
  apiKey?: string;
  username?: string;
  senderId?: string;
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

function normalizeSmsText(value: string): string {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

export class SmsNotificationService {
  private readonly apiKey?: string;
  private readonly username?: string;
  private readonly senderId?: string;
  private clientPromise?: Promise<SmsClient | null>;

  constructor(config: SmsNotificationServiceConfig = {}) {
    this.apiKey = normalizeConfigValue(config.apiKey);
    this.username = normalizeConfigValue(config.username);
    this.senderId = normalizeConfigValue(config.senderId);
  }

  isEnabled(): boolean {
    return Boolean(this.apiKey && this.username);
  }

  getSenderId(): string | null {
    return this.senderId ?? null;
  }

  async send(input: SendSmsInput): Promise<void> {
    if (!this.isEnabled()) {
      return;
    }

    const client = await this.getClient();
    if (!client) {
      return;
    }

    const to = normalizeConfigValue(input.to);
    const message = normalizeSmsText(input.message);
    if (!to || !message) {
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
