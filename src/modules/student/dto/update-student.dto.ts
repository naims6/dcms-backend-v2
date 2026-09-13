import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { BloodGroup, Gender } from '../../../generated/prisma/client.js';

export class UpdateStudentDto {
  @IsOptional()
  @IsUUID('4', { message: 'classId must be a valid UUID' })
  classId?: string;

  @IsOptional()
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

  @IsOptional()
  @IsString()
  @Transform(({ value }: { value?: string }) => value?.trim())
  studentId?: string;
}
