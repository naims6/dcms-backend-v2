import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateRoleDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;

  /**
   * Full replacement list of permission names for this role.
   * Permissions not in this list will be removed from the role.
   * Send an empty array to clear all permissions.
   */
  @IsOptional()
  @IsString({ each: true })
  permissionNames?: string[];
}
