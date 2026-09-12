import { Transform } from 'class-transformer';
import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { Gender } from '../../../generated/prisma/client.js';

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
}
