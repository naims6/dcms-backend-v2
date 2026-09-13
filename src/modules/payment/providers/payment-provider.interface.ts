import { PaymentTransaction } from '../../../generated/prisma/client.js';

export interface InitiatePaymentParams {
  transaction: PaymentTransaction;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  successUrl: string;
  failUrl: string;
  cancelUrl: string;
  ipnUrl: string;
}

export interface InitiatePaymentResult {
  gatewayUrl: string;
  tranId: string;
}

export interface ValidatePaymentResult {
  isValid: boolean;
  valId?: string;
  bankTranId?: string;
  cardType?: string;
  cardIssuer?: string;
  rawResponse?: Record<string, unknown>;
}

export interface IPaymentProvider {
  initiatePayment(
    params: InitiatePaymentParams,
  ): Promise<InitiatePaymentResult>;
  validatePayment(
    payload: Record<string, unknown>,
  ): Promise<ValidatePaymentResult>;
}
