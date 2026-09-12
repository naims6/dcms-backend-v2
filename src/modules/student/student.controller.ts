import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { StudentService } from './student.service.js';
import { UpdateStudentDto } from './dto/update-student.dto.js';
import { RequirePermissions } from '../../common/decorators/permissions.decorator.js';
import { PERMISSIONS } from '../../common/constants/permissions.constant.js';
import { ResponseMessage } from '../../common/decorators/response-message.decorator.js';

@Controller('students')
export class StudentController {
  constructor(private readonly studentService: StudentService) {}

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
   * Update student academic fields: classId, rollNumber, dateOfBirth, gender.
   * To change account status use PATCH /users/:userId/status instead.
   */
  @RequirePermissions(PERMISSIONS.STUDENTS_UPDATE)
  @Patch(':id')
  @ResponseMessage('Student updated successfully')
  updateStudent(@Param('id') id: string, @Body() dto: UpdateStudentDto) {
    return this.studentService.updateStudent(id, dto);
  }
}
