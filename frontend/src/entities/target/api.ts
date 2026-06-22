import { api } from "@/shared/api/client";
import type { ApiEnvelope } from "@/shared/api/types";
import type { AdminTargetRow, MyTargets, StaffTarget, TargetPeriod } from "./model";

export interface CreateTargetInput {
  staff_id: number;
  period: TargetPeriod;
  amount: number;
  start_date?: string;
  notes?: string;
}

export const targetApi = {
  async me(): Promise<MyTargets> {
    const res = await api.get<ApiEnvelope<MyTargets>>("/targets/me");
    return res.data.data;
  },
  async adminList(): Promise<AdminTargetRow[]> {
    const res = await api.get<ApiEnvelope<AdminTargetRow[]>>("/targets/admin");
    return res.data.data ?? [];
  },
  async forStaff(staffId: number): Promise<StaffTarget[]> {
    const res = await api.get<ApiEnvelope<StaffTarget[]>>("/targets", { params: { staff_id: staffId } });
    return res.data.data ?? [];
  },
  async setDefault(staffId: number, amount: number): Promise<void> {
    await api.put("/targets/default", { staff_id: staffId, amount });
  },
  async create(input: CreateTargetInput): Promise<StaffTarget> {
    const res = await api.post<ApiEnvelope<StaffTarget>>("/targets", input);
    return res.data.data;
  },
  async update(id: number, amount: number, notes?: string): Promise<StaffTarget> {
    const res = await api.put<ApiEnvelope<StaffTarget>>(`/targets/${id}`, { amount, notes });
    return res.data.data;
  },
  async remove(id: number): Promise<void> {
    await api.delete(`/targets/${id}`);
  },
};
