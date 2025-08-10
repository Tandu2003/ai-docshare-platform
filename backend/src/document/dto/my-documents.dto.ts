import { Type } from 'class-transformer';
import { IsOptional, IsString, IsNumber, IsEnum, Min } from 'class-validator';

export enum DocumentStatus {
  ALL = 'all',
  APPROVED = 'approved',
  PENDING = 'pending',
  REJECTED = 'rejected',
}

export enum MyDocumentsSortBy {
  CREATED_AT = 'createdAt',
  TITLE = 'title',
  DOWNLOADS = 'downloads',
  VIEWS = 'views',
}

export enum MyDocumentsOrder {
  ASC = 'asc',
  DESC = 'desc',
}

export class GetMyDocumentsDto {
  @IsOptional()
  @IsEnum(DocumentStatus)
  status?: DocumentStatus = DocumentStatus.ALL;

  @IsOptional()
  @IsEnum(MyDocumentsSortBy)
  sort?: MyDocumentsSortBy = MyDocumentsSortBy.CREATED_AT;

  @IsOptional()
  @IsEnum(MyDocumentsOrder)
  order?: MyDocumentsOrder = MyDocumentsOrder.DESC;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  limit?: number = 10;
}
