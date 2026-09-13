import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service.js';
import { CloudinaryService } from '../../common/cloudinary/cloudinary.service.js';
import { CreateTeacherDto } from './dto/create-teacher.dto.js';
import { UpdateTeacherDto } from './dto/update-teacher.dto.js';

// ─── Reusable select shape ────────────────────────────────────────────────────

const TEACHER_DETAIL_SELECT = {
  id: true,
  employeeId: true,
  dateOfBirth: true,
  gender: true,
  bloodGroup: true,
  designation: true,
  qualification: true,
  department: true,
  joiningDate: true,
  experienceYears: true,
  emergencyContact: true,
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
      imageUrl: true,
      imageKey: true,
      status: true,
      userRoles: {
        select: { role: { select: { id: true, name: true } } },
      },
    },
  },
} as const;

@Injectable()
export class TeacherService {
  private readonly SALT_ROUNDS = 10;

  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinary: CloudinaryService,
  ) {}

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
      data: teachers.map((t) => this.normalizeTeacher(t)),
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
   * Atomically creates a User (with TEACHER role) and associated Teacher profile.
   * If an image file buffer is provided, it uploads it to Cloudinary automatically.
   */
  async createTeacher(dto: CreateTeacherDto, fileBuffer?: Buffer) {
    // 1. Check uniqueness of user email
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
      select: { id: true },
    });
    if (existingUser) {
      throw new ConflictException(`Email "${dto.email}" is already registered`);
    }

    // 2. Check uniqueness of employeeId
    const existingTeacher = await this.prisma.teacher.findUnique({
      where: { employeeId: dto.employeeId },
      select: { id: true },
    });
    if (existingTeacher) {
      throw new ConflictException(
        `Employee ID "${dto.employeeId}" is already taken`,
      );
    }

    // 3. Upload avatar image to Cloudinary if file provided
    let imageUrl = dto.imageUrl;
    let imageKey = dto.imageKey;

    if (fileBuffer) {
      const uploaded = await this.cloudinary.uploadImage(
        fileBuffer,
        'dcms/avatars',
      );
      imageUrl = uploaded.url;
      imageKey = uploaded.key;
    }

    // 4. Hash initial password
    const hashedPassword = await bcrypt.hash(dto.password, this.SALT_ROUNDS);

    // 5. Find TEACHER role if it exists
    const teacherRole = await this.prisma.role.findFirst({
      where: { name: { equals: 'TEACHER', mode: 'insensitive' } },
      select: { id: true },
    });

    // 6. Execute creation inside transaction
    const teacher = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          firstName: dto.firstName,
          lastName: dto.lastName,
          email: dto.email,
          password: hashedPassword,
          phone: dto.phone,
          imageUrl,
          imageKey,
          ...(teacherRole && {
            userRoles: {
              create: { roleId: teacherRole.id },
            },
          }),
        },
      });

      return tx.teacher.create({
        data: {
          userId: user.id,
          employeeId: dto.employeeId,
          dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
          gender: dto.gender,
          bloodGroup: dto.bloodGroup,
          designation: dto.designation,
          qualification: dto.qualification,
          department: dto.department,
          joiningDate: dto.joiningDate ? new Date(dto.joiningDate) : undefined,
          experienceYears: dto.experienceYears,
          emergencyContact: dto.emergencyContact,
        },
        select: TEACHER_DETAIL_SELECT,
      });
    });

    return this.normalizeTeacher(teacher);
  }

  /**
   * Updates teacher personal (User table) and professional profile (Teacher table) fields atomically.
   * If an image file buffer is provided, uploads it to Cloudinary and replaces the old avatar.
   */
  async updateTeacher(id: string, dto: UpdateTeacherDto, fileBuffer?: Buffer) {
    const existingTeacher = await this.prisma.teacher.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
        employeeId: true,
        user: { select: { imageKey: true } },
      },
    });

    if (!existingTeacher) {
      throw new NotFoundException(`Teacher "${id}" not found`);
    }

    if (!fileBuffer && Object.keys(dto).length === 0) {
      throw new BadRequestException('No fields or image provided to update');
    }

    let { imageUrl, imageKey } = dto;
    const {
      firstName,
      lastName,
      email,
      phone,
      employeeId,
      dateOfBirth,
      joiningDate,
      ...teacherFields
    } = dto;

    // Check email uniqueness if changing email
    if (email) {
      const emailConflict = await this.prisma.user.findFirst({
        where: { email, NOT: { id: existingTeacher.userId } },
        select: { id: true },
      });
      if (emailConflict) {
        throw new ConflictException(`Email "${email}" is already in use`);
      }
    }

    // Check employeeId uniqueness if changing employeeId
    if (employeeId && employeeId !== existingTeacher.employeeId) {
      const employeeIdConflict = await this.prisma.teacher.findFirst({
        where: { employeeId, NOT: { id } },
        select: { id: true },
      });
      if (employeeIdConflict) {
        throw new ConflictException(
          `Employee ID "${employeeId}" is already taken`,
        );
      }
    }

    // If a new image file is uploaded, upload to Cloudinary and delete old image
    if (fileBuffer) {
      if (existingTeacher.user?.imageKey) {
        await this.cloudinary.deleteImage(existingTeacher.user.imageKey);
      }
      const uploaded = await this.cloudinary.uploadImage(
        fileBuffer,
        'dcms/avatars',
      );
      imageUrl = uploaded.url;
      imageKey = uploaded.key;
    }

    const hasUserUpdates =
      firstName !== undefined ||
      lastName !== undefined ||
      email !== undefined ||
      phone !== undefined ||
      imageUrl !== undefined ||
      imageKey !== undefined;

    const hasProfileUpdates =
      employeeId !== undefined ||
      dateOfBirth !== undefined ||
      joiningDate !== undefined ||
      Object.keys(teacherFields).length > 0;

    await this.prisma.$transaction(async (tx) => {
      if (hasUserUpdates) {
        await tx.user.update({
          where: { id: existingTeacher.userId },
          data: {
            ...(firstName !== undefined && { firstName }),
            ...(lastName !== undefined && { lastName }),
            ...(email !== undefined && { email }),
            ...(phone !== undefined && { phone }),
            ...(imageUrl !== undefined && { imageUrl }),
            ...(imageKey !== undefined && { imageKey }),
          },
        });
      }

      if (hasProfileUpdates) {
        await tx.teacher.update({
          where: { id },
          data: {
            ...teacherFields,
            ...(employeeId !== undefined && { employeeId }),
            ...(dateOfBirth !== undefined && {
              dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
            }),
            ...(joiningDate !== undefined && {
              joiningDate: joiningDate ? new Date(joiningDate) : null,
            }),
          },
        });
      }
    });

    return this.findById(id);
  }

  /**
   * Uploads or replaces a teacher avatar image on Cloudinary.
   */
  async uploadAvatar(id: string, fileBuffer: Buffer) {
    return this.updateTeacher(id, {}, fileBuffer);
  }

  /**
   * Deletes a teacher profile and their underlying user account (plus Cloudinary avatar).
   */
  async deleteTeacher(id: string) {
    const teacher = await this.prisma.teacher.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
        user: { select: { imageKey: true } },
      },
    });

    if (!teacher) {
      throw new NotFoundException(`Teacher "${id}" not found`);
    }

    // Delete Cloudinary image if present
    if (teacher.user?.imageKey) {
      await this.cloudinary.deleteImage(teacher.user.imageKey);
    }

    // Deleting the user will cascade delete the teacher record
    await this.prisma.user.delete({
      where: { id: teacher.userId },
    });

    return { id, message: 'Teacher deleted successfully' };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Private helpers
  // ─────────────────────────────────────────────────────────────────────────

  /** Flatten prisma relation shape into frontend-friendly object. */
  private normalizeTeacher(teacher: {
    id: string;
    employeeId: string;
    dateOfBirth: Date | null;
    gender: string | null;
    bloodGroup: string | null;
    designation: string | null;
    qualification: string | null;
    department: string | null;
    joiningDate: Date | null;
    experienceYears: number | null;
    emergencyContact: string | null;
    status: string;
    createdAt: Date;
    updatedAt: Date;
    user: {
      id: string;
      firstName: string;
      lastName: string | null;
      email: string;
      phone: string | null;
      imageUrl: string | null;
      imageKey: string | null;
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
