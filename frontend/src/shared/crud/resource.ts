import { type ReactNode } from "react";
import { api } from "@/shared/api/client";
import type { ApiEnvelope, ListParams, PaginationMeta } from "@/shared/api/types";

export type FieldType =
  | "text"
  | "number"
  | "date"
  | "select"
  | "textarea"
  | "checkbox"
  | "password";

export interface FieldOption {
  value: string | number;
  label: string;
}

export type LookupKey = "branches" | "departments" | "customers" | "products" | "roles";

export interface ResourceField {
  name: string;
  label: string;
  type?: FieldType;
  options?: FieldOption[];
  lookup?: LookupKey; // dynamically loaded options
  required?: boolean;
  placeholder?: string;
  step?: string;
  inTable?: boolean; // default true
  inForm?: boolean; // default true
  cell?: (row: Record<string, unknown>) => ReactNode; // custom table cell
}

export interface ResourceConfig {
  title: string;
  subtitle?: string;
  endpoint: string; // e.g. "/customers"
  queryKey: string; // e.g. "customers"
  fields: ResourceField[];
  searchPlaceholder?: string;
  canCreate?: boolean; // default true
  canEdit?: boolean; // default true
  canDelete?: boolean; // default true
}

export interface ListResult<T> {
  items: T[];
  meta: PaginationMeta;
}

// Build a typed CRUD client for a REST resource following the standard envelope.
export function createResourceApi<T = Record<string, unknown>>(endpoint: string) {
  return {
    async list(params: ListParams): Promise<ListResult<T>> {
      const res = await api.get<ApiEnvelope<T[]>>(endpoint, { params });
      return {
        items: res.data.data ?? [],
        meta: res.data.meta ?? { page: 1, per_page: 20, total: 0, total_pages: 0 },
      };
    },
    async create(payload: Partial<T>): Promise<T> {
      const res = await api.post<ApiEnvelope<T>>(endpoint, payload);
      return res.data.data;
    },
    async update(id: number | string, payload: Partial<T>): Promise<T> {
      const res = await api.put<ApiEnvelope<T>>(`${endpoint}/${id}`, payload);
      return res.data.data;
    },
    async remove(id: number | string): Promise<void> {
      await api.delete(`${endpoint}/${id}`);
    },
  };
}
