import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class GetShareLinksQueryDto {
  @ApiPropertyOptional({
    description: 'Trang hiện tại',
    example: 1,
    minimum: 1,
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber({}, { message: 'Trang phải là số' })
  @Min(1, { message: 'Trang phải lớn hơn 0' })
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Số lượng item mỗi trang',
    example: 20,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber({}, { message: 'Giới hạn phải là số' })
  @Min(1, { message: 'Giới hạn phải lớn hơn 0' })
  @Max(100, { message: 'Giới hạn không được quá 100' })
  limit?: number = 20;

  @ApiPropertyOptional({
    description: 'Lọc theo ID tài liệu',
    example: 'clx123456',
  })
  @IsOptional()
  @IsString({ message: 'ID tài liệu phải là chuỗi' })
  documentId?: string;

  @ApiPropertyOptional({
    description: 'Lọc theo ID người tạo',
    example: 'clx123456',
  })
  @IsOptional()
  @IsString({ message: 'ID người tạo phải là chuỗi' })
  createdById?: string;

  @ApiPropertyOptional({
    description: 'Lọc theo trạng thái thu hồi',
    example: 'false',
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean({ message: 'Trạng thái thu hồi phải là boolean' })
  isRevoked?: boolean;

  @ApiPropertyOptional({
    description: 'Lọc theo trạng thái hết hạn',
    example: 'false',
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean({ message: 'Trạng thái hết hạn phải là boolean' })
  isExpired?: boolean;

  @ApiPropertyOptional({
    description: 'Sắp xếp theo trường',
    example: 'createdAt',
    enum: ['createdAt', 'updatedAt', 'expiresAt'],
  })
  @IsOptional()
  @IsString({ message: 'Trường sắp xếp phải là chuỗi' })
  sortBy?: string = 'createdAt';

  @ApiPropertyOptional({
    description: 'Thứ tự sắp xếp',
    example: 'desc',
    enum: ['asc', 'desc'],
  })
  @IsOptional()
  @IsString({ message: 'Thứ tự sắp xếp phải là chuỗi' })
  sortOrder?: 'asc' | 'desc' = 'desc';
}
