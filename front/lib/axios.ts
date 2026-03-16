import axios, {
  AxiosError,
  InternalAxiosRequestConfig,
  AxiosHeaders,
} from "axios";
import { Platform } from "react-native";
import Constants from "expo-constants";
import { store } from "@/store/store";
import {
  logout,
  setCredentials,
} from "@/store/features/auth/authSlice";
import type { AuthApiResponse } from "@/store/features/auth/authSlice";

// ---------- Base URL resolution (Android / iOS / Web) ----------
const DEFAULT_PORT = process.env.PORT || 3000;

function resolveBaseUrl(): string {
  // 1) Expo dev server exposes the host machine's LAN IP automatically
  //    e.g. "192.168.1.2:8081" — we extract just the IP part
  const debuggerHost =
    Constants.expoConfig?.hostUri ?? (Constants as any).manifest?.debuggerHost;
  console.log(`[api] debuggerHost = ${debuggerHost}`);
  if (debuggerHost) {
    const ip = debuggerHost.split(":")[0]; // strip metro port
    return `http://${ip}:${DEFAULT_PORT}`;
  }

  // 2) Fallback: explicit env override
  const envUrl = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (envUrl) return envUrl;

  // 3) Platform-specific defaults (emulator / web)
  const LAN_IP = "172.16.8.159"; // IP dyal PC dyalek

  if (Platform.OS === "android") {
    return `http://${LAN_IP}:${DEFAULT_PORT}`;
  }
  return `http://localhost:${DEFAULT_PORT}`;
}

export const API_BASE_URL = resolveBaseUrl();
console.log(`[api] BASE_URL = ${API_BASE_URL}  (platform: ${Platform.OS})`);

// Gateway path for auth-service refresh endpoint
const REFRESH_PATH = "/s1/auth/refresh/post";

type AxiosRequestConfigWithRetry = InternalAxiosRequestConfig & {
  _retry?: boolean;
};

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

// Attach Authorization header from Redux auth state
api.interceptors.request.use((config) => {
  const state = store.getState();
  const accessToken = state.auth.accessToken;

  if (accessToken) {
    if (!config.headers) {
      config.headers = new AxiosHeaders();
    }
    // Axios v1 uses AxiosHeaders; mutate instead of reassigning a plain object
    (config.headers as any).Authorization = `Bearer ${accessToken}`;
  }

  // --- LOG REQUEST ---
  const fullUrl = `${config.baseURL ?? ""}${config.url ?? ""}`;
  console.log(
    `[API REQ] ${config.method?.toUpperCase()} ${fullUrl}`,
    config.data ? JSON.stringify(config.data) : "",
  );

  return config;
});

// User-friendly message when the device can't reach the server
export const NETWORK_ERROR_USER_MESSAGE =
  "Cannot reach the server. Make sure the phone and PC are on the same Wi-Fi, " +
  "the gateway is running, and the firewall allows port 3000.";

// Handle 401 → try refresh token once, then logout on failure
api.interceptors.response.use(
  (response) => {
    // --- LOG SUCCESS RESPONSE ---
    const cfg = response.config;
    const fullUrl = `${cfg.baseURL ?? ""}${cfg.url ?? ""}`;
    console.log(
      `[API RES] ${response.status} ${cfg.method?.toUpperCase()} ${fullUrl}`,
      JSON.stringify(response.data),
    );
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as AxiosRequestConfigWithRetry | undefined;
    const status = error.response?.status;
    const errCode = (error as any)?.code;

    // If no response or not 401, just bubble up
    if (!originalRequest || status !== 401) {
      // --- LOG ERROR RESPONSE ---
      const cfg = originalRequest ?? error.config;
      const fullUrl = cfg ? `${cfg.baseURL ?? ""}${cfg.url ?? ""}` : "unknown";
      console.log(
        `[API ERR] ${status ?? "NETWORK"} ${cfg?.method?.toUpperCase() ?? "?"} ${fullUrl}`,
        error.response?.data ? JSON.stringify(error.response.data) : error.message,
      );

      // Extra hint for network errors
      if (error.message === "Network Error" || errCode === "ERR_NETWORK") {
        console.log(
          "[API ERR] Tip: ensure gateway is running, same WiFi, and firewall allows port.",
        );
      }

      return Promise.reject(error);
    }

    // Avoid infinite loop and don't try to refresh on refresh/login endpoints
    if (
      originalRequest._retry ||
      originalRequest.url?.includes("/auth/login") ||
      originalRequest.url?.includes("/auth/register") ||
      originalRequest.url?.includes("/auth/refresh")
    ) {
      store.dispatch(logout());
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    const state = store.getState();
    const { refreshToken, user } = state.auth;

    if (!refreshToken || !user) {
      store.dispatch(logout());
      return Promise.reject(error);
    }

    try {
      // Call auth-service refresh through the gateway
      const refreshResponse = await api.post<
        AuthApiResponse<{ accessToken: string; refreshToken?: string | null }>
      >(REFRESH_PATH, { refreshToken });

      const payload = refreshResponse.data;
      if (!payload.success || !payload.data?.accessToken) {
        store.dispatch(logout());
        return Promise.reject(error);
      }

      const newAccessToken = payload.data.accessToken;
      const newRefreshToken = payload.data.refreshToken ?? refreshToken;

      // Update Redux auth state (keep same user)
      store.dispatch(
        setCredentials({
          user,
          accessToken: newAccessToken,
          refreshToken: newRefreshToken,
        })
      );

      // Retry original request with new token
      if (!originalRequest.headers) {
        originalRequest.headers = new AxiosHeaders();
      }
      (originalRequest.headers as any).Authorization = `Bearer ${newAccessToken}`;

      return api(originalRequest);
    } catch (refreshError) {
      store.dispatch(logout());
      return Promise.reject(refreshError);
    }
  }
);

