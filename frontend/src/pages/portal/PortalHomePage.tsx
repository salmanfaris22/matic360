import { useEffect, useState } from "react";
import { LogIn, LogOut, Coffee, Play, MapPin, Clock, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import {
  useToday,
  useCheckIn,
  useCheckOut,
  useBreakStart,
  useBreakEnd,
} from "@/features/attendance/hooks";
import { SelfieCapture } from "@/features/attendance/SelfieCapture";
import { dayState } from "@/entities/attendance/model";
import { getCurrentPosition } from "@/shared/lib/geo";
import { apiErrorMessage } from "@/shared/api/client";
import { cn } from "@/shared/lib/cn";
import { formatDuration } from "@/shared/lib/format";
import { Badge, Button, Card, CardContent, CenteredSpinner, Modal } from "@/shared/ui";

function timeOf(iso?: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

// Re-renders every second while `active`, to drive the live clock/timer.
function useNow(active: boolean) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [active]);
  return now;
}

function fmtElapsed(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(h)}:${p(m)}:${p(sec)}`;
}

export default function PortalHomePage() {
  const { data, isLoading } = useToday();
  const checkIn = useCheckIn();
  const checkOut = useCheckOut();
  const breakStart = useBreakStart();
  const breakEnd = useBreakEnd();

  const [sheet, setSheet] = useState<null | "in" | "out">(null);
  const [selfie, setSelfie] = useState<Blob | null>(null);

  const att = data?.attendance ?? null;
  const state = dayState(att);
  const staffName = data?.staff?.name?.split(" ")[0] ?? "there";

  const live = state === "working" || state === "on_break";
  const now = useNow(live || state === "not_checked_in");

  const submitGeo = async (kind: "in" | "out") => {
    try {
      const pos = await getCurrentPosition();
      const geo = { lat: pos.lat, lng: pos.lng, selfie };
      if (kind === "in") {
        await checkIn.mutateAsync(geo);
        toast.success("Checked in ✅");
      } else {
        await checkOut.mutateAsync(geo);
        toast.success("Checked out 👋");
      }
      setSheet(null);
      setSelfie(null);
    } catch (e) {
      toast.error(apiErrorMessage(e, "Could not capture location"));
    }
  };

  if (isLoading) return <CenteredSpinner label="Loading…" />;

  if (!data?.staff) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-sm text-muted-foreground">
          No staff profile is linked to your account. Please contact your admin.
        </CardContent>
      </Card>
    );
  }

  const statusMeta: Record<string, { text: string; variant: "secondary" | "success" | "warning"; accent: string }> = {
    not_checked_in: { text: "Not checked in", variant: "secondary", accent: "text-muted-foreground" },
    working: { text: "Working", variant: "success", accent: "text-[hsl(var(--success))]" },
    on_break: { text: "On break", variant: "warning", accent: "text-[hsl(var(--warning))]" },
    checked_out: { text: "Checked out", variant: "secondary", accent: "text-muted-foreground" },
  };
  const sm = statusMeta[state];
  const elapsedMs = att?.check_in_at ? now - new Date(att.check_in_at).getTime() : 0;

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm text-muted-foreground">
          {new Date().toLocaleDateString([], { weekday: "long", day: "numeric", month: "long" })}
        </p>
        <h1 className="text-2xl font-semibold">Hi, {staffName} 👋</h1>
      </div>

      {/* Hero: status + live timer + actions */}
      <Card className="overflow-hidden">
        <CardContent className="space-y-5 p-5">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Today's status</span>
            <Badge variant={sm.variant}>
              <span className={cn("mr-1.5 inline-block h-1.5 w-1.5 rounded-full", live && "animate-pulse", `bg-current`)} />
              {sm.text}
            </Badge>
          </div>

          {/* Centre display */}
          <div className="py-2 text-center">
            {live ? (
              <>
                <p className={cn("font-mono text-4xl font-bold tabular-nums", sm.accent)}>{fmtElapsed(elapsedMs)}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {state === "on_break" ? "on break" : "since"} check-in at {timeOf(att?.check_in_at)}
                </p>
              </>
            ) : state === "checked_out" ? (
              <div className="flex flex-col items-center gap-1">
                <CheckCircle2 className="h-9 w-9 text-[hsl(var(--success))]" />
                <p className="font-medium">Day complete</p>
                <p className="text-xs text-muted-foreground">You worked {formatDuration(att?.working_hours)} today.</p>
              </div>
            ) : (
              <>
                <p className="font-mono text-4xl font-bold tabular-nums">
                  {new Date(now).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">Ready to start your day</p>
              </>
            )}
          </div>

          {/* Mini stats */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <Stat icon={<LogIn className="h-4 w-4" />} label="In" value={timeOf(att?.check_in_at)} />
            <Stat icon={<Coffee className="h-4 w-4" />} label="Break" value={`${Math.round(att?.break_minutes ?? 0)}m`} />
            <Stat icon={<LogOut className="h-4 w-4" />} label="Out" value={timeOf(att?.check_out_at)} />
          </div>

          {/* Actions */}
          <div className="space-y-2.5">
            {state === "not_checked_in" && (
              <Button className="h-14 w-full rounded-xl text-base" onClick={() => setSheet("in")}>
                <LogIn className="h-5 w-5" /> Check In
              </Button>
            )}

            {state === "working" && (
              <>
                <Button variant="destructive" className="h-14 w-full rounded-xl text-base" onClick={() => setSheet("out")}>
                  <LogOut className="h-5 w-5" /> Check Out
                </Button>
                <Button
                  variant="outline"
                  className="h-12 w-full rounded-xl text-base"
                  loading={breakStart.isPending}
                  onClick={() =>
                    breakStart.mutate(undefined, {
                      onSuccess: () => toast.success("Break started ☕"),
                      onError: (e) => toast.error(apiErrorMessage(e)),
                    })
                  }
                >
                  <Coffee className="h-5 w-5" /> Start Break
                </Button>
              </>
            )}

            {state === "on_break" && (
              <Button
                className="h-14 w-full rounded-xl text-base"
                loading={breakEnd.isPending}
                onClick={() =>
                  breakEnd.mutate(undefined, {
                    onSuccess: () => toast.success("Welcome back 💪"),
                    onError: (e) => toast.error(apiErrorMessage(e)),
                  })
                }
              >
                <Play className="h-5 w-5" /> End Break
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Check-in / Check-out sheet */}
      <Modal
        open={sheet !== null}
        onClose={() => setSheet(null)}
        variant="sheet"
        title={sheet === "in" ? "Check In" : "Check Out"}
        description="Your GPS location is captured and required."
        footer={
          <>
            <Button variant="outline" onClick={() => setSheet(null)}>Cancel</Button>
            <Button
              loading={checkIn.isPending || checkOut.isPending}
              disabled={sheet === "out" && !selfie}
              onClick={() => submitGeo(sheet === "in" ? "in" : "out")}
            >
              <MapPin className="h-4 w-4" /> Confirm {sheet === "in" ? "Check In" : "Check Out"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="flex items-center justify-center gap-2 rounded-lg bg-muted/60 py-3 text-sm">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
            <span className="text-muted-foreground">· location required</span>
          </div>
          <SelfieCapture onChange={setSelfie} />
          {sheet === "out" && !selfie && (
            <p className="text-center text-xs text-warning">A photo is required to check out.</p>
          )}
        </div>
      </Modal>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg bg-muted/60 p-3">
      <div className="mx-auto mb-1 flex h-7 w-7 items-center justify-center rounded-full bg-background text-muted-foreground">
        {icon}
      </div>
      <p className="text-sm font-semibold">{value}</p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}
