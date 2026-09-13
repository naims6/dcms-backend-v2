import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service.js';
import { CloudinaryService } from '../../common/cloudinary/cloudinary.service.js';
import { CreateStudentDto } from './dto/create-student.dto.js';
import { UpdateStudentDto } from './dto/update-student.dto.js';

// ─── Reusable select shape ────────────────────────────────────────────────────

const STUDENT_DETAIL_SELECT = {
  id: true,
  studentId: true,
  classId: true,
  rollNumber: true,
  dateOfBirth: true,
  gender: true,
  bloodGroup: true,
  religion: true,
  admissionDate: true,
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
export class StudentService {
  private readonly SALT_ROUNDS = 10;

  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinary: CloudinaryService,
  ) {}

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
      data: students.map((s) => this.normalizeStudent(s)),
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
   * Atomically creates a User (with STUDENT role) and associated Student profile.
   * If an image file buffer is provided, it uploads it to Cloudinary automatically.
   */
  async createStudent(dto: CreateStudentDto, fileBuffer?: Buffer) {
    // 1. Check uniqueness of user email
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
      select: { id: true },
    });
    if (existingUser) {
      throw new ConflictException(`Email "${dto.email}" is already registered`);
    }

    // 2. Check uniqueness of studentId
    const existingStudent = await this.prisma.student.findUnique({
      where: { studentId: dto.studentId },
      select: { id: true },
    });
    if (existingStudent) {
      throw new ConflictException(
        `Student ID "${dto.studentId}" is already taken`,
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

    // 5. Find STUDENT role if it exists
    const studentRole = await this.prisma.role.findFirst({
      where: { name: { equals: 'STUDENT', mode: 'insensitive' } },
      select: { id: true },
    });

    // 6. Execute creation inside transaction
    const student = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          firstName: dto.firstName,
          lastName: dto.lastName,
          email: dto.email,
          password: hashedPassword,
          phone: dto.phone,
          imageUrl,
          imageKey,
          ...(studentRole && {
            userRoles: {
              create: { roleId: studentRole.id },
            },
          }),
        },
      });

      return tx.student.create({
        data: {
          userId: user.id,
          studentId: dto.studentId,
          classId: dto.classId,
          rollNumber: dto.rollNumber,
          dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
          gender: dto.gender,
          bloodGroup: dto.bloodGroup,
          religion: dto.religion,
          admissionDate: dto.admissionDate
            ? new Date(dto.admissionDate)
            : undefined,
          emergencyContact: dto.emergencyContact,
        },
        select: STUDENT_DETAIL_SELECT,
      });
    });

    return this.normalizeStudent(student);
  }

  /**
   * Updates student personal (User table) and academic profile (Student table) fields atomically.
   * If an image file buffer is provided, uploads it to Cloudinary and replaces the old avatar.
   */
  async updateStudent(id: string, dto: UpdateStudentDto, fileBuffer?: Buffer) {
    const existingStudent = await this.prisma.student.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
        studentId: true,
        user: { select: { imageKey: true } },
      },
    });

    if (!existingStudent) {
      throw new NotFoundException(`Student "${id}" not found`);
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
      studentId,
      dateOfBirth,
      admissionDate,
      ...studentFields
    } = dto;

    // Check email uniqueness if changing email
    if (email) {
      const emailConflict = await this.prisma.user.findFirst({
        where: { email, NOT: { id: existingStudent.userId } },
        select: { id: true },
      });
      if (emailConflict) {
        throw new ConflictException(`Email "${email}" is already in use`);
      }
    }

    // Check studentId uniqueness if changing studentId
    if (studentId && studentId !== existingStudent.studentId) {
      const studentIdConflict = await this.prisma.student.findFirst({
        where: { studentId, NOT: { id } },
        select: { id: true },
      });
      if (studentIdConflict) {
        throw new ConflictException(
          `Student ID "${studentId}" is already taken`,
        );
      }
    }

    // If a new image file is uploaded, upload to Cloudinary and delete the old image
    if (fileBuffer) {
      if (existingStudent.user?.imageKey) {
        await this.cloudinary.deleteImage(existingStudent.user.imageKey);
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
      studentId !== undefined ||
      dateOfBirth !== undefined ||
      admissionDate !== undefined ||
      Object.keys(studentFields).length > 0;

    await this.prisma.$transaction(async (tx) => {
      if (hasUserUpdates) {
        await tx.user.update({
          where: { id: existingStudent.userId },
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
        await tx.student.update({
          where: { id },
          data: {
            ...studentFields,
            ...(studentId !== undefined && { studentId }),
            ...(dateOfBirth !== undefined && {
              dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
            }),
            ...(admissionDate !== undefined && {
              admissionDate: admissionDate ? new Date(admissionDate) : null,
            }),
          },
        });
      }
    });

    return this.findById(id);
  }

  /**
   * Uploads or replaces a student avatar image on Cloudinary.
   */
  async uploadAvatar(id: string, fileBuffer: Buffer) {
    return this.updateStudent(id, {}, fileBuffer);
  }

  /**
   * Deletes a student profile and their underlying user account (plus Cloudinary avatar).
   */
  async deleteStudent(id: string) {
    const student = await this.prisma.student.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
        user: { select: { imageKey: true } },
      },
    });

    if (!student) {
      throw new NotFoundException(`Student "${id}" not found`);
    }

    // Delete Cloudinary image if present
    if (student.user?.imageKey) {
      await this.cloudinary.deleteImage(student.user.imageKey);
    }

    // Deleting the user will cascade delete the student record
    await this.prisma.user.delete({
      where: { id: student.userId },
    });

    return { id, message: 'Student deleted successfully' };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Private helpers
  // ─────────────────────────────────────────────────────────────────────────

  /** Flatten prisma relation shape into frontend-friendly object. */
  private normalizeStudent(student: {
    id: string;
    studentId: string;
    classId: string | null;
    rollNumber: number | null;
    dateOfBirth: Date | null;
    gender: string | null;
    bloodGroup: string | null;
    religion: string | null;
    admissionDate: Date | null;
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
