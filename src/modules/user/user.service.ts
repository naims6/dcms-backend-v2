import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { RedisService } from '../../redis/redis.service.js';
import { REDIS_KEYS } from '../../common/constants/redis-keys.constant.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { ChangeStatusDto } from './dto/change-status.dto.js';
import { AssignRoleDto } from './dto/assign-role.dto.js';

// ─── Reusable Prisma select shapes ───────────────────────────────────────────

const USER_SUMMARY_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  phone: true,
  status: true,
  createdAt: true,
  userRoles: {
    select: {
      role: { select: { id: true, name: true } },
    },
  },
} as const;

const USER_DETAIL_SELECT = {
  ...USER_SUMMARY_SELECT,
  student: {
    select: {
      id: true,
      studentId: true,
      classId: true,
      rollNumber: true,
      dateOfBirth: true,
      gender: true,
      status: true,
    },
  },
  teacher: {
    select: {
      id: true,
      employeeId: true,
      dateOfBirth: true,
      gender: true,
      status: true,
    },
  },
} as const;

@Injectable()
export class UserService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  // ─────────────────────────────────────────────────────────────────────────
  // Queries
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Returns a paginated list of all users.
   * Optionally filter by status and/or role name.
   */
  async findAll(params: {
    page?: number;
    limit?: number;
    status?: string;
    role?: string;
  }) {
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(100, Math.max(1, params.limit ?? 20));
    const skip = (page - 1) * limit;

    const where = {
      ...(params.status && { status: params.status as never }),
      ...(params.role && {
        userRoles: { some: { role: { name: params.role } } },
      }),
    };

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: USER_SUMMARY_SELECT,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data: users,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  /**
   * Returns full user detail: profile fields + embedded roles +
   * student or teacher sub-profile (whichever applies).
   */
  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: USER_DETAIL_SELECT,
    });

    if (!user) throw new NotFoundException(`User "${id}" not found`);

    // Rename prisma relation keys to camelCase frontend-friendly names
    const { student, teacher, userRoles, ...rest } = user;
    return {
      ...rest,
      roles: userRoles.map((ur) => ur.role),
      studentProfile: student ?? null,
      teacherProfile: teacher ?? null,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Mutations
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Updates any combination of: firstName, lastName, email, phone.
   * Checks email uniqueness before writing.
   */
  async updateUser(id: string, dto: UpdateUserDto) {
    await this.assertExists(id);

    if (dto.email) {
      const conflict = await this.prisma.user.findFirst({
        where: { email: dto.email, NOT: { id } },
        select: { id: true },
      });
      if (conflict) {
        throw new ConflictException(
          `Email "${dto.email}" is already in use by another account`,
        );
      }
    }

    if (Object.keys(dto).length === 0) {
      throw new BadRequestException('No fields provided to update');
    }

    const { userRoles, student, teacher, ...updated } =
      await this.prisma.user.update({
        where: { id },
        data: dto,
        select: USER_DETAIL_SELECT,
      });

    return {
      ...updated,
      roles: userRoles.map((ur) => ur.role),
      studentProfile: student ?? null,
      teacherProfile: teacher ?? null,
    };
  }

  /**
   * Dedicated quick-status endpoint.
   * Also invalidates the Redis permissions cache so the status change takes
   * effect immediately on the next request.
   */
  async changeStatus(id: string, dto: ChangeStatusDto) {
    await this.assertExists(id);

    const updated = await this.prisma.user.update({
      where: { id },
      data: { status: dto.status },
      select: { id: true, status: true },
    });

    // Force re-evaluation of permissions on next request
    await this.redis.del(REDIS_KEYS.userPermissions(id));

    return updated;
  }

  /**
   * Assigns a role to a user. Idempotent — silently succeeds if already assigned.
   */
  async assignRole(userId: string, dto: AssignRoleDto) {
    await this.assertExists(userId);
    await this.assertRoleExists(dto.roleId);

    // @@unique([userId, roleId]) — upsert handles duplicate silently
    await this.prisma.userRole.upsert({
      where: { userId_roleId: { userId, roleId: dto.roleId } },
      update: {},
      create: { userId, roleId: dto.roleId },
    });

    await this.redis.del(REDIS_KEYS.userPermissions(userId));

    return this.findById(userId);
  }

  /**
   * Removes a role from a user. Throws 404 if the user doesn't hold that role.
   */
  async revokeRole(userId: string, roleId: string) {
    await this.assertExists(userId);

    const assignment = await this.prisma.userRole.findUnique({
      where: { userId_roleId: { userId, roleId } },
    });

    if (!assignment) {
      throw new NotFoundException(
        `User "${userId}" does not have role "${roleId}"`,
      );
    }

    await this.prisma.userRole.delete({
      where: { userId_roleId: { userId, roleId } },
    });

    await this.redis.del(REDIS_KEYS.userPermissions(userId));

    return this.findById(userId);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Private helpers
  // ─────────────────────────────────────────────────────────────────────────

  private async assertExists(id: string) {
    const exists = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!exists) throw new NotFoundException(`User "${id}" not found`);
  }

  private async assertRoleExists(roleId: string) {
    const exists = await this.prisma.role.findUnique({
      where: { id: roleId },
      select: { id: true },
    });
    if (!exists) throw new NotFoundException(`Role "${roleId}" not found`);
  }
}
