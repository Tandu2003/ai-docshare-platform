// User role and permissions
export interface Permission {
  action:
    | 'create'
    | 'read'
    | 'update'
    | 'delete'
    | 'manage'
    | 'approve'
    | 'moderate'
    | 'upload'
    | 'download'
    | 'comment'
    | 'rate'
    | 'bookmark'
    | 'share';
  subject:
    | 'User'
    | 'Document'
    | 'File'
    | 'Category'
    | 'Comment'
    | 'Rating'
    | 'Bookmark'
    | 'Notification'
    | 'SystemSetting'
    | 'all';
  conditions?: Record<string, any>;
}

export interface Role {
  id: string;
  name: string;
  description: string;
  permissions: Permission[];
}

// User interface
export interface User {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  bio?: string;
  website?: string;
  location?: string;
  roleId: string;
  isVerified: boolean;
  isActive: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  role: Role;
}

// Auth DTOs
export interface RegisterDto {
  email: string;
  username: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface LoginDto {
  emailOrUsername: string;
  password: string;
}

export interface ForgotPasswordDto {
  email: string;
}

export interface ResetPasswordDto {
  token: string;
  password: string;
}

export interface VerifyEmailDto {
  token: string;
}

export interface ResendVerificationDto {
  email: string;
}

// Auth Tokens
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

// Login Response
export interface LoginResponse {
  user: Omit<User, 'role'> & {
    role: {
      name: string;
      description: string;
      permissions: string[];
    };
  };
  tokens: AuthTokens;
  message?: string; // Message from API response
}

// Auth State
export interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}
