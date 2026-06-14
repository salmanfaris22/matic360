export type RoleSlug = "super_admin" | "admin" | "staff";

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: RoleSlug | string;
  role_name: string;
  branch_id?: number | null;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user: AuthUser;
}

export interface LoginPayload {
  email: string;
  password: string;
}
