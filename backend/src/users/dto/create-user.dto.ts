import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator'

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class CreateUserDto {
  @ApiProperty({
    description: 'Email của người dùng',
    example: 'user@example.com',
  })
  @IsEmail({}, { message: 'Email không hợp lệ' })
  email: string;

  @ApiProperty({
    description: 'Tên đăng nhập',
    example: 'johndoe',
    minLength: 3,
    maxLength: 30,
  })
  @IsString({ message: 'Tên đăng nhập phải là chuỗi' })
  @MinLength(3, { message: 'Tên đăng nhập phải có ít nhất 3 ký tự' })
  @MaxLength(30, { message: 'Tên đăng nhập không được quá 30 ký tự' })
  username: string;

  @ApiProperty({
    description: 'Mật khẩu',
    example: 'password123',
    minLength: 6,
  })
  @IsString({ message: 'Mật khẩu phải là chuỗi' })
  @MinLength(6, { message: 'Mật khẩu phải có ít nhất 6 ký tự' })
  password: string;

  @ApiProperty({
    description: 'Tên',
    example: 'John',
  })
  @IsString({ message: 'Tên phải là chuỗi' })
  @MinLength(1, { message: 'Tên không được để trống' })
  @MaxLength(50, { message: 'Tên không được quá 50 ký tự' })
  firstName: string;

  @ApiProperty({
    description: 'Họ',
    example: 'Doe',
  })
  @IsString({ message: 'Họ phải là chuỗi' })
  @MinLength(1, { message: 'Họ không được để trống' })
  @MaxLength(50, { message: 'Họ không được quá 50 ký tự' })
  lastName: string;

  @ApiPropertyOptional({
    description: 'URL ảnh đại diện',
    example: 'https://example.com/avatar.jpg',
  })
  @IsOptional()
  @IsString({ message: 'URL ảnh đại diện phải là chuỗi' })
  avatar?: string;

  @ApiPropertyOptional({
    description: 'Tiểu sử',
    example: 'Software Developer',
    maxLength: 500,
  })
  @IsOptional()
  @IsString({ message: 'Tiểu sử phải là chuỗi' })
  @MaxLength(500, { message: 'Tiểu sử không được quá 500 ký tự' })
  bio?: string;

  @ApiProperty({
    description: 'ID vai trò',
    example: 'clr1234567890',
  })
  @IsString({ message: 'ID vai trò phải là chuỗi' })
  roleId: string;

  @ApiPropertyOptional({
    description: 'Trạng thái xác thực email',
    example: false,
    default: false,
  })
  @IsOptional()
  isVerified?: boolean;

  @ApiPropertyOptional({
    description: 'Trạng thái hoạt động',
    example: true,
    default: true,
  })
  @IsOptional()
  isActive?: boolean;
}
