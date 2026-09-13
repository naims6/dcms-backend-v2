import { Injectable, NotImplementedException } from '@nestjs/common';
import {
  IPaymentProvider,
  InitiatePaymentParams,
  InitiatePaymentResult,
  ValidatePaymentResult,
} from './payment-provider.interface.js';

@Injectable()
export class BkashProvider implements IPaymentProvider {
  initiatePayment(
    params: InitiatePaymentParams,
  ): Promise<InitiatePaymentResult> {
    void params;
    return Promise.reject(
      new NotImplementedException(
        'bKash gateway provider will be enabled in a future release.',
      ),
    );
  }

  validatePayment(
    payload: Record<string, unknown>,
  ): Promise<ValidatePaymentResult> {
    void payload;
    return Promise.reject(
      new NotImplementedException(
        'bKash gateway provider will be enabled in a future release.',
      ),
    );
  }
}
