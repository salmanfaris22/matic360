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

interface Payment {
  id: number;
  amount: number;
  payment_type: string;
  status: string;
  notes: string;
  customer?: { name?: string } | null;
}

const variant: Record<string, "warning" | "default" | "success" | "destructive"> = {
  pending: "warning",
  admin_approved: "default",
  approved: "success",
  rejected: "destructive",
};

export default function PaymentsPage() {
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["payments", { status, page }],
    queryFn: async () => {
      const res = await api.get<ApiEnvelope<Payment[]>>("/payments", {
        params: { status: status || undefined, page, per_page: 12 },
      });
      return {
        items: res.data.data ?? [],
        meta: res.data.meta as PaginationMeta,
      };
    },
    placeholderData: keepPreviousData,
  });

  const act = useMutation({
    mutationFn: ({ id, action }: { id: number; action: "approve" | "reject" }) =>
      api.put(`/payments/${id}/${action}`),
    onSuccess: () => {
      toast.success("Payment updated");
      qc.invalidateQueries({ queryKey: ["payments"] });
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  const items = data?.items ?? [];
  const meta = data?.meta;

  return (
    <div className="space-y-6">
      <PageHeader title="Payments" description="Collections and the approval workflow." />

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
              <option value="admin_approved">Admin approved</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </Select>
          </div>

          {isLoading ? (
            <CenteredSpinner label="Loading…" />
          ) : items.length === 0 ? (
            <EmptyState title="No payments" description="Collections recorded by staff appear here." />
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Customer</TH>
                  <TH>Amount</TH>
                  <TH>Type</TH>
                  <TH>Notes</TH>
                  <TH>Status</TH>
                  <TH className="text-right">Actions</TH>
                </TR>
              </THead>
              <TBody>
                {items.map((p) => (
                  <TR key={p.id}>
                    <TD className="font-medium">{p.customer?.name ?? "—"}</TD>
                    <TD>{formatCurrency(p.amount)}</TD>
                    <TD className="capitalize text-muted-foreground">{p.payment_type?.replace("_", " ")}</TD>
                    <TD className="text-muted-foreground">{p.notes || "—"}</TD>
                    <TD>
                      <Badge variant={variant[p.status] ?? "secondary"} className="capitalize">
                        {p.status.replace("_", " ")}
                      </Badge>
                    </TD>
                    <TD>
                      <div className="flex justify-end gap-1">
                        {p.status !== "approved" && p.status !== "rejected" && (
                          <>
                            <Button size="sm" variant="outline" onClick={() => act.mutate({ id: p.id, action: "approve" })}>
                              <Check className="h-4 w-4" /> Approve
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => act.mutate({ id: p.id, action: "reject" })}>
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
