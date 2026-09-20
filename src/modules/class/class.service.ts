import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';

@Injectable()
export class ClassService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Fetch all academic classes.
   */
  async findAll() {
    return this.prisma.class.findMany({
      select: {
        id: true,
        name: true,
        numericValue: true,
      },
      orderBy: { numericValue: 'asc' },
    });
  }
}
