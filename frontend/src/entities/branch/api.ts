import { api } from "@/shared/api/client";
import type { ApiEnvelope } from "@/shared/api/types";

export interface Branch {
  id: number;
  name: string;
  code: string;
  address: string;
  district: string;
  phone: string;
  manager_id?: number | null;
  is_head_office: boolean;
  is_active: boolean;
}

export const branchApi = {
  async list(): Promise<Branch[]> {
    const res = await api.get<ApiEnvelope<Branch[]>>("/branches", {
      params: { per_page: 100 },
    });
    return res.data.data ?? [];
  },
};
