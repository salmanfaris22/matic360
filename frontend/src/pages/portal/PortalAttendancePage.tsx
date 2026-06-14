import { useState } from "react";
import { LogIn, LogOut, CalendarClock } from "lucide-react";
import { useAttendanceHistory } from "@/features/attendance/hooks";
import type { AttendanceStatus } from "@/entities/attendance/model";
import { Badge, Button, Card, CardContent, CenteredSpinner, EmptyState } from "@/shared/ui";
import { formatDate } from "@/shared/lib/format";

const statusVariant: Record<AttendanceStatus, "success" | "secondary" | "warning" | "destructive"> = {
  present: "success",
  late: "warning",
  half_day: "warning",
  absent: "destructive",
};

function timeOf(iso?: string | null) {
  return iso ? new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—";
}

export default function PortalAttendancePage() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useAttendanceHistory(page);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">My Attendance</h1>

      {isLoading ? (
        <CenteredSpinner />
      ) : !data || data.items.length === 0 ? (
        <EmptyState
          icon={<CalendarClock className="h-6 w-6" />}
          title="No attendance yet"
          description="Your check-ins will appear here."
        />
      ) : (
        <div className="space-y-2.5">
          {data.items.map((a) => (
            <Card key={a.id}>
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <p className="font-medium">{formatDate(a.date)}</p>
                  <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <LogIn className="h-3.5 w-3.5" /> {timeOf(a.check_in_at)}
                    </span>
                    <span className="flex items-center gap-1">
                      <LogOut className="h-3.5 w-3.5" /> {timeOf(a.check_out_at)}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <Badge variant={statusVariant[a.status]} className="capitalize">
                    {a.status.replace("_", " ")}
                  </Badge>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {a.working_hours.toFixed(1)}h
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {data && data.meta.total_pages > 1 && (
        <div className="flex justify-between gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= data.meta.total_pages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
