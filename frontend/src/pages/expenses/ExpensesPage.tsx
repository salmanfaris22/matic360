import { useState } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, X } from "lucide-react";
import { toast } from "sonner";
import { api, apiErrorMessage } from "@/shared/api/client";
import type { ApiEnvelope, PaginationMeta } from "@/shared/api/types";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CenteredSpinner,
  EmptyState,
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

interface Expense {
  id: number;
  expense_type: string;
  amount: number;
  remarks: string;
  status: string;
  user?: { name?: string } | null;
}

const variant: Record<string, "warning" | "success" | "destructive"> = {
  pending: "warning",
  approved: "success",
  rejected: "destructive",
};

export default function ExpensesPage() {
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["expenses", { status, page }],
    queryFn: async () => {
      const res = await api.get<ApiEnvelope<Expense[]>>("/expenses", {
        params: { status: status || undefined, page, per_page: 12 },
      });
      return { items: res.data.data ?? [], meta: res.data.meta as PaginationMeta };
    },
    placeholderData: keepPreviousData,
  });

  const act = useMutation({
    mutationFn: ({ id, action }: { id: number; action: "approve" | "reject" }) =>
      api.put(`/expenses/${id}/${action}`),
    onSuccess: () => {
      toast.success("Expense updated");
      qc.invalidateQueries({ queryKey: ["expenses"] });
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  const items = data?.items ?? [];
  const meta = data?.meta;

  return (
    <div className="space-y-6">
      <PageHeader title="Expenses" description="Staff expenses and approvals." />

      <Card>
        <CardContent className="p-0">
          <div className="flex items-center gap-3 border-b border-border p-4">
            <span className="text-sm text-muted-foreground">Status</span>
            <Select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              className="w-48"
            >
              <option value="">All</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </Select>
          </div>

          {isLoading ? (
            <CenteredSpinner label="Loading…" />
          ) : items.length === 0 ? (
            <EmptyState title="No expenses" description="Expenses logged by staff appear here." />
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Staff</TH>
                  <TH>Type</TH>
                  <TH>Amount</TH>
                  <TH>Remarks</TH>
                  <TH>Status</TH>
                  <TH className="text-right">Actions</TH>
                </TR>
              </THead>
              <TBody>
                {items.map((e) => (
                  <TR key={e.id}>
                    <TD className="font-medium">{e.user?.name ?? "—"}</TD>
                    <TD className="capitalize text-muted-foreground">{e.expense_type}</TD>
                    <TD>{formatCurrency(e.amount)}</TD>
                    <TD className="text-muted-foreground">{e.remarks || "—"}</TD>
                    <TD>
                      <Badge variant={variant[e.status] ?? "secondary"} className="capitalize">
                        {e.status}
                      </Badge>
                    </TD>
                    <TD>
                      <div className="flex justify-end gap-1">
                        {e.status === "pending" && (
                          <>
                            <Button size="sm" variant="outline" onClick={() => act.mutate({ id: e.id, action: "approve" })}>
                              <Check className="h-4 w-4" /> Approve
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => act.mutate({ id: e.id, action: "reject" })}>
                              <X className="h-4 w-4 text-destructive" />
                            </Button>
                          </>
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
    </div>
  );
}
