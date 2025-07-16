import axios from 'axios';
import type {
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from 'axios';

import { API_CONFIG, HTTP_STATUS, STORAGE_KEYS } from '../config';
import type { ApiResponse } from '../types';

class ApiClient {
  private client: AxiosInstance;
  private refreshPromise: Promise<string | null> | null = null;

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
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor - Handle token refresh and error formatting
    this.client.interceptors.response.use(
      (response: AxiosResponse) => response,
      async (error) => {
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
      }
    );
  }

  private getAccessToken(): string | null {
    return localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
  }

  private setAccessToken(token: string): void {
    localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, token);
  }

  private removeAccessToken(): void {
    localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
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
        { withCredentials: true }
      );

      const { data } = response.data as ApiResponse<{ accessToken: string }>;
      if (data?.accessToken) {
        this.setAccessToken(data.accessToken);
        return data.accessToken;
      }

      return null;
    } catch (error) {
      this.handleAuthError();
      return null;
    }
  }

  private handleAuthError(): void {
    this.removeAccessToken();
    localStorage.removeItem(STORAGE_KEYS.USER);
    // Dispatch logout action or redirect to login
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
  async get<T>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.client.get<ApiResponse<T>>(url, config);
    return response.data;
  }

  async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.client.post<ApiResponse<T>>(url, data, config);
    return response.data;
  }

  async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.client.put<ApiResponse<T>>(url, data, config);
    return response.data;
  }

  async patch<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.client.patch<ApiResponse<T>>(url, data, config);
    return response.data;
  }

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.client.delete<ApiResponse<T>>(url, config);
    return response.data;
  }

  // Auth specific methods
  setAuthToken(token: string): void {
    this.setAccessToken(token);
  }

  clearAuth(): void {
    this.removeAccessToken();
  }

  // File upload method
  async uploadFile<T>(
    url: string,
    file: File,
    onUploadProgress?: (progressEvent: any) => void
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
