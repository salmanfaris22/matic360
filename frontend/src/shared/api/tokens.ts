import { storageKeys } from "@/shared/config";

// Token storage lives in `shared` so the API client never depends on higher
// FSD layers. The session store (entities/auth) reads/writes the same keys.
export const tokenStore = {
  getAccess: () => localStorage.getItem(storageKeys.accessToken),
  getRefresh: () => localStorage.getItem(storageKeys.refreshToken),
  set(access: string, refresh: string) {
    localStorage.setItem(storageKeys.accessToken, access);
    localStorage.setItem(storageKeys.refreshToken, refresh);
  },
  setAccess(access: string) {
    localStorage.setItem(storageKeys.accessToken, access);
  },
  clear() {
    localStorage.removeItem(storageKeys.accessToken);
    localStorage.removeItem(storageKeys.refreshToken);
  },
};
