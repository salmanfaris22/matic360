import { useState } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MapPin, CheckCircle2, BadgeCheck } from "lucide-react";
import { toast } from "sonner";
import { attendanceApi } from "@/entities/attendance/api";
import type { AttendanceStatus } from "@/entities/attendance/model";
import { apiErrorMessage } from "@/shared/api/client";
import { mapsLink } from "@/shared/lib/geo";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CenteredSpinner,
  EmptyState,
  Input,
  PageHeader,
  Table,
  TBody,
  TD,
  TH,
  THead,
  TR,
} from "@/shared/ui";

const statusVariant: Record<AttendanceStatus, "success" | "secondary" | "warning" | "destructive"> = {
  present: "success",
  late: "warning",
  half_day: "warning",
  absent: "destructive",
};

const timeOf = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—";

export default function AttendanceAdminPage() {
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [page, setPage] = useState(1);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["attendance", "admin", { date, page }],
    queryFn: () => attendanceApi.adminList({ date, page, per_page: 15 }),
    placeholderData: keepPreviousData,
  });

  const verify = useMutation({
    mutationFn: (id: number) => attendanceApi.verify(id),
    onSuccess: () => {
      toast.success("Attendance verified");
      qc.invalidateQueries({ queryKey: ["attendance", "admin"] });
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  const items = data?.items ?? [];
  const meta = data?.meta;

  return (
    <div className="space-y-6">
      <PageHeader title="Attendance" description="Review and verify staff check-ins with GPS." />

      <Card>
        <CardContent className="p-0">
          <div className="flex items-center gap-3 border-b border-border p-4">
            <label className="text-sm text-muted-foreground">Date</label>
            <Input
              type="date"
              value={date}
              onChange={(e) => {
                setDate(e.target.value);
                setPage(1);
              }}
              className="w-44"
            />
          </div>

          {isLoading ? (
            <CenteredSpinner label="Loading…" />
          ) : items.length === 0 ? (
            <EmptyState title="No attendance" description="No records for this date." />
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Staff</TH>
                  <TH>In</TH>
                  <TH>Out</TH>
                  <TH>Break</TH>
                  <TH>Hours</TH>
                  <TH>Status</TH>
                  <TH>Location</TH>
                  <TH className="text-right">Verify</TH>
                </TR>
              </THead>
              <TBody>
                {items.map((a) => (
                  <TR key={a.id}>
                    <TD>
                      <p className="font-medium">{a.staff?.name ?? `#${a.staff_id}`}</p>
                      <p className="text-xs text-muted-foreground">{a.staff?.employee_id}</p>
                    </TD>
                    <TD>{timeOf(a.check_in_at)}</TD>
                    <TD>
                      {timeOf(a.check_out_at)}
                      {a.auto_closed && (
                        <span className="ml-1 rounded bg-warning/15 px-1 py-0.5 text-[10px] text-warning">
                          auto
                        </span>
                      )}
                    </TD>
                    <TD>{Math.round(a.break_minutes)}m</TD>
                    <TD>{a.working_hours.toFixed(2)}</TD>
                    <TD>
                      {a.on_break ? (
                        <Badge variant="warning">On break</Badge>
                      ) : (
                        <Badge variant={statusVariant[a.status]} className="capitalize">
                          {a.status.replace("_", " ")}
                        </Badge>
                      )}
                    </TD>
                    <TD>
                      {a.check_in_lat || a.check_in_lng ? (
                        <a
                          href={mapsLink(a.check_in_lat, a.check_in_lng)}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex flex-col text-sm text-primary hover:underline"
                        >
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5" /> Map
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {a.check_in_lat.toFixed(4)}, {a.check_in_lng.toFixed(4)}
                          </span>
                        </a>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TD>
                    <TD>
                      <div className="flex justify-end">
                        {a.is_verified ? (
                          <Badge variant="success">
                            <BadgeCheck className="mr-1 h-3.5 w-3.5" /> Verified
                          </Badge>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            loading={verify.isPending && verify.variables === a.id}
                            onClick={() => verify.mutate(a.id)}
                          >
                            <CheckCircle2 className="h-4 w-4" /> Verify
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
              <p className="text-muted-foreground">
                Page {meta.page} of {meta.total_pages}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
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
