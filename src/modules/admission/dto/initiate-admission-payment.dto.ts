import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { PaymentProvider } from '../../../generated/prisma/client.js';

export class InitiateAdmissionPaymentDto {
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @IsEnum(PaymentProvider)
  @IsOptional()
  provider?: PaymentProvider = PaymentProvider.SSLCOMMERZ;
}

export class RejectAdmissionDto {
  @IsString()
  @IsNotEmpty()
  reason!: string;
}
