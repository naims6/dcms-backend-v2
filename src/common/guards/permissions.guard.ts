import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator.js';
import { UserPayload } from '../../modules/auth/dto/auth-response.dto.js';
import { RedisService } from '../../redis/redis.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import {
  PERMISSIONS_CACHE_TTL,
  REDIS_KEYS,
} from '../constants/redis-keys.constant.js';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly redisService: RedisService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // 1. Retrieve required permissions from route/controller metadata
    const required = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    // No permissions declared → route is open to any authenticated user
    if (!required || required.length === 0) {
      return true;
    }

    // 2. Get authenticated user from request (populated by JwtAuthGuard)
    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user as UserPayload | undefined;

    if (!user?.id) {
      throw new ForbiddenException('Access denied');
    }

    // 3. Resolve user permissions (Redis → DB fallback)
    const userPermissions = await this.resolvePermissions(user.id);

    // 4. user must hold AT LEAST ONE of the required permissions
    const hasAccess = required.some((p) => userPermissions.includes(p));

    if (!hasAccess) {
      throw new ForbiddenException(
        `Access denied. Required one of: ${required.join(', ')}`,
      );
    }

    return true;
  }

  /**
   * Returns the flat list of permission strings for a user.
   * Checks Redis first; on miss, queries the DB and caches the result.
   */
  private async resolvePermissions(userId: string): Promise<string[]> {
    const cacheKey = REDIS_KEYS.userPermissions(userId);

    // ── Redis hit ──
    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      return JSON.parse(cached) as string[];
    }

    // ── DB fallback ──
    const userRoles = await this.prisma.userRole.findMany({
      where: { userId },
      select: {
        role: {
          select: {
            permissions: {
              select: {
                permission: { select: { name: true } },
              },
            },
          },
        },
      },
    });

    // Flatten role → permissions and deduplicate
    const permissions = [
      ...new Set(
        userRoles.flatMap((ur) =>
          ur.role.permissions.map((rp) => rp.permission.name),
        ),
      ),
    ];

    // ── Populate cache ──
    await this.redisService.set(
      cacheKey,
      JSON.stringify(permissions),
      PERMISSIONS_CACHE_TTL,
    );

    return permissions;
  }
}
