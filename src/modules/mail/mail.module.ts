import { Global, Module, Provider } from '@nestjs/common';
import { env } from '../../config/env.config.js';
import { EMAIL_PROVIDER_TOKEN } from './interfaces/email-provider.interface.js';
import { MailService } from './mail.service.js';
import { BrevoEmailProvider } from './providers/brevo-email.provider.js';
import { ConsoleEmailProvider } from './providers/console-email.provider.js';

const emailProviderFactory: Provider = {
  provide: EMAIL_PROVIDER_TOKEN,
  useFactory: () => {
    if (env.mail.provider === 'brevo') {
      return new BrevoEmailProvider();
    }
    return new ConsoleEmailProvider();
  },
};

@Global()
@Module({
  providers: [emailProviderFactory, MailService],
  exports: [MailService],
})
export class MailModule {}
