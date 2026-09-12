import { SetMetadata } from '@nestjs/common';
import type { Permission } from '../constants/permissions.constant.js';

export const PERMISSIONS_KEY = 'permissions';

/**
 * Decorator to declare required permissions on a route or controller.
 *
 * Logic: OR — the user must hold AT LEAST ONE of the listed permissions.
 *
 * example
 * @RequirePermissions(PERMISSIONS.ROLES_READ)
 * @Get()
 * findAll() {}
 *
 * example // Multiple: user needs roles:read OR roles:create
 * @RequirePermissions(PERMISSIONS.ROLES_READ, PERMISSIONS.ROLES_CREATE)
 */
export const RequirePermissions = (...permissions: Permission[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
