import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { attendanceApi, type GeoCapture } from "@/entities/attendance/api";

const TODAY_KEY = ["attendance", "today"];

export function useToday() {
  return useQuery({ queryKey: TODAY_KEY, queryFn: attendanceApi.today });
}

function useTodayMutation<TArgs>(fn: (args: TArgs) => Promise<unknown>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: TODAY_KEY });
      qc.invalidateQueries({ queryKey: ["attendance", "history"] });
    },
  });
}

export const useCheckIn = () => useTodayMutation((geo: GeoCapture) => attendanceApi.checkIn(geo));
export const useCheckOut = () => useTodayMutation((geo: GeoCapture) => attendanceApi.checkOut(geo));
export const useBreakStart = () => useTodayMutation(() => attendanceApi.breakStart());
export const useBreakEnd = () => useTodayMutation(() => attendanceApi.breakEnd());

export function useAttendanceHistory(page: number) {
  return useQuery({
    queryKey: ["attendance", "history", page],
    queryFn: () => attendanceApi.history({ page, per_page: 15 }),
  });
}
