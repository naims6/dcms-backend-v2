import { PrismaClient } from '../../generated/prisma/client.js';

const classes = [
  { name: '6', numericValue: 6 },
  { name: '7', numericValue: 7 },
  { name: '8', numericValue: 8 },
  { name: '9', numericValue: 9 },
  { name: '10', numericValue: 10 },
];

export async function seedClasses(prisma: PrismaClient) {
  console.log('Seeding classes...');

  for (const classData of classes) {
    await prisma.class.upsert({
      where: { name: classData.name },
      update: {},
      create: classData,
    });
  }

  console.log(`Seeded ${classes.length} classes`);
}
