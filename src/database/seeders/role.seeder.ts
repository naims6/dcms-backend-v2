import { PrismaClient } from '../../generated/prisma/client.js';

const roles = [
  {
    name: 'ADMIN',
    description: 'Full system administrator',
    permissions: ['user.create', 'user.read', 'user.update', 'user.delete'],
  },
];

export async function seedRoles(prisma: PrismaClient) {
  console.log('Seeding roles...');

  if (!prisma || !prisma.role) {
    throw new Error('Prisma role client is not available');
  }

  for (const role of roles) {
    const permissionNames = Array.isArray(role.permissions)
      ? role.permissions
      : [];

    await prisma.role.upsert({
      where: { name: role.name },
      update: {},
      create: {
        name: role.name,
        description: role.description,
        permissions: {
          create: permissionNames.map((permName) => ({
            permission: {
              connect: { name: permName },
            },
          })),
        },
      },
    });
  }

  console.log(`Seeded ${roles.length} roles`);
}
