import { DocumentModerationStatus } from '@prisma/client';
import {
  IsEnum,
  IsIn,
  IsNumberString,
  IsOptional,
  IsString,
} from 'class-validator';

export class ModerationQueueQueryDto {
  @IsOptional()
  @IsNumberString()
  page?: string;
  @IsOptional()
  @IsNumberString()
  limit?: string;
  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsString()
  uploaderId?: string;

  @IsOptional()
  @IsEnum(DocumentModerationStatus)
  status?: DocumentModerationStatus;

  @IsOptional()
  @IsIn(['createdAt', 'title', 'uploader'])
  sort?: 'createdAt' | 'title' | 'uploader';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  order?: 'asc' | 'desc';
}
