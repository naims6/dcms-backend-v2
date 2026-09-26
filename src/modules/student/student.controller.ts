import {
  BadRequestException,
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
import { StudentService } from './student.service.js';
import { CreateStudentDto } from './dto/create-student.dto.js';
import { UpdateStudentDto } from './dto/update-student.dto.js';
import { RequirePermissions } from '../../common/decorators/permissions.decorator.js';
import { PERMISSIONS } from '../../common/constants/permissions.constant.js';
import { ResponseMessage } from '../../common/decorators/response-message.decorator.js';
import {
  imageUploadOptions,
  ImageUploadValidationPipe,
} from '../../common/uploads/image-upload.validation.js';
import type { UploadedImageFile } from '../../common/uploads/image-upload.validation.js';

@Controller('students')
export class StudentController {
  constructor(private readonly studentService: StudentService) {}

  /**
   * POST /students
   * Create a new student profile and optional guardians (pure application/json).
   */
  @RequirePermissions(PERMISSIONS.STUDENTS_CREATE)
  @Post()
  @ResponseMessage('Student created successfully')
  createStudent(@Body() dto: CreateStudentDto) {
    return this.studentService.createStudent(dto);
  }

  /**
   * POST /students/:id/avatar
   * Upload or update student avatar profile picture (multipart form field 'image').
   */
  @RequirePermissions(PERMISSIONS.STUDENTS_UPDATE)
  @Post(':id/avatar')
  @UseInterceptors(FileInterceptor('image', imageUploadOptions))
  @ResponseMessage('Student avatar uploaded successfully')
  uploadAvatar(
    @Param('id') id: string,
    @UploadedFile(ImageUploadValidationPipe) file?: UploadedImageFile,
  ) {
    if (!file) {
      throw new BadRequestException('Please provide an image file');
    }
    return this.studentService.uploadAvatar(id, file.buffer);
  }

  /**
   * GET /students
   * Paginated list of all students with embedded user info.
   * Optional query params: ?page=1&limit=20&classId=<uuid>
   */
  @RequirePermissions(PERMISSIONS.STUDENTS_READ)
  @Get()
  @ResponseMessage('Students retrieved successfully')
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('classId') classId?: string,
  ) {
    return this.studentService.findAll({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      classId,
    });
  }

  /**
   * GET /students/:id
   * Full student profile with embedded user object and roles.
   */
  @RequirePermissions(PERMISSIONS.STUDENTS_READ)
  @Get(':id')
  @ResponseMessage('Student retrieved successfully')
  findById(@Param('id') id: string) {
    return this.studentService.findById(id);
  }

  /**
   * PATCH /students/:id
   * Unified update for student identity (User), academic profile (Student) and guardians.
   * JSON body only — the avatar is changed via POST /students/:id/avatar.
   */
  @RequirePermissions(PERMISSIONS.STUDENTS_UPDATE)
  @Patch(':id')
  @ResponseMessage('Student updated successfully')
  updateStudent(@Param('id') id: string, @Body() dto: UpdateStudentDto) {
    return this.studentService.updateStudent(id, dto);
  }

  /**
   * DELETE /students/:id
   * Delete student profile and associated user account.
   */
  @RequirePermissions(PERMISSIONS.STUDENTS_DELETE)
  @Delete(':id')
  @ResponseMessage('Student deleted successfully')
  deleteStudent(@Param('id') id: string) {
    return this.studentService.deleteStudent(id);
  }
}
