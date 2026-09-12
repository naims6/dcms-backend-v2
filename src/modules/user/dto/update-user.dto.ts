import { Transform } from 'class-transformer';
import { IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateUserDto {
  @IsOptional()
  @IsString({ message: 'First name must be a string' })
  @MaxLength(100)
  @Transform(({ value }: { value?: string }) => value?.trim())
  firstName?: string;

  @IsOptional()
  @IsString({ message: 'Last name must be a string' })
  @MaxLength(100)
  @Transform(({ value }: { value?: string }) => value?.trim())
  lastName?: string;

  @IsOptional()
  @IsEmail({}, { message: 'Please enter a valid email address' })
  @Transform(({ value }: { value?: string }) => value?.trim().toLowerCase())
  email?: string;

  @IsOptional()
  @IsString({ message: 'Phone must be a string' })
  @MaxLength(20)
  @Transform(({ value }: { value?: string }) => value?.trim())
  phone?: string;
}
