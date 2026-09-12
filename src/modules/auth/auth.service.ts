import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import { env } from '../../config/env.config.js';
import { UserStatus } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { RedisService } from '../../redis/redis.service.js';
import { REDIS_KEYS } from '../../common/constants/redis-keys.constant.js';
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
import { JwtRefreshPayload } from './auth.interface.js';
import { MailService } from '../mail/mail.service.js';

@Injectable()
export class AuthService {
  private readonly SALT_ROUNDS = 10;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly redisService: RedisService,
    private readonly mailService: MailService,
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
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        status: true,
        userRoles: {
          select: {
            role: { select: { name: true } },
          },
        },
      },
    });

    // Send welcome / account creation email asynchronously
    void this.mailService.sendUserCreatedEmail({
      email: user.email,
      firstName: user.firstName ?? undefined,
      lastName: user.lastName ?? undefined,
    });

    const roles = user.userRoles.map((ur) => ur.role.name);
    const userPayload = this.buildUserPayload(user, roles);

    // 5. Generate access & refresh tokens and store refresh token in Redis
    const { accessToken, refreshToken, tokenId } = await this.generateTokenPair(
      user.id,
      user.email,
      roles,
    );
    await this.storeRefreshTokenInRedis(user.id, tokenId);

    return {
      accessToken,
      refreshToken,
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
      select: {
        id: true,
        email: true,
        password: true,
        firstName: true,
        lastName: true,
        status: true,
        userRoles: {
          select: {
            role: { select: { name: true } },
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

    // 4. Generate tokens & store refresh token in Redis
    const { accessToken, refreshToken, tokenId } = await this.generateTokenPair(
      user.id,
      user.email,
      roles,
    );
    await this.storeRefreshTokenInRedis(user.id, tokenId);

    return {
      accessToken,
      refreshToken,
      user: userPayload,
    };
  }

  /**
   * Refresh JWT token pair using Redis with token rotation and reuse detection.
   */
  async refreshToken(
    refreshTokenDto: RefreshTokenDto,
  ): Promise<TokenRefreshResponseDto> {
    const { refreshToken } = refreshTokenDto;

    // 1. Verify JWT refresh token signature
    let payload: JwtRefreshPayload;
    try {
      payload = await this.jwtService.verifyAsync<JwtRefreshPayload>(
        refreshToken,
        {
          secret: env.jwtRefreshSecret,
        },
      );
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const userId = payload.id || payload.sub;
    const tokenId = payload.tokenId;

    if (!tokenId) {
      throw new UnauthorizedException('Malformed refresh token');
    }

    // 2. Verify token presence in Redis via REDIS_KEYS
    const redisKey = REDIS_KEYS.refreshToken(userId, tokenId);
    const tokenExists = await this.redisService.exists(redisKey);

    if (!tokenExists) {
      // Re-use attempt or revoked token: security breach! Revoke all tokens for this user
      await this.revokeAllUserRefreshTokens(userId);
      throw new UnauthorizedException(
        'Invalid or revoked refresh token. Please sign in again.',
      );
    }

    // 3. Rotate token: Delete old token from Redis
    await this.redisService.del(redisKey);
    await this.redisService
      .getClient()
      .srem(REDIS_KEYS.userTokensSet(userId), tokenId);

    // 4. Generate and store new token pair in Redis
    const newTokens = await this.generateTokenPair(
      userId,
      payload.email,
      payload.roles,
    );
    await this.storeRefreshTokenInRedis(userId, newTokens.tokenId);

    return {
      accessToken: newTokens.accessToken,
      refreshToken: newTokens.refreshToken,
    };
  }

  /**
   * Change user password and revoke all existing active refresh tokens from Redis.
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

    // 5. Revoke all existing active refresh tokens in Redis (force re-login everywhere)
    await this.revokeAllUserRefreshTokens(userId);

    return { message: 'Password changed successfully.' };
  }

  /**
   * Logout user by revoking refresh token session in Redis.
   */
  async logout(
    userId: string,
    refreshToken?: string,
  ): Promise<MessageResponseDto> {
    if (refreshToken) {
      try {
        const payload = await this.jwtService.verifyAsync<JwtRefreshPayload>(
          refreshToken,
          {
            secret: env.jwtRefreshSecret,
          },
        );

        if (payload.tokenId) {
          const redisKey = REDIS_KEYS.refreshToken(userId, payload.tokenId);
          await this.redisService.del(redisKey);
          await this.redisService
            .getClient()
            .srem(REDIS_KEYS.userTokensSet(userId), payload.tokenId);
        }
      } catch {
        // Token signature invalid or expired, fallback to revoking all
        await this.revokeAllUserRefreshTokens(userId);
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
  ): Promise<{ accessToken: string; refreshToken: string; tokenId: string }> {
    const tokenId = randomUUID();
    const payload = { sub: userId, id: userId, tokenId, email, roles };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(
        { sub: userId, id: userId, email, roles },
        {
          secret: env.jwtAccessSecret,
          expiresIn: env.jwtAccessExpiresIn as unknown as number,
        },
      ),
      this.jwtService.signAsync(payload, {
        secret: env.jwtRefreshSecret,
        expiresIn: env.jwtRefreshExpiresIn as unknown as number,
      }),
    ]);

    return { accessToken, refreshToken, tokenId };
  }

  private async storeRefreshTokenInRedis(
    userId: string,
    tokenId: string,
  ): Promise<void> {
    const ttlSeconds = this.parseDurationToSeconds(env.jwtRefreshExpiresIn);
    const redisKey = REDIS_KEYS.refreshToken(userId, tokenId);

    // Store active token in Redis with TTL
    await this.redisService.set(redisKey, 'active', ttlSeconds);

    // Track token in user's active tokens set via REDIS_KEYS
    const userTokensKey = REDIS_KEYS.userTokensSet(userId);
    const client = this.redisService.getClient();
    await client.sadd(userTokensKey, tokenId);
    await client.expire(userTokensKey, ttlSeconds);
  }

  private async revokeAllUserRefreshTokens(userId: string): Promise<void> {
    const userTokensKey = REDIS_KEYS.userTokensSet(userId);
    const client = this.redisService.getClient();
    const activeTokenIds = await client.smembers(userTokensKey);

    if (activeTokenIds.length > 0) {
      const keysToDelete = activeTokenIds.map((tId) =>
        REDIS_KEYS.refreshToken(userId, tId),
      );
      await this.redisService.del(...keysToDelete);
    }

    await this.redisService.del(userTokensKey);
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

  private parseDurationToSeconds(duration: string): number {
    const unit = duration.slice(-1);
    const val = parseInt(duration.slice(0, -1), 10);
    switch (unit) {
      case 's':
        return val;
      case 'm':
        return val * 60;
      case 'h':
        return val * 60 * 60;
      case 'd':
        return val * 24 * 60 * 60;
      default:
        return 7 * 24 * 60 * 60;
    }
  }
}
