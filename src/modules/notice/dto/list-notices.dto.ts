import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import {
  NoticeCategory,
  NoticeStatus,
} from '../../../generated/prisma/client.js';

export class ListNoticesDto {
  /**
   * Filter by status.
   * - Admin: any status (DRAFT, PUBLISHED, ARCHIVED)
   * - Public: this param is ignored — always forced to PUBLISHED in the service
   */
  @IsOptional()
  @IsEnum(NoticeStatus)
  status?: NoticeStatus;

  /** Filter by category */
  @IsOptional()
  @IsEnum(NoticeCategory)
  category?: NoticeCategory;

  /** Full-text search on subject */
  @IsOptional()
  @IsString()
  @MaxLength(200)
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
