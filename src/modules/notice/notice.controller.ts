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
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { UserPayload } from '../auth/dto/auth-response.dto.js';

/**
 * Helper to check if caller has an Admin role.
 */
function isAdmin(user?: UserPayload): boolean {
  if (!user || !user.roles) return false;
  return user.roles.some(
    (role) =>
      role.toUpperCase() === 'ADMIN' || role.toUpperCase() === 'SUPER_ADMIN',
  );
}

@Controller('notices')
export class NoticeController {
  constructor(private readonly noticeService: NoticeService) {}

  /**
   * POST /notices
   * Create a notice. Admin can choose DRAFT or PUBLISHED at creation time.
   */
  @RequirePermissions(PERMISSIONS.NOTICES_CREATE)
  @Post()
  @ResponseMessage('Notice created successfully')
  create(@Body() dto: CreateNoticeDto) {
    return this.noticeService.create(dto);
  }

  /**
   * GET /notices
   * @Public — open to everyone.
   * - Admin users → see draft & published notices (respects ?status= filter)
   * - Public / standard users → only PUBLISHED notices
   */
  @Public()
  @Get()
  @ResponseMessage('Notices retrieved successfully')
  findAll(
    @Query() query: ListNoticesDto,
    @CurrentUser() currentUser?: UserPayload,
  ) {
    return this.noticeService.findAll(query, isAdmin(currentUser));
  }

  /**
   * GET /notices/:id
   * @Public — open to everyone.
   * - Admin users → can fetch any notice regardless of status
   * - Public / standard users → 404 for non-PUBLISHED notices
   */
  @Public()
  @Get(':id')
  @ResponseMessage('Notice retrieved successfully')
  findById(@Param('id') id: string, @CurrentUser() currentUser?: UserPayload) {
    return this.noticeService.findById(id, isAdmin(currentUser));
  }

  /**
   * PATCH /notices/:id
   * Update notice content. Requires notices:update permission.
   */
  @RequirePermissions(PERMISSIONS.NOTICES_UPDATE)
  @Patch(':id')
  @ResponseMessage('Notice updated successfully')
  update(@Param('id') id: string, @Body() dto: UpdateNoticeDto) {
    return this.noticeService.update(id, dto);
  }

  /**
   * PATCH /notices/:id/publish
   * Publish a DRAFT notice. Requires notices:update permission.
   */
  @RequirePermissions(PERMISSIONS.NOTICES_UPDATE)
  @Patch(':id/publish')
  @ResponseMessage('Notice published successfully')
  publish(@Param('id') id: string) {
    return this.noticeService.publish(id);
  }

  /**
   * PATCH /notices/:id/unpublish
   * Revert a PUBLISHED notice back to DRAFT. Requires notices:update permission.
   */
  @RequirePermissions(PERMISSIONS.NOTICES_UPDATE)
  @Patch(':id/unpublish')
  @ResponseMessage('Notice unpublished successfully')
  unpublish(@Param('id') id: string) {
    return this.noticeService.unpublish(id);
  }

  /**
   * DELETE /notices/:id
   * Hard delete a notice. Requires notices:delete permission.
   */
  @RequirePermissions(PERMISSIONS.NOTICES_DELETE)
  @Delete(':id')
  @ResponseMessage('Notice deleted successfully')
  remove(@Param('id') id: string) {
    return this.noticeService.remove(id);
  }
}
