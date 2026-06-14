// Centralized runtime configuration sourced from Vite env vars.
export const config = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? "/api/v1",
  appName: "Distribution Management System",
  currency: "INR",
  locale: "en-IN",
} as const;

// localStorage keys.
export const storageKeys = {
  accessToken: "dms.access_token",
  refreshToken: "dms.refresh_token",
  theme: "theme",
} as const;
