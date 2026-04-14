import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

export interface SendInvoiceEmailOptions {
  to: string;
  subject: string;
  html: string;
  pdfBase64: string;
  fileName: string;
}

@Injectable()
export class ResendService {
  private readonly logger = new Logger(ResendService.name);
  private readonly client: Resend | null = null;
  private readonly fromEmail: string;

  private readonly devOverrideTo: string | undefined;

  constructor(private readonly config: ConfigService) {
    const apiKey = config.get<string>('RESEND_API_KEY');
    this.fromEmail =
      config.get<string>('RESEND_FROM_EMAIL') ?? 'bills@yourdomain.com';
    this.devOverrideTo = config.get<string>('RESEND_DEV_OVERRIDE_TO');
    if (apiKey) {
      this.client = new Resend(apiKey);
    } else {
      this.logger.warn(
        'RESEND_API_KEY is not set — email sending is disabled.',
      );
    }
  }

  isConfigured(): boolean {
    return this.client !== null;
  }

  async sendInvoiceEmail(opts: SendInvoiceEmailOptions): Promise<void> {
    if (!this.client) {
      this.logger.warn(
        `Email not sent to ${opts.to}: Resend is not configured.`,
      );
      return;
    }
    const recipient = this.devOverrideTo ?? opts.to;
    if (this.devOverrideTo) {
      this.logger.warn(`DEV: redirecting email from ${opts.to} → ${recipient}`);
    }
    const { error } = await this.client.emails.send({
      from: this.fromEmail,
      to: [recipient],
      subject: opts.subject,
      html: opts.html,
      attachments: [
        {
          filename: opts.fileName,
          content: opts.pdfBase64,
        },
      ],
    });
    if (error) {
      this.logger.error(`Resend error sending to ${opts.to}: ${JSON.stringify(error)}`);
      throw new Error(`Failed to send email: ${error.message}`);
    }
    this.logger.log(`Invoice email sent to ${opts.to} (${opts.fileName})`);
  }
}
