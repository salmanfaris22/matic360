import { api } from "@/shared/api/client";
import type { ApiEnvelope } from "@/shared/api/types";

export interface Department {
  id: number;
  name: string;
  description: string;
  is_active: boolean;
}

export const departmentApi = {
  async list(): Promise<Department[]> {
    const res = await api.get<ApiEnvelope<Department[]>>("/departments", {
      params: { per_page: 100 },
    });
    return res.data.data ?? [];
  },
};
