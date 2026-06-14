import { api } from "@/shared/api/client";
import type { ApiEnvelope } from "@/shared/api/types";

export interface DashboardSummary {
  staff_total: number;
  staff_active: number;
  customers: number;
  branches: number;
  departments: number;
  users: number;
  pending_payments: number;
  outstanding_amount: number;
}

export interface Pair {
  label: string;
  value: number;
}

export interface MonthPoint {
  month: string;
  total: number;
}

export interface DashboardCharts {
  collections_trend: MonthPoint[];
  attendance_today: Pair[];
  payments_by_status: Pair[];
  expenses_by_type: Pair[];
  outstanding_by_district: Pair[];
  staff_by_department: Pair[];
}

export const dashboardApi = {
  async summary(): Promise<DashboardSummary> {
    const res = await api.get<ApiEnvelope<DashboardSummary>>("/dashboard/summary");
    return res.data.data;
  },
  async charts(): Promise<DashboardCharts> {
    const res = await api.get<ApiEnvelope<DashboardCharts>>("/dashboard/charts");
    return res.data.data;
  },
};
