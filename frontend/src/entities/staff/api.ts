import { api } from "@/shared/api/client";
import type { ApiEnvelope, ListParams, PaginationMeta } from "@/shared/api/types";
import type { Staff, StaffFormValues } from "./model";

export interface StaffListResult {
  items: Staff[];
  meta: PaginationMeta;
}

export const staffApi = {
  async list(params: ListParams): Promise<StaffListResult> {
    const res = await api.get<ApiEnvelope<Staff[]>>("/staff", { params });
    return {
      items: res.data.data ?? [],
      meta: res.data.meta ?? { page: 1, per_page: 20, total: 0, total_pages: 0 },
    };
  },
  async get(id: number | string): Promise<Staff> {
    const res = await api.get<ApiEnvelope<Staff>>(`/staff/${id}`);
    return res.data.data;
  },
  async create(payload: StaffFormValues): Promise<Staff> {
    const res = await api.post<ApiEnvelope<Staff>>("/staff", payload);
    return res.data.data;
  },
  async update(id: number | string, payload: StaffFormValues): Promise<Staff> {
    const res = await api.put<ApiEnvelope<Staff>>(`/staff/${id}`, payload);
    return res.data.data;
  },
  async remove(id: number | string): Promise<void> {
    await api.delete(`/staff/${id}`);
  },
  async createLogin(
    id: number | string,
    payload: { email?: string; password: string },
  ): Promise<{ id: number; email: string; name: string }> {
    const res = await api.post<ApiEnvelope<{ id: number; email: string; name: string }>>(
      `/staff/${id}/create-login`,
      payload,
    );
    return res.data.data;
  },
  async uploadImage(
    id: number | string,
    type: "photo" | "aadhaar" | "pan",
    file: File,
  ): Promise<Staff> {
    const form = new FormData();
    form.append("file", file);
    const res = await api.post<ApiEnvelope<Staff>>(`/staff/${id}/upload`, form, {
      params: { type },
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data.data;
  },
};
