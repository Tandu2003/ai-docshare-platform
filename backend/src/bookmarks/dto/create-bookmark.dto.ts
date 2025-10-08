import { IsOptional, IsString } from 'class-validator';

export class CreateBookmarkDto {
  @IsString()
  documentId!: string;

  @IsOptional()
  @IsString()
  folderId?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
