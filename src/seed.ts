import 'dotenv/config';
import { PrismaService } from './prisma/prisma.service.js';
import { SeedService } from './database/seed.service.js';

async function bootstrap() {
  const prisma = new PrismaService();
  console.log('Starting database seeding...');

  try {
    await prisma.$connect();
    const seedService = new SeedService(prisma);
    await seedService.seed();
  } catch (error) {
    console.error('Seed failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

await bootstrap();
