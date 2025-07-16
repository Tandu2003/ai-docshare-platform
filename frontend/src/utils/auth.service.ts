import { API_ENDPOINTS, STORAGE_KEYS } from '../config';
import type { LoginDto, LoginResponse, RegisterDto, User } from '../types';
import { apiClient } from '../utils/api-client';

class AuthService {
  /**
   * Register a new user
   */
  async register(registerData: RegisterDto): Promise<LoginResponse> {
    const response = await apiClient.post<{ user: any; accessToken: string }>(
      API_ENDPOINTS.AUTH.REGISTER,
      registerData
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
      loginData
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
      console.warn('Logout request failed:', error);
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

  /**
   * Refresh access token
   */
  async refreshToken(): Promise<string> {
    try {
      const response = await apiClient.post<{ accessToken: string }>(API_ENDPOINTS.AUTH.REFRESH);

      if (response.success && response.data?.accessToken) {
        this.setAccessToken(response.data.accessToken);
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
   * Try to refresh token if no access token but user data exists
   */
  async initializeAuth(): Promise<boolean> {
    const accessToken = this.getAccessToken();
    const userData = this.getUserData();

    // If we have both token and user data, we're authenticated
    if (accessToken && userData) {
      return true;
    }

    // If we have user data but no token, try to refresh
    if (userData && !accessToken) {
      try {
        await this.refreshToken();
        return true;
      } catch (error) {
        // Refresh failed, clear auth data
        this.clearAuthData();
        return false;
      }
    }

    // No user data, not authenticated
    return false;
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    const token = this.getAccessToken();
    const user = this.getUserData();
    return !!(token && user);
  }

  /**
   * Get stored access token
   */
  getAccessToken(): string | null {
    return localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
  }

  /**
   * Get stored user data
   */
  getUserData(): User | null {
    try {
      const userData = localStorage.getItem(STORAGE_KEYS.USER);
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.error('Error parsing user data:', error);
      return null;
    }
  }

  /**
   * Check if user has specific permission
   */
  hasPermission(permission: string): boolean {
    const user = this.getUserData();
    if (!user?.role?.permissions) return false;

    return user.role.permissions.includes(permission);
  }

  /**
   * Check if user has specific role
   */
  hasRole(roleName: string): boolean {
    const user = this.getUserData();
    return user?.role?.name === roleName;
  }

  // Private helper methods

  private handleAuthSuccess(authData: LoginResponse): void {
    if (authData.tokens?.accessToken) {
      this.setAccessToken(authData.tokens.accessToken);
    }

    if (authData.user) {
      this.setUserData(authData.user as User);
    }

    // Set token in API client
    apiClient.setAuthToken(authData.tokens?.accessToken || '');
  }

  private setAccessToken(token: string): void {
    localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, token);
  }

  private setUserData(user: User): void {
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
  }

  private clearAuthData(): void {
    localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.USER);
    apiClient.clearAuth();
  }

  private handleAuthError(error: any): Error {
    // Clear auth data on auth errors
    if (error.response?.status === 401) {
      this.clearAuthData();
    }

    // Extract error message
    const message =
      error.response?.data?.message || error.message || 'An unexpected error occurred';

    return new Error(message);
  }
}

// Export singleton instance
export const authService = new AuthService();
export default authService;
