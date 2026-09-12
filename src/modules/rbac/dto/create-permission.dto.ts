import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreatePermissionDto {
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;
}
