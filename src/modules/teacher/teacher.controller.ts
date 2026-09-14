import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { TeacherService } from './teacher.service.js';
import { CreateTeacherDto } from './dto/create-teacher.dto.js';
import { UpdateTeacherDto } from './dto/update-teacher.dto.js';
import { RequirePermissions } from '../../common/decorators/permissions.decorator.js';
import { PERMISSIONS } from '../../common/constants/permissions.constant.js';
import { ResponseMessage } from '../../common/decorators/response-message.decorator.js';
import {
  imageUploadOptions,
  ImageUploadValidationPipe,
} from '../../common/uploads/image-upload.validation.js';
import type { UploadedImageFile } from '../../common/uploads/image-upload.validation.js';

@Controller('teachers')
export class TeacherController {
  constructor(private readonly teacherService: TeacherService) {}

  /**
   * POST /teachers
   * Create a new teacher (user identity + teacher profile).
   * Optional image file upload via multipart form field 'image'.
   */
  @RequirePermissions(PERMISSIONS.TEACHERS_CREATE)
  @Post()
  @UseInterceptors(FileInterceptor('image', imageUploadOptions))
  @ResponseMessage('Teacher created successfully')
  createTeacher(
    @Body() dto: CreateTeacherDto,
    @UploadedFile(ImageUploadValidationPipe) file?: UploadedImageFile,
  ) {
    return this.teacherService.createTeacher(dto, file?.buffer);
  }

  /**
   * GET /teachers
   * Paginated list of all teachers with embedded user info.
   * Optional query params: ?page=1&limit=20
   */
  @RequirePermissions(PERMISSIONS.TEACHERS_READ)
  @Get()
  @ResponseMessage('Teachers retrieved successfully')
  findAll(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.teacherService.findAll({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  /**
   * GET /teachers/:id
   * Full teacher profile with embedded user object and roles.
   */
  @RequirePermissions(PERMISSIONS.TEACHERS_READ)
  @Get(':id')
  @ResponseMessage('Teacher retrieved successfully')
  findById(@Param('id') id: string) {
    return this.teacherService.findById(id);
  }

  /**
   * PATCH /teachers/:id
   * Unified update for teacher identity (User) and professional profile (Teacher).
   * Optional image file upload via multipart form field 'image'.
   */
  @RequirePermissions(PERMISSIONS.TEACHERS_UPDATE)
  @Patch(':id')
  @UseInterceptors(FileInterceptor('image', imageUploadOptions))
  @ResponseMessage('Teacher updated successfully')
  updateTeacher(
    @Param('id') id: string,
    @Body() dto: UpdateTeacherDto,
    @UploadedFile(ImageUploadValidationPipe) file?: UploadedImageFile,
  ) {
    return this.teacherService.updateTeacher(id, dto, file?.buffer);
  }

  /**
   * DELETE /teachers/:id
   * Delete teacher profile and associated user account.
   */
  @RequirePermissions(PERMISSIONS.TEACHERS_DELETE)
  @Delete(':id')
  @ResponseMessage('Teacher deleted successfully')
  deleteTeacher(@Param('id') id: string) {
    return this.teacherService.deleteTeacher(id);
  }
}
