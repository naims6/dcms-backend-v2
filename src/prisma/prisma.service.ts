import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '../generated/prisma/client.js';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  //   constructor() {
  //     super({
  //       log:
  //         process.env.NODE_ENV === 'development'
  //           ? ['query', 'info', 'warn', 'error']
  //           : ['error'],
  //     });
  //   }
  async onModuleInit() {
    await this.$connect();
    console.log('Database connected successfully');
  }

  async onModuleDestroy() {
    await this.$disconnect();
    console.log('Database disconnected');
  }
}
