import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import {
  BloodGroup,
  Gender,
  Religion,
} from '../../../generated/prisma/client.js';
import { UpdateGuardianDto } from './update-guardian.dto.js';

export class UpdateStudentDto {
  // ── Optional User Identity Fields ──────────────────────────────────────────

  @IsOptional()
  @IsString({ message: 'firstName must be a string' })
  @Transform(({ value }: { value?: string }) => value?.trim())
  firstName?: string;

  @IsOptional()
  @IsString({ message: 'lastName must be a string' })
  @Transform(({ value }: { value?: string }) => value?.trim())
  lastName?: string;

  @IsOptional()
  @IsEmail({}, { message: 'email must be a valid email address' })
  @Transform(({ value }: { value?: string }) => value?.trim().toLowerCase())
  email?: string;

  @IsOptional()
  @IsString({ message: 'phone must be a string' })
  @Transform(({ value }: { value?: string }) => value?.trim())
  phone?: string;

  @IsOptional()
  @IsUrl({}, { message: 'imageUrl must be a valid URL' })
  imageUrl?: string;

  // ── Optional Student Academic Profile Fields ──────────────────────────────

  @IsOptional()
  @IsUUID('4', { message: 'classId must be a valid UUID' })
  classId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'rollNumber must be an integer' })
  @Min(1)
  @Max(9999)
  rollNumber?: number;

  @IsOptional()
  @IsDateString({}, { message: 'dateOfBirth must be a valid ISO date string' })
  dateOfBirth?: string;

  @IsOptional()
  @IsEnum(Gender, {
    message: `gender must be one of: ${Object.values(Gender).join(', ')}`,
  })
  gender?: Gender;

  @IsOptional()
  @IsEnum(BloodGroup, {
    message: `bloodGroup must be one of: ${Object.values(BloodGroup).join(', ')}`,
  })
  bloodGroup?: BloodGroup;

  @IsOptional()
  @IsEnum(Religion, {
    message: `religion must be one of: ${Object.values(Religion).join(', ')}`,
  })
  religion?: Religion;

  @IsOptional()
  @IsDateString(
    {},
    { message: 'admissionDate must be a valid ISO date string' },
  )
  admissionDate?: string;

  @IsOptional()
  @IsString({ message: 'emergencyContact must be a string' })
  @Transform(({ value }: { value?: string }) => value?.trim())
  emergencyContact?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }: { value?: string }) => value?.trim())
  studentId?: string;

  // ── Guardians (full replacement when the key is present) ─────────────────
  // NOTE: when sent as multipart/form-data the client JSON-encodes this array;
  // JsonBodyFieldsPipe decodes it before validation runs.

  @IsOptional()
  @IsArray({ message: 'guardians must be an array' })
  @ValidateNested({ each: true })
  @Type(() => UpdateGuardianDto)
  guardians?: UpdateGuardianDto[];
}
