import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { type ReactNode } from "react";
import { Card, CardContent } from "@/shared/ui";
import { formatCurrency, formatNumber } from "@/shared/lib/format";
import type { MonthPoint, Pair } from "@/entities/dashboard/api";

export const PALETTE = [
  "#7c6cf0",
  "#22c55e",
  "#f59e0b",
  "#06b6d4",
  "#ec4899",
  "#a855f7",
  "#ef4444",
  "#84cc16",
];

const axis = { fontSize: 11, stroke: "hsl(var(--muted-foreground))" } as const;
const grid = "hsl(var(--border))";

export function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="mb-4">
          <h3 className="font-semibold">{title}</h3>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        {children}
      </CardContent>
    </Card>
  );
}

function tooltipStyle() {
  return {
    borderRadius: 10,
    border: "1px solid hsl(var(--border))",
    background: "hsl(var(--card))",
    color: "hsl(var(--card-foreground))",
    fontSize: 12,
  };
}

export function CollectionsTrend({ data }: { data: MonthPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={PALETTE[0]} stopOpacity={0.35} />
            <stop offset="100%" stopColor={PALETTE[0]} stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis dataKey="month" tick={axis} tickLine={false} axisLine={{ stroke: grid }} />
        <YAxis
          tick={axis}
          tickLine={false}
          axisLine={false}
          width={48}
          tickFormatter={(v) => (v >= 1000 ? `${v / 1000}k` : String(v))}
        />
        <Tooltip
          contentStyle={tooltipStyle()}
          formatter={(v: number) => [formatCurrency(v), "Collected"]}
        />
        <Area
          type="monotone"
          dataKey="total"
          stroke={PALETTE[0]}
          strokeWidth={2.5}
          fill="url(#grad)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function DonutChart({ data, money }: { data: Pair[]; money?: boolean }) {
  const fmt = money ? formatCurrency : formatNumber;
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <div className="flex items-center gap-4">
      <ResponsiveContainer width="55%" height={200}>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="label" innerRadius={52} outerRadius={80} paddingAngle={2}>
            {data.map((_, i) => (
              <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
            ))}
          </Pie>
          <Tooltip contentStyle={tooltipStyle()} formatter={(v: number) => fmt(v)} />
        </PieChart>
      </ResponsiveContainer>
      <ul className="flex-1 space-y-2">
        {data.map((d, i) => (
          <li key={d.label} className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: PALETTE[i % PALETTE.length] }} />
              <span className="capitalize text-muted-foreground">{d.label}</span>
            </span>
            <span className="font-medium">{total ? fmt(d.value) : "—"}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function BarsChart({ data, money }: { data: Pair[]; money?: boolean }) {
  const fmt = money ? formatCurrency : formatNumber;
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
        <XAxis dataKey="label" tick={axis} tickLine={false} axisLine={{ stroke: grid }} interval={0} />
        <YAxis tick={axis} tickLine={false} axisLine={false} width={44} />
        <Tooltip cursor={{ fill: "hsl(var(--muted))" }} contentStyle={tooltipStyle()} formatter={(v: number) => fmt(v)} />
        <Bar dataKey="value" radius={[6, 6, 0, 0]}>
          {data.map((_, i) => (
            <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
