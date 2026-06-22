import { useState } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MapPin, CheckCircle2, BadgeCheck, Coffee, X, Plus, Eye, Pencil } from "lucide-react";
import { toast } from "sonner";
import { attendanceApi, type AdminAttendanceInput } from "@/entities/attendance/api";
import type { Attendance, AttendanceStatus } from "@/entities/attendance/model";
import { api, apiErrorMessage } from "@/shared/api/client";
import type { ApiEnvelope } from "@/shared/api/types";
import { mapsLink } from "@/shared/lib/geo";
import { formatDate, formatDuration } from "@/shared/lib/format";
import {
  Badge, Button, Card, CardContent, CenteredSpinner, EmptyState, Input, Label, Modal,
  PageHeader, Select, Table, TBody, TD, TH, THead, TR,
} from "@/shared/ui";

const statusVariant: Record<AttendanceStatus, "success" | "secondary" | "warning" | "destructive"> = {
  present: "success",
  late: "warning",
  half_day: "warning",
  absent: "destructive",
};

const statusOptions: AttendanceStatus[] = ["present", "late", "half_day", "absent"];

const timeOf = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—";

// ISO → "HH:MM" (local) for time inputs.
const hhmm = (iso?: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

export default function AttendanceAdminPage() {
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [staffId, setStaffId] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [addOpen, setAddOpen] = useState(false);
  const [detail, setDetail] = useState<Attendance | null>(null);
  const qc = useQueryClient();

  const { data: staff = [] } = useQuery({
    queryKey: ["lookup", "staff"],
    queryFn: async () => {
      const res = await api.get<ApiEnvelope<{ id: number; name: string }[]>>("/staff", { params: { per_page: 100 } });
      return res.data.data ?? [];
    },
    staleTime: 60_000,
  });

  const { data, isLoading } = useQuery({
    queryKey: ["attendance", "admin", { date, staffId, status, page }],
    queryFn: () =>
      attendanceApi.adminList({
        date: date || undefined,
        staff_id: staffId || undefined,
        status: status || undefined,
        page,
        per_page: 15,
      }),
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

  const clearAuto = useMutation({
    mutationFn: (id: number) => attendanceApi.clearAuto(id),
    onSuccess: () => {
      toast.success("Auto check-out removed");
      qc.invalidateQueries({ queryKey: ["attendance", "admin"] });
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  const items = data?.items ?? [];
  const meta = data?.meta;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <PageHeader title="Attendance" description="Review, verify and edit staff check-ins with GPS, selfies and breaks." />
        <Button onClick={() => setAddOpen(true)}><Plus className="h-4 w-4" /> Add attendance</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="flex flex-wrap items-end gap-3 border-b border-border p-4">
            <div className="space-y-1">
              <span className="block text-xs text-muted-foreground">Date</span>
              <Input type="date" value={date} onChange={(e) => { setDate(e.target.value); setPage(1); }} className="w-44" />
            </div>
            <div className="space-y-1">
              <span className="block text-xs text-muted-foreground">Staff</span>
              <Select value={staffId} onChange={(e) => { setStaffId(e.target.value); setPage(1); }} className="w-44">
                <option value="">All staff</option>
                {staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </Select>
            </div>
            <div className="space-y-1">
              <span className="block text-xs text-muted-foreground">Status</span>
              <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="w-40">
                <option value="">All</option>
                <option value="present">🟢 Present</option>
                <option value="late">🟡 Late</option>
                <option value="half_day">🟡 Half day</option>
                <option value="absent">🔴 Absent</option>
              </Select>
            </div>
            {date && <Button variant="ghost" size="sm" onClick={() => { setDate(""); setPage(1); }}>All dates</Button>}
          </div>

          {isLoading ? (
            <CenteredSpinner label="Loading…" />
          ) : items.length === 0 ? (
            <EmptyState title="No attendance" description="No records for this filter." />
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Staff</TH><TH>In</TH><TH>Out</TH><TH>Breaks</TH><TH>Hours</TH><TH>Status</TH><TH>Location</TH>
                  <TH className="text-right">Actions</TH>
                </TR>
              </THead>
              <TBody>
                {items.map((a) => (
                  <TR key={a.id}>
                    <TD>
                      <p className="font-medium">{a.staff?.name ?? `#${a.staff_id}`}</p>
                      <p className="text-xs text-muted-foreground">{a.staff?.employee_id} · {formatDate(a.date)}</p>
                    </TD>
                    <TD><PunchCell time={timeOf(a.check_in_at)} selfie={a.check_in_selfie} /></TD>
                    <TD>
                      <PunchCell time={timeOf(a.check_out_at)} selfie={a.check_out_selfie} />
                      {a.auto_closed && (
                        <button
                          onClick={() => clearAuto.mutate(a.id)}
                          disabled={clearAuto.isPending && clearAuto.variables === a.id}
                          className="mt-1 inline-flex items-center gap-1 rounded bg-warning/15 px-1.5 py-0.5 text-[10px] text-warning hover:bg-warning/25"
                          title="Remove the auto check-out"
                        >
                          <X className="h-3 w-3" /> auto · remove
                        </button>
                      )}
                    </TD>
                    <TD><BreaksCell att={a} /></TD>
                    <TD>{formatDuration(a.working_hours)}</TD>
                    <TD>
                      {a.on_break ? <Badge variant="warning">On break</Badge> : (
                        <Badge variant={statusVariant[a.status]} className="capitalize">{a.status.replace("_", " ")}</Badge>
                      )}
                    </TD>
                    <TD>
                      {a.check_in_lat || a.check_in_lng ? (
                        <a href={mapsLink(a.check_in_lat, a.check_in_lng)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
                          <MapPin className="h-3.5 w-3.5" /> Map
                        </a>
                      ) : <span className="text-muted-foreground">—</span>}
                    </TD>
                    <TD>
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="outline" onClick={() => setDetail(a)}><Eye className="h-4 w-4" /> View</Button>
                        {!a.is_verified && (
                          <Button size="sm" variant="ghost" loading={verify.isPending && verify.variables === a.id} onClick={() => verify.mutate(a.id)}>
                            <CheckCircle2 className="h-4 w-4" />
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
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
                <Button variant="outline" size="sm" disabled={page >= meta.total_pages} onClick={() => setPage((p) => p + 1)}>Next</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <AddAttendanceModal open={addOpen} onClose={() => setAddOpen(false)} staff={staff} />
      {detail && <DetailDrawer record={detail} onClose={() => setDetail(null)} onChanged={setDetail} />}
    </div>
  );
}

function PunchCell({ time, selfie }: { time: string; selfie?: string }) {
  return (
    <div className="flex items-center gap-2">
      {selfie ? (
        <a href={selfie} target="_blank" rel="noreferrer"><img src={selfie} alt="selfie" className="h-8 w-8 rounded-full object-cover ring-1 ring-border" /></a>
      ) : null}
      <span>{time}</span>
    </div>
  );
}

function BreaksCell({ att }: { att: Attendance }) {
  const breaks = att.breaks ?? [];
  if (att.break_minutes <= 0 && breaks.length === 0) return <span className="text-muted-foreground">—</span>;
  return (
    <span className="inline-flex items-center gap-1 text-sm">
      <Coffee className="h-3.5 w-3.5 text-muted-foreground" />
      {Math.round(att.break_minutes)}m{breaks.length > 0 && <span className="text-muted-foreground">· {breaks.length}×</span>}
    </span>
  );
}

// ── Add attendance ───────────────────────────────────────────────────
function AddAttendanceModal({ open, onClose, staff }: { open: boolean; onClose: () => void; staff: { id: number; name: string }[] }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ staff_id: "", date: new Date().toISOString().slice(0, 10), check_in: "09:00", check_out: "", break_minutes: "", status: "present" });
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const save = useMutation({
    mutationFn: () => {
      const input: AdminAttendanceInput = {
        staff_id: Number(form.staff_id),
        date: form.date,
        check_in: form.check_in,
        check_out: form.check_out || undefined,
        break_minutes: form.break_minutes ? Number(form.break_minutes) : 0,
        status: form.status,
      };
      return attendanceApi.adminCreate(input);
    },
    onSuccess: () => {
      toast.success("Attendance added");
      qc.invalidateQueries({ queryKey: ["attendance", "admin"] });
      onClose();
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  const canSave = form.staff_id && form.date && form.check_in;

  return (
    <Modal open={open} onClose={onClose} title="Add attendance" size="sm"
      footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button loading={save.isPending} disabled={!canSave} onClick={() => save.mutate()}>Save</Button></>}>
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label>Staff</Label>
          <Select value={form.staff_id} onChange={(e) => set("staff_id", e.target.value)}>
            <option value="">Select staff…</option>
            {staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Date</Label>
          <Input type="date" value={form.date} onChange={(e) => set("date", e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5"><Label>Check in</Label><Input type="time" value={form.check_in} onChange={(e) => set("check_in", e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Check out</Label><Input type="time" value={form.check_out} onChange={(e) => set("check_out", e.target.value)} /></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5"><Label>Break (min)</Label><Input type="number" value={form.break_minutes} onChange={(e) => set("break_minutes", e.target.value)} placeholder="0" /></div>
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select value={form.status} onChange={(e) => set("status", e.target.value)}>
              {statusOptions.map((s) => <option key={s} value={s} className="capitalize">{s.replace("_", " ")}</option>)}
            </Select>
          </div>
        </div>
      </div>
    </Modal>
  );
}

// ── Detail + edit drawer ─────────────────────────────────────────────
function DetailDrawer({ record, onClose, onChanged }: { record: Attendance; onClose: () => void; onChanged: (a: Attendance) => void }) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [checkIn, setCheckIn] = useState(hhmm(record.check_in_at));
  const [checkOut, setCheckOut] = useState(hhmm(record.check_out_at));
  const [breakMin, setBreakMin] = useState(String(Math.round(record.break_minutes)));
  const [status, setStatus] = useState<AttendanceStatus>(record.status);

  const save = useMutation({
    mutationFn: () => attendanceApi.adminUpdate(record.id, {
      check_in: checkIn || undefined,
      check_out: checkOut || undefined,
      break_minutes: Number(breakMin) || 0,
      status,
    }),
    onSuccess: (updated) => {
      toast.success("Attendance updated");
      qc.invalidateQueries({ queryKey: ["attendance", "admin"] });
      onChanged(updated);
      setEditing(false);
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  const removeCheckout = useMutation({
    mutationFn: () => attendanceApi.clearCheckout(record.id),
    onSuccess: (updated) => {
      toast.success("Check-out removed");
      qc.invalidateQueries({ queryKey: ["attendance", "admin"] });
      onChanged(updated);
      setCheckOut("");
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  const breaks = record.breaks ?? [];

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-border p-4">
          <div>
            <h2 className="font-semibold">{record.staff?.name ?? `#${record.staff_id}`}</h2>
            <p className="text-xs text-muted-foreground">{formatDate(record.date)}</p>
          </div>
          <div className="flex items-center gap-1">
            {!editing && <Button size="sm" variant="outline" onClick={() => setEditing(true)}><Pencil className="h-4 w-4" /> Edit</Button>}
            <button onClick={onClose} className="rounded-md p-1 text-muted-foreground hover:bg-accent"><X className="h-5 w-5" /></button>
          </div>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          {editing ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label>Check in</Label><Input type="time" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} /></div>
                <div className="space-y-1.5"><Label>Check out</Label><Input type="time" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label>Break (min)</Label><Input type="number" value={breakMin} onChange={(e) => setBreakMin(e.target.value)} /></div>
                <div className="space-y-1.5">
                  <Label>Status</Label>
                  <Select value={status} onChange={(e) => setStatus(e.target.value as AttendanceStatus)}>
                    {statusOptions.map((s) => <option key={s} value={s} className="capitalize">{s.replace("_", " ")}</option>)}
                  </Select>
                </div>
              </div>
              <div className="flex gap-2">
                <Button loading={save.isPending} onClick={() => save.mutate()}>Save changes</Button>
                <Button variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-2 text-center">
                <PunchStat label="In" time={timeOf(record.check_in_at)} selfie={record.check_in_selfie} />
                <div className="rounded-lg bg-muted/60 p-2">
                  <p className="text-sm font-semibold">{formatDuration(record.working_hours)}</p>
                  <p className="text-[10px] text-muted-foreground">Worked</p>
                </div>
                <PunchStat label="Out" time={timeOf(record.check_out_at)} selfie={record.check_out_selfie} />
              </div>

              <div className="flex items-center justify-between rounded-lg border border-border p-3 text-sm">
                <span className="text-muted-foreground">Status</span>
                <Badge variant={statusVariant[record.status]} className="capitalize">{record.status.replace("_", " ")}</Badge>
              </div>

              {record.check_out_at && (
                <Button variant="outline" className="w-full" loading={removeCheckout.isPending} onClick={() => removeCheckout.mutate()}>
                  <X className="h-4 w-4" /> Remove check-out
                </Button>
              )}

              {(record.check_in_lat || record.check_in_lng) && (
                <a href={mapsLink(record.check_in_lat, record.check_in_lng)} target="_blank" rel="noreferrer"
                  className="flex items-center gap-2 rounded-lg border border-border p-3 text-sm text-primary hover:bg-muted">
                  <MapPin className="h-4 w-4" /> Check-in location ({record.check_in_lat.toFixed(4)}, {record.check_in_lng.toFixed(4)})
                </a>
              )}

              <div>
                <p className="mb-1.5 text-xs font-semibold text-muted-foreground">Breaks ({breaks.length}) · {Math.round(record.break_minutes)}m total</p>
                {breaks.length === 0 ? <p className="text-sm text-muted-foreground">No breaks.</p> : (
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

              {record.is_verified ? (
                <Badge variant="success"><BadgeCheck className="mr-1 h-3.5 w-3.5" /> Verified</Badge>
              ) : (
                <VerifyButton record={record} onChanged={onChanged} />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function PunchStat({ label, time, selfie }: { label: string; time: string; selfie?: string }) {
  return (
    <div className="rounded-lg bg-muted/60 p-2">
      {selfie ? (
        <a href={selfie} target="_blank" rel="noreferrer"><img src={selfie} alt={label} className="mx-auto mb-1 h-8 w-8 rounded-full object-cover" /></a>
      ) : null}
      <p className="text-sm font-semibold">{time}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}

function VerifyButton({ record, onChanged }: { record: Attendance; onChanged: (a: Attendance) => void }) {
  const qc = useQueryClient();
  const verify = useMutation({
    mutationFn: () => attendanceApi.verify(record.id),
    onSuccess: (updated) => {
      toast.success("Attendance verified");
      qc.invalidateQueries({ queryKey: ["attendance", "admin"] });
      onChanged(updated);
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  return (
    <Button className="w-full" loading={verify.isPending} onClick={() => verify.mutate()}>
      <CheckCircle2 className="h-4 w-4" /> Verify attendance
    </Button>
  );
}
