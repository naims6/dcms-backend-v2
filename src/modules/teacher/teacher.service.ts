import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { UpdateTeacherDto } from './dto/update-teacher.dto.js';

// ─── Reusable select shape ────────────────────────────────────────────────────

const TEACHER_DETAIL_SELECT = {
  id: true,
  employeeId: true,
  dateOfBirth: true,
  gender: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  user: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      status: true,
      userRoles: {
        select: { role: { select: { id: true, name: true } } },
      },
    },
  },
} as const;

@Injectable()
export class TeacherService {
  constructor(private readonly prisma: PrismaService) {}

  // ─────────────────────────────────────────────────────────────────────────
  // Queries
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Paginated list of teachers with embedded user info.
   */
  async findAll(params: { page?: number; limit?: number }) {
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(100, Math.max(1, params.limit ?? 20));
    const skip = (page - 1) * limit;

    const [teachers, total] = await Promise.all([
      this.prisma.teacher.findMany({
        select: TEACHER_DETAIL_SELECT,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.teacher.count(),
    ]);

    return {
      data: teachers.map(this.normalizeTeacher),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  /**
   * Full teacher detail with embedded user object and roles.
   */
  async findById(id: string) {
    const teacher = await this.prisma.teacher.findUnique({
      where: { id },
      select: TEACHER_DETAIL_SELECT,
    });

    if (!teacher) throw new NotFoundException(`Teacher "${id}" not found`);

    return this.normalizeTeacher(teacher);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Mutations
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Updates teacher profile fields.
   * Does NOT touch UserStatus — manage that via PATCH /users/:id/status.
   */
  async updateTeacher(id: string, dto: UpdateTeacherDto) {
    await this.assertExists(id);

    if (Object.keys(dto).length === 0) {
      throw new BadRequestException('No fields provided to update');
    }

    const { dateOfBirth, ...rest } = dto;

    const teacher = await this.prisma.teacher.update({
      where: { id },
      data: {
        ...rest,
        ...(dateOfBirth && { dateOfBirth: new Date(dateOfBirth) }),
      },
      select: TEACHER_DETAIL_SELECT,
    });

    return this.normalizeTeacher(teacher);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Private helpers
  // ─────────────────────────────────────────────────────────────────────────

  private async assertExists(id: string) {
    const exists = await this.prisma.teacher.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!exists) throw new NotFoundException(`Teacher "${id}" not found`);
  }

  /** Flatten prisma relation shape into frontend-friendly object. */
  private normalizeTeacher(teacher: {
    id: string;
    employeeId: string;
    dateOfBirth: Date | null;
    gender: string | null;
    status: string;
    createdAt: Date;
    updatedAt: Date;
    user: {
      id: string;
      firstName: string;
      lastName: string | null;
      email: string;
      phone: string | null;
      status: string;
      userRoles: { role: { id: string; name: string } }[];
    };
  }) {
    const { user, ...profile } = teacher;
    const { userRoles, ...userFields } = user;
    return {
      ...profile,
      user: {
        ...userFields,
        roles: userRoles.map((ur) => ur.role),
      },
    };
  }
}
