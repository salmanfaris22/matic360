import { useState } from "react";
import {
  LogIn,
  LogOut,
  Coffee,
  Play,
  MapPin,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import {
  useToday,
  useCheckIn,
  useCheckOut,
  useBreakStart,
  useBreakEnd,
} from "@/features/attendance/hooks";
import { SelfieCapture } from "@/features/attendance/SelfieCapture";
import { dayState, type Attendance } from "@/entities/attendance/model";
import { getCurrentPosition } from "@/shared/lib/geo";
import { apiErrorMessage } from "@/shared/api/client";
import { Badge, Button, Card, CardContent, CenteredSpinner, Modal } from "@/shared/ui";

function timeOf(iso?: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
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

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm text-muted-foreground">
          {new Date().toLocaleDateString([], { weekday: "long", day: "numeric", month: "long" })}
        </p>
        <h1 className="text-2xl font-semibold">Hi, {staffName} 👋</h1>
      </div>

      <StatusCard att={att} state={state} />

      {/* Primary actions */}
      <div className="space-y-3">
        {state === "not_checked_in" && (
          <Button className="h-14 w-full text-base" onClick={() => setSheet("in")}>
            <LogIn className="h-5 w-5" /> Check In
          </Button>
        )}

        {state === "working" && (
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="secondary"
              className="h-14 text-base"
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
            <Button variant="destructive" className="h-14 text-base" onClick={() => setSheet("out")}>
              <LogOut className="h-5 w-5" /> Check Out
            </Button>
          </div>
        )}

        {state === "on_break" && (
          <Button
            className="h-14 w-full text-base"
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

        {state === "checked_out" && (
          <Card className="border-[hsl(var(--success))]/30 bg-[hsl(var(--success))]/5">
            <CardContent className="flex items-center gap-3 p-5">
              <CheckCircle2 className="h-6 w-6 text-[hsl(var(--success))]" />
              <div>
                <p className="font-medium">Day complete</p>
                <p className="text-sm text-muted-foreground">
                  You worked {att?.working_hours.toFixed(2)} hours today.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Check-in / Check-out sheet */}
      <Modal
        open={sheet !== null}
        onClose={() => setSheet(null)}
        variant="sheet"
        title={sheet === "in" ? "Check In" : "Check Out"}
        description="Your GPS location is captured automatically."
        footer={
          <>
            <Button variant="outline" onClick={() => setSheet(null)}>
              Cancel
            </Button>
            <Button
              loading={checkIn.isPending || checkOut.isPending}
              onClick={() => submitGeo(sheet === "in" ? "in" : "out")}
            >
              <MapPin className="h-4 w-4" /> Confirm {sheet === "in" ? "Check In" : "Check Out"}
            </Button>
          </>
        }
      >
        <SelfieCapture onChange={setSelfie} />
      </Modal>
    </div>
  );
}

function StatusCard({ att, state }: { att: Attendance | null; state: string }) {
  const labels: Record<string, { text: string; variant: "secondary" | "success" | "warning" }> = {
    not_checked_in: { text: "Not checked in", variant: "secondary" },
    working: { text: "Working", variant: "success" },
    on_break: { text: "On break", variant: "warning" },
    checked_out: { text: "Checked out", variant: "secondary" },
  };
  const s = labels[state];

  return (
    <Card>
      <CardContent className="space-y-4 p-5">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Today's status</span>
          <Badge variant={s.variant}>{s.text}</Badge>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <Stat icon={<LogIn className="h-4 w-4" />} label="In" value={timeOf(att?.check_in_at)} />
          <Stat icon={<Coffee className="h-4 w-4" />} label="Break" value={`${Math.round(att?.break_minutes ?? 0)}m`} />
          <Stat icon={<LogOut className="h-4 w-4" />} label="Out" value={timeOf(att?.check_out_at)} />
        </div>
        {att?.status && (
          <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            Marked <span className="font-medium capitalize">{att.status.replace("_", " ")}</span>
          </div>
        )}
      </CardContent>
    </Card>
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
