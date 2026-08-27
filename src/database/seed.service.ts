import { Injectable, Logger } from '@nestjs/common';
import { seedPermissions } from './seeders/permission.seeder.js';
import { seedRoles } from './seeders/role.seeder.js';
import { seedUsers } from './seeders/user.seeder.js';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class SeedService {
  private readonly logger = new Logger(SeedService.name);

  constructor(private readonly prisma: PrismaService) {}

  async seed() {
    this.logger.log('Starting database seed...');

    try {
      await seedPermissions(this.prisma);
      await seedRoles(this.prisma);
      await seedUsers(this.prisma);

      this.logger.log('Database seed completed successfully');
    } catch (error) {
      this.logger.error('Database seed failed', error);
      throw error;
    }
  }
}
