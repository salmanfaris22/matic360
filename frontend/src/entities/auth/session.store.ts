import { create } from "zustand";
import { tokenStore } from "@/shared/api/tokens";
import type { AuthResponse, AuthUser } from "./model";

interface SessionState {
  user: AuthUser | null;
  status: "loading" | "authenticated" | "guest";
  setSession: (auth: AuthResponse) => void;
  setUser: (user: AuthUser | null) => void;
  setStatus: (status: SessionState["status"]) => void;
  logout: () => void;
}

// The session store holds the current user. Tokens live in tokenStore
// (shared) so the API client stays decoupled from this entity.
export const useSessionStore = create<SessionState>((set) => ({
  user: null,
  status: "loading",
  setSession: (auth) => {
    tokenStore.set(auth.access_token, auth.refresh_token);
    set({ user: auth.user, status: "authenticated" });
  },
  setUser: (user) => set({ user, status: user ? "authenticated" : "guest" }),
  setStatus: (status) => set({ status }),
  logout: () => {
    tokenStore.clear();
    set({ user: null, status: "guest" });
  },
}));

// Convenience selector hooks.
export const useCurrentUser = () => useSessionStore((s) => s.user);
export const useIsAuthenticated = () => useSessionStore((s) => s.status === "authenticated");
