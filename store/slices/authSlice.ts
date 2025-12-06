import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { apiClient } from '@/lib/api-client';
import { API_ENDPOINTS, STORAGE_KEYS } from '@/lib/constants';

interface User {
  id: string;
  email: string;
  authType: 'email' | 'google';
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  rememberMe: boolean;
}

const loadPersistedState = (): Partial<AuthState> => {
  if (typeof window === 'undefined') {
    return {
      user: null,
      token: null,
      isAuthenticated: false,
      rememberMe: false,
    };
  }

  const rememberMe = localStorage.getItem(STORAGE_KEYS.REMEMBER_ME) === 'true';
  const storage = rememberMe ? localStorage : sessionStorage;

  const userStr = storage.getItem(STORAGE_KEYS.AUTH_USER);
  const token = storage.getItem(STORAGE_KEYS.AUTH_TOKEN);

  if (userStr && token) {
    try {
      const user = JSON.parse(userStr);
      return { user, token, isAuthenticated: true, rememberMe };
    } catch {
      return { user: null, token: null, isAuthenticated: false, rememberMe };
    }
  }

  return { user: null, token: null, isAuthenticated: false, rememberMe };
};

const initialState: AuthState = {
  user: null,
  token: null,
  isLoading: false,
  isAuthenticated: false,
  rememberMe: false,
};

const saveAuthState = (
  user: User | null,
  token: string | null,
  rememberMe: boolean
) => {
  if (typeof window === 'undefined') return;

  const storage = rememberMe ? localStorage : sessionStorage;

  if (user && token) {
    storage.setItem(STORAGE_KEYS.AUTH_USER, JSON.stringify(user));
    storage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
    if (rememberMe) {
      localStorage.setItem(STORAGE_KEYS.REMEMBER_ME, 'true');
    } else {
      localStorage.removeItem(STORAGE_KEYS.REMEMBER_ME);
    }
  } else {
    storage.removeItem(STORAGE_KEYS.AUTH_USER);
    storage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.REMEMBER_ME);
  }
};

const clearAuthState = () => {
  if (typeof window === 'undefined') return;

  localStorage.removeItem(STORAGE_KEYS.AUTH_USER);
  localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
  localStorage.removeItem(STORAGE_KEYS.REMEMBER_ME);
  sessionStorage.removeItem(STORAGE_KEYS.AUTH_USER);
  sessionStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
};

interface LoginResponse {
  success: boolean;
  user: User;
  token: string;
}

interface LoginResponse {
  success: boolean;
  user: User;
  token: string;
}

export const loginUser = createAsyncThunk<
  LoginResponse & { rememberMe: boolean },
  { email: string; password: string; rememberMe?: boolean }
>('auth/login', async (credentials) => {
  const response = await apiClient.post<LoginResponse>(
    API_ENDPOINTS.AUTH.LOGIN,
    {
      email: credentials.email,
      password: credentials.password,
    }
  );
  const data = response.data;
  return { ...data, rememberMe: credentials.rememberMe || false };
});

interface UserResponse {
  user: User;
}

export const fetchUser = createAsyncThunk<UserResponse>(
  'auth/fetchUser',
  async () => {
    const response = await apiClient.get<UserResponse>(API_ENDPOINTS.AUTH.ME);
    return response.data;
  }
);

export const logoutUser = createAsyncThunk('auth/logout', async () => {
  await apiClient.post(API_ENDPOINTS.AUTH.LOGOUT);
});

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<User>) => {
      state.user = action.payload;
      state.isAuthenticated = true;
      saveAuthState(action.payload, state.token, state.rememberMe);
    },
    clearAuth: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.rememberMe = false;
      clearAuthState();
    },
    restoreAuth: (state) => {
      const persisted = loadPersistedState();
      if (persisted.user && persisted.token) {
        state.user = persisted.user;
        state.token = persisted.token;
        state.isAuthenticated = true;
        state.rememberMe = persisted.rememberMe || false;
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginUser.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.isAuthenticated = true;
        state.rememberMe = action.payload.rememberMe;
        saveAuthState(
          action.payload.user,
          action.payload.token,
          action.payload.rememberMe
        );
      })
      .addCase(loginUser.rejected, (state) => {
        state.isLoading = false;
        state.isAuthenticated = false;
        clearAuthState();
      })
      .addCase(fetchUser.fulfilled, (state, action) => {
        state.user = action.payload.user;
        state.isAuthenticated = true;
        if (state.token) {
          saveAuthState(action.payload.user, state.token, state.rememberMe);
        }
      })
      .addCase(fetchUser.rejected, (state) => {
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;
        clearAuthState();
      })
      .addCase(logoutUser.fulfilled, (state) => {
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;
        state.rememberMe = false;
        clearAuthState();
      });
  },
});

export const { setUser, clearAuth, restoreAuth } = authSlice.actions;
export default authSlice.reducer;
