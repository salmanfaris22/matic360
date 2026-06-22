import { useState } from "react";
import { LogIn, LogOut, CalendarClock, Coffee, MapPin, ChevronRight } from "lucide-react";
import { useAttendanceHistory } from "@/features/attendance/hooks";
import type { Attendance, AttendanceStatus } from "@/entities/attendance/model";
import { mapsLink } from "@/shared/lib/geo";
import { Badge, Button, Card, CardContent, CenteredSpinner, EmptyState, Modal } from "@/shared/ui";
import { formatDate, formatDuration } from "@/shared/lib/format";

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
  const [active, setActive] = useState<Attendance | null>(null);
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
                <button className="flex flex-1 items-center justify-between text-left" onClick={() => setActive(a)}>
                  <div>
                    <p className="font-medium">{formatDate(a.date)}</p>
                    <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><LogIn className="h-3.5 w-3.5" /> {timeOf(a.check_in_at)}</span>
                      <span className="flex items-center gap-1"><LogOut className="h-3.5 w-3.5" /> {timeOf(a.check_out_at)}</span>
                      {a.break_minutes > 0 && (
                        <span className="flex items-center gap-1">
                          <Coffee className="h-3.5 w-3.5" /> {Math.round(a.break_minutes)}m
                          {a.breaks && a.breaks.length > 0 ? ` · ${a.breaks.length}×` : ""}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <Badge variant={statusVariant[a.status]} className="capitalize">{a.status.replace("_", " ")}</Badge>
                      <p className="mt-1 text-xs text-muted-foreground">{formatDuration(a.working_hours)}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {data && data.meta.total_pages > 1 && (
        <div className="flex justify-between gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
          <Button variant="outline" size="sm" disabled={page >= data.meta.total_pages} onClick={() => setPage((p) => p + 1)}>Next</Button>
        </div>
      )}

      <Modal open={active != null} onClose={() => setActive(null)} variant="sheet" title={active ? formatDate(active.date) : ""}>
        {active && <AttendanceDetail a={active} />}
      </Modal>
    </div>
  );
}

function AttendanceDetail({ a }: { a: Attendance }) {
  const breaks = a.breaks ?? [];
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2 text-center">
        <Punch label="In" time={timeOf(a.check_in_at)} selfie={a.check_in_selfie} />
        <div className="rounded-lg bg-muted/60 p-2">
          <p className="text-sm font-semibold">{formatDuration(a.working_hours)}</p>
          <p className="text-[10px] text-muted-foreground">Worked</p>
        </div>
        <Punch label="Out" time={timeOf(a.check_out_at)} selfie={a.check_out_selfie} />
      </div>

      <div className="flex items-center justify-between rounded-lg border border-border p-3 text-sm">
        <span className="text-muted-foreground">Status</span>
        <Badge variant={statusVariant[a.status]} className="capitalize">{a.status.replace("_", " ")}</Badge>
      </div>

      {(a.check_in_lat || a.check_in_lng) && (
        <a href={mapsLink(a.check_in_lat, a.check_in_lng)} target="_blank" rel="noreferrer"
          className="flex items-center gap-2 rounded-lg border border-border p-3 text-sm text-primary">
          <MapPin className="h-4 w-4" /> View check-in location
        </a>
      )}

      <div>
        <p className="mb-1.5 text-xs font-semibold text-muted-foreground">
          Breaks ({breaks.length}) · {Math.round(a.break_minutes)}m total
        </p>
        {breaks.length === 0 ? (
          <p className="text-sm text-muted-foreground">No breaks.</p>
        ) : (
          <div className="space-y-1.5">
            {breaks.map((b) => (
              <div key={b.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
                <span>{timeOf(b.started_at)} – {b.ended_at ? timeOf(b.ended_at) : "…"}</span>
                <span className="text-muted-foreground">{Math.round(b.minutes)}m</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Punch({ label, time, selfie }: { label: string; time: string; selfie?: string }) {
  return (
    <div className="rounded-lg bg-muted/60 p-2">
      {selfie ? (
        <a href={selfie} target="_blank" rel="noreferrer"><img src={selfie} alt={label} className="mx-auto mb-1 h-9 w-9 rounded-full object-cover" /></a>
      ) : null}
      <p className="text-sm font-semibold">{time}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}
