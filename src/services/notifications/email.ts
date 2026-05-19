export interface EmailNotificationRequest {
  to: string;
  subject: string;
  message: string;
}

export class EmailNotificationService {
  isEnabled(): boolean {
    return false;
  }

  async send(_input: EmailNotificationRequest): Promise<{ delivered: boolean }> {
    return { delivered: false };
  }
}
