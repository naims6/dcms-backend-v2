import { PrismaClient } from '../../generated/prisma/client.js';

const permissions = [
  { name: 'user.create', description: 'Create users' },
  { name: 'user.read', description: 'Read users' },
  { name: 'user.update', description: 'Update users' },
  { name: 'user.delete', description: 'Delete users' },
];

export async function seedPermissions(prisma: PrismaClient) {
  console.log('Seeding permissions...');

  if (!prisma || !prisma.permission) {
    throw new Error('Prisma permission client is not available');
  }

  for (const permission of permissions) {
    await prisma.permission.upsert({
      where: { name: permission.name },
      update: {},
      create: permission,
    });
  }

  console.log(`Seeded ${permissions.length} permissions`);
}
