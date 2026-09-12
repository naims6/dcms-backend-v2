import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { UpdateStudentDto } from './dto/update-student.dto.js';

// ─── Reusable select shape ────────────────────────────────────────────────────

const STUDENT_DETAIL_SELECT = {
  id: true,
  studentId: true,
  classId: true,
  rollNumber: true,
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
export class StudentService {
  constructor(private readonly prisma: PrismaService) {}

  // ─────────────────────────────────────────────────────────────────────────
  // Queries
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Paginated list of students with embedded user info.
   * Optionally filter by classId.
   */
  async findAll(params: { page?: number; limit?: number; classId?: string }) {
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(100, Math.max(1, params.limit ?? 20));
    const skip = (page - 1) * limit;

    const where = {
      ...(params.classId && { classId: params.classId }),
    };

    const [students, total] = await Promise.all([
      this.prisma.student.findMany({
        where,
        select: STUDENT_DETAIL_SELECT,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.student.count({ where }),
    ]);

    return {
      data: students.map(this.normalizeStudent),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  /**
   * Full student detail with embedded user object and roles.
   */
  async findById(id: string) {
    const student = await this.prisma.student.findUnique({
      where: { id },
      select: STUDENT_DETAIL_SELECT,
    });

    if (!student) throw new NotFoundException(`Student "${id}" not found`);

    return this.normalizeStudent(student);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Mutations
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Updates student academic profile fields.
   * Does NOT touch UserStatus — manage that via PATCH /users/:id/status.
   */
  async updateStudent(id: string, dto: UpdateStudentDto) {
    await this.assertExists(id);

    if (Object.keys(dto).length === 0) {
      throw new BadRequestException('No fields provided to update');
    }

    const { dateOfBirth, ...rest } = dto;

    const student = await this.prisma.student.update({
      where: { id },
      data: {
        ...rest,
        ...(dateOfBirth && { dateOfBirth: new Date(dateOfBirth) }),
      },
      select: STUDENT_DETAIL_SELECT,
    });

    return this.normalizeStudent(student);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Private helpers
  // ─────────────────────────────────────────────────────────────────────────

  private async assertExists(id: string) {
    const exists = await this.prisma.student.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!exists) throw new NotFoundException(`Student "${id}" not found`);
  }

  /** Flatten prisma relation shape into frontend-friendly object. */
  private normalizeStudent(student: {
    id: string;
    studentId: string;
    classId: string | null;
    rollNumber: number | null;
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
    const { user, ...profile } = student;
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
