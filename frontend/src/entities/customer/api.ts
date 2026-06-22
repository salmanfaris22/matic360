import { api } from "@/shared/api/client";
import type { ApiEnvelope } from "@/shared/api/types";

export interface ClientLite {
  id: number;
  name: string;
  phone?: string;
  shop_name?: string;
}

export const customersApi = {
  async search(q: string): Promise<ClientLite[]> {
    const res = await api.get<ApiEnvelope<ClientLite[]>>("/customers/search", {
      params: q ? { q } : undefined,
    });
    return res.data.data ?? [];
  },
  async quickCreate(name: string, phone?: string): Promise<ClientLite> {
    const res = await api.post<ApiEnvelope<ClientLite>>("/customers/quick", { name, phone });
    return res.data.data;
  },
};
