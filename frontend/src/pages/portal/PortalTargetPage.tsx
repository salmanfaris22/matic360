import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Target as TargetIcon } from "lucide-react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { targetApi } from "@/entities/target/api";
import { periodLabel, progressPct, type TargetSeriesPoint } from "@/entities/target/model";
import { formatCurrency } from "@/shared/lib/format";
import { cn } from "@/shared/lib/cn";
import { Badge, Card, CardContent, CenteredSpinner, EmptyState } from "@/shared/ui";

type Gran = "day" | "week" | "month";

function bucket(series: TargetSeriesPoint[], gran: Gran): { label: string; amount: number }[] {
  if (gran === "day") {
    return series.map((p) => ({ label: String(new Date(p.date).getDate()), amount: p.amount }));
  }
  if (gran === "month") {
    const total = series.reduce((s, p) => s + p.amount, 0);
    return [{ label: "This month", amount: total }];
  }
  // week buckets within the month
  const weeks: Record<number, number> = {};
  series.forEach((p) => {
    const w = Math.floor((new Date(p.date).getDate() - 1) / 7) + 1;
    weeks[w] = (weeks[w] ?? 0) + p.amount;
  });
  return Object.keys(weeks).map((w) => ({ label: `W${w}`, amount: weeks[Number(w)] }));
}

export default function PortalTargetPage() {
  const { data, isLoading } = useQuery({ queryKey: ["targets", "me"], queryFn: targetApi.me });
  const [gran, setGran] = useState<Gran>("day");

  const chartData = useMemo(() => bucket(data?.series ?? [], gran), [data?.series, gran]);

  if (isLoading) return <CenteredSpinner label="Loading…" />;

  const current = data?.current;
  const monthAchieved = data?.month.achieved ?? 0;
  const targetAmt = current?.amount ?? 0;
  const pct = progressPct(monthAchieved, targetAmt);
  const remaining = Math.max(0, targetAmt - monthAchieved);

  return (
    <div className="space-y-5">
      <h1 className="flex items-center gap-2 text-xl font-semibold">
        <TargetIcon className="h-5 w-5 text-primary" /> My Target
      </h1>

      {/* Headline */}
      <Card>
        <CardContent className="space-y-3 p-5">
          {targetAmt > 0 ? (
            <>
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Collected this month</p>
                  <p className="text-2xl font-semibold">{formatCurrency(monthAchieved)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Target</p>
                  <p className="text-lg font-medium">{formatCurrency(targetAmt)}</p>
                </div>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={cn("h-full rounded-full transition-all", pct >= 100 ? "bg-[hsl(var(--success))]" : "bg-primary")}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className="flex justify-between text-xs">
                <span className="font-medium text-primary">{pct}% achieved</span>
                <span className="text-muted-foreground">{remaining > 0 ? `${formatCurrency(remaining)} to go` : "Target met 🎉"}</span>
              </div>
            </>
          ) : (
            <p className="py-2 text-center text-sm text-muted-foreground">No target set for this month yet.</p>
          )}
        </CardContent>
      </Card>

      {/* Graph */}
      <Card>
        <CardContent className="space-y-3 p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">Collections</p>
            <div className="flex gap-1 rounded-lg bg-muted p-0.5">
              {(["day", "week", "month"] as Gran[]).map((g) => (
                <button
                  key={g}
                  onClick={() => setGran(g)}
                  className={cn(
                    "rounded-md px-2.5 py-1 text-xs font-medium capitalize transition-colors",
                    gran === g ? "bg-background text-foreground shadow-sm" : "text-muted-foreground",
                  )}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>
          {chartData.length === 0 ? (
            <EmptyState title="No collections yet" description="Your collections will chart here." />
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={chartData}>
                <XAxis dataKey="label" fontSize={11} stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} />
                <Tooltip
                  cursor={{ fill: "hsl(var(--muted))" }}
                  formatter={(v: number) => [formatCurrency(v), "Collected"]}
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid hsl(var(--border))", background: "hsl(var(--popover))" }}
                />
                <Bar dataKey="amount" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* All active targets */}
      {data && data.targets.length > 0 && (
        <div>
          <p className="mb-2 text-sm font-semibold text-muted-foreground">All targets</p>
          <div className="space-y-2">
            {data.targets.map((t) => {
              const p = progressPct(t.achieved, t.amount);
              return (
                <Card key={t.id}>
                  <CardContent className="space-y-2 p-4">
                    <div className="flex items-center justify-between">
                      <Badge variant="secondary">{periodLabel[t.period]}</Badge>
                      <span className="text-sm">{formatCurrency(t.achieved)} / {formatCurrency(t.amount)}</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div className={cn("h-full rounded-full", p >= 100 ? "bg-[hsl(var(--success))]" : "bg-primary")} style={{ width: `${p}%` }} />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
