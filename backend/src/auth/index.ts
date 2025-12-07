export { AuthService } from './auth.service';
export { RoleService } from './role.service';
// Controllers
export { AuthController } from './controllers/auth.controller';
export { RoleController } from './controllers/role.controller';
// Module
export { AuthModule } from './auth.module';
// Guards
export { JwtAuthGuard, OptionalJwtAuthGuard, AdminGuard } from './guards';
// Decorators
export { Public, IS_PUBLIC_KEY } from './decorators';

// Strategies
export { JwtStrategy } from './strategies';

export type {
  JwtPayload,
  AuthTokens,
  AuthUser,
  LoginResponse,
} from './interfaces';

// DTOs
export {
  RegisterDto,
  LoginDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  VerifyEmailDto,
  ResendVerificationDto,
  UpdateProfileDto,
  ChangePasswordDto,
} from './dto';

// Constants
export {
  JWT_ACCESS_TOKEN_EXPIRY,
  JWT_REFRESH_TOKEN_EXPIRY,
  PASSWORD_SALT_ROUNDS,
  MIN_PASSWORD_LENGTH,
  MAX_PASSWORD_LENGTH,
  VERIFICATION_TOKEN_LENGTH,
  VERIFICATION_TOKEN_EXPIRY_HOURS,
  RESET_TOKEN_LENGTH,
  RESET_TOKEN_EXPIRY_HOURS,
  AUTH_RATE_LIMITS,
  DEFAULT_ROLE_NAME,
  ADMIN_ROLE_NAME,
  ROLE_NAMES,
  AUTH_ERROR_MESSAGES,
  AUTH_SUCCESS_MESSAGES,
} from './constants';
export type { RoleName } from './constants';
