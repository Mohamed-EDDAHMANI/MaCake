import { createSlice, PayloadAction } from "@reduxjs/toolkit";

// Align with auth-service User entity and response
export type UserRole =
  | "CLIENT"
  | "PATISSIERE"
  | "LIVREUR"
  | "ADMIN"
  | "MANAGER"
  | "SUPER_ADMIN";

export type UserStatus = "active" | "suspended";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status?: UserStatus;
  createdAt?: string;
  photo?: string | null;
  coverPhoto?: string | null;
  phone?: string | null;
  city?: string | null;
  address?: string | null;
  description?: string | null;
}

// Auth-service success response data (login/register)
export interface AuthResponseData {
  user: AuthUser;
  accessToken: string;
  refreshToken?: string;
}

// Auth-service unified API response shape (gateway)
export interface AuthApiResponse<T = AuthResponseData | null> {
  success: boolean;
  statusCode: number;
  message: string;
  data: T;
  error?: { code: string; message: string; details?: unknown } | null;
  meta?: unknown;
  errors?: Array<{ field: string; message: string }> | null;
  timestamp: string;
  path?: string;
}

/** Profile stats from get-profile (rating + followers). */
export interface ProfileStats {
  rating: { average: number; count: number };
  followersCount: number;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  /** Set after getProfile(); used on profile screen for rating & followers. */
  profileStats: ProfileStats | null;
}

const initialState: AuthState = {
  isAuthenticated: false,
  user: null,
  accessToken: null,
  refreshToken: null,
  profileStats: null,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setCredentials: (
      state,
      action: PayloadAction<{
        user: AuthUser;
        accessToken: string;
        refreshToken?: string | null;
      }>
    ) => {
      state.isAuthenticated = true;
      state.user = action.payload.user;
      state.accessToken = action.payload.accessToken;
      state.refreshToken = action.payload.refreshToken ?? null;
    },
    setCredentialsFromResponse: (
      state,
      action: PayloadAction<AuthApiResponse<AuthResponseData>>
    ) => {
      const { data } = action.payload;
      if (action.payload.success && data?.user && data?.accessToken) {
        state.isAuthenticated = true;
        state.user = data.user;
        state.accessToken = data.accessToken;
        state.refreshToken = data.refreshToken ?? null;
      }
    },
    updateUser: (state, action: PayloadAction<Partial<AuthUser>>) => {
      if (state.user) {
        state.user = { ...state.user, ...action.payload };
      }
    },
    setProfileStats: (state, action: PayloadAction<ProfileStats | null>) => {
      state.profileStats = action.payload;
    },
    logout: (state) => {
      state.isAuthenticated = false;
      state.user = null;
      state.accessToken = null;
      state.refreshToken = null;
      state.profileStats = null;
    },
  },
});

export const {
  setCredentials,
  setCredentialsFromResponse,
  updateUser,
  setProfileStats,
  logout,
} = authSlice.actions;
export default authSlice.reducer;
