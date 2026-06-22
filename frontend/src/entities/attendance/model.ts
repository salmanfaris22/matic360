export type AttendanceStatus = "present" | "absent" | "late" | "half_day";

export interface AttendanceBreak {
  id: number;
  attendance_id: number;
  started_at: string;
  ended_at?: string | null;
  minutes: number;
}

export interface Attendance {
  id: number;
  staff_id: number;
  date: string;
  check_in_at?: string | null;
  check_in_lat: number;
  check_in_lng: number;
  check_in_selfie: string;
  check_out_at?: string | null;
  check_out_lat: number;
  check_out_lng: number;
  check_out_selfie: string;
  on_break: boolean;
  break_started_at?: string | null;
  break_minutes: number;
  breaks?: AttendanceBreak[] | null;
  working_hours: number;
  status: AttendanceStatus;
  auto_closed: boolean;
  is_verified: boolean;
  notes: string;
  staff?: {
    id: number;
    name: string;
    employee_id: string;
    branch?: { id: number; name: string } | null;
  } | null;
}

export interface TodayResponse {
  staff: {
    id: number;
    name: string;
    employee_id: string;
    designation: string;
  } | null;
  attendance: Attendance | null;
}

// Derived UI state of the current day.
export type DayState = "not_checked_in" | "working" | "on_break" | "checked_out";

export function dayState(a: Attendance | null): DayState {
  if (!a || !a.check_in_at) return "not_checked_in";
  if (a.check_out_at) return "checked_out";
  if (a.on_break) return "on_break";
  return "working";
}
