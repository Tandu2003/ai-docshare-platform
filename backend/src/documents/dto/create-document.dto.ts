import {
  IsArray,
  IsBoolean,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateDocumentDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsArray()
  @IsString({ each: true })
  fileIds: string[];

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsString()
  language?: string;

  @IsOptional()
  @IsBoolean()
  useAI?: boolean;

  @IsOptional()
  @IsObject()
  aiAnalysis?: {
    title?: string;
    description?: string;
    tags?: string[];
    summary?: string;
    keyPoints?: string[];
    difficulty?: 'beginner' | 'intermediate' | 'advanced';
    language?: string;
    confidence?: number;
  };
}
