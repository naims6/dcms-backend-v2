import {
  ConflictException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { RedisService } from '../../redis/redis.service.js';
import { REDIS_KEYS } from '../../common/constants/redis-keys.constant.js';
import { ALL_PERMISSIONS } from '../../common/constants/permissions.constant.js';
import { CreateRoleDto } from './dto/create-role.dto.js';
import { UpdateRoleDto } from './dto/update-role.dto.js';
import { CreatePermissionDto } from './dto/create-permission.dto.js';

@Injectable()
export class RbacService implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
  ) {}

  // ─────────────────────────────────────────────────────────────────────────
  // Lifecycle: sync permissions from constants into DB on startup
  // ─────────────────────────────────────────────────────────────────────────

  async onModuleInit(): Promise<void> {
    await this.syncPermissions();
  }

  /**
   * Ensures every permission string defined in ALL_PERMISSIONS exists in the DB.
   * Uses upsert so it is idempotent and safe to run on every startup.
   */
  private async syncPermissions(): Promise<void> {
    await Promise.all(
      ALL_PERMISSIONS.map((name) =>
        this.prisma.permission.upsert({
          where: { name },
          update: {},
          create: { name },
        }),
      ),
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Roles
  // ─────────────────────────────────────────────────────────────────────────

  async findAllRoles() {
    return this.prisma.role.findMany({
      include: {
        permissions: {
          include: { permission: true },
        },
        _count: { select: { userRoles: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findRoleById(id: string) {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: {
        permissions: {
          include: { permission: true },
        },
        _count: { select: { userRoles: true } },
      },
    });

    if (!role) {
      throw new NotFoundException(`Role with id "${id}" not found`);
    }

    return role;
  }

  async createRole(dto: CreateRoleDto) {
    const { name, description, permissionNames = [] } = dto;

    const existing = await this.prisma.role.findUnique({ where: { name } });
    if (existing) {
      throw new ConflictException(`Role "${name}" already exists`);
    }

    const permissions = await this.resolvePermissionIds(permissionNames);

    return this.prisma.role.create({
      data: {
        name,
        description,
        permissions: {
          create: permissions.map((p) => ({ permissionId: p.id })),
        },
      },
      include: {
        permissions: { include: { permission: true } },
      },
    });
  }

  async updateRole(id: string, dto: UpdateRoleDto) {
    await this.findRoleById(id); // throws 404 if not found

    const { name, description, permissionNames } = dto;

    // If permissionNames was supplied, do a full replacement
    if (permissionNames !== undefined) {
      const newPermissions = await this.resolvePermissionIds(permissionNames);

      // Run inside a transaction: delete old, insert new, update fields
      const updated = await this.prisma.$transaction(async (tx) => {
        await tx.rolePermission.deleteMany({ where: { roleId: id } });

        return tx.role.update({
          where: { id },
          data: {
            ...(name && { name }),
            ...(description !== undefined && { description }),
            permissions: {
              create: newPermissions.map((p) => ({ permissionId: p.id })),
            },
          },
          include: {
            permissions: { include: { permission: true } },
          },
        });
      });

      // Invalidate permissions cache for all users who hold this role
      await this.invalidateCacheForRole(id);

      return updated;
    }

    // No permissionNames — just update name/description
    return this.prisma.role.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
      },
      include: {
        permissions: { include: { permission: true } },
      },
    });
  }

  async deleteRole(id: string) {
    await this.findRoleById(id); // throws 404 if not found

    // Invalidate cache before deletion so no stale entries remain
    await this.invalidateCacheForRole(id);

    await this.prisma.role.delete({ where: { id } });

    return { message: `Role deleted successfully` };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Permissions
  // ─────────────────────────────────────────────────────────────────────────

  async findAllPermissions() {
    return this.prisma.permission.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async createPermission(dto: CreatePermissionDto) {
    const { name, description } = dto;

    const existing = await this.prisma.permission.findUnique({
      where: { name },
    });
    if (existing) {
      throw new ConflictException(`Permission "${name}" already exists`);
    }

    return this.prisma.permission.create({ data: { name, description } });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Cache helpers (used by PermissionsGuard via RbacService or directly)
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Invalidates the permissions cache for a specific user.
   * Call this whenever a user's role assignment changes.
   */
  async invalidateUserPermissionsCache(userId: string): Promise<void> {
    await this.redisService.del(REDIS_KEYS.userPermissions(userId));
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Private helpers
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Resolves permission names to their DB records.
   * Throws NotFoundException for any unknown permission name.
   */
  private async resolvePermissionIds(
    names: string[],
  ): Promise<{ id: string; name: string }[]> {
    if (names.length === 0) return [];

    const permissions = await this.prisma.permission.findMany({
      where: { name: { in: names } },
      select: { id: true, name: true },
    });

    const missing = names.filter((n) => !permissions.some((p) => p.name === n));
    if (missing.length > 0) {
      throw new NotFoundException(
        `Unknown permissions: ${missing.join(', ')}. Check GET /rbac/permissions for valid names.`,
      );
    }

    return permissions;
  }

  /**
   * Invalidates the permissions cache for every user who currently holds the
   * given role. Called when a role's permission list changes or the role is deleted.
   */
  private async invalidateCacheForRole(roleId: string): Promise<void> {
    const affected = await this.prisma.userRole.findMany({
      where: { roleId },
      select: { userId: true },
    });

    await Promise.all(
      affected.map((ur) => this.invalidateUserPermissionsCache(ur.userId)),
    );
  }
}
