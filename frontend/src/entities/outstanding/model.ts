export type PaymentType = "cash" | "upi" | "cheque";
export type OutstandingStatus = "open" | "partial" | "closed";

export interface Payment {
  id: number;
  outstanding_id?: number | null;
  customer_id: number;
  amount: number;
  payment_type: PaymentType;
  cheque_number: string;
  bank_name: string;
  next_payment_date?: string | null;
  receipt_url: string;
  notes: string;
  status: string;
  collected_by: number;
  collector?: { id: number; name: string } | null;
  paid_at?: string | null;
  created_at: string;
}

// Outstanding is ONE bill. Payments accumulate against it over time.
export interface Outstanding {
  id: number;
  customer_id: number;
  customer?: { id: number; name?: string; phone?: string } | null;
  ref_code: string;
  bill_number: string;
  item_name: string;
  bill_date?: string | null;
  amount: number;
  paid_amount: number;
  due_date?: string | null;
  image_url: string;
  description: string;
  status: OutstandingStatus;
  created_by: number;
  creator?: { id: number; name: string } | null;
  assignees?: AssigneeLite[] | null;
  payments?: Payment[] | null;
  created_at: string;
}

export interface AssigneeLite {
  id: number;
  name: string;
  employee_id?: string;
  photo_url?: string;
}

// Per-customer aggregate for the client-based admin view.
export interface ClientOutstanding {
  customer_id: number;
  customer_name: string;
  phone: string;
  bill_count: number;
  total_due: number;
  oldest_due?: string | null;
}

export const paymentTypeOptions: { value: PaymentType; label: string }[] = [
  { value: "cash", label: "Cash" },
  { value: "upi", label: "UPI" },
  { value: "cheque", label: "Cheque" },
];

export function due(o: Outstanding): number {
  return Math.max(0, o.amount - o.paid_amount);
}

// The date a bill's age is measured from: the promised next-due date if set,
// otherwise the bill date (so an old unpaid bill ages from when it was raised).
export function ageAnchor(o: Outstanding): string | null | undefined {
  return o.due_date || o.bill_date;
}

export const statusLabel: Record<OutstandingStatus, string> = {
  open: "Pending",
  partial: "Partial",
  closed: "Complete",
};

export const statusVariant: Record<OutstandingStatus, "warning" | "default" | "success"> = {
  open: "warning",
  partial: "default",
  closed: "success",
};

// ── Aging: 🟢 0–45 · 🟠 46–90 · 🔴 90+ days, from the next paying (due) date ──
export type AgingColor = "green" | "orange" | "red";

export function agingDays(date?: string | null): number | null {
  if (!date) return null;
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return null;
  return Math.floor((Date.now() - d.getTime()) / 86_400_000);
}

export function agingColor(date?: string | null): AgingColor {
  const days = agingDays(date);
  if (days === null || days <= 45) return "green";
  if (days <= 90) return "orange";
  return "red";
}

export const agingBadgeVariant: Record<AgingColor, "success" | "warning" | "destructive"> = {
  green: "success",
  orange: "warning",
  red: "destructive",
};

export const agingRangeLabel: Record<AgingColor, string> = {
  green: "0–45 days",
  orange: "46–90 days",
  red: "90+ days",
};
