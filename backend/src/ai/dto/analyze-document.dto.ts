import { IsArray, IsNotEmpty, ArrayMinSize } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AnalyzeDocumentDto {
  @ApiProperty({
    description: 'Array of file IDs to analyze',
    example: ['file-id-1', 'file-id-2'],
    type: [String],
  })
  @IsArray()
  @IsNotEmpty()
  @ArrayMinSize(1, { message: 'At least one file ID is required' })
  fileIds: string[];
}
