import axios, {
  type AxiosInstance,
  type AxiosRequestConfig,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios';

import { API_CONFIG, HTTP_STATUS } from '@/config';
import type { ApiResponse } from '@/types/api.types';

import { TokenManager } from './token-manager';

class ApiClient {
  private client: AxiosInstance;
  private refreshPromise: Promise<string | null> | null = null;
  private tokenManager = TokenManager.getInstance();
  private getTokenFromStore: (() => string | null) | null = null;
  constructor() {
    this.client = axios.create({
      baseURL: API_CONFIG.BASE_URL,
      timeout: API_CONFIG.TIMEOUT,
      withCredentials: true,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    this.client.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        const token = this.getAccessToken();
        if (token && config.headers) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      error => Promise.reject(error),
    );

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

        const apiError = this.extractErrorMessage(error);
        return Promise.reject(apiError);
      },
    );
  }

  private getAccessToken(): string | null {
    if (this.getTokenFromStore) {
      return this.getTokenFromStore();
    }
    return this.tokenManager.getToken();
  }

  private async refreshToken(): Promise<string | null> {
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
        this.tokenManager.setToken(data.accessToken);
        return data.accessToken;
      }

      return null;
    } catch {
      this.handleAuthError();
      return null;
    }
  }

  private handleAuthError(): void {
    this.tokenManager.clearToken();

    const currentPath = window.location.pathname + window.location.search;
    const callbackUrl = encodeURIComponent(currentPath);

    const isAuthPage =
      currentPath.startsWith('/auth/') ||
      currentPath.startsWith('/login') ||
      currentPath.startsWith('/register');

    if (!isAuthPage) {
      window.location.href = `/auth/login?callback=${callbackUrl}`;
    }

    window.dispatchEvent(new CustomEvent('auth:logout'));
  }

  private extractErrorMessage(error: unknown): Error {
    let message = 'Có lỗi xảy ra, vui lòng thử lại';

    if (
      error &&
      typeof error === 'object' &&
      'response' in error &&
      error.response &&
      typeof error.response === 'object' &&
      'data' in error.response
    ) {
      const responseData = error.response.data as {
        message?: string;
        error?: string;
      };

      if (responseData.message) {
        message = responseData.message;
      } else if (responseData.error) {
        message = responseData.error;
      } else if (typeof responseData === 'string') {
        message = responseData;
      }
    } else if (
      error &&
      typeof error === 'object' &&
      'message' in error &&
      typeof error.message === 'string'
    ) {
      message = error.message;
    }

    const apiError = new Error(message);
    apiError.name = 'ApiError';
    return apiError;
  }

  async get<T>(
    url: string,
    config?: AxiosRequestConfig,
  ): Promise<ApiResponse<T>> {
    const response = await this.client.get<ApiResponse<T>>(url, config);
    return response.data;
  }

  async post<T>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig,
  ): Promise<ApiResponse<T>> {
    const response = await this.client.post<ApiResponse<T>>(url, data, config);
    return response.data;
  }

  async put<T>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig,
  ): Promise<ApiResponse<T>> {
    const response = await this.client.put<ApiResponse<T>>(url, data, config);
    return response.data;
  }

  async patch<T>(
    url: string,
    data?: unknown,
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

  setAuthToken(token: string): void {
    this.tokenManager.setToken(token);
  }

  clearAuth(): void {
    this.tokenManager.clearToken();
  }

  connectToRedux(
    setTokenAction: (token: string) => void,
    clearTokenAction: () => void,
    getTokenFromStore: () => string | null,
  ): void {
    this.tokenManager.setCallbacks(setTokenAction, clearTokenAction);
    this.getTokenFromStore = getTokenFromStore;
  }

  async uploadFile<T>(
    url: string,
    file: File,
    onUploadProgress?: (progressEvent: unknown) => void,
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

export const apiClient = new ApiClient();
