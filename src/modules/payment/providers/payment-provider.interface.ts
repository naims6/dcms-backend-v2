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
  /** Gateway-reported transaction ID — must match our stored tranId */
  gatewayTranId?: string;
  /** Gateway-reported amount as a string (e.g. "500.00") */
  gatewayAmount?: string;
  /** Gateway-reported currency (e.g. "BDT") */
  gatewayCurrency?: string;
  /** Gateway store identifier used for this transaction */
  gatewayStoreId?: string;
}

export interface IPaymentProvider {
  initiatePayment(
    params: InitiatePaymentParams,
  ): Promise<InitiatePaymentResult>;
  validatePayment(
    payload: Record<string, unknown>,
  ): Promise<ValidatePaymentResult>;
}
