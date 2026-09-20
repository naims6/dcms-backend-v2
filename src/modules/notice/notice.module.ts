import { Module } from '@nestjs/common';
import { NoticeController } from './notice.controller.js';
import { NoticeService } from './notice.service.js';
import { NoticePdfService } from './notice-pdf.service.js';
import { PrismaModule } from '../../prisma/prisma.module.js';

@Module({
  imports: [PrismaModule],
  controllers: [NoticeController],
  providers: [NoticeService, NoticePdfService],
  exports: [NoticeService],
})
export class NoticeModule {}
