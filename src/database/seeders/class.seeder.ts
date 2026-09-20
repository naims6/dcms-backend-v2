import { PrismaClient } from '../../generated/prisma/client.js';

const classes = [
  { name: 'Six', numericValue: 6 },
  { name: 'Seven', numericValue: 7 },
  { name: 'Eight', numericValue: 8 },
  { name: 'Nine', numericValue: 9 },
  { name: 'Ten', numericValue: 10 },
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
