import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { authApi } from "@/entities/auth/api";
import { useSessionStore } from "@/entities/auth/session.store";

// Logout: best-effort server call, then clear local session + cache.
export function useLogout() {
  const logout = useSessionStore((s) => s.logout);
  const navigate = useNavigate();
  const qc = useQueryClient();

  return async () => {
    try {
      await authApi.logout();
    } catch {
      /* stateless logout — ignore network errors */
    }
    logout();
    qc.clear();
    navigate("/login", { replace: true });
  };
}
