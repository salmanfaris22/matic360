import { useMutation } from "@tanstack/react-query";
import { authApi } from "@/entities/auth/api";
import { useSessionStore } from "@/entities/auth/session.store";
import type { LoginPayload } from "@/entities/auth/model";

// Login mutation: on success it populates the session store (and tokens).
export function useLogin() {
  const setSession = useSessionStore((s) => s.setSession);
  return useMutation({
    mutationFn: (payload: LoginPayload) => authApi.login(payload),
    onSuccess: (data) => setSession(data),
  });
}
