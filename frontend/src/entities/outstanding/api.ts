import { api } from "@/shared/api/client";
import type { ApiEnvelope, PaginationMeta } from "@/shared/api/types";
import type { AssigneeLite, ClientOutstanding, Outstanding, PaymentType } from "./model";

export interface BillListParams {
  search?: string;
  customer_id?: number | string;
  created_by?: number | string;
  staff_id?: number | string;
  status?: string; // pending | complete | open | partial | closed
  from?: string;
  to?: string;
  color?: string; // green | orange | red
  page?: number;
  per_page?: number;
}

export interface CreateBillInput {
  customer_id: number;
  bill_number?: string;
  item_name?: string;
  bill_date?: string;
  amount: number;
  description?: string;
}

export interface AddPaymentInput {
  amount: number;
  payment_type: PaymentType;
  cheque_number?: string;
  bank_name?: string;
  next_payment_date?: string | null;
  notes?: string;
}

export const outstandingApi = {
  async list(params: BillListParams): Promise<{ items: Outstanding[]; meta: PaginationMeta }> {
    const res = await api.get<ApiEnvelope<Outstanding[]>>("/outstandings", { params });
    return {
      items: res.data.data ?? [],
      meta: res.data.meta ?? { page: 1, per_page: 20, total: 0, total_pages: 0 },
    };
  },
  async get(id: number): Promise<Outstanding> {
    const res = await api.get<ApiEnvelope<Outstanding>>(`/outstandings/${id}`);
    return res.data.data;
  },
  async create(input: CreateBillInput): Promise<Outstanding> {
    const res = await api.post<ApiEnvelope<Outstanding>>("/outstandings", input);
    return res.data.data;
  },
  async update(id: number, input: Partial<CreateBillInput>): Promise<Outstanding> {
    const res = await api.put<ApiEnvelope<Outstanding>>(`/outstandings/${id}`, input);
    return res.data.data;
  },
  async addPayment(billId: number, input: AddPaymentInput): Promise<Outstanding> {
    const res = await api.post<ApiEnvelope<Outstanding>>(`/outstandings/${billId}/payments`, input);
    return res.data.data;
  },
  async uploadBillImage(billId: number, file: Blob): Promise<Outstanding> {
    const form = new FormData();
    form.append("file", file, "bill.jpg");
    const res = await api.post<ApiEnvelope<Outstanding>>(`/outstandings/${billId}/image`, form);
    return res.data.data;
  },
  async uploadPaymentImage(paymentId: number, file: Blob): Promise<void> {
    const form = new FormData();
    form.append("file", file, "receipt.jpg");
    await api.post(`/payments/${paymentId}/receipt`, form);
  },
  async addAssignee(billId: number, staffId: number): Promise<AssigneeLite[]> {
    const res = await api.post<ApiEnvelope<AssigneeLite[]>>(`/outstandings/${billId}/assignees`, { staff_id: staffId });
    return res.data.data ?? [];
  },
  async removeAssignee(billId: number, staffId: number): Promise<AssigneeLite[]> {
    const res = await api.delete<ApiEnvelope<AssigneeLite[]>>(`/outstandings/${billId}/assignees/${staffId}`);
    return res.data.data ?? [];
  },
  async byClient(params: { search?: string; staff_id?: string | number; from?: string; to?: string } = {}): Promise<ClientOutstanding[]> {
    const clean = Object.fromEntries(Object.entries(params).filter(([, v]) => v));
    const res = await api.get<ApiEnvelope<ClientOutstanding[]>>("/outstandings/by-client", {
      params: Object.keys(clean).length ? clean : undefined,
    });
    return res.data.data ?? [];
  },
  async stats(): Promise<MonthStat[]> {
    const res = await api.get<ApiEnvelope<MonthStat[]>>("/outstandings/stats");
    return res.data.data ?? [];
  },
};

export interface MonthStat {
  month: string;
  billed: number;
  collected: number;
}
