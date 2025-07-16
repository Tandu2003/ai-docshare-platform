// User role and permissions
export interface Role {
  id: string;
  name: string;
  permissions: string[];
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
