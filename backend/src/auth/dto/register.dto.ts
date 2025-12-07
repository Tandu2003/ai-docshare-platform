import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  @IsEmail({}, { message: 'Email phải là địa chỉ email hợp lệ' })
  @Transform(({ value }) => value?.toLowerCase().trim())
  email: string;
  @IsString({ message: 'Tên người dùng phải là chuỗi ký tự' })
  @IsNotEmpty({ message: 'Tên người dùng là bắt buộc' })
  @MinLength(3, { message: 'Tên người dùng phải có ít nhất 3 ký tự' })
  @MaxLength(30, { message: 'Tên người dùng không được vượt quá 30 ký tự' })
  @Matches(/^[a-zA-Z0-9_]+$/, {
    message: 'Tên người dùng chỉ có thể chứa chữ cái, số và dấu gạch dưới',
  })
  @Transform(({ value }) => value?.toLowerCase().trim())
  username: string;

  @IsString({ message: 'Mật khẩu phải là chuỗi ký tự' })
  @IsNotEmpty({ message: 'Mật khẩu là bắt buộc' })
  @MinLength(8, { message: 'Mật khẩu phải có ít nhất 8 ký tự' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
    message:
      'Mật khẩu phải chứa ít nhất một chữ hoa, một chữ thường, một số và một ký tự đặc biệt',
  })
  password: string;

  @IsString({ message: 'Tên phải là chuỗi ký tự' })
  @IsNotEmpty({ message: 'Tên là bắt buộc' })
  @MinLength(2, { message: 'Tên phải có ít nhất 2 ký tự' })
  @MaxLength(50, { message: 'Tên không được vượt quá 50 ký tự' })
  @Transform(({ value }) => value?.trim())
  firstName: string;

  @IsString({ message: 'Họ phải là chuỗi ký tự' })
  @IsNotEmpty({ message: 'Họ là bắt buộc' })
  @MinLength(2, { message: 'Họ phải có ít nhất 2 ký tự' })
  @MaxLength(50, { message: 'Họ không được vượt quá 50 ký tự' })
  @Transform(({ value }) => value?.trim())
  lastName: string;
}
