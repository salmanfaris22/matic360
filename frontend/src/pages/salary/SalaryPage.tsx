import { useState } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { Plus, Check, IndianRupee, CalendarPlus } from "lucide-react";
import { toast } from "sonner";
import { api, apiErrorMessage } from "@/shared/api/client";
import type { ApiEnvelope, PaginationMeta } from "@/shared/api/types";
import { staffApi } from "@/entities/staff/api";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CenteredSpinner,
  EmptyState,
  Input,
  Label,
  Modal,
  PageHeader,
  Select,
  Table,
  TBody,
  TD,
  TH,
  THead,
  TR,
} from "@/shared/ui";
import { formatCurrency } from "@/shared/lib/format";

interface Salary {
  id: number;
  month: number;
  year: number;
  basic: number;
  net_amount: number;
  status: string;
  staff?: { name?: string; employee_id?: string } | null;
}

const monthNames = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const variant: Record<string, "warning" | "default" | "success"> = {
  pending: "warning",
  approved: "default",
  paid: "success",
};

export default function SalaryPage() {
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["salaries", { page }],
    queryFn: async () => {
      const res = await api.get<ApiEnvelope<Salary[]>>("/salaries", { params: { page, per_page: 12 } });
      return { items: res.data.data ?? [], meta: res.data.meta as PaginationMeta };
    },
    placeholderData: keepPreviousData,
  });

  const { data: staff } = useQuery({
    queryKey: ["staff", "all"],
    queryFn: () => staffApi.list({ per_page: 100 }),
    enabled: open,
  });

  const act = useMutation({
    mutationFn: ({ id, action }: { id: number; action: "approve" | "pay" }) =>
      api.put(`/salaries/${id}/${action}`),
    onSuccess: () => {
      toast.success("Salary updated");
      qc.invalidateQueries({ queryKey: ["salaries"] });
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  const create = useMutation({
    mutationFn: (payload: Record<string, unknown>) => api.post("/salaries", payload),
    onSuccess: () => {
      toast.success("Salary generated");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["salaries"] });
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Could not generate salary")),
  });

  const generateDue = useMutation({
    mutationFn: () => api.post("/salaries/generate", {}),
    onSuccess: (res) => {
      const created = (res.data as { data?: { created?: number } })?.data?.created ?? 0;
      toast.success(created > 0 ? `Generated ${created} due salaries` : "Everyone already has this month's salary");
      qc.invalidateQueries({ queryKey: ["salaries"] });
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Could not generate due salaries")),
  });

  const items = data?.items ?? [];
  const meta = data?.meta;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Salary"
        description="Generate payroll and manage approvals."
        action={
          <>
            <Button variant="outline" onClick={() => generateDue.mutate()} loading={generateDue.isPending}>
              <CalendarPlus className="h-4 w-4" /> Generate due (this month)
            </Button>
            <Button onClick={() => setOpen(true)}>
              <Plus className="h-4 w-4" /> Add manually
            </Button>
          </>
        }
      />

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <CenteredSpinner label="Loading…" />
          ) : items.length === 0 ? (
            <EmptyState title="No salary records" description="Generate payroll for a staff member." />
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Staff</TH>
                  <TH>Period</TH>
                  <TH>Basic</TH>
                  <TH>Net</TH>
                  <TH>Status</TH>
                  <TH className="text-right">Actions</TH>
                </TR>
              </THead>
              <TBody>
                {items.map((s) => (
                  <TR key={s.id}>
                    <TD className="font-medium">{s.staff?.name ?? "—"}</TD>
                    <TD>{monthNames[s.month]} {s.year}</TD>
                    <TD>{formatCurrency(s.basic)}</TD>
                    <TD className="font-medium">{formatCurrency(s.net_amount)}</TD>
                    <TD>
                      <Badge variant={variant[s.status] ?? "secondary"} className="capitalize">
                        {s.status}
                      </Badge>
                    </TD>
                    <TD>
                      <div className="flex justify-end gap-1">
                        {s.status === "pending" && (
                          <Button size="sm" variant="outline" onClick={() => act.mutate({ id: s.id, action: "approve" })}>
                            <Check className="h-4 w-4" /> Approve
                          </Button>
                        )}
                        {s.status === "approved" && (
                          <Button size="sm" variant="outline" onClick={() => act.mutate({ id: s.id, action: "pay" })}>
                            <IndianRupee className="h-4 w-4" /> Mark paid
                          </Button>
                        )}
                      </div>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}

          {meta && meta.total_pages > 1 && (
            <div className="flex items-center justify-between border-t border-border p-4 text-sm">
              <p className="text-muted-foreground">Page {meta.page} of {meta.total_pages}</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  Previous
                </Button>
                <Button variant="outline" size="sm" disabled={page >= meta.total_pages} onClick={() => setPage((p) => p + 1)}>
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title="Generate salary" size="lg">
        <SalaryForm
          staffOptions={(staff?.items ?? []).map((s) => ({ value: s.id, label: `${s.name} (${s.employee_id})` }))}
          submitting={create.isPending}
          onSubmit={(v) => create.mutate(v)}
          onCancel={() => setOpen(false)}
        />
      </Modal>
    </div>
  );
}

function SalaryForm({
  staffOptions,
  submitting,
  onSubmit,
  onCancel,
}: {
  staffOptions: { value: number; label: string }[];
  submitting: boolean;
  onSubmit: (v: Record<string, unknown>) => void;
  onCancel: () => void;
}) {
  const now = new Date();
  const { register, handleSubmit } = useForm({
    defaultValues: {
      staff_id: "",
      month: now.getMonth() + 1,
      year: now.getFullYear(),
      basic: 0,
      allowances: 0,
      incentives: 0,
      bonus: 0,
      deductions: 0,
    },
  });

  const submit = handleSubmit((v) =>
    onSubmit({ ...v, staff_id: Number(v.staff_id), month: Number(v.month), year: Number(v.year) }),
  );

  const num = (name: string, label: string) => (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      <Input type="number" step="0.01" {...register(name as never, { valueAsNumber: true })} />
    </div>
  );

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <Label>Staff</Label>
          <Select {...register("staff_id")}>
            <option value="">— Select staff —</option>
            {staffOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Month</Label>
          <Select {...register("month")}>
            {monthNames.slice(1).map((m, i) => (
              <option key={m} value={i + 1}>
                {m}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Year</Label>
          <Input type="number" {...register("year", { valueAsNumber: true })} />
        </div>
        {num("basic", "Basic")}
        {num("allowances", "Allowances")}
        {num("incentives", "Incentives")}
        {num("bonus", "Bonus")}
        {num("deductions", "Deductions")}
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" loading={submitting}>
          Generate
        </Button>
      </div>
    </form>
  );
}
