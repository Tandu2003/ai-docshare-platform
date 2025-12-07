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

  async getCurrentUser(): Promise<User> {
    try {
      const response = await apiClient.get<User>(API_ENDPOINTS.AUTH.ME);

      if (response.success && response.data) {
        // Update stored user data
        this.setUserData(response.data);
        return response.data;
      }

      throw new Error(response.message || 'Failed to get user profile');
    } catch (error: any) {
      throw this.handleAuthError(error);
    }
  }

  async refreshToken(): Promise<string> {
    try {
      const response = await apiClient.post<{ accessToken: string }>(
        API_ENDPOINTS.AUTH.REFRESH,
      );

      if (response.success && response.data?.accessToken) {
        // Set token in API client which will trigger Redux update
        apiClient.setAuthToken(response.data.accessToken);

        return response.data.accessToken;
      }

      throw new Error('Token refresh failed');
    } catch (error: any) {
      this.clearAuthData();
      throw this.handleAuthError(error);
    }
  }

  async initializeAuth(): Promise<{ user: User; token: string } | null> {
    try {
      // Always try to refresh token first to validate current session
      const newToken = await this.refreshToken();

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
      // Refresh failed, clear any stale data
      this.clearAuthData();
      return null;
    }
  }

  isAuthenticated(): boolean {
    return !!this.userData;
  }

  getAccessToken(): string | null {
    if (store) {
      return store.getState().auth.accessToken ?? null;
    }
    return null;
  }

  getUserData(): User | null {
    return this.userData;
  }

  clearAuthData(): void {
    this.userData = null;
    apiClient.clearAuth();
  }

  hasPermission(permission: string): boolean {
    const user = this.getUserData();
    if (!user?.role?.permissions) return false;

    return user.role.permissions.some(p => p.action === permission);
  }

  hasRole(roleName: string): boolean {
    const user = this.getUserData();
    return user?.role?.name === roleName;
  }

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
