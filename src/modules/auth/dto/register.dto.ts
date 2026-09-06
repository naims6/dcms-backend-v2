import { Transform } from 'class-transformer';
import {
  IsArray,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  @IsEmail({}, { message: 'Please enter a valid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  @Transform(({ value }: { value: string }) => value?.trim().toLowerCase())
  email!: string;

  @IsString({ message: 'Password must be a string' })
  @IsNotEmpty({ message: 'Password is required' })
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  password!: string;

  @IsString({ message: 'First name must be a string' })
  @IsNotEmpty({ message: 'First name is required' })
  @Transform(({ value }: { value: string }) => value?.trim())
  firstName!: string;

  @IsOptional()
  @IsString({ message: 'Last name must be a string' })
  @Transform(({ value }: { value?: string }) => value?.trim())
  lastName?: string;

  @IsOptional()
  @IsString({ message: 'Phone must be a string' })
  @Transform(({ value }: { value?: string }) => value?.trim())
  phone?: string;

  @IsOptional()
  @IsArray({ message: 'Role names must be an array of strings' })
  @IsString({ each: true, message: 'Each role name must be a string' })
  roleNames?: string[];
}
