import { API_ENDPOINTS } from '@/config';
import type { AppStore } from '@/store';
import type {
  ForgotPasswordDto,
  LoginDto,
  LoginResponse,
  RegisterDto,
  ResendVerificationDto,
  ResetPasswordDto,
  User,
  VerifyEmailDto,
} from '@/types';
import { apiClient } from '@/utils/api-client';

// We need to access the store to get the access token
// This is a simple way to access the store from outside React components
let store: AppStore | null = null;

export const setStore = (reduxStore: AppStore): void => {
  store = reduxStore;
};

class AuthService {
  private userData: User | null = null;

  /**
   * Register a new user
   */
  async register(registerData: RegisterDto): Promise<LoginResponse> {
    const response = await apiClient.post<{ user: any; accessToken: string }>(
      API_ENDPOINTS.AUTH.REGISTER,
      registerData,
    );

    if (response.success && response.data) {
      // Transform backend response to match frontend interface
      const loginResponse: LoginResponse = {
        user: response.data.user,
        tokens: {
          accessToken: response.data.accessToken,
          refreshToken: '', // Backend uses httpOnly cookies for refresh
        },
        message: response.message, // Include message from API response
      };

      this.handleAuthSuccess(loginResponse);
      return loginResponse;
    }

    throw new Error(response.message || 'Registration failed');
  }

  /**
   * Login user
   */
  async login(loginData: LoginDto): Promise<LoginResponse> {
    const response = await apiClient.post<{ user: any; accessToken: string }>(
      API_ENDPOINTS.AUTH.LOGIN,
      loginData,
    );

    if (response.success && response.data) {
      // Transform backend response to match frontend interface
      const loginResponse: LoginResponse = {
        user: response.data.user,
        tokens: {
          accessToken: response.data.accessToken,
          refreshToken: '', // Backend uses httpOnly cookies for refresh
        },
        message: response.message, // Include message from API response
      };

      this.handleAuthSuccess(loginResponse);
      return loginResponse;
    }

    throw new Error(response.message || 'Login failed');
  }

  /**
   * Logout user
   */
  async logout(): Promise<{ message?: string }> {
    try {
      const response = await apiClient.post(API_ENDPOINTS.AUTH.LOGOUT);
      return { message: response.message };
    } catch (error) {
      // Continue with logout even if server request fails
      return { message: 'Đăng xuất thành công!' }; // Fallback message
    } finally {
      this.clearAuthData();
    }
  }

  /**
   * Get current user profile
   */
  async getCurrentUser(): Promise<User> {
    try {
      if (import.meta.env.DEV) {
        const currentToken = this.getAccessToken();
          '[AuthService] getCurrentUser - Current token from store:',
          currentToken ? currentToken.substring(0, 20) + '...' : 'null',
        );
      }

      const response = await apiClient.get<User>(API_ENDPOINTS.AUTH.ME);

      if (response.success && response.data) {
        // Update stored user data
        this.setUserData(response.data);
        return response.data;
      }

      throw new Error(response.message || 'Failed to get user profile');
    } catch (error: any) {
      if (import.meta.env.DEV) {
      }
      throw this.handleAuthError(error);
    }
  }

  /**
   * Refresh access token
   */
  async refreshToken(): Promise<string> {
    try {
      const response = await apiClient.post<{ accessToken: string }>(
        API_ENDPOINTS.AUTH.REFRESH,
      );

      if (response.success && response.data?.accessToken) {
        // Set token in API client which will trigger Redux update
        apiClient.setAuthToken(response.data.accessToken);

        if (import.meta.env.DEV) {
            '[AuthService] refreshToken - Set new token:',
            response.data.accessToken.substring(0, 20) + '...',
          );
        }

        return response.data.accessToken;
      }

      throw new Error('Token refresh failed');
    } catch (error: any) {
      this.clearAuthData();
      throw this.handleAuthError(error);
    }
  }

  /**
   * Initialize authentication state on app startup
   * Always try to refresh token first to validate session
   */
  async initializeAuth(): Promise<{ user: User; token: string } | null> {
    try {
      // Always try to refresh token first to validate current session
      const newToken = await this.refreshToken();

      if (import.meta.env.DEV) {
          '[AuthService] Refresh token result:',
          newToken ? newToken.substring(0, 20) + '...' : 'null',
        );
      }

      if (newToken) {
        // Small delay to ensure token is properly set in Redux store and synced to ApiClient
        await new Promise(resolve => setTimeout(resolve, 100));

        // If refresh successful, get current user data
        const user = await this.getCurrentUser();
        this.setUserData(user);

        return { user, token: newToken };
      }

      return null;
    } catch (error) {
      if (import.meta.env.DEV) {
      }
      // Refresh failed, clear any stale data
      this.clearAuthData();
      return null;
    }
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!this.userData;
  }

  /**
   * Get stored access token (from Redux store)
   */
  getAccessToken(): string | null {
    if (store) {
      return store.getState().auth.accessToken ?? null;
    }
    return null;
  }

  /**
   * Get stored user data (from memory)
   */
  getUserData(): User | null {
    return this.userData;
  }

  /**
   * Clear auth data (public method for API client)
   */
  clearAuthData(): void {
    this.userData = null;
    apiClient.clearAuth();
  }

  /**
   * Check if user has specific permission
   */
  hasPermission(permission: string): boolean {
    const user = this.getUserData();
    if (!user?.role?.permissions) return false;

    return user.role.permissions.some(p => p.action === permission);
  }

  /**
   * Check if user has specific role
   */
  hasRole(roleName: string): boolean {
    const user = this.getUserData();
    return user?.role?.name === roleName;
  }

  /**
   * Forgot password - Send reset password email
   */
  async forgotPassword(
    forgotPasswordData: ForgotPasswordDto,
  ): Promise<{ message: string }> {
    try {
      const response = await apiClient.post(
        API_ENDPOINTS.AUTH.FORGOT_PASSWORD,
        forgotPasswordData,
      );

      if (response.success) {
        return {
          message: response.message || 'Password reset instructions sent',
        };
      }

      throw new Error(
        response.message || 'Failed to send password reset email',
      );
    } catch (error: any) {
      throw this.handleAuthError(error);
    }
  }

  /**
   * Reset password with token
   */
  async resetPassword(
    resetPasswordData: ResetPasswordDto,
  ): Promise<{ message: string }> {
    try {
      const response = await apiClient.post(
        API_ENDPOINTS.AUTH.RESET_PASSWORD,
        resetPasswordData,
      );

      if (response.success) {
        return { message: response.message || 'Password reset successfully' };
      }

      throw new Error(response.message || 'Failed to reset password');
    } catch (error: any) {
      throw this.handleAuthError(error);
    }
  }

  /**
   * Verify email with token
   */
  async verifyEmail(
    verifyEmailData: VerifyEmailDto,
  ): Promise<{ message: string }> {
    try {
      const response = await apiClient.post(
        API_ENDPOINTS.AUTH.VERIFY_EMAIL,
        verifyEmailData,
      );

      if (response.success) {
        return { message: response.message || 'Email verified successfully' };
      }

      throw new Error(response.message || 'Failed to verify email');
    } catch (error: any) {
      throw this.handleAuthError(error);
    }
  }

  /**
   * Resend verification email
   */
  async resendVerification(
    resendData: ResendVerificationDto,
  ): Promise<{ message: string }> {
    try {
      const response = await apiClient.post(
        API_ENDPOINTS.AUTH.RESEND_VERIFICATION,
        resendData,
      );

      if (response.success) {
        return { message: response.message || 'Verification email sent' };
      }

      throw new Error(response.message || 'Failed to send verification email');
    } catch (error: any) {
      throw this.handleAuthError(error);
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(profileData: {
    email?: string;
    firstName?: string;
    lastName?: string;
    avatar?: string;
    bio?: string;
    website?: string;
    location?: string;
  }): Promise<User> {
    try {
      const response = await apiClient.patch<User>(
        API_ENDPOINTS.AUTH.UPDATE_PROFILE,
        profileData,
      );

      if (response.success && response.data) {
        // Update stored user data
        this.setUserData(response.data);
        return response.data;
      }

      throw new Error(response.message || 'Failed to update profile');
    } catch (error: any) {
      throw this.handleAuthError(error);
    }
  }

  /**
   * Change password
   */
  async changePassword(passwordData: {
    currentPassword: string;
    newPassword: string;
  }): Promise<{ message: string }> {
    try {
      const response = await apiClient.patch(
        API_ENDPOINTS.AUTH.CHANGE_PASSWORD,
        passwordData,
      );

      if (response.success) {
        return { message: response.message || 'Password changed successfully' };
      }

      throw new Error(response.message || 'Failed to change password');
    } catch (error: any) {
      throw this.handleAuthError(error);
    }
  }

  // Private helper methods

  private handleAuthSuccess(authData: LoginResponse): void {
    if (authData.user) {
      this.setUserData(authData.user as unknown as User);
    }

    // Token will be set in Redux store by API client
    if (authData.tokens?.accessToken) {
      apiClient.setAuthToken(authData.tokens.accessToken);
    }
  }

  private setUserData(user: User): void {
    this.userData = user;
  }

  private handleAuthError(error: any): Error {
    // Clear auth data on auth errors
    if (error.response?.status === 401) {
      this.clearAuthData();
    }

    // Extract error message
    const message =
      error.response?.data?.message ||
      error.message ||
      'An unexpected error occurred';

    return new Error(message);
  }
}

// Export singleton instance
export const authService = new AuthService();
