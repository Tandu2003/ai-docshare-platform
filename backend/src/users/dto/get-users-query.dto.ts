import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export enum UserSortBy {
  CREATED_AT = 'createdAt',
  UPDATED_AT = 'updatedAt',
  LAST_LOGIN_AT = 'lastLoginAt',
  EMAIL = 'email',
  USERNAME = 'username',
  FIRST_NAME = 'firstName',
  LAST_NAME = 'lastName',
}

export enum UserSortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

export class GetUsersQueryDto {
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
    example: 10,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber({}, { message: 'Giới hạn phải là số' })
  @Min(1, { message: 'Giới hạn phải lớn hơn 0' })
  @Max(100, { message: 'Giới hạn không được quá 100' })
  limit?: number = 10;

  @ApiPropertyOptional({
    description: 'Tìm kiếm theo tên, email, username',
    example: 'john',
  })
  @IsOptional()
  @IsString({ message: 'Từ khóa tìm kiếm phải là chuỗi' })
  search?: string;

  @ApiPropertyOptional({
    description: 'Lọc theo vai trò',
    example: 'admin',
  })
  @IsOptional()
  @IsString({ message: 'Vai trò phải là chuỗi' })
  role?: string;

  @ApiPropertyOptional({
    description: 'Lọc theo trạng thái hoạt động',
    example: 'true',
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean({ message: 'Trạng thái hoạt động phải là boolean' })
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Lọc theo trạng thái xác thực',
    example: 'true',
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean({ message: 'Trạng thái xác thực phải là boolean' })
  isVerified?: boolean;

  @ApiPropertyOptional({
    description: 'Sắp xếp theo trường',
    enum: UserSortBy,
    example: UserSortBy.CREATED_AT,
  })
  @IsOptional()
  @IsEnum(UserSortBy, { message: 'Trường sắp xếp không hợp lệ' })
  sortBy?: UserSortBy = UserSortBy.CREATED_AT;

  @ApiPropertyOptional({
    description: 'Thứ tự sắp xếp',
    enum: UserSortOrder,
    example: UserSortOrder.DESC,
  })
  @IsOptional()
  @IsEnum(UserSortOrder, { message: 'Thứ tự sắp xếp không hợp lệ' })
  sortOrder?: UserSortOrder = UserSortOrder.DESC;
}
