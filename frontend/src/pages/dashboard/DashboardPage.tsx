import { useQuery } from "@tanstack/react-query";
import {
  Users,
  UserCheck,
  Store,
  Building2,
  Wallet,
  ReceiptIndianRupee,
  Network,
  UserCog,
  type LucideIcon,
} from "lucide-react";
import { dashboardApi, type DashboardSummary } from "@/entities/dashboard/api";
import { useCurrentUser } from "@/entities/auth/session.store";
import { Card, CardContent, CenteredSpinner, ErrorState, PageHeader } from "@/shared/ui";
import { formatCurrency, formatNumber } from "@/shared/lib/format";
import {
  BarsChart,
  ChartCard,
  CollectionsTrend,
  DonutChart,
} from "@/widgets/charts/DashboardCharts";

interface Stat {
  label: string;
  value: string;
  icon: LucideIcon;
  tone: string;
}

function buildStats(s: DashboardSummary): Stat[] {
  return [
    { label: "Total Staff", value: formatNumber(s.staff_total), icon: Users, tone: "text-indigo-500 bg-indigo-500/10" },
    { label: "Active Staff", value: formatNumber(s.staff_active), icon: UserCheck, tone: "text-emerald-500 bg-emerald-500/10" },
    { label: "Clients", value: formatNumber(s.customers), icon: Store, tone: "text-sky-500 bg-sky-500/10" },
    { label: "Outstanding", value: formatCurrency(s.outstanding_amount), icon: Wallet, tone: "text-amber-500 bg-amber-500/10" },
    { label: "Pending Payments", value: formatNumber(s.pending_payments), icon: ReceiptIndianRupee, tone: "text-rose-500 bg-rose-500/10" },
    { label: "Branches", value: formatNumber(s.branches), icon: Building2, tone: "text-violet-500 bg-violet-500/10" },
    { label: "Departments", value: formatNumber(s.departments), icon: Network, tone: "text-cyan-500 bg-cyan-500/10" },
    { label: "Users", value: formatNumber(s.users), icon: UserCog, tone: "text-fuchsia-500 bg-fuchsia-500/10" },
  ];
}

export default function DashboardPage() {
  const user = useCurrentUser();
  const summary = useQuery({ queryKey: ["dashboard", "summary"], queryFn: dashboardApi.summary });
  const charts = useQuery({ queryKey: ["dashboard", "charts"], queryFn: dashboardApi.charts });

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Welcome back, ${user?.name?.split(" ")[0] ?? "there"} 👋`}
        description="Here's what's happening across your distribution network today."
      />

      {summary.isLoading && <CenteredSpinner label="Loading dashboard…" />}
      {summary.isError && <ErrorState message="Could not load dashboard metrics." />}

      {summary.data && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {buildStats(summary.data).map((stat) => (
            <Card key={stat.label}>
              <CardContent className="flex items-center justify-between p-5">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="mt-1 text-2xl font-semibold tracking-tight">{stat.value}</p>
                </div>
                <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${stat.tone}`}>
                  <stat.icon className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {charts.data && (
        <>
          <ChartCard title="Collections trend" subtitle="Approved payments, last 6 months">
            <CollectionsTrend data={charts.data.collections_trend} />
          </ChartCard>

          <div className="grid gap-4 lg:grid-cols-2">
            <ChartCard title="Attendance today" subtitle="Across active staff">
              <DonutChart data={charts.data.attendance_today} />
            </ChartCard>
            <ChartCard title="Payments by status">
              <BarsChart data={charts.data.payments_by_status} />
            </ChartCard>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <ChartCard title="Expenses by type" subtitle="Total amount">
              <DonutChart data={charts.data.expenses_by_type} money />
            </ChartCard>
            <ChartCard title="Outstanding by district">
              <BarsChart data={charts.data.outstanding_by_district} money />
            </ChartCard>
          </div>

          <ChartCard title="Staff by department">
            <BarsChart data={charts.data.staff_by_department} />
          </ChartCard>
        </>
      )}
    </div>
  );
}
