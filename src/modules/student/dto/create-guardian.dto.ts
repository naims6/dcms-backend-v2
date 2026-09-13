import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { GuardianRelationship } from '../../../generated/prisma/client.js';

export class CreateGuardianDto {
  @IsNotEmpty({ message: 'name is required' })
  @IsString({ message: 'name must be a string' })
  @Transform(({ value }: { value?: string }) => value?.trim())
  name!: string;

  @IsNotEmpty({ message: 'relationship is required' })
  @IsEnum(GuardianRelationship, {
    message: `relationship must be one of: ${Object.values(GuardianRelationship).join(', ')}`,
  })
  relationship!: GuardianRelationship;

  @IsOptional()
  @IsString({ message: 'phone must be a string' })
  @Transform(({ value }: { value?: string }) => value?.trim())
  phone?: string;

  @IsOptional()
  @IsEmail({}, { message: 'email must be a valid email address' })
  @Transform(({ value }: { value?: string }) => value?.trim().toLowerCase())
  email?: string;

  @IsOptional()
  @IsString({ message: 'occupation must be a string' })
  @Transform(({ value }: { value?: string }) => value?.trim())
  occupation?: string;

  @IsOptional()
  @IsString({ message: 'address must be a string' })
  @Transform(({ value }: { value?: string }) => value?.trim())
  address?: string;
}
