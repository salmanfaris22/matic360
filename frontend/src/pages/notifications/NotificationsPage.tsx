import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCheck, Dot } from "lucide-react";
import { toast } from "sonner";
import { api, apiErrorMessage } from "@/shared/api/client";
import type { ApiEnvelope } from "@/shared/api/types";
import {
  Button,
  Card,
  CardContent,
  CenteredSpinner,
  EmptyState,
  PageHeader,
} from "@/shared/ui";

interface Notification {
  id: number;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
}

export default function NotificationsPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const res = await api.get<ApiEnvelope<Notification[]>>("/notifications", {
        params: { per_page: 50 },
      });
      return res.data.data ?? [];
    },
  });

  const markAll = useMutation({
    mutationFn: () => api.put("/notifications/read-all"),
    onSuccess: () => {
      toast.success("All marked read");
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  const markOne = useMutation({
    mutationFn: (id: number) => api.put(`/notifications/${id}/read`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const items = data ?? [];
  const unread = items.filter((n) => !n.is_read).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications"
        description={unread ? `${unread} unread` : "You're all caught up."}
        action={
          unread > 0 ? (
            <Button variant="outline" onClick={() => markAll.mutate()} loading={markAll.isPending}>
              <CheckCheck className="h-4 w-4" /> Mark all read
            </Button>
          ) : undefined
        }
      />

      {isLoading ? (
        <CenteredSpinner />
      ) : items.length === 0 ? (
        <EmptyState icon={<Bell className="h-6 w-6" />} title="No notifications" />
      ) : (
        <div className="space-y-2">
          {items.map((n) => (
            <Card key={n.id} className={n.is_read ? "" : "border-primary/30 bg-primary/5"}>
              <CardContent className="flex items-start justify-between gap-3 p-4">
                <div className="flex items-start gap-2">
                  {!n.is_read && <Dot className="-ml-2 h-6 w-6 shrink-0 text-primary" />}
                  <div>
                    <p className="font-medium">{n.title}</p>
                    <p className="text-sm text-muted-foreground">{n.message}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {new Date(n.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
                {!n.is_read && (
                  <Button size="sm" variant="ghost" onClick={() => markOne.mutate(n.id)}>
                    Mark read
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
