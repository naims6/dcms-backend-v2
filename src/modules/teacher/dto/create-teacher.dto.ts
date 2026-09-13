import { Transform, Type } from 'class-transformer';
import {
  IsDateString,
  IsEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Min,
  MinLength,
} from 'class-validator';
import { BloodGroup, Gender } from '../../../generated/prisma/client.js';

export class CreateTeacherDto {
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

  // ── Teacher Profile Fields ────────────────────────────────────────────────

  @IsNotEmpty({ message: 'employeeId is required' })
  @IsString({ message: 'employeeId must be a string' })
  @Transform(({ value }: { value?: string }) => value?.trim())
  employeeId!: string;

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
  @IsString({ message: 'designation must be a string' })
  @Transform(({ value }: { value?: string }) => value?.trim())
  designation?: string;

  @IsOptional()
  @IsString({ message: 'qualification must be a string' })
  @Transform(({ value }: { value?: string }) => value?.trim())
  qualification?: string;

  @IsOptional()
  @IsString({ message: 'department must be a string' })
  @Transform(({ value }: { value?: string }) => value?.trim())
  department?: string;

  @IsOptional()
  @IsDateString({}, { message: 'joiningDate must be a valid ISO date string' })
  joiningDate?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'experienceYears must be an integer' })
  @Min(0)
  experienceYears?: number;

  @IsOptional()
  @IsString({ message: 'emergencyContact must be a string' })
  @Transform(({ value }: { value?: string }) => value?.trim())
  emergencyContact?: string;
}
