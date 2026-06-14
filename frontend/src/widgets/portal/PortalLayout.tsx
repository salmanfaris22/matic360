import { NavLink, Outlet } from "react-router-dom";
import { Home, CalendarClock, User, Boxes } from "lucide-react";
import { cn } from "@/shared/lib/cn";
import { ThemeToggle } from "@/features/theme/ThemeToggle";
import { useCurrentUser } from "@/entities/auth/session.store";
import { initials } from "@/shared/lib/format";

const tabs = [
  { to: "/portal", label: "Home", icon: Home, end: true },
  { to: "/portal/attendance", label: "Attendance", icon: CalendarClock, end: false },
  { to: "/portal/me", label: "Profile", icon: User, end: false },
];

export function PortalLayout() {
  const user = useCurrentUser();

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col bg-background">
      {/* Top bar */}
      <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-border bg-background/90 px-4 backdrop-blur">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Boxes className="h-4 w-4" />
          </div>
          <span className="text-sm font-semibold">Staff Portal</span>
        </div>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold uppercase text-primary">
            {initials(user?.name)}
          </div>
        </div>
      </header>

      <main className="flex-1 px-4 pb-24 pt-4">
        <Outlet />
      </main>

      {/* Bottom navigation */}
      <nav className="fixed inset-x-0 bottom-0 z-10 mx-auto flex max-w-md items-center justify-around border-t border-border bg-background/95 px-2 py-2 backdrop-blur">
        {tabs.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            end={t.end}
            className={({ isActive }) =>
              cn(
                "flex flex-1 flex-col items-center gap-1 rounded-lg py-1.5 text-[11px] font-medium transition-colors",
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground",
              )
            }
          >
            <t.icon className="h-5 w-5" />
            {t.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
