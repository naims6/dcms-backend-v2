import { Module } from '@nestjs/common';
import { PaymentService } from './payment.service.js';
import { PaymentController } from './payment.controller.js';
import { SslcommerzProvider } from './providers/sslcommerz.provider.js';
import { BkashProvider } from './providers/bkash.provider.js';
import { PrismaModule } from '../../prisma/prisma.module.js';

@Module({
  imports: [PrismaModule],
  controllers: [PaymentController],
  providers: [PaymentService, SslcommerzProvider, BkashProvider],
  exports: [PaymentService],
})
export class PaymentModule {}
