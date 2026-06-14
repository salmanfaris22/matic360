import { api } from "@/shared/api/client";
import type { ApiEnvelope } from "@/shared/api/types";
import type { AuthResponse, AuthUser, LoginPayload } from "./model";

export const authApi = {
  async login(payload: LoginPayload): Promise<AuthResponse> {
    const res = await api.post<ApiEnvelope<AuthResponse>>("/auth/login", payload);
    return res.data.data;
  },
  async me(): Promise<AuthUser> {
    const res = await api.get<ApiEnvelope<AuthUser>>("/auth/me");
    return res.data.data;
  },
  async logout(): Promise<void> {
    await api.post("/auth/logout");
  },
};
