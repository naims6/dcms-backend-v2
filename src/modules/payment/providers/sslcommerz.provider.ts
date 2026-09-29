import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import SSLCommerzPayment from 'sslcommerz-lts';
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

/**
 * SSLCommerz Payment Provider
 *
 * Uses the official `sslcommerz-lts` package to initiate payment sessions
 * and securely validate transactions with the SSLCommerz gateway.
 */
@Injectable()
export class SslcommerzProvider implements IPaymentProvider {
  private readonly logger = new Logger(SslcommerzProvider.name);
  private readonly sslcommerz: SSLCommerzPayment;

  constructor() {
    // live: true for live production mode, false for sandbox mode
    const isLive = !env.sslcommerz.isSandbox;
    this.sslcommerz = new SSLCommerzPayment(
      env.sslcommerz.storeId,
      env.sslcommerz.storePassword,
      isLive,
    );
  }

  /**
   * Initiates payment with SSLCommerz using sslcommerz-lts SDK.
   * Returns the GatewayPageURL where the customer should complete payment.
   */
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

    const paymentData = {
      total_amount: Number(transaction.amount).toFixed(2),
      currency: transaction.currency || 'BDT',
      tran_id: transaction.tranId,
      success_url: successUrl,
      fail_url: failUrl,
      cancel_url: cancelUrl,
      ipn_url: ipnUrl,
      shipping_method: 'NO',
      product_name: `Payment for ${transaction.purpose}`,
      product_category: 'Education',
      product_profile: 'non-physical-goods',
      cus_name: customerName || 'Valued Customer',
      cus_email: customerEmail || 'customer@example.com',
      cus_add1: 'Dhaka, Bangladesh',
      cus_city: 'Dhaka',
      cus_postcode: '1000',
      cus_country: 'Bangladesh',
      cus_phone: customerPhone || '01700000000',
    };

    try {
      this.logger.log(
        `Initiating SSLCommerz payment session for tranId: ${transaction.tranId}`,
      );
      const response: SSLCommerzInitResponse =
        await this.sslcommerz.init(paymentData);

      if (response?.status === 'SUCCESS' && response?.GatewayPageURL) {
        return {
          gatewayUrl: response.GatewayPageURL,
          tranId: transaction.tranId,
        };
      }

      const failMsg =
        response?.failedreason || 'SSLCommerz session initiation failed';
      this.logger.error(`SSLCommerz Session Initiation Failed: ${failMsg}`);
      throw new BadRequestException(failMsg);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'SSLCommerz connection error';
      this.logger.error(`SSLCommerz Init Error: ${message}`);
      throw new BadRequestException(message);
    }
  }

  /**
   * Validates a transaction with SSLCommerz using val_id.
   * Calls the validation server to confirm the transaction status and authenticity.
   */
  async validatePayment(
    payload: Record<string, unknown>,
  ): Promise<ValidatePaymentResult> {
    const callbackPayload = payload as SSLCommerzCallbackPayload;
    const valId = callbackPayload.val_id;

    if (!valId) {
      this.logger.warn(
        'Payment validation skipped: Missing val_id in callback payload',
      );
      return { isValid: false, rawResponse: payload };
    }

    try {
      this.logger.log(
        `Validating payment with SSLCommerz for val_id: ${valId}`,
      );
      const response: SSLCommerzValidationResponse =
        await this.sslcommerz.validate({ val_id: valId });

      if (response?.status === 'VALID' || response?.status === 'VALIDATED') {
        return {
          isValid: true,
          valId: response.val_id,
          bankTranId: response.bank_tran_id,
          cardType: response.card_type,
          cardIssuer: response.card_issuer,
          gatewayTranId: response.tran_id,
          gatewayAmount: response.amount,
          gatewayCurrency: response.currency,
          gatewayStoreId: response.store_id,
          rawResponse: response as unknown as Record<string, unknown>,
        };
      }

      this.logger.warn(
        `SSLCommerz validation failed with status: ${response?.status}`,
      );
      return {
        isValid: false,
        rawResponse: response as unknown as Record<string, unknown>,
      };
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'SSLCommerz Validation error';
      this.logger.error(`SSLCommerz Validation Error: ${message}`);
      return { isValid: false, rawResponse: payload };
    }
  }
}
