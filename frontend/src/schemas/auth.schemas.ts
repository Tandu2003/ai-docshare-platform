import { z } from 'zod';

// Register schema
export const registerSchema = z
  .object({
    email: z
      .string()
      .min(1, 'Email là bắt buộc')
      .email('Vui lòng nhập địa chỉ email hợp lệ')
      .toLowerCase()
      .trim(),
    username: z
      .string()
      .min(3, 'Tên người dùng phải có ít nhất 3 ký tự')
      .max(30, 'Tên người dùng không được vượt quá 30 ký tự')
      .regex(
        /^[a-zA-Z0-9_]+$/,
        'Tên người dùng chỉ có thể chứa chữ cái, số và dấu gạch dưới',
      )
      .toLowerCase()
      .trim(),

    password: z
      .string()
      .min(8, 'Mật khẩu phải có ít nhất 8 ký tự')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
        'Mật khẩu phải chứa ít nhất một chữ cái viết hoa, một chữ cái viết thường, một số và một ký tự đặc biệt',
      ),

    confirmPassword: z.string().min(1, 'Vui lòng xác nhận mật khẩu của bạn'),

    firstName: z
      .string()
      .min(2, 'Tên phải có ít nhất 2 ký tự')
      .max(50, 'Tên không được vượt quá 50 ký tự')
      .trim(),

    lastName: z
      .string()
      .min(2, 'Họ phải có ít nhất 2 ký tự')
      .max(50, 'Họ không được vượt quá 50 ký tự')
      .trim(),
  })
  .refine(data => data.password === data.confirmPassword, {
    message: 'Mật khẩu không khớp',
    path: ['confirmPassword'],
  });

// Login schema
export const loginSchema = z.object({
  emailOrUsername: z
    .string()
    .min(1, 'Email hoặc tên người dùng là bắt buộc')
    .toLowerCase()
    .trim(),

  password: z.string().min(1, 'Mật khẩu là bắt buộc'),
});

// Profile update schema
export const updateProfileSchema = z.object({
  firstName: z
    .string()
    .min(2, 'Tên phải có ít nhất 2 ký tự')
    .max(50, 'Tên không được vượt quá 50 ký tự')
    .trim(),

  lastName: z
    .string()
    .min(2, 'Họ phải có ít nhất 2 ký tự')
    .max(50, 'Họ không được vượt quá 50 ký tự')
    .trim(),

  bio: z.string().max(500, 'Tiểu sử không được vượt quá 500 ký tự').optional(),
});

// Change password schema
export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Mật khẩu hiện tại là bắt buộc'),

    newPassword: z
      .string()
      .min(8, 'Mật khẩu phải có ít nhất 8 ký tự')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
        'Mật khẩu phải chứa ít nhất một chữ cái viết hoa, một chữ cái viết thường, một số và một ký tự đặc biệt',
      ),

    confirmNewPassword: z
      .string()
      .min(1, 'Vui lòng xác nhận mật khẩu mới của bạn'),
  })
  .refine(data => data.newPassword === data.confirmNewPassword, {
    message: 'Mật khẩu không khớp',
    path: ['confirmNewPassword'],
  });

// Forgot password schema
export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, 'Email là bắt buộc')
    .email('Vui lòng nhập địa chỉ email hợp lệ')
    .toLowerCase()
    .trim(),
});

// Reset password schema
export const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, 'Mật khẩu phải có ít nhất 8 ký tự')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
        'Mật khẩu phải chứa ít nhất một chữ cái viết hoa, một chữ cái viết thường, một số và một ký tự đặc biệt',
      ),

    confirmPassword: z.string().min(1, 'Vui lòng xác nhận mật khẩu của bạn'),
  })
  .refine(data => data.password === data.confirmPassword, {
    message: 'Mật khẩu không khớp',
    path: ['confirmPassword'],
  });

// Verify email schema
export const verifyEmailSchema = z.object({
  token: z.string().min(1, 'Mã xác minh là bắt buộc'),
});

// Resend verification schema
export const resendVerificationSchema = z.object({
  email: z
    .string()
    .min(1, 'Email là bắt buộc')
    .email('Vui lòng nhập địa chỉ email hợp lệ')
    .toLowerCase()
    .trim(),
});

// Type exports
export type RegisterFormData = z.infer<typeof registerSchema>;
export type LoginFormData = z.infer<typeof loginSchema>;
export type UpdateProfileFormData = z.infer<typeof updateProfileSchema>;
export type ChangePasswordFormData = z.infer<typeof changePasswordSchema>;
export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;
export type VerifyEmailFormData = z.infer<typeof verifyEmailSchema>;
export type ResendVerificationFormData = z.infer<
  typeof resendVerificationSchema
>;
