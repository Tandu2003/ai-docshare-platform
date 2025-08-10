import { IsString, IsNotEmpty } from 'class-validator';

export class DuplicateCheckDto {
  @IsString()
  @IsNotEmpty()
  fileHash: string;
}

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  similarDocuments: {
    id: string;
    title: string;
    similarityScore: number;
    uploader: any;
  }[];
}
