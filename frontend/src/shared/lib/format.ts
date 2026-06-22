import { config } from "@/shared/config";

// Format a number as Indian Rupees.
export function formatCurrency(value: number | null | undefined): string {
  const n = typeof value === "number" ? value : 0;
  return new Intl.NumberFormat(config.locale, {
    style: "currency",
    currency: config.currency,
    maximumFractionDigits: 0,
  }).format(n);
}

// Format a number with Indian grouping (e.g. 1,00,000).
export function formatNumber(value: number | null | undefined): string {
  return new Intl.NumberFormat(config.locale).format(value ?? 0);
}

// Format an ISO date string as "12 Jan 2025"; returns "—" when empty.
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat(config.locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d);
}

// Format a duration given in hours as "2h 15m" / "45m" / "0m".
export function formatDuration(hours: number | null | undefined): string {
  const h = typeof hours === "number" ? hours : 0;
  if (h <= 0) return "0m";
  const totalMin = Math.round(h * 60);
  const hh = Math.floor(totalMin / 60);
  const mm = totalMin % 60;
  if (hh === 0) return `${mm}m`;
  return mm > 0 ? `${hh}h ${mm}m` : `${hh}h`;
}

// Take the first letters of up to two words for an avatar fallback.
export function initials(name: string | undefined | null): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  return (parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "");
}
