import {
  Controller,
  Post,
  Body,
  Res,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import { PaymentService } from './payment.service.js';
import { env } from '../../config/env.config.js';
import { SSLCommerzCallbackPayload } from './interfaces/sslcommerz.interface.js';
import { Public } from '../../common/decorators/public.decorator.js';

@Controller('payments')
export class PaymentController {
  private readonly logger = new Logger(PaymentController.name);

  constructor(private readonly paymentService: PaymentService) {}

  @Public()
  @Post('sslcommerz/success')
  @HttpCode(HttpStatus.OK)
  async handleSslcommerzSuccess(
    @Body() payload: Record<string, unknown>,
    @Res() res: Response,
  ) {
    const callbackData = payload as SSLCommerzCallbackPayload;
    this.logger.log(
      `SSLCommerz Success Callback received for tran_id: ${callbackData.tran_id ?? 'unknown'}`,
    );
    try {
      const transaction =
        await this.paymentService.processSslcommerzSuccess(payload);
      const frontendUrl = env.sslcommerz.baseUrl.replace(/\/$/, '');
      return res.redirect(
        `${frontendUrl}/admission/complete?tranId=${transaction.tranId}&status=success`,
      );
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Payment validation error';
      this.logger.error(
        `Error processing SSLCommerz success callback: ${message}`,
      );
      const frontendUrl = env.sslcommerz.baseUrl.replace(/\/$/, '');
      return res.redirect(
        `${frontendUrl}/admission/complete?status=error&message=${encodeURIComponent(message)}`,
      );
    }
  }

  @Public()
  @Post('sslcommerz/fail')
  @HttpCode(HttpStatus.OK)
  async handleSslcommerzFail(
    @Body() payload: Record<string, unknown>,
    @Res() res: Response,
  ) {
    const callbackData = payload as SSLCommerzCallbackPayload;
    this.logger.log(
      `SSLCommerz Fail Callback received for tran_id: ${callbackData.tran_id ?? 'unknown'}`,
    );
    await this.paymentService.processSslcommerzFail(payload);
    const frontendUrl = env.sslcommerz.baseUrl.replace(/\/$/, '');
    return res.redirect(`${frontendUrl}/admission/complete?status=fail`);
  }

  @Public()
  @Post('sslcommerz/cancel')
  @HttpCode(HttpStatus.OK)
  async handleSslcommerzCancel(
    @Body() payload: Record<string, unknown>,
    @Res() res: Response,
  ) {
    const callbackData = payload as SSLCommerzCallbackPayload;
    this.logger.log(
      `SSLCommerz Cancel Callback received for tran_id: ${callbackData.tran_id ?? 'unknown'}`,
    );
    await this.paymentService.processSslcommerzCancel(payload);
    const frontendUrl = env.sslcommerz.baseUrl.replace(/\/$/, '');
    return res.redirect(`${frontendUrl}/admission/complete?status=cancel`);
  }

  @Public()
  @Post('sslcommerz/ipn')
  @HttpCode(HttpStatus.OK)
  async handleSslcommerzIpn(@Body() payload: Record<string, unknown>) {
    const callbackData = payload as SSLCommerzCallbackPayload;
    this.logger.log(
      `SSLCommerz IPN webhook received for tran_id: ${callbackData.tran_id ?? 'unknown'}`,
    );
    await this.paymentService.processSslcommerzSuccess(payload);
    return { status: 'OK' };
  }
}
