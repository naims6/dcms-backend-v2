import { PrismaClient } from '../../generated/prisma/client.js';
import { PERMISSIONS } from '../../common/constants/permissions.constant.js';

export interface RoleConfig {
  name: string;
  description: string;
  /**
   * Use '*' to automatically assign ALL permissions in the database,
   * or provide an array of specific permission strings from PERMISSIONS constant.
   */
  permissions: '*' | string[];
}

/**
 * Central roles seed configuration.
 * Easy for anyone to maintain and extend!
 */
export const DEFAULT_ROLES: RoleConfig[] = [
  {
    name: 'ADMIN',
    description: 'Full system administrator with access to all permissions',
    permissions: '*', // Auto-assigns all permissions
  },
  {
    name: 'TEACHER',
    description:
      'Teacher role with management access to teacher and student records',
    permissions: [
      PERMISSIONS.TEACHERS_READ,
      PERMISSIONS.TEACHERS_UPDATE,
      PERMISSIONS.STUDENTS_READ,
      PERMISSIONS.STUDENTS_UPDATE,
    ],
  },
  {
    name: 'STUDENT',
    description: 'Student role with standard read permissions',
    permissions: [PERMISSIONS.STUDENTS_READ],
  },
];

export async function seedRoles(prisma: PrismaClient) {
  console.log('Seeding and updating roles & permissions...');

  if (!prisma || !prisma.role) {
    throw new Error('Prisma role client is not available');
  }

  for (const roleConfig of DEFAULT_ROLES) {
    // 1. Create or update role metadata
    const role = await prisma.role.upsert({
      where: { name: roleConfig.name },
      update: { description: roleConfig.description },
      create: {
        name: roleConfig.name,
        description: roleConfig.description,
      },
    });

    // 2. Resolve target permissions
    let targetPermissionIds: string[] = [];
    if (roleConfig.permissions === '*') {
      const allDbPerms = await prisma.permission.findMany({
        select: { id: true },
      });
      targetPermissionIds = allDbPerms.map((p) => p.id);
    } else if (
      Array.isArray(roleConfig.permissions) &&
      roleConfig.permissions.length > 0
    ) {
      const dbPerms = await prisma.permission.findMany({
        where: { name: { in: roleConfig.permissions } },
        select: { id: true },
      });
      targetPermissionIds = dbPerms.map((p) => p.id);
    }

    // 3. Synchronize role permissions (clear existing relations & re-assign)
    await prisma.$transaction(async (tx) => {
      await tx.rolePermission.deleteMany({
        where: { roleId: role.id },
      });

      if (targetPermissionIds.length > 0) {
        await tx.rolePermission.createMany({
          data: targetPermissionIds.map((permissionId) => ({
            roleId: role.id,
            permissionId,
          })),
        });
      }
    });

    console.log(
      `Role "${role.name}" synced with ${targetPermissionIds.length} permissions`,
    );
  }

  console.log(`Seeded/Updated ${DEFAULT_ROLES.length} roles successfully`);
}
