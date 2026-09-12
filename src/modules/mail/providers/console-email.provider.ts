import { Injectable, Logger } from '@nestjs/common';
import {
  EmailProvider,
  SendEmailOptions,
} from '../interfaces/email-provider.interface.js';

@Injectable()
export class ConsoleEmailProvider implements EmailProvider {
  private readonly logger = new Logger(ConsoleEmailProvider.name);

  sendEmail(options: SendEmailOptions): Promise<void> {
    this.logger.log(
      `[Console Email Fallback] To: ${options.to} | Subject: ${options.subject}`,
    );
    this.logger.debug(`[Email HTML]:\n${options.html}`);
    return Promise.resolve();
  }
}
