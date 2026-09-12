import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { UserService } from './user.service.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { ChangeStatusDto } from './dto/change-status.dto.js';
import { AssignRoleDto } from './dto/assign-role.dto.js';
import { RequirePermissions } from '../../common/decorators/permissions.decorator.js';
import { PERMISSIONS } from '../../common/constants/permissions.constant.js';
import { ResponseMessage } from '../../common/decorators/response-message.decorator.js';

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  /**
   * GET /users
   * Paginated list of all users. Optional query params:
   *   ?page=1&limit=20&status=ACTIVE&role=TEACHER
   */
  @RequirePermissions(PERMISSIONS.USERS_READ)
  @Get()
  @ResponseMessage('Users retrieved successfully')
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('role') role?: string,
  ) {
    return this.userService.findAll({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      status,
      role,
    });
  }

  /**
   * GET /users/:id
   * Full user detail with embedded roles + student/teacher profile.
   */
  @RequirePermissions(PERMISSIONS.USERS_READ)
  @Get(':id')
  @ResponseMessage('User retrieved successfully')
  findById(@Param('id') id: string) {
    return this.userService.findById(id);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Updates
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * PATCH /users/:id
   * Update any combination of profile fields: firstName, lastName, email, phone.
   * Send only the fields you want to change.
   */
  @RequirePermissions(PERMISSIONS.USERS_UPDATE)
  @Patch(':id')
  @ResponseMessage('User updated successfully')
  updateUser(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.userService.updateUser(id, dto);
  }

  /**
   * PATCH /users/:id/status
   * Quick status toggle — dedicated endpoint for the frontend list-page button.
   * Body: { "status": "ACTIVE" | "INACTIVE" | "SUSPENDED" }
   */
  @RequirePermissions(PERMISSIONS.USERS_UPDATE)
  @Patch(':id/status')
  @ResponseMessage('User status updated successfully')
  changeStatus(@Param('id') id: string, @Body() dto: ChangeStatusDto) {
    return this.userService.changeStatus(id, dto);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Role Management
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * POST /users/:id/roles
   * Assign a role to a user. Idempotent.
   * Body: { "roleId": "<uuid>" }
   */
  @RequirePermissions(PERMISSIONS.USERS_ASSIGN_ROLE)
  @Post(':id/roles')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Role assigned successfully')
  assignRole(@Param('id') id: string, @Body() dto: AssignRoleDto) {
    return this.userService.assignRole(id, dto);
  }

  /**
   * DELETE /users/:id/roles/:roleId
   * Remove a role from a user.
   */
  @RequirePermissions(PERMISSIONS.USERS_REVOKE_ROLE)
  @Delete(':id/roles/:roleId')
  @ResponseMessage('Role revoked successfully')
  revokeRole(@Param('id') id: string, @Param('roleId') roleId: string) {
    return this.userService.revokeRole(id, roleId);
  }
}
