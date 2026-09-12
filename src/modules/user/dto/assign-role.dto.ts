import { IsUUID } from 'class-validator';

export class AssignRoleDto {
  @IsUUID('4', { message: 'roleId must be a valid UUID' })
  roleId!: string;
}
