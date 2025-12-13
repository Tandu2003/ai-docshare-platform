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

export class GetCommentsQueryDto {
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
    description: 'Tìm kiếm theo nội dung bình luận',
    example: 'tài liệu',
  })
  @IsOptional()
  @IsString({ message: 'Từ khóa tìm kiếm phải là chuỗi' })
  search?: string;

  @ApiPropertyOptional({
    description: 'Lọc theo ID tài liệu',
    example: 'clx123456',
  })
  @IsOptional()
  @IsString({ message: 'ID tài liệu phải là chuỗi' })
  documentId?: string;

  @ApiPropertyOptional({
    description: 'Lọc theo ID người dùng',
    example: 'clx123456',
  })
  @IsOptional()
  @IsString({ message: 'ID người dùng phải là chuỗi' })
  userId?: string;

  @ApiPropertyOptional({
    description: 'Lọc theo trạng thái xóa',
    example: 'false',
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean({ message: 'Trạng thái xóa phải là boolean' })
  isDeleted?: boolean;

  @ApiPropertyOptional({
    description: 'Sắp xếp theo trường',
    example: 'createdAt',
    enum: ['createdAt', 'updatedAt', 'likesCount'],
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
