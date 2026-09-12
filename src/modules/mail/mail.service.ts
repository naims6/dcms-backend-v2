import { Inject, Injectable, Logger } from '@nestjs/common';
import { EMAIL_PROVIDER_TOKEN } from './interfaces/email-provider.interface.js';
import type {
  EmailProvider,
  SendEmailOptions,
} from './interfaces/email-provider.interface.js';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(
    @Inject(EMAIL_PROVIDER_TOKEN)
    private readonly emailProvider: EmailProvider,
  ) {}

  /**
   * Generic method to send any email
   */
  async sendEmail(options: SendEmailOptions): Promise<void> {
    try {
      await this.emailProvider.sendEmail(options);
    } catch (error) {
      this.logger.error(
        `Failed to send email to ${options.to}: ${(error as Error).message}`,
      );
    }
  }

  /**
   * Send notification when an Admin creates a new user account
   */
  async sendUserCreatedEmail(user: {
    email: string;
    firstName?: string;
    lastName?: string;
  }): Promise<void> {
    const name =
      [user.firstName, user.lastName].filter(Boolean).join(' ') || 'User';
    const subject = 'Welcome to DCMS — Your Account Has Been Created';
    const html = `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
        <h2 style="color: #4F46E5;">Welcome to DCMS, ${name}!</h2>
        <p>Your user account has been successfully created by an administrator.</p>
        <p>You can now log in to your dashboard using your email: <strong>${user.email}</strong></p>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="font-size: 12px; color: #777;">If you have any questions, please contact your system administrator.</p>
      </div>
    `;

    await this.sendEmail({
      to: user.email,
      subject,
      html,
    });
  }
}
