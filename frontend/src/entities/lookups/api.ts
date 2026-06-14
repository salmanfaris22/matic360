import { api } from "@/shared/api/client";
import type { ApiEnvelope } from "@/shared/api/types";

export interface LookupItem {
  id: number;
  name: string;
}

async function fetchList(endpoint: string): Promise<LookupItem[]> {
  const res = await api.get<ApiEnvelope<LookupItem[]>>(endpoint, { params: { per_page: 100 } });
  return res.data.data ?? [];
}

export const lookupsApi = {
  branches: () => fetchList("/branches"),
  departments: () => fetchList("/departments"),
  customers: () => fetchList("/customers"),
  products: () => fetchList("/products"),
  roles: () => fetchList("/roles"),
};
