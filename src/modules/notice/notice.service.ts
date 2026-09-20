import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { NoticeStatus } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { CreateNoticeDto } from './dto/create-notice.dto.js';
import { UpdateNoticeDto } from './dto/update-notice.dto.js';
import { ListNoticesDto } from './dto/list-notices.dto.js';

@Injectable()
export class NoticeService {
  constructor(private readonly prisma: PrismaService) {}

  // ─────────────────────────────────────────────────────────────────────────
  // Queries
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Dashboard — returns ALL notices regardless of status.
   * Supports filtering by status, category, and search term.
   * Called by admin-only GET /notices.
   */
  async findAllForDashboard(query: ListNoticesDto) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 20));
    const skip = (page - 1) * limit;

    const where = {
      // Admins can optionally filter by a specific status; omitting it returns everything
      ...(query.status && { status: query.status }),
      ...(query.category && { category: query.category }),
      ...(query.search && {
        subject: { contains: query.search, mode: 'insensitive' as const },
      }),
    };

    const [notices, total] = await Promise.all([
      this.prisma.notice.findMany({
        where,
        orderBy: { noticeDate: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.notice.count({ where }),
    ]);

    return {
      data: notices,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  /**
   * Public homepage — returns ONLY published notices.
   * The status filter is intentionally hard-coded and cannot be overridden.
   * Called by public GET /notices/public.
   */
  async findAllPublished(query: ListNoticesDto) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 20));
    const skip = (page - 1) * limit;

    const where = {
      status: NoticeStatus.PUBLISHED, // always fixed — never exposed to callers
      ...(query.category && { category: query.category }),
      ...(query.search && {
        subject: { contains: query.search, mode: 'insensitive' as const },
      }),
    };

    const [notices, total] = await Promise.all([
      this.prisma.notice.findMany({
        where,
        orderBy: { noticeDate: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.notice.count({ where }),
    ]);

    return {
      data: notices,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  /**
   * Get a single notice by ID.
   * Used by both dashboard and public detail pages.
   * Pass isPublic=true to restrict to PUBLISHED notices only (public route).
   */
  async findById(id: string, isPublic = false) {
    const notice = await this.prisma.notice.findUnique({ where: { id } });

    if (!notice) {
      throw new NotFoundException(`Notice "${id}" not found`);
    }

    // On public routes, non-published notices must look like they don't exist
    if (isPublic && notice.status !== NoticeStatus.PUBLISHED) {
      throw new NotFoundException(`Notice "${id}" not found`);
    }

    return notice;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Mutations
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Create a new notice.
   * Admin can choose DRAFT or PUBLISHED at creation time.
   * Defaults to DRAFT when status is omitted.
   * Sets publishedAt automatically when status=PUBLISHED.
   */
  async create(dto: CreateNoticeDto) {
    const status = dto.status ?? NoticeStatus.DRAFT;
    const isPublishing = status === NoticeStatus.PUBLISHED;

    return this.prisma.notice.create({
      data: {
        category: dto.category,
        subject: dto.subject,
        body: dto.body,
        noticeDate: new Date(dto.noticeDate),
        status,
        publishedAt: isPublishing ? new Date() : null,
      },
    });
  }

  /**
   * Update notice content fields.
   * If status changes to PUBLISHED → publishedAt is set automatically.
   * If status changes to DRAFT     → publishedAt is cleared automatically.
   */
  async update(id: string, dto: UpdateNoticeDto) {
    await this.ensureExists(id);

    const isPublishing = dto.status === NoticeStatus.PUBLISHED;
    const isDrafting = dto.status === NoticeStatus.DRAFT;

    return this.prisma.notice.update({
      where: { id },
      data: {
        ...(dto.category !== undefined && { category: dto.category }),
        ...(dto.subject !== undefined && { subject: dto.subject }),
        ...(dto.body !== undefined && { body: dto.body }),
        ...(dto.noticeDate !== undefined && {
          noticeDate: new Date(dto.noticeDate),
        }),
        ...(dto.status !== undefined && { status: dto.status }),
        ...(isPublishing && { publishedAt: new Date() }),
        ...(isDrafting && { publishedAt: null }),
      },
    });
  }

  /**
   * Publish a notice (DRAFT → PUBLISHED).
   * Sets publishedAt = now().
   */
  async publish(id: string) {
    const notice = await this.ensureExists(id);

    if (notice.status === NoticeStatus.PUBLISHED) {
      throw new BadRequestException('Notice is already published');
    }

    return this.prisma.notice.update({
      where: { id },
      data: { status: NoticeStatus.PUBLISHED, publishedAt: new Date() },
    });
  }

  /**
   * Unpublish a notice (PUBLISHED → DRAFT).
   * Clears publishedAt.
   */
  async unpublish(id: string) {
    const notice = await this.ensureExists(id);

    if (notice.status !== NoticeStatus.PUBLISHED) {
      throw new BadRequestException('Notice is not published');
    }

    return this.prisma.notice.update({
      where: { id },
      data: { status: NoticeStatus.DRAFT, publishedAt: null },
    });
  }

  /**
   * Hard delete a notice.
   */
  async remove(id: string) {
    await this.ensureExists(id);
    await this.prisma.notice.delete({ where: { id } });
    return { id };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Private helpers
  // ─────────────────────────────────────────────────────────────────────────

  private async ensureExists(id: string) {
    const notice = await this.prisma.notice.findUnique({ where: { id } });
    if (!notice) throw new NotFoundException(`Notice "${id}" not found`);
    return notice;
  }
}
