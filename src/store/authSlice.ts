import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { api } from '@/services/api';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  userType: 'ADMIN' | 'ORGANISATION' | 'PROFESSIONAL';
  adminProfile?: any;
  organisation?: any;
  professional?: any;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  token: null,
  isAuthenticated: false,
  loading: false,
  error: null,
};

// Initialize auth from localStorage
const initializeAuth = (): Partial<AuthState> => {
  const token = localStorage.getItem('token');
  const userStr = localStorage.getItem('user');
  
  if (token && userStr) {
    try {
      const user = JSON.parse(userStr);
      // Set authorization header
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      return {
        token,
        user,
        isAuthenticated: true,
      };
    } catch (error) {
      // If parsing fails, clear invalid data
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      return {};
    }
  }
  return {};
};

// Async thunks
export const login = createAsyncThunk(
  'auth/login',
  async ({ email, password }: { email: string; password: string }, { rejectWithValue }) => {
    try {
      const response = await api.post('/v1/auth/login', { email, password });
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Login failed');
    }
  }
);

export const adminLogin = createAsyncThunk(
  'auth/adminLogin',
  async ({ email, password }: { email: string; password: string }, { rejectWithValue }) => {
    try {
      // Admin login uses the same endpoint as regular login
      const response = await api.post('/v1/auth/login', { email, password });
      const data = response.data;
      
      // Verify user is an admin
      if (data.user && data.user.userType !== 'ADMIN') {
        return rejectWithValue('Access denied. Admin credentials required.');
      }
      
      return data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Login failed');
    }
  }
);

export const register = createAsyncThunk(
  'auth/register',
  async (data: any, { rejectWithValue }) => {
    try {
      await api.post('/v1/auth/register', data);
      return { success: true };
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Registration failed');
    }
  }
);

export const registerBusiness = createAsyncThunk(
  'auth/registerBusiness',
  async (data: any, { rejectWithValue }) => {
    try {
      await api.post('/v1/auth/createbusiness', data);
      return { success: true };
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Registration failed');
    }
  }
);

export const fetchUserProfile = createAsyncThunk(
  'auth/fetchUserProfile',
  async (_, { rejectWithValue, getState }) => {
    try {
      const state = getState() as { auth: AuthState };
      if (!state.auth.token) {
        throw new Error('No token available');
      }
      
      // Try to fetch user profile based on user type
      let response;
      if (state.auth.user?.userType === 'ADMIN') {
        response = await api.get('/v1/admin/profile');
      } else if (state.auth.user?.userType === 'ORGANISATION') {
        response = await api.get('/v1/organisation/profile');
      } else if (state.auth.user?.userType === 'PROFESSIONAL') {
        response = await api.get('/v1/professional/profile');
      } else {
        throw new Error('Unknown user type');
      }
      
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch profile');
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    ...initialState,
    ...initializeAuth(),
  },
  reducers: {
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.error = null;
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      delete api.defaults.headers.common['Authorization'];
    },
    clearError: (state) => {
      state.error = null;
    },
    setCredentials: (state, action: PayloadAction<{ token: string; user: User }>) => {
      state.token = action.payload.token;
      state.user = action.payload.user;
      state.isAuthenticated = true;
      localStorage.setItem('token', action.payload.token);
      localStorage.setItem('user', JSON.stringify(action.payload.user));
      api.defaults.headers.common['Authorization'] = `Bearer ${action.payload.token}`;
    },
  },
  extraReducers: (builder) => {
    // Login
    builder
      .addCase(login.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.loading = false;
        state.token = action.payload.token;
        state.user = action.payload.user;
        state.isAuthenticated = true;
        localStorage.setItem('token', action.payload.token);
        localStorage.setItem('user', JSON.stringify(action.payload.user));
        api.defaults.headers.common['Authorization'] = `Bearer ${action.payload.token}`;
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
        state.isAuthenticated = false;
      });

    // Admin Login
    builder
      .addCase(adminLogin.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(adminLogin.fulfilled, (state, action) => {
        state.loading = false;
        state.token = action.payload.token;
        state.user = action.payload.user;
        state.isAuthenticated = true;
        localStorage.setItem('token', action.payload.token);
        localStorage.setItem('user', JSON.stringify(action.payload.user));
        api.defaults.headers.common['Authorization'] = `Bearer ${action.payload.token}`;
      })
      .addCase(adminLogin.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
        state.isAuthenticated = false;
      });

    // Register
    builder
      .addCase(register.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(register.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(register.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Register Business
    builder
      .addCase(registerBusiness.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(registerBusiness.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(registerBusiness.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Fetch User Profile
    builder
      .addCase(fetchUserProfile.fulfilled, (state, action) => {
        state.user = { ...state.user, ...action.payload.user } as User;
        localStorage.setItem('user', JSON.stringify(state.user));
      })
      .addCase(fetchUserProfile.rejected, (state) => {
        // If profile fetch fails, logout user
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        delete api.defaults.headers.common['Authorization'];
      });
  },
});

export const { logout, clearError, setCredentials } = authSlice.actions;
export default authSlice.reducer;

