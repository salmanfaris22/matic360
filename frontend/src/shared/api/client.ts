import axios, {
  AxiosError,
  type AxiosInstance,
  type InternalAxiosRequestConfig,
} from "axios";
import { config } from "@/shared/config";
import { tokenStore } from "./tokens";

// Single axios instance for the whole app.
export const api: AxiosInstance = axios.create({
  baseURL: config.apiBaseUrl,
  headers: { "Content-Type": "application/json" },
});

// Attach the access token to every request.
api.interceptors.request.use((cfg: InternalAxiosRequestConfig) => {
  const token = tokenStore.getAccess();
  if (token) {
    cfg.headers.Authorization = `Bearer ${token}`;
  }
  // For file uploads, drop the JSON default so axios sets
  // multipart/form-data with the correct boundary.
  if (cfg.data instanceof FormData) {
    delete cfg.headers["Content-Type"];
  }
  return cfg;
});

// ── Refresh-on-401 handling ────────────────────────────
// Concurrent 401s share a single in-flight refresh request.
let refreshing: Promise<string | null> | null = null;

// Callback invoked when refresh ultimately fails (set by the app to log out).
let onAuthFailure: (() => void) | null = null;
export function setAuthFailureHandler(fn: () => void) {
  onAuthFailure = fn;
}

async function refreshAccessToken(): Promise<string | null> {
  const refresh = tokenStore.getRefresh();
  if (!refresh) return null;
  try {
    // Bare axios (not `api`) to avoid recursive interceptors.
    const res = await axios.post(`${config.apiBaseUrl}/auth/refresh`, {
      refresh_token: refresh,
    });
    const data = res.data?.data;
    if (data?.access_token) {
      tokenStore.set(data.access_token, data.refresh_token ?? refresh);
      return data.access_token as string;
    }
    return null;
  } catch {
    return null;
  }
}

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };
    const status = error.response?.status;
    const isAuthRoute = original?.url?.includes("/auth/");

    if (status === 401 && original && !original._retry && !isAuthRoute) {
      original._retry = true;
      if (!refreshing) {
        refreshing = refreshAccessToken().finally(() => {
          refreshing = null;
        });
      }
      const newToken = await refreshing;
      if (newToken) {
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      }
      tokenStore.clear();
      onAuthFailure?.();
    }
    return Promise.reject(error);
  },
);

// Extract a human-readable message from an axios error.
export function apiErrorMessage(error: unknown, fallback = "Something went wrong"): string {
  if (axios.isAxiosError(error)) {
    return (error.response?.data as { message?: string })?.message ?? error.message ?? fallback;
  }
  return fallback;
}
