import { Module } from '@nestjs/common';
import { TeacherController } from './teacher.controller.js';
import { TeacherService } from './teacher.service.js';
import { PrismaModule } from '../../prisma/prisma.module.js';

@Module({
  imports: [PrismaModule],
  controllers: [TeacherController],
  providers: [TeacherService],
  exports: [TeacherService],
})
export class TeacherModule {}
