// Standard API envelope returned by the Go backend.
export interface ApiEnvelope<T> {
  success: boolean;
  message?: string;
  data: T;
  meta?: PaginationMeta;
  error?: unknown;
}

export interface PaginationMeta {
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
}

export interface Paginated<T> {
  items: T[];
  meta: PaginationMeta;
}

// Common query params for list endpoints.
export interface ListParams {
  page?: number;
  per_page?: number;
  search?: string;
  sort?: string;
  [key: string]: string | number | undefined;
}
