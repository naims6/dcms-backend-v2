import { Injectable, Logger } from '@nestjs/common';
import { env } from '../../../config/env.config.js';
import {
  EmailProvider,
  SendEmailOptions,
} from '../interfaces/email-provider.interface.js';
import { ConsoleEmailProvider } from './console-email.provider.js';

@Injectable()
export class BrevoEmailProvider implements EmailProvider {
  private readonly logger = new Logger(BrevoEmailProvider.name);
  private readonly consoleFallback = new ConsoleEmailProvider();

  async sendEmail(options: SendEmailOptions): Promise<void> {
    const apiKey = env.mail.brevoApiKey;

    if (
      !apiKey ||
      apiKey.trim() === '' ||
      apiKey.includes('your_brevo_api_key')
    ) {
      this.logger.warn(
        '⚠️ BREVO_API_KEY is not set or using default value. Falling back to Console logging for email.',
      );
      return this.consoleFallback.sendEmail(options);
    }

    const payload = {
      sender: {
        name: env.mail.senderName,
        email: env.mail.senderEmail,
      },
      to: [
        {
          email: options.to,
        },
      ],
      subject: options.subject,
      htmlContent: options.html,
      textContent: options.text,
    };

    try {
      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'api-key': apiKey,
          'content-type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.text();
        this.logger.error(
          `❌ Failed to send email via Brevo API (${response.status}): ${errorData}`,
        );
        throw new Error(`Brevo API error: ${response.statusText}`);
      }

      this.logger.log(`✅ Email sent successfully via Brevo to ${options.to}`);
    } catch (error) {
      this.logger.error(
        `❌ Exception sending email via Brevo: ${(error as Error).message}`,
      );
      throw error;
    }
  }
}
