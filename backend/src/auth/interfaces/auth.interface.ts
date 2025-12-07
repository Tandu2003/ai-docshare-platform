export interface JwtPayload {
  sub: string; // User ID
  email: string;
  username: string;
  roleId: string;
  iat?: number;
  exp?: number;
}
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}
export interface AuthUser {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  roleId: string;
  isVerified: boolean;
  isActive: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  role: {
    id: string;
    name: string;
    permissions: any;
  };
}

export interface LoginResponse {
  user: Omit<AuthUser, 'role'> & {
    role: {
      name: string;
      permissions: string[];
    };
  };
  tokens: AuthTokens;
}
