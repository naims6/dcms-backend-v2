import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import {
  NoticeCategory,
  NoticeStatus,
} from '../../../generated/prisma/client.js';

/**
 * All fields are optional for partial updates.
 * Explicitly redefined (instead of PartialType) to avoid isolatedModules TS issues.
 */
export class UpdateNoticeDto {
  @IsOptional()
  @IsEnum(NoticeCategory)
  category?: NoticeCategory;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  subject?: string;

  /** Raw HTML from a rich-text editor. */
  @IsOptional()
  @IsString()
  body?: string;

  @IsOptional()
  @IsDateString()
  noticeDate?: string;

  @IsOptional()
  @IsEnum(NoticeStatus)
  status?: NoticeStatus;
}
