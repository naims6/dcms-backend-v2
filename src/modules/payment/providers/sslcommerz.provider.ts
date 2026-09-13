import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { env } from '../../../config/env.config.js';
import {
  IPaymentProvider,
  InitiatePaymentParams,
  InitiatePaymentResult,
  ValidatePaymentResult,
} from './payment-provider.interface.js';
import {
  SSLCommerzCallbackPayload,
  SSLCommerzInitResponse,
  SSLCommerzValidationResponse,
} from '../interfaces/sslcommerz.interface.js';

@Injectable()
export class SslcommerzProvider implements IPaymentProvider {
  private readonly logger = new Logger(SslcommerzProvider.name);

  private get sessionUrl(): string {
    return env.sslcommerz.isSandbox
      ? 'https://sandbox.sslcommerz.com/gwprocess/v4/api.php'
      : 'https://securepay.sslcommerz.com/gwprocess/v4/api.php';
  }

  private get validationUrl(): string {
    return env.sslcommerz.isSandbox
      ? 'https://sandbox.sslcommerz.com/validator/api/validationserverAPI.php'
      : 'https://securepay.sslcommerz.com/validator/api/validationserverAPI.php';
  }

  async initiatePayment(
    params: InitiatePaymentParams,
  ): Promise<InitiatePaymentResult> {
    const {
      transaction,
      customerName,
      customerEmail,
      customerPhone,
      successUrl,
      failUrl,
      cancelUrl,
      ipnUrl,
    } = params;

    const payload = new URLSearchParams({
      store_id: env.sslcommerz.storeId,
      store_passwd: env.sslcommerz.storePassword,
      total_amount: Number(transaction.amount).toFixed(2),
      currency: transaction.currency || 'BDT',
      tran_id: transaction.tranId,
      success_url: successUrl,
      fail_url: failUrl,
      cancel_url: cancelUrl,
      ipn_url: ipnUrl,
      cus_name: customerName || 'Valued Customer',
      cus_email: customerEmail || 'customer@example.com',
      cus_add1: 'Dhaka, Bangladesh',
      cus_city: 'Dhaka',
      cus_postcode: '1000',
      cus_country: 'Bangladesh',
      cus_phone: customerPhone || '01700000000',
      shipping_method: 'NO',
      product_name: `Payment for ${transaction.purpose}`,
      product_category: 'Education',
      product_profile: 'non-physical-goods',
    });

    try {
      const response = await fetch(this.sessionUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: payload.toString(),
      });

      const data = (await response.json()) as SSLCommerzInitResponse;

      if (data.status === 'SUCCESS' && data.GatewayPageURL) {
        return {
          gatewayUrl: data.GatewayPageURL,
          tranId: transaction.tranId,
        };
      }

      const failMsg =
        data.failedreason || 'SSLCommerz session initiation failed';
      this.logger.error(`SSLCommerz Session Failed: ${failMsg}`);
      throw new BadRequestException(failMsg);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'SSLCommerz connection error';
      this.logger.error(`SSLCommerz HTTP Error: ${message}`);
      throw new BadRequestException(message);
    }
  }

  async validatePayment(
    payload: Record<string, unknown>,
  ): Promise<ValidatePaymentResult> {
    const callbackPayload = payload as SSLCommerzCallbackPayload;
    const valId = callbackPayload.val_id;

    if (!valId) {
      return { isValid: false, rawResponse: payload };
    }

    const query = new URLSearchParams({
      val_id: valId,
      store_id: env.sslcommerz.storeId,
      store_passwd: env.sslcommerz.storePassword,
      format: 'json',
    });

    try {
      const response = await fetch(`${this.validationUrl}?${query.toString()}`);
      const data = (await response.json()) as SSLCommerzValidationResponse;

      if (data.status === 'VALID' || data.status === 'VALIDATED') {
        return {
          isValid: true,
          valId: data.val_id,
          bankTranId: data.bank_tran_id,
          cardType: data.card_type,
          cardIssuer: data.card_issuer,
        };
      }

      return {
        isValid: false,
      };
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'SSLCommerz Validation error';
      this.logger.error(`SSLCommerz Validation Error: ${message}`);
      return { isValid: false, rawResponse: payload };
    }
  }
}
