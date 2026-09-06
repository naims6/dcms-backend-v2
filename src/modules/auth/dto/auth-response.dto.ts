import { UserStatus } from '../../../generated/prisma/client.js';

export interface UserPayload {
  id: string;
  email: string;
  firstName: string;
  lastName: string | null;
  status: UserStatus;
  roles: string[];
}

export class AuthResponseDto {
  accessToken!: string;
  refreshToken!: string;
  user!: UserPayload;
}

export class LoginResponseDto extends AuthResponseDto {}

export class TokenRefreshResponseDto {
  accessToken!: string;
  refreshToken!: string;
}

export class MessageResponseDto {
  message!: string;
}
