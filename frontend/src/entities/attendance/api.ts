import { api } from "@/shared/api/client";
import type { ApiEnvelope, ListParams, PaginationMeta } from "@/shared/api/types";
import type { Attendance, TodayResponse } from "./model";

export interface GeoCapture {
  lat: number;
  lng: number;
  device?: string;
  selfie?: Blob | null;
}

function geoForm(geo: GeoCapture): FormData {
  const form = new FormData();
  form.append("lat", String(geo.lat));
  form.append("lng", String(geo.lng));
  form.append("device", geo.device ?? navigator.userAgent);
  if (geo.selfie) form.append("selfie", geo.selfie, "selfie.jpg");
  return form;
}

export const attendanceApi = {
  async today(): Promise<TodayResponse> {
    const res = await api.get<ApiEnvelope<TodayResponse>>("/attendance/me/today");
    return res.data.data;
  },
  async history(params: ListParams): Promise<{ items: Attendance[]; meta: PaginationMeta }> {
    const res = await api.get<ApiEnvelope<Attendance[]>>("/attendance/me/history", { params });
    return {
      items: res.data.data ?? [],
      meta: res.data.meta ?? { page: 1, per_page: 20, total: 0, total_pages: 0 },
    };
  },
  async checkIn(geo: GeoCapture): Promise<Attendance> {
    const res = await api.post<ApiEnvelope<Attendance>>("/attendance/me/check-in", geoForm(geo));
    return res.data.data;
  },
  async checkOut(geo: GeoCapture): Promise<Attendance> {
    const res = await api.post<ApiEnvelope<Attendance>>("/attendance/me/check-out", geoForm(geo));
    return res.data.data;
  },
  async breakStart(): Promise<Attendance> {
    const res = await api.post<ApiEnvelope<Attendance>>("/attendance/me/break/start");
    return res.data.data;
  },
  async breakEnd(): Promise<Attendance> {
    const res = await api.post<ApiEnvelope<Attendance>>("/attendance/me/break/end");
    return res.data.data;
  },
  // Admin
  async adminList(params: ListParams): Promise<{ items: Attendance[]; meta: PaginationMeta }> {
    const res = await api.get<ApiEnvelope<Attendance[]>>("/attendance", { params });
    return {
      items: res.data.data ?? [],
      meta: res.data.meta ?? { page: 1, per_page: 20, total: 0, total_pages: 0 },
    };
  },
  async verify(id: number, notes?: string): Promise<Attendance> {
    const form = new FormData();
    if (notes) form.append("notes", notes);
    const res = await api.put<ApiEnvelope<Attendance>>(`/attendance/${id}/verify`, form);
    return res.data.data;
  },
};
