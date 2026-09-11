import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { env } from '../../config/env.config.js';
import { RefreshToken, UserStatus } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import {
  AuthResponseDto,
  MessageResponseDto,
  TokenRefreshResponseDto,
  UserPayload,
} from './dto/auth-response.dto.js';
import { ChangePasswordDto } from './dto/change-password.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { RefreshTokenDto } from './dto/refresh-token.dto.js';
import { RegisterDto } from './dto/register.dto.js';

@Injectable()
export class AuthService {
  private readonly SALT_ROUNDS = 10;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Register/Create a new user (Protected Admin endpoint).
   */
  async register(registerDto: RegisterDto): Promise<AuthResponseDto> {
    const { email, password, firstName, lastName, phone, roleNames } =
      registerDto;

    // 1. Ensure email is unique
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException('A user with this email already exists.');
    }

    // 2. Hash password
    const hashedPassword = await bcrypt.hash(password, this.SALT_ROUNDS);

    // 3. Connect roles if roleNames provided
    const userRoleConnect: { roleId: string }[] = [];
    if (roleNames && roleNames.length > 0) {
      const existingRoles = await this.prisma.role.findMany({
        where: { name: { in: roleNames } },
      });

      for (const role of existingRoles) {
        userRoleConnect.push({ roleId: role.id });
      }
    }

    // 4. Create user record
    const user = await this.prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
        phone,
        status: UserStatus.ACTIVE,
        userRoles: {
          create: userRoleConnect,
        },
      },
      include: {
        userRoles: {
          include: {
            role: true,
          },
        },
      },
    });

    const roles = user.userRoles.map((ur) => ur.role.name);
    const userPayload = this.buildUserPayload(user, roles);

    // 5. Generate access & refresh tokens
    const tokens = await this.generateTokenPair(user.id, user.email, roles);
    await this.storeRefreshToken(user.id, tokens.refreshToken);

    return {
      ...tokens,
      user: userPayload,
    };
  }

  /**
   * User login with email and password.
   */
  async login(loginDto: LoginDto): Promise<AuthResponseDto> {
    const { email, password } = loginDto;

    // 1. Fetch user with roles
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: {
        userRoles: {
          include: {
            role: true,
          },
        },
      },
    });

    // 2. Uniform security check: verify user existence and bcrypt password
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // 3. Check account status
    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException(
        `Account status is ${user.status.toLowerCase()}. Please contact support.`,
      );
    }

    const roles = user.userRoles.map((ur) => ur.role.name);
    const userPayload = this.buildUserPayload(user, roles);

    // 4. Generate tokens & store hashed refresh token
    const tokens = await this.generateTokenPair(user.id, user.email, roles);
    await this.storeRefreshToken(user.id, tokens.refreshToken);

    return {
      ...tokens,
      user: userPayload,
    };
  }

  /**
   * Refresh JWT token pair with token rotation and reuse detection.
   */
  async refreshToken(
    refreshTokenDto: RefreshTokenDto,
  ): Promise<TokenRefreshResponseDto> {
    const { refreshToken } = refreshTokenDto;

    // 1. Verify JWT refresh token signature
    let payload: { sub: string; id?: string; email: string; roles: string[] };
    try {
      payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: env.jwtRefreshSecret,
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const userId = payload.id || payload.sub;

    // 2. Fetch user active refresh tokens
    const activeTokens = await this.prisma.refreshToken.findMany({
      where: {
        userId,
        isRevoked: false,
        expiresAt: { gt: new Date() },
      },
    });

    // 3. Find matching token in database by bcrypt compare
    let matchingTokenRecord: RefreshToken | null = null;
    for (const tokenRecord of activeTokens) {
      const isMatch = await bcrypt.compare(refreshToken, tokenRecord.tokenHash);
      if (isMatch) {
        matchingTokenRecord = tokenRecord;
        break;
      }
    }

    if (!matchingTokenRecord) {
      // Re-use attempt or revoked token: revoke all tokens for this user for security
      await this.prisma.refreshToken.updateMany({
        where: { userId },
        data: { isRevoked: true },
      });
      throw new UnauthorizedException(
        'Invalid or revoked refresh token. Please sign in again.',
      );
    }

    // 4. Revoke old refresh token (Token Rotation)
    await this.prisma.refreshToken.update({
      where: { id: matchingTokenRecord.id },
      data: { isRevoked: true },
    });

    // 5. Generate and store new token pair
    const tokens = await this.generateTokenPair(
      userId,
      payload.email,
      payload.roles,
    );
    await this.storeRefreshToken(userId, tokens.refreshToken);

    return tokens;
  }

  /**
   * Change user password and revoke existing refresh tokens.
   */
  async changePassword(
    userId: string,
    changePasswordDto: ChangePasswordDto,
  ): Promise<MessageResponseDto> {
    const { currentPassword, newPassword } = changePasswordDto;

    if (currentPassword === newPassword) {
      throw new BadRequestException(
        'New password must be different from current password.',
      );
    }

    // 1. Fetch user
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found.');
    }

    // 2. Verify current password
    const isPasswordValid = await bcrypt.compare(
      currentPassword,
      user.password,
    );
    if (!isPasswordValid) {
      throw new BadRequestException('Current password is incorrect.');
    }

    // 3. Hash new password
    const newHashedPassword = await bcrypt.hash(newPassword, this.SALT_ROUNDS);

    // 4. Update user password
    await this.prisma.user.update({
      where: { id: userId },
      data: { password: newHashedPassword },
    });

    // 5. Revoke all existing active refresh tokens (force re-login everywhere)
    await this.revokeAllUserRefreshTokens(userId);

    return { message: 'Password changed successfully.' };
  }

  /**
   * Logout user by revoking active refresh tokens.
   */
  async logout(
    userId: string,
    refreshToken?: string,
  ): Promise<MessageResponseDto> {
    if (refreshToken) {
      const activeTokens = await this.prisma.refreshToken.findMany({
        where: { userId, isRevoked: false },
      });

      for (const tokenRecord of activeTokens) {
        const isMatch = await bcrypt.compare(
          refreshToken,
          tokenRecord.tokenHash,
        );
        if (isMatch) {
          await this.prisma.refreshToken.update({
            where: { id: tokenRecord.id },
            data: { isRevoked: true },
          });
          break;
        }
      }
    } else {
      await this.revokeAllUserRefreshTokens(userId);
    }

    return { message: 'Logged out successfully.' };
  }

  // --- Helper Methods ---

  private async generateTokenPair(
    userId: string,
    email: string,
    roles: string[],
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const payload = { sub: userId, id: userId, email, roles };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: env.jwtAccessSecret,
        expiresIn: env.jwtAccessExpiresIn as unknown as number,
      }),
      this.jwtService.signAsync(payload, {
        secret: env.jwtRefreshSecret,
        expiresIn: env.jwtRefreshExpiresIn as unknown as number,
      }),
    ]);

    return { accessToken, refreshToken };
  }

  private async storeRefreshToken(
    userId: string,
    refreshToken: string,
  ): Promise<void> {
    const tokenHash = await bcrypt.hash(refreshToken, this.SALT_ROUNDS);
    const expiresMs = this.parseDurationToMs(env.jwtRefreshExpiresIn);
    const expiresAt = new Date(Date.now() + expiresMs);

    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash,
        expiresAt,
      },
    });
  }

  private async revokeAllUserRefreshTokens(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, isRevoked: false },
      data: { isRevoked: true },
    });
  }

  private buildUserPayload(
    user: {
      id: string;
      email: string;
      firstName: string;
      lastName: string | null;
      status: UserStatus;
    },
    roles: string[],
  ): UserPayload {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      status: user.status,
      roles,
    };
  }

  private parseDurationToMs(duration: string): number {
    const unit = duration.slice(-1);
    const val = parseInt(duration.slice(0, -1), 10);
    switch (unit) {
      case 's':
        return val * 1000;
      case 'm':
        return val * 60 * 1000;
      case 'h':
        return val * 60 * 60 * 1000;
      case 'd':
        return val * 24 * 60 * 60 * 1000;
      default:
        return 7 * 24 * 60 * 60 * 1000;
    }
  }
}
