import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import {
  PaymentProvider,
  PaymentPurpose,
} from '../../../generated/prisma/client.js';

export class InitiatePaymentDto {
  @IsEnum(PaymentPurpose)
  @IsNotEmpty()
  purpose!: PaymentPurpose;

  @IsString()
  @IsNotEmpty()
  referenceId!: string;

  @IsNumber()
  @Min(1)
  amount!: number;

  @IsEnum(PaymentProvider)
  @IsOptional()
  provider?: PaymentProvider = PaymentProvider.SSLCOMMERZ;

  @IsString()
  @IsNotEmpty()
  customerName!: string;

  @IsString()
  @IsNotEmpty()
  customerEmail!: string;

  @IsString()
  @IsNotEmpty()
  customerPhone!: string;
}
