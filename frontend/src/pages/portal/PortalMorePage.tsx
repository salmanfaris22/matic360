import { useQuery } from "@tanstack/react-query";
import { LogOut, BadgeIndianRupee } from "lucide-react";
import { api } from "@/shared/api/client";
import type { ApiEnvelope } from "@/shared/api/types";
import { useCurrentUser } from "@/entities/auth/session.store";
import { useLogout } from "@/features/auth/useLogout";
import { Badge, Button, Card, CardContent } from "@/shared/ui";
import { formatCurrency, initials } from "@/shared/lib/format";

interface SalaryRow {
  id: number;
  month: number;
  year: number;
  net_amount: number;
  status: string;
}

const monthName = (m: number) =>
  ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][m] ?? m;

export default function PortalMorePage() {
  const user = useCurrentUser();
  const logout = useLogout();

  const { data: salaries } = useQuery({
    queryKey: ["salaries", "me"],
    queryFn: async () => {
      const res = await api.get<ApiEnvelope<SalaryRow[]>>("/salaries/me");
      return res.data.data ?? [];
    },
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-col items-center gap-3 pt-2 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary text-2xl font-semibold uppercase text-primary-foreground">
          {initials(user?.name)}
        </div>
        <div>
          <p className="text-lg font-semibold">{user?.name}</p>
          <p className="text-sm text-muted-foreground">{user?.email}</p>
          <Badge className="mt-2 capitalize">{user?.role_name}</Badge>
        </div>
      </div>

      <div>
        <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
          <BadgeIndianRupee className="h-4 w-4" /> Salary status
        </p>
        {!salaries || salaries.length === 0 ? (
          <Card>
            <CardContent className="p-4 text-center text-sm text-muted-foreground">
              No salary records yet.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {salaries.map((s) => (
              <Card key={s.id}>
                <CardContent className="flex items-center justify-between p-4">
                  <div>
                    <p className="font-medium">
                      {monthName(s.month)} {s.year}
                    </p>
                    <p className="text-sm text-muted-foreground">{formatCurrency(s.net_amount)}</p>
                  </div>
                  <Badge
                    variant={
                      s.status === "paid" ? "success" : s.status === "approved" ? "default" : "secondary"
                    }
                    className="capitalize"
                  >
                    {s.status}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Button variant="outline" className="w-full" onClick={logout}>
        <LogOut className="h-4 w-4" /> Log out
      </Button>
    </div>
  );
}
