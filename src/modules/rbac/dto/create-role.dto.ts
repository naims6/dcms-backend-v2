import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateRoleDto {
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;

  /** Permission names to attach to this role on creation. */
  @IsOptional()
  @IsString({ each: true })
  permissionNames?: string[];
}
