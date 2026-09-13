import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { SslcommerzProvider } from './providers/sslcommerz.provider.js';
import { BkashProvider } from './providers/bkash.provider.js';
import { InitiatePaymentDto } from './dto/initiate-payment.dto.js';
import {
  ApplicationStatus,
  PaymentProvider,
  PaymentPurpose,
  PaymentStatus,
  PaymentTransaction,
  Prisma,
} from '../../generated/prisma/client.js';
import { env } from '../../config/env.config.js';
import { SSLCommerzCallbackPayload } from './interfaces/sslcommerz.interface.js';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly sslcommerzProvider: SslcommerzProvider,
    private readonly bkashProvider: BkashProvider,
  ) {}

  private getProvider(provider: PaymentProvider) {
    switch (provider) {
      case PaymentProvider.SSLCOMMERZ:
        return this.sslcommerzProvider;
      case PaymentProvider.BKASH:
        return this.bkashProvider;
      default:
        return this.sslcommerzProvider;
    }
  }

  /**
   * Generates unique transaction ID
   */
  generateTranId(purpose: string): string {
    const timestamp = Date.now();
    const random = Math.floor(1000 + Math.random() * 9000);
    return `TXN_${purpose.toUpperCase()}_${timestamp}_${random}`;
  }

  /**
   * Initiates payment transaction and returns Gateway URL
   */
  async createAndInitiate(
    dto: InitiatePaymentDto,
  ): Promise<{ tranId: string; gatewayUrl: string }> {
    const tranId = this.generateTranId(dto.purpose);
    const providerType = dto.provider || PaymentProvider.SSLCOMMERZ;

    const transaction = await this.prisma.paymentTransaction.create({
      data: {
        tranId,
        purpose: dto.purpose,
        referenceId: dto.referenceId,
        provider: providerType,
        amount: dto.amount,
        currency: 'BDT',
        status: PaymentStatus.PENDING,
      },
    });

    const provider = this.getProvider(providerType);
    const baseUrl = env.sslcommerz.baseUrl.replace(/\/$/, '');

    const result = await provider.initiatePayment({
      transaction,
      customerName: dto.customerName,
      customerEmail: dto.customerEmail,
      customerPhone: dto.customerPhone,
      successUrl: `${baseUrl}/api/v1/payments/sslcommerz/success`,
      failUrl: `${baseUrl}/api/v1/payments/sslcommerz/fail`,
      cancelUrl: `${baseUrl}/api/v1/payments/sslcommerz/cancel`,
      ipnUrl: `${baseUrl}/api/v1/payments/sslcommerz/ipn`,
    });

    return result;
  }

  /**
   * Processes SSLCommerz Callback (Success / IPN) and validates payload
   */
  async processSslcommerzSuccess(
    payload: Record<string, unknown>,
  ): Promise<PaymentTransaction> {
    const callbackData = payload as SSLCommerzCallbackPayload;
    const tranId = callbackData.tran_id;

    if (!tranId) {
      throw new BadRequestException(
        'Transaction ID (tran_id) is missing in payload',
      );
    }

    const transaction = await this.prisma.paymentTransaction.findUnique({
      where: { tranId },
    });

    if (!transaction) {
      throw new NotFoundException(`Transaction with ID ${tranId} not found`);
    }

    if (transaction.status === PaymentStatus.VALIDATED) {
      return transaction; // Already validated
    }

    // Validate with SSLCommerz Server
    const validation = await this.sslcommerzProvider.validatePayment(payload);

    if (validation.isValid) {
      const updatedTxn = await this.prisma.paymentTransaction.update({
        where: { id: transaction.id },
        data: {
          status: PaymentStatus.VALIDATED,
          valId: validation.valId || callbackData.val_id,
          bankTranId: validation.bankTranId || callbackData.bank_tran_id,
          cardType: validation.cardType || callbackData.card_type,
          cardIssuer: validation.cardIssuer || callbackData.card_issuer,
          rawResponse: (validation.rawResponse ||
            payload) as Prisma.InputJsonValue,
          paidAt: new Date(),
        },
      });

      if (transaction.purpose === PaymentPurpose.ADMISSION_FEE) {
        await this.prisma.admissionApplication.updateMany({
          where: { id: transaction.referenceId },
          data: { status: ApplicationStatus.SUBMITTED_FOR_REVIEW },
        });
      }

      this.logger.log(`Payment transaction ${tranId} VALIDATED successfully.`);
      return updatedTxn;
    } else {
      const failedTxn = await this.prisma.paymentTransaction.update({
        where: { id: transaction.id },
        data: {
          status: PaymentStatus.FAILED,
          rawResponse: (validation.rawResponse ||
            payload) as Prisma.InputJsonValue,
        },
      });

      this.logger.warn(`Payment transaction ${tranId} validation failed.`);
      return failedTxn;
    }
  }

  async processSslcommerzFail(
    payload: Record<string, unknown>,
  ): Promise<PaymentTransaction> {
    const callbackData = payload as SSLCommerzCallbackPayload;
    const tranId = callbackData.tran_id;

    if (!tranId) {
      throw new BadRequestException('Transaction ID missing');
    }

    const transaction = await this.prisma.paymentTransaction.findUnique({
      where: { tranId },
    });

    if (!transaction) {
      throw new NotFoundException(`Transaction ${tranId} not found`);
    }

    return this.prisma.paymentTransaction.update({
      where: { id: transaction.id },
      data: {
        status: PaymentStatus.FAILED,
        rawResponse: payload as Prisma.InputJsonValue,
      },
    });
  }

  async processSslcommerzCancel(
    payload: Record<string, unknown>,
  ): Promise<PaymentTransaction> {
    const callbackData = payload as SSLCommerzCallbackPayload;
    const tranId = callbackData.tran_id;

    if (!tranId) {
      throw new BadRequestException('Transaction ID missing');
    }

    const transaction = await this.prisma.paymentTransaction.findUnique({
      where: { tranId },
    });

    if (!transaction) {
      throw new NotFoundException(`Transaction ${tranId} not found`);
    }

    return this.prisma.paymentTransaction.update({
      where: { id: transaction.id },
      data: {
        status: PaymentStatus.CANCELLED,
        rawResponse: payload as Prisma.InputJsonValue,
      },
    });
  }

  async getByTranId(tranId: string): Promise<PaymentTransaction | null> {
    return this.prisma.paymentTransaction.findUnique({
      where: { tranId },
    });
  }

  async getByReferenceId(
    purpose: PaymentPurpose,
    referenceId: string,
  ): Promise<PaymentTransaction | null> {
    return this.prisma.paymentTransaction.findFirst({
      where: { purpose, referenceId, status: PaymentStatus.VALIDATED },
      orderBy: { createdAt: 'desc' },
    });
  }
}
