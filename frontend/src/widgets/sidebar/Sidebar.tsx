import { NavLink } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Boxes, X, PanelLeftClose, PanelLeft } from "lucide-react";
import { cn } from "@/shared/lib/cn";
import { navGroups } from "@/app/router/navigation";
import { useCurrentUser } from "@/entities/auth/session.store";
import { useSidebarStore } from "@/shared/store/sidebar.store";
import { api } from "@/shared/api/client";
import type { ApiEnvelope } from "@/shared/api/types";
import type { RoleSlug } from "@/entities/auth/model";

export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const user = useCurrentUser();
  const role = (user?.role ?? "staff") as RoleSlug;
  const collapsed = useSidebarStore((s) => s.collapsed);
  const toggle = useSidebarStore((s) => s.toggle);

  const { data: unread } = useQuery({
    queryKey: ["notifications", "unread-count"],
    queryFn: async () => {
      const res = await api.get<ApiEnvelope<{ unread: number }>>("/notifications/unread-count");
      return res.data.data.unread;
    },
    refetchInterval: 60_000,
  });

  const visibleGroups = navGroups
    .map((g) => ({ ...g, items: g.items.filter((i) => !i.roles || i.roles.includes(role)) }))
    .filter((g) => g.items.length > 0);

  const hideOnCollapse = collapsed ? "lg:hidden" : "";

  return (
    <>
      {/* Mobile backdrop */}
      <div
        className={cn(
          "fixed inset-0 z-30 bg-black/40 backdrop-blur-sm transition-opacity lg:hidden",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={onClose}
      />

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-border bg-sidebar text-sidebar-foreground transition-all lg:static lg:translate-x-0",
          collapsed ? "lg:w-[76px]" : "lg:w-64",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {/* Brand + collapse */}
        <div className="flex h-16 items-center justify-between gap-2 px-4">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Boxes className="h-5 w-5" />
            </div>
            <span className={cn("truncate text-base font-semibold tracking-tight", hideOnCollapse)}>
              Nexus<span className="text-primary">DMS</span>
            </span>
          </div>
          <button
            className="hidden rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground lg:block"
            onClick={toggle}
            aria-label="Collapse sidebar"
            title={collapsed ? "Expand" : "Collapse"}
          >
            {collapsed ? <PanelLeft className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </button>
          <button className="rounded-md p-1.5 hover:bg-accent lg:hidden" onClick={onClose} aria-label="Close menu">
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-3">
          {visibleGroups.map((group) => (
            <div key={group.title}>
              <p
                className={cn(
                  "px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70",
                  hideOnCollapse,
                )}
              >
                {group.title}
              </p>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const badge = item.path === "/notifications" && unread ? unread : 0;
                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      end={item.path === "/"}
                      onClick={onClose}
                      title={collapsed ? item.label : undefined}
                      className={({ isActive }) =>
                        cn(
                          "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                          collapsed ? "lg:justify-center" : "",
                          isActive
                            ? "bg-primary text-primary-foreground shadow-sm"
                            : "text-sidebar-foreground/80 hover:bg-accent hover:text-accent-foreground",
                        )
                      }
                    >
                      <item.icon className="h-[18px] w-[18px] shrink-0" />
                      <span className={cn("flex-1 truncate", hideOnCollapse)}>{item.label}</span>
                      {badge > 0 && (
                        <span
                          className={cn(
                            "ml-auto rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold text-primary",
                            collapsed ? "lg:hidden" : "",
                          )}
                        >
                          {badge}
                        </span>
                      )}
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className={cn("border-t border-border px-4 py-3 text-[11px] text-muted-foreground", hideOnCollapse)}>
          v0.2.0 · Distribution MS
        </div>
      </aside>
    </>
  );
}
