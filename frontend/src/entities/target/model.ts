export type TargetPeriod = "weekly" | "monthly" | "quarterly" | "half_yearly" | "yearly";

export interface StaffTarget {
  id: number;
  staff_id: number;
  staff?: { id: number; name: string } | null;
  period: TargetPeriod;
  start_date: string;
  end_date: string;
  amount: number;
  achieved: number;
  auto_gen: boolean;
  notes: string;
}

export interface TargetSeriesPoint {
  date: string;
  amount: number;
}

export interface MyTargets {
  current: StaffTarget | null;
  targets: StaffTarget[];
  series: TargetSeriesPoint[];
  month: { achieved: number };
}

export interface AdminTargetRow {
  staff_id: number;
  name: string;
  employee_id: string;
  monthly_target: number;
  achieved: number;
}

export const periodOptions: { value: TargetPeriod; label: string }[] = [
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "3 Months" },
  { value: "half_yearly", label: "6 Months" },
  { value: "yearly", label: "Yearly" },
];

export const periodLabel: Record<TargetPeriod, string> = {
  weekly: "Weekly",
  monthly: "Monthly",
  quarterly: "3 Months",
  half_yearly: "6 Months",
  yearly: "Yearly",
};

export function progressPct(achieved: number, target: number): number {
  if (target <= 0) return 0;
  return Math.min(100, Math.round((achieved / target) * 100));
}
