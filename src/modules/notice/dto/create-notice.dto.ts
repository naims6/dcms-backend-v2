import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import {
  NoticeCategory,
  NoticeStatus,
} from '../../../generated/prisma/client.js';

export class CreateNoticeDto {
  @IsEnum(NoticeCategory)
  category!: NoticeCategory;

  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  subject!: string;

  /** Raw HTML from a rich-text editor (TipTap, Quill, etc.). Stored as-is. */
  @IsString()
  @IsNotEmpty()
  body!: string;

  @IsDateString()
  noticeDate!: string;

  /**
   * Admin can choose to create as DRAFT or PUBLISHED.
   * Defaults to DRAFT when omitted.
   */
  @IsOptional()
  @IsEnum(NoticeStatus)
  status?: NoticeStatus;
}
