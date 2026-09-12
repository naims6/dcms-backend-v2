import { PrismaClient } from '../../generated/prisma/client.js';
import {
  ALL_PERMISSIONS,
  PERMISSIONS,
} from '../../common/constants/permissions.constant.js';

/**
 * Optional custom descriptions for standard permission keys.
 */
const PERMISSION_DESCRIPTIONS: Record<string, string> = {
  [PERMISSIONS.ROLES_READ]: 'Read system roles',
  [PERMISSIONS.ROLES_CREATE]: 'Create system roles',
  [PERMISSIONS.ROLES_UPDATE]: 'Update system roles',
  [PERMISSIONS.ROLES_DELETE]: 'Delete system roles',
  [PERMISSIONS.PERMISSIONS_READ]: 'Read system permissions',
  [PERMISSIONS.PERMISSIONS_CREATE]: 'Create system permissions',
  [PERMISSIONS.USERS_READ]: 'Read user accounts',
  [PERMISSIONS.USERS_CREATE]: 'Create user accounts',
  [PERMISSIONS.USERS_UPDATE]: 'Update user accounts',
  [PERMISSIONS.USERS_DELETE]: 'Delete user accounts',
  [PERMISSIONS.USERS_ASSIGN_ROLE]: 'Assign roles to users',
  [PERMISSIONS.USERS_REVOKE_ROLE]: 'Revoke roles from users',
  [PERMISSIONS.STUDENTS_READ]: 'Read student profiles',
  [PERMISSIONS.STUDENTS_UPDATE]: 'Update student profiles',
  [PERMISSIONS.TEACHERS_READ]: 'Read teacher profiles',
  [PERMISSIONS.TEACHERS_UPDATE]: 'Update teacher profiles',
};

/**
 * Helper to generate a human-readable description if not explicitly defined.
 * Format: `resource:action` -> `Action Resource`
 */
function getPermissionDescription(name: string): string {
  if (PERMISSION_DESCRIPTIONS[name]) {
    return PERMISSION_DESCRIPTIONS[name];
  }
  const [resource, action] = name.split(':');
  if (!resource || !action) return name;
  const formattedAction = action
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
  const formattedResource = resource
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
  return `${formattedAction} ${formattedResource}`;
}

export async function seedPermissions(prisma: PrismaClient) {
  console.log('Seeding permissions from permissions.constant.ts...');

  if (!prisma || !prisma.permission) {
    throw new Error('Prisma permission client is not available');
  }

  for (const name of ALL_PERMISSIONS) {
    const description = getPermissionDescription(name);
    await prisma.permission.upsert({
      where: { name },
      update: { description },
      create: { name, description },
    });
  }

  console.log(
    `Seeded/Synced ${ALL_PERMISSIONS.length} permissions successfully`,
  );
}
