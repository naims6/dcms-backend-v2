import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { BloodGroup, Gender } from '../../../generated/prisma/client.js';

export class UpdateTeacherDto {
  @IsOptional()
  @IsString({ message: 'employeeId must be a string' })
  @Transform(({ value }: { value?: string }) => value?.trim())
  employeeId?: string;

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
  @IsInt({ message: 'experienceYears must be an integer' })
  @Min(0)
  experienceYears?: number;

  @IsOptional()
  @IsString({ message: 'emergencyContact must be a string' })
  @Transform(({ value }: { value?: string }) => value?.trim())
  emergencyContact?: string;
}
