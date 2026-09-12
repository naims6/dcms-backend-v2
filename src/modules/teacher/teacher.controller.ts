import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { TeacherService } from './teacher.service.js';
import { UpdateTeacherDto } from './dto/update-teacher.dto.js';
import { RequirePermissions } from '../../common/decorators/permissions.decorator.js';
import { PERMISSIONS } from '../../common/constants/permissions.constant.js';
import { ResponseMessage } from '../../common/decorators/response-message.decorator.js';

@Controller('teachers')
export class TeacherController {
  constructor(private readonly teacherService: TeacherService) {}

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
   * Update teacher profile fields: employeeId, dateOfBirth, gender.
   * To change account status use PATCH /users/:userId/status instead.
   */
  @RequirePermissions(PERMISSIONS.TEACHERS_UPDATE)
  @Patch(':id')
  @ResponseMessage('Teacher updated successfully')
  updateTeacher(@Param('id') id: string, @Body() dto: UpdateTeacherDto) {
    return this.teacherService.updateTeacher(id, dto);
  }
}
