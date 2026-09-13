import { Module } from '@nestjs/common';
import { AdmissionService } from './admission.service.js';
import { AdmissionController } from './admission.controller.js';
import { PrismaModule } from '../../prisma/prisma.module.js';
import { RedisModule } from '../../redis/redis.module.js';
import { MailModule } from '../mail/mail.module.js';
import { CloudinaryModule } from '../../common/cloudinary/cloudinary.module.js';
import { PaymentModule } from '../payment/payment.module.js';

@Module({
  imports: [
    PrismaModule,
    RedisModule,
    MailModule,
    CloudinaryModule,
    PaymentModule,
  ],
  controllers: [AdmissionController],
  providers: [AdmissionService],
  exports: [AdmissionService],
})
export class AdmissionModule {}
