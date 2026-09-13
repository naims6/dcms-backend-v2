import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  Max,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { BloodGroup, Gender } from '../../../generated/prisma/client.js';
import { CreateGuardianDto } from './create-guardian.dto.js';

export class CreateStudentDto {
  // ── User Identity Fields ──────────────────────────────────────────────────

  @IsNotEmpty({ message: 'firstName is required' })
  @IsString({ message: 'firstName must be a string' })
  @Transform(({ value }: { value?: string }) => value?.trim())
  firstName!: string;

  @IsOptional()
  @IsString({ message: 'lastName must be a string' })
  @Transform(({ value }: { value?: string }) => value?.trim())
  lastName?: string;

  @IsNotEmpty({ message: 'email is required' })
  @IsEmail({}, { message: 'email must be a valid email address' })
  @Transform(({ value }: { value?: string }) => value?.trim().toLowerCase())
  email!: string;

  @IsNotEmpty({ message: 'password is required' })
  @IsString({ message: 'password must be a string' })
  @MinLength(6, { message: 'password must be at least 6 characters long' })
  password!: string;

  @IsOptional()
  @IsString({ message: 'phone must be a string' })
  @Transform(({ value }: { value?: string }) => value?.trim())
  phone?: string;

  @IsOptional()
  @IsUrl({}, { message: 'imageUrl must be a valid URL' })
  imageUrl?: string;

  @IsOptional()
  @IsString()
  imageKey?: string;

  // ── Student Academic Profile Fields ──────────────────────────────────────

  @IsNotEmpty({ message: 'studentId is required' })
  @IsString({ message: 'studentId must be a string' })
  @Transform(({ value }: { value?: string }) => value?.trim())
  studentId!: string;

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
  @IsString({ message: 'religion must be a string' })
  @Transform(({ value }: { value?: string }) => value?.trim())
  religion?: string;

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

  // ── Guardian Profiles ───────────────────────────────────────────────────

  @IsOptional()
  @IsArray({ message: 'guardians must be an array' })
  @ValidateNested({ each: true })
  @Type(() => CreateGuardianDto)
  guardians?: CreateGuardianDto[];
}
