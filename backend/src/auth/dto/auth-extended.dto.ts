import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class ForgotPasswordDto {
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  email: string;
}

export class ResetPasswordDto {
  @IsString({ message: 'Reset token must be a string' })
  @IsNotEmpty({ message: 'Reset token is required' })
  token: string;

  @IsString({ message: 'Password must be a string' })
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @IsNotEmpty({ message: 'Password is required' })
  password: string;
}

export class VerifyEmailDto {
  @IsString({ message: 'Verification token must be a string' })
  @IsNotEmpty({ message: 'Verification token is required' })
  token: string;
}

export class ResendVerificationDto {
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  email: string;
}
