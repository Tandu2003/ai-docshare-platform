import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import { toast } from 'sonner';

import type { AuthState, LoginDto, RegisterDto, User } from '@/types';
import { authService } from '@/utils';

// Initial state - Don't set authenticated immediately, let initializeAuth handle it
const initialState: AuthState = {
  user: null,
  accessToken: null,
  isAuthenticated: false,
  isLoading: false,
};

// Async thunks
export const registerUser = createAsyncThunk(
  'auth/register',
  async (registerData: RegisterDto, { rejectWithValue }) => {
    try {
      const response = await authService.register(registerData);
      // Use message from API response if available
      const successMessage =
        response.message || 'Đăng ký thành công! Chào mừng bạn đến với DocShare AI!';
      toast.success(successMessage);
      // Navigate to dashboard will be handled by component
      return response;
    } catch (error: any) {
      // Error message is already extracted from API response in api-client
      toast.error(error.message);
      return rejectWithValue(error.message);
    }
  }
);

export const loginUser = createAsyncThunk(
  'auth/login',
  async (loginData: LoginDto, { rejectWithValue }) => {
    try {
      const response = await authService.login(loginData);
      // Use message from API response if available
      const successMessage = response.message || 'Đăng nhập thành công!';
      toast.success(successMessage);
      // Navigate to dashboard will be handled by component
      return response;
    } catch (error: any) {
      // Error message is already extracted from API response in api-client
      toast.error(error.message);
      return rejectWithValue(error.message);
    }
  }
);

export const logoutUser = createAsyncThunk('auth/logout', async (_, { rejectWithValue }) => {
  try {
    const response = await authService.logout();
    // Use message from API response or fallback
    const successMessage = response.message || 'Đăng xuất thành công!';
    toast.success(successMessage);
    return;
  } catch (error: any) {
    // Error message is already extracted from API response in api-client
    toast.error(error.message);
    return rejectWithValue(error.message);
  }
});

export const getCurrentUser = createAsyncThunk(
  'auth/getCurrentUser',
  async (_, { rejectWithValue }) => {
    try {
      const user = await authService.getCurrentUser();
      return user;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const refreshToken = createAsyncThunk(
  'auth/refreshToken',
  async (_, { rejectWithValue }) => {
    try {
      const token = await authService.refreshToken();
      return token;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const initializeAuth = createAsyncThunk(
  'auth/initializeAuth',
  async (_, { rejectWithValue }) => {
    try {
      const result = await authService.initializeAuth();
      if (result && result.user && result.token) {
        return { user: result.user, token: result.token };
      }
      return null;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

// Auth slice
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<User>) => {
      state.user = action.payload;
      state.isAuthenticated = true;
    },
    clearAuth: (state) => {
      state.user = null;
      state.accessToken = null;
      state.isAuthenticated = false;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    // Handle automatic logout from API client
    handleAutoLogout: (state) => {
      state.user = null;
      state.accessToken = null;
      state.isAuthenticated = false;
      toast.error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
    },
    // Set access token (for API client use)
    setAccessToken: (state, action: PayloadAction<string>) => {
      state.accessToken = action.payload;
      state.isAuthenticated = !!(state.accessToken && state.user);
    },
    // Clear access token (for API client use)
    clearAccessToken: (state) => {
      state.accessToken = null;
      state.isAuthenticated = false;
    },
  },
  extraReducers: (builder) => {
    // Register
    builder
      .addCase(registerUser.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(registerUser.fulfilled, (state, action) => {
        state.isLoading = false;
        if (action.payload && action.payload.user && action.payload.tokens) {
          state.user = action.payload.user as User;
          state.accessToken = action.payload.tokens.accessToken;
          state.isAuthenticated = true;
        }
      })
      .addCase(registerUser.rejected, (state) => {
        state.isLoading = false;
      });

    // Login
    builder
      .addCase(loginUser.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.isLoading = false;
        if (action.payload && action.payload.user && action.payload.tokens) {
          state.user = action.payload.user as User;
          state.accessToken = action.payload.tokens.accessToken;
          state.isAuthenticated = true;
        }
      })
      .addCase(loginUser.rejected, (state) => {
        state.isLoading = false;
      });

    // Logout
    builder
      .addCase(logoutUser.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(logoutUser.fulfilled, (state) => {
        state.isLoading = false;
        state.user = null;
        state.accessToken = null;
        state.isAuthenticated = false;
      })
      .addCase(logoutUser.rejected, (state) => {
        state.isLoading = false;
        // Still clear auth data even if logout request failed
        state.user = null;
        state.accessToken = null;
        state.isAuthenticated = false;
      });

    // Get current user
    builder
      .addCase(getCurrentUser.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(getCurrentUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload;
        state.isAuthenticated = true;
      })
      .addCase(getCurrentUser.rejected, (state) => {
        state.isLoading = false;
        // Clear auth on user fetch failure
        state.user = null;
        state.accessToken = null;
        state.isAuthenticated = false;
      });

    // Refresh token
    builder
      .addCase(refreshToken.fulfilled, (state, action) => {
        state.accessToken = action.payload;
        state.isAuthenticated = !!(state.accessToken && state.user);
      })
      .addCase(refreshToken.rejected, (state) => {
        // Clear auth on token refresh failure
        state.user = null;
        state.accessToken = null;
        state.isAuthenticated = false;
      });

    // Initialize auth
    builder
      .addCase(initializeAuth.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(initializeAuth.fulfilled, (state, action) => {
        state.isLoading = false;
        if (action.payload) {
          state.user = action.payload.user;
          state.accessToken = action.payload.token;
          state.isAuthenticated = true;
        } else {
          state.user = null;
          state.accessToken = null;
          state.isAuthenticated = false;
        }
      })
      .addCase(initializeAuth.rejected, (state) => {
        state.isLoading = false;
        state.user = null;
        state.accessToken = null;
        state.isAuthenticated = false;
      });
  },
});

// Export actions
export const {
  setUser,
  clearAuth,
  setLoading,
  handleAutoLogout,
  setAccessToken,
  clearAccessToken,
} = authSlice.actions;

// Export reducer
export default authSlice.reducer;

// Selectors
export const selectAuth = (state: { auth: AuthState }) => state.auth;
export const selectUser = (state: { auth: AuthState }) => state.auth.user;
export const selectIsAuthenticated = (state: { auth: AuthState }) => state.auth.isAuthenticated;
export const selectIsLoading = (state: { auth: AuthState }) => state.auth.isLoading;
export const selectAccessToken = (state: { auth: AuthState }) => state.auth.accessToken;
