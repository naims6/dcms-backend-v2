import { IsEnum } from 'class-validator';
import { UserStatus } from '../../../generated/prisma/client.js';

export class ChangeStatusDto {
  @IsEnum(UserStatus, {
    message: `status must be one of: ${Object.values(UserStatus).join(', ')}`,
  })
  status!: UserStatus;
}
