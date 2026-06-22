import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Plus, Check } from "lucide-react";
import { toast } from "sonner";
import { targetApi, type CreateTargetInput } from "@/entities/target/api";
import { periodOptions, progressPct, type AdminTargetRow, type TargetPeriod } from "@/entities/target/model";
import { apiErrorMessage } from "@/shared/api/client";
import { formatCurrency } from "@/shared/lib/format";
import { cn } from "@/shared/lib/cn";
import {
  Button, Card, CardContent, CenteredSpinner, EmptyState, Input, Label, Modal, PageHeader,
  Select, Table, TBody, TD, TH, THead, TR,
} from "@/shared/ui";

export default function TargetsPage() {
  const qc = useQueryClient();
  const { data: rows = [], isLoading } = useQuery({ queryKey: ["targets", "admin"], queryFn: targetApi.adminList });
  const [addFor, setAddFor] = useState<AdminTargetRow | null>(null);

  const chartData = rows
    .filter((r) => r.monthly_target > 0 || r.achieved > 0)
    .map((r) => ({ name: r.name.split(" ")[0], Target: r.monthly_target, Achieved: r.achieved }));

  return (
    <div className="space-y-6">
      <PageHeader title="Targets" description="Monthly collection goals per staff (paid-based progress)." />

      {/* Target vs achieved chart */}
      <Card>
        <CardContent className="p-5">
          <p className="mb-3 text-sm font-semibold">This month — target vs achieved</p>
          {chartData.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Set targets below to see the chart.</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="name" fontSize={11} stroke="hsl(var(--muted-foreground))" tickLine={false} />
                <YAxis fontSize={11} stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} width={48} />
                <Tooltip
                  formatter={(v: number) => formatCurrency(v)}
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid hsl(var(--border))", background: "hsl(var(--popover))" }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="Target" fill="hsl(var(--muted-foreground))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Achieved" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <CenteredSpinner label="Loading…" />
          ) : rows.length === 0 ? (
            <EmptyState title="No active staff" description="Active staff appear here." />
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Staff</TH>
                  <TH>Monthly target</TH>
                  <TH>Achieved</TH>
                  <TH>Progress</TH>
                  <TH className="text-right">More</TH>
                </TR>
              </THead>
              <TBody>
                {rows.map((r) => (
                  <TargetRow key={r.staff_id} row={r} onAddPeriod={() => setAddFor(r)} />
                ))}
              </TBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AddPeriodTargetModal
        row={addFor}
        onClose={() => setAddFor(null)}
        onSaved={() => qc.invalidateQueries({ queryKey: ["targets"] })}
      />
    </div>
  );
}

function TargetRow({ row, onAddPeriod }: { row: AdminTargetRow; onAddPeriod: () => void }) {
  const qc = useQueryClient();
  const [amount, setAmount] = useState(String(row.monthly_target || ""));
  const pct = progressPct(row.achieved, row.monthly_target);

  const save = useMutation({
    mutationFn: () => targetApi.setDefault(row.staff_id, Number(amount) || 0),
    onSuccess: () => {
      toast.success("Target updated");
      qc.invalidateQueries({ queryKey: ["targets"] });
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  const dirty = String(row.monthly_target || "") !== amount;

  return (
    <TR>
      <TD>
        <p className="font-medium">{row.name}</p>
        <p className="text-xs text-muted-foreground">{row.employee_id}</p>
      </TD>
      <TD>
        <div className="flex items-center gap-1.5">
          <Input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-28"
            placeholder="0"
          />
          <Button size="sm" variant={dirty ? "default" : "outline"} disabled={!dirty} loading={save.isPending} onClick={() => save.mutate()}>
            <Check className="h-4 w-4" />
          </Button>
        </div>
      </TD>
      <TD className="font-medium">{formatCurrency(row.achieved)}</TD>
      <TD>
        <div className="flex items-center gap-2">
          <div className="h-2 w-24 overflow-hidden rounded-full bg-muted">
            <div className={cn("h-full rounded-full", pct >= 100 ? "bg-[hsl(var(--success))]" : "bg-primary")} style={{ width: `${pct}%` }} />
          </div>
          <span className="text-xs text-muted-foreground">{pct}%</span>
        </div>
      </TD>
      <TD className="text-right">
        <Button size="sm" variant="ghost" onClick={onAddPeriod}>
          <Plus className="h-4 w-4" /> Target
        </Button>
      </TD>
    </TR>
  );
}

function AddPeriodTargetModal({ row, onClose, onSaved }: { row: AdminTargetRow | null; onClose: () => void; onSaved: () => void }) {
  const [period, setPeriod] = useState<TargetPeriod>("monthly");
  const [amount, setAmount] = useState("");

  const create = useMutation({
    mutationFn: () => {
      const input: CreateTargetInput = { staff_id: row!.staff_id, period, amount: Number(amount) };
      return targetApi.create(input);
    },
    onSuccess: () => {
      toast.success("Target added");
      onSaved();
      setAmount("");
      onClose();
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  return (
    <Modal
      open={row != null}
      onClose={onClose}
      title={row ? `Add target — ${row.name}` : "Add target"}
      size="sm"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button loading={create.isPending} disabled={!(Number(amount) > 0)} onClick={() => create.mutate()}>Add</Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label>Period</Label>
          <Select value={period} onChange={(e) => setPeriod(e.target.value as TargetPeriod)}>
            {periodOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Target amount</Label>
          <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" />
        </div>
        <p className="text-xs text-muted-foreground">
          Monthly targets auto-create each month from the staff's default amount. Use this to add a one-off weekly / 3-month / 6-month / yearly target.
        </p>
      </div>
    </Modal>
  );
}
