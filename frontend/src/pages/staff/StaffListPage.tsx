import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Pencil, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { staffApi } from "@/entities/staff/api";
import type { Staff, StaffStatus } from "@/entities/staff/model";
import { apiErrorMessage } from "@/shared/api/client";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CenteredSpinner,
  EmptyState,
  ErrorState,
  Input,
  Table,
  TBody,
  TD,
  TH,
  THead,
  TR,
} from "@/shared/ui";
import { formatCurrency, initials } from "@/shared/lib/format";
import { useDebounce } from "@/shared/hooks/useDebounce";

const statusVariant: Record<StaffStatus, "success" | "secondary" | "warning" | "destructive"> = {
  active: "success",
  inactive: "secondary",
  resigned: "warning",
  terminated: "destructive",
};

export default function StaffListPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const debounced = useDebounce(search, 350);
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data, isLoading, isError, isFetching } = useQuery({
    queryKey: ["staff", { search: debounced, page }],
    queryFn: () => staffApi.list({ search: debounced, page, per_page: 10 }),
    placeholderData: keepPreviousData,
  });

  const remove = useMutation({
    mutationFn: (id: number) => staffApi.remove(id),
    onSuccess: () => {
      toast.success("Staff deleted");
      qc.invalidateQueries({ queryKey: ["staff"] });
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Delete failed")),
  });

  const onDelete = (s: Staff) => {
    if (window.confirm(`Delete ${s.name} (${s.employee_id})? This cannot be undone.`)) {
      remove.mutate(s.id);
    }
  };

  const items = data?.items ?? [];
  const meta = data?.meta;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Staff</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage employees, KYC, departments and branches.
          </p>
        </div>
        <Button onClick={() => navigate("/staff/new")}>
          <Plus className="h-4 w-4" /> Add staff
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="flex items-center gap-2 border-b border-border p-4">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Search by name, ID, phone, email…"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </div>
            {isFetching && <span className="text-xs text-muted-foreground">Updating…</span>}
          </div>

          {isLoading ? (
            <CenteredSpinner label="Loading staff…" />
          ) : isError ? (
            <ErrorState message="Failed to load staff." />
          ) : items.length === 0 ? (
            <EmptyState
              icon={<Users className="h-6 w-6" />}
              title="No staff found"
              description="Add your first employee to get started."
              action={
                <Button onClick={() => navigate("/staff/new")}>
                  <Plus className="h-4 w-4" /> Add staff
                </Button>
              }
            />
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Employee</TH>
                  <TH>Designation</TH>
                  <TH>Branch</TH>
                  <TH>Department</TH>
                  <TH>Salary</TH>
                  <TH>Status</TH>
                  <TH className="text-right">Actions</TH>
                </TR>
              </THead>
              <TBody>
                {items.map((s) => (
                  <TR key={s.id}>
                    <TD>
                      <div className="flex items-center gap-3">
                        {s.photo_url ? (
                          <img
                            src={s.photo_url}
                            alt={s.name}
                            className="h-9 w-9 rounded-full object-cover"
                          />
                        ) : (
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold uppercase text-primary">
                            {initials(s.name)}
                          </div>
                        )}
                        <div className="leading-tight">
                          <p className="font-medium">{s.name}</p>
                          <p className="text-xs text-muted-foreground">{s.employee_id}</p>
                        </div>
                      </div>
                    </TD>
                    <TD className="text-muted-foreground">{s.designation || "—"}</TD>
                    <TD className="text-muted-foreground">{s.branch?.name ?? "—"}</TD>
                    <TD className="text-muted-foreground">{s.department?.name ?? "—"}</TD>
                    <TD>{formatCurrency(s.salary)}</TD>
                    <TD>
                      <Badge variant={statusVariant[s.status]} className="capitalize">
                        {s.status}
                      </Badge>
                    </TD>
                    <TD>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Edit"
                          onClick={() => navigate(`/staff/${s.id}/edit`)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Delete"
                          onClick={() => onDelete(s)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}

          {meta && meta.total_pages > 1 && (
            <div className="flex items-center justify-between border-t border-border p-4 text-sm">
              <p className="text-muted-foreground">
                Page {meta.page} of {meta.total_pages} · {meta.total} total
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= meta.total_pages}
                  onClick={() => setPage((p) => p + 1)}
                >
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
