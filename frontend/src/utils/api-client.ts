import axios, {
  type AxiosInstance,
  type AxiosRequestConfig,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios';

import { API_CONFIG, HTTP_STATUS } from '@/config';
import type { ApiResponse } from '@/types/api.types';

// TokenManager is used for callback notifications to Redux store
// The actual token retrieval is done directly from Redux store for synchronization
class TokenManager {
  private static instance: TokenManager;
  private token: string | null = null;
  private setTokenCallback: ((token: string) => void) | null = null;
  private clearTokenCallback: (() => void) | null = null;

  private constructor() {}

  static getInstance(): TokenManager {
    if (!TokenManager.instance) {
      TokenManager.instance = new TokenManager();
    }
    return TokenManager.instance;
  }

  setToken(token: string): void {
    this.token = token;
    if (this.setTokenCallback) {
      this.setTokenCallback(token);
    }
  }

  getToken(): string | null {
    return this.token;
  }

  clearToken(): void {
    this.token = null;
    if (this.clearTokenCallback) {
      this.clearTokenCallback();
    }
  }

  setCallbacks(
    setToken: (token: string) => void,
    clearToken: () => void,
  ): void {
    this.setTokenCallback = setToken;
    this.clearTokenCallback = clearToken;
  }

  // Token is now accessed directly from Redux store via ApiClient.getTokenFromStore callback
}

class ApiClient {
  private client: AxiosInstance;
  private refreshPromise: Promise<string | null> | null = null;
  private tokenManager = TokenManager.getInstance();
  private getTokenFromStore: (() => string | null) | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: API_CONFIG.BASE_URL,
      timeout: API_CONFIG.TIMEOUT,
      withCredentials: true, // Important for httpOnly cookies
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // Request interceptor - Add auth token
    this.client.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        const token = this.getAccessToken();
        if (token && config.headers) {
          config.headers.Authorization = `Bearer ${token}`;

          // Debug log to verify token is being sent
          if (import.meta.env.DEV) {
            console.log(
              '[ApiClient] Sending request with token:',
              token.substring(0, 20) + '...',
            );
          }
        } else if (import.meta.env.DEV) {
          console.log('[ApiClient] Sending request without token');
        }
        return config;
      },
      error => Promise.reject(error),
    );

    // Response interceptor - Handle token refresh and error formatting
    this.client.interceptors.response.use(
      (response: AxiosResponse) => response,
      async error => {
        const originalRequest = error.config;

        if (
          error.response?.status === HTTP_STATUS.UNAUTHORIZED &&
          !originalRequest._retry &&
          this.getAccessToken()
        ) {
          originalRequest._retry = true;

          try {
            const newToken = await this.refreshToken();
            if (newToken && originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${newToken}`;
              return this.client(originalRequest);
            }
          } catch (refreshError) {
            this.handleAuthError();
            return Promise.reject(refreshError);
          }
        }

        // Extract error message from API response
        const apiError = this.extractErrorMessage(error);
        return Promise.reject(apiError);
      },
    );
  }

  private getAccessToken(): string | null {
    // Get token from Redux store if getter is available, otherwise fallback to TokenManager
    if (this.getTokenFromStore) {
      return this.getTokenFromStore();
    }
    return this.tokenManager.getToken();
  }

  private async refreshToken(): Promise<string | null> {
    // Prevent multiple refresh requests
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = this.performTokenRefresh();

    try {
      const token = await this.refreshPromise;
      return token;
    } finally {
      this.refreshPromise = null;
    }
  }

  private async performTokenRefresh(): Promise<string | null> {
    try {
      const response = await axios.post(
        `${API_CONFIG.BASE_URL}/auth/refresh`,
        {},
        { withCredentials: true },
      );

      const { data } = response.data as ApiResponse<{ accessToken: string }>;
      if (data?.accessToken) {
        // Update token in token manager (which will update Redux)
        this.tokenManager.setToken(data.accessToken);
        return data.accessToken;
      }

      return null;
    } catch (error) {
      this.handleAuthError();
      return null;
    }
  }

  private handleAuthError(): void {
    // Clear token in token manager (which will update Redux)
    this.tokenManager.clearToken();
    // Dispatch logout event
    window.dispatchEvent(new CustomEvent('auth:logout'));
  }

  private extractErrorMessage(error: any): Error {
    // Extract message from API response structure
    let message = 'Có lỗi xảy ra, vui lòng thử lại';

    if (error.response?.data) {
      const responseData = error.response.data;

      // Handle different response structures
      if (responseData.message) {
        message = responseData.message;
      } else if (responseData.error) {
        message = responseData.error;
      } else if (typeof responseData === 'string') {
        message = responseData;
      }
    } else if (error.message) {
      message = error.message;
    }

    const apiError = new Error(message);
    apiError.name = 'ApiError';
    return apiError;
  }

  // Public methods
  async get<T>(
    url: string,
    config?: AxiosRequestConfig,
  ): Promise<ApiResponse<T>> {
    const response = await this.client.get<ApiResponse<T>>(url, config);
    return response.data;
  }

  async post<T>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig,
  ): Promise<ApiResponse<T>> {
    const response = await this.client.post<ApiResponse<T>>(url, data, config);
    return response.data;
  }

  async put<T>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig,
  ): Promise<ApiResponse<T>> {
    const response = await this.client.put<ApiResponse<T>>(url, data, config);
    return response.data;
  }

  async patch<T>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig,
  ): Promise<ApiResponse<T>> {
    const response = await this.client.patch<ApiResponse<T>>(url, data, config);
    return response.data;
  }

  async delete<T>(
    url: string,
    config?: AxiosRequestConfig,
  ): Promise<ApiResponse<T>> {
    const response = await this.client.delete<ApiResponse<T>>(url, config);
    return response.data;
  }

  // Auth specific methods
  setAuthToken(token: string): void {
    // Set token in TokenManager to trigger Redux callback
    this.tokenManager.setToken(token);
  }

  clearAuth(): void {
    this.tokenManager.clearToken();
  }

  // Method to connect with Redux store
  connectToRedux(
    setTokenAction: (token: string) => void,
    clearTokenAction: () => void,
    getTokenFromStore: () => string | null,
  ): void {
    this.tokenManager.setCallbacks(setTokenAction, clearTokenAction);
    this.getTokenFromStore = getTokenFromStore;
  }

  // Note: Synchronization is now handled via the getTokenFromStore callback
  // passed to connectToRedux, so no manual sync method is needed

  // File upload method
  async uploadFile<T>(
    url: string,
    file: File,
    onUploadProgress?: (progressEvent: any) => void,
  ): Promise<ApiResponse<T>> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await this.client.post<ApiResponse<T>>(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress,
    });

    return response.data;
  }
}

// Export singleton instance
export const apiClient = new ApiClient();
export default apiClient;
