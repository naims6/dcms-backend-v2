import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { NoticeService } from './notice.service.js';
import { CreateNoticeDto } from './dto/create-notice.dto.js';
import { UpdateNoticeDto } from './dto/update-notice.dto.js';
import { ListNoticesDto } from './dto/list-notices.dto.js';
import { Public } from '../../common/decorators/public.decorator.js';
import { RequirePermissions } from '../../common/decorators/permissions.decorator.js';
import { PERMISSIONS } from '../../common/constants/permissions.constant.js';
import { ResponseMessage } from '../../common/decorators/response-message.decorator.js';

@Controller('notices')
export class NoticeController {
  constructor(private readonly noticeService: NoticeService) {}

  // ─── Public endpoints ─────────────────────────────────────────────────────
  // NOTE: All literal routes (non-parameterised) MUST be declared before
  //       GET(':id') so Express matches them first.

  /**
   * GET /notices/feed
   * Public homepage — returns ONLY published notices.
   * No authentication required.
   * Named "feed" (not "public") to avoid clashing with the GET /:id param route.
   */
  @Public()
  @Get('feed')
  @ResponseMessage('Notices retrieved successfully')
  findAllPublished(@Query() query: ListNoticesDto) {
    return this.noticeService.findAllPublished(query);
  }

  /**
   * GET /notices/feed/:id
   * Public detail — returns a single PUBLISHED notice.
   * Returns 404 for drafts/archived — does not leak their existence.
   * No authentication required.
   */
  @Public()
  @Get('feed/:id')
  @ResponseMessage('Notice retrieved successfully')
  findPublishedById(@Param('id') id: string) {
    return this.noticeService.findById(id, true);
  }

  // ─── Dashboard endpoints (admin only) ─────────────────────────────────────

  /**
   * GET /notices
   * Returns ALL notices (DRAFT, PUBLISHED, ARCHIVED) for the admin dashboard.
   * Supports ?status=, ?category=, ?search=, ?page=, ?limit= filters.
   */
  @RequirePermissions(PERMISSIONS.NOTICES_READ)
  @Get()
  @ResponseMessage('Notices retrieved successfully')
  findAll(@Query() query: ListNoticesDto) {
    return this.noticeService.findAllForDashboard(query);
  }

  /**
   * GET /notices/:id
   * Fetch a single notice by ID — any status.
   * Admin dashboard use only.
   */
  @RequirePermissions(PERMISSIONS.NOTICES_READ)
  @Get(':id')
  @ResponseMessage('Notice retrieved successfully')
  findById(@Param('id') id: string) {
    return this.noticeService.findById(id);
  }

  // ─── Write operations ─────────────────────────────────────────────────────

  /**
   * POST /notices
   * Create a notice. Status defaults to DRAFT when omitted.
   */
  @RequirePermissions(PERMISSIONS.NOTICES_CREATE)
  @Post()
  @ResponseMessage('Notice created successfully')
  create(@Body() dto: CreateNoticeDto) {
    return this.noticeService.create(dto);
  }

  /**
   * PATCH /notices/:id
   * Update notice fields. Only send the fields you want to change.
   */
  @RequirePermissions(PERMISSIONS.NOTICES_UPDATE)
  @Patch(':id')
  @ResponseMessage('Notice updated successfully')
  update(@Param('id') id: string, @Body() dto: UpdateNoticeDto) {
    return this.noticeService.update(id, dto);
  }

  /**
   * PATCH /notices/:id/publish
   * Transition a DRAFT notice to PUBLISHED. Sets publishedAt automatically.
   */
  @RequirePermissions(PERMISSIONS.NOTICES_UPDATE)
  @Patch(':id/publish')
  @ResponseMessage('Notice published successfully')
  publish(@Param('id') id: string) {
    return this.noticeService.publish(id);
  }

  /**
   * PATCH /notices/:id/unpublish
   * Revert a PUBLISHED notice back to DRAFT. Clears publishedAt.
   */
  @RequirePermissions(PERMISSIONS.NOTICES_UPDATE)
  @Patch(':id/unpublish')
  @ResponseMessage('Notice unpublished successfully')
  unpublish(@Param('id') id: string) {
    return this.noticeService.unpublish(id);
  }

  /**
   * DELETE /notices/:id
   * Hard delete a notice permanently.
   */
  @RequirePermissions(PERMISSIONS.NOTICES_DELETE)
  @Delete(':id')
  @ResponseMessage('Notice deleted successfully')
  remove(@Param('id') id: string) {
    return this.noticeService.remove(id);
  }
}
