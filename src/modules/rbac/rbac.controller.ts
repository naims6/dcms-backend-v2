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
} from '@nestjs/common';
import { RbacService } from './rbac.service.js';
import { CreateRoleDto } from './dto/create-role.dto.js';
import { UpdateRoleDto } from './dto/update-role.dto.js';
import { CreatePermissionDto } from './dto/create-permission.dto.js';
import { RequirePermissions } from '../../common/decorators/permissions.decorator.js';
import { PERMISSIONS } from '../../common/constants/permissions.constant.js';
import { ResponseMessage } from '../../common/decorators/response-message.decorator.js';

@Controller('rbac')
export class RbacController {
  constructor(private readonly rbacService: RbacService) {}

  // ─────────────────────────────────────────────────────────────────────────
  // Roles
  // ─────────────────────────────────────────────────────────────────────────

  @RequirePermissions(PERMISSIONS.ROLES_READ)
  @Get('roles')
  @ResponseMessage('Roles retrieved successfully')
  findAllRoles() {
    return this.rbacService.findAllRoles();
  }

  @RequirePermissions(PERMISSIONS.ROLES_READ)
  @Get('roles/:id')
  @ResponseMessage('Role retrieved successfully')
  findRoleById(@Param('id') id: string) {
    return this.rbacService.findRoleById(id);
  }

  @RequirePermissions(PERMISSIONS.ROLES_CREATE)
  @Post('roles')
  @HttpCode(HttpStatus.CREATED)
  @ResponseMessage('Role created successfully')
  createRole(@Body() dto: CreateRoleDto) {
    return this.rbacService.createRole(dto);
  }

  @RequirePermissions(PERMISSIONS.ROLES_UPDATE)
  @Patch('roles/:id')
  @ResponseMessage('Role updated successfully')
  updateRole(@Param('id') id: string, @Body() dto: UpdateRoleDto) {
    return this.rbacService.updateRole(id, dto);
  }

  @RequirePermissions(PERMISSIONS.ROLES_DELETE)
  @Delete('roles/:id')
  @ResponseMessage('Role deleted successfully')
  deleteRole(@Param('id') id: string) {
    return this.rbacService.deleteRole(id);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Permissions
  // ─────────────────────────────────────────────────────────────────────────

  @RequirePermissions(PERMISSIONS.PERMISSIONS_READ)
  @Get('permissions')
  @ResponseMessage('Permissions retrieved successfully')
  findAllPermissions() {
    return this.rbacService.findAllPermissions();
  }

  @RequirePermissions(PERMISSIONS.PERMISSIONS_CREATE)
  @Post('permissions')
  @HttpCode(HttpStatus.CREATED)
  @ResponseMessage('Permission created successfully')
  createPermission(@Body() dto: CreatePermissionDto) {
    return this.rbacService.createPermission(dto);
  }
}
