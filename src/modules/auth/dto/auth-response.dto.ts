import { UserStatus } from '../../../generated/prisma/client.js';

export interface UserPayload {
  id: string;
  email: string;
  firstName: string;
  lastName: string | null;
  status: UserStatus;
  roles: string[];
}

export class LoginResponseDto {
  accessToken!: string;
  user!: UserPayload;
}
