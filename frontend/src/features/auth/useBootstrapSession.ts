import { useEffect } from "react";
import { authApi } from "@/entities/auth/api";
import { useSessionStore } from "@/entities/auth/session.store";
import { tokenStore } from "@/shared/api/tokens";

// On app load: if a token exists, fetch the current user to restore the session.
export function useBootstrapSession() {
  const setUser = useSessionStore((s) => s.setUser);
  const setStatus = useSessionStore((s) => s.setStatus);

  useEffect(() => {
    let active = true;
    const token = tokenStore.getAccess();
    if (!token) {
      setStatus("guest");
      return;
    }
    authApi
      .me()
      .then((user) => active && setUser(user))
      .catch(() => {
        if (active) {
          tokenStore.clear();
          setStatus("guest");
        }
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
