import { LogOut, Menu } from "lucide-react";
import { ThemeToggle } from "@/features/theme/ThemeToggle";
import { useLogout } from "@/features/auth/useLogout";
import { useCurrentUser } from "@/entities/auth/session.store";
import { Button } from "@/shared/ui";
import { initials } from "@/shared/lib/format";

export function Header({ onMenu }: { onMenu: () => void }) {
  const user = useCurrentUser();
  const logout = useLogout();

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur lg:px-6">
      <button
        className="rounded-md p-2 hover:bg-accent lg:hidden"
        onClick={onMenu}
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="ml-auto flex items-center gap-2">
        <ThemeToggle />

        <div className="flex items-center gap-3 rounded-full border border-border bg-card py-1 pl-1 pr-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-semibold uppercase text-primary-foreground">
            {initials(user?.name)}
          </div>
          <div className="hidden leading-tight sm:block">
            <p className="text-sm font-medium">{user?.name}</p>
            <p className="text-[11px] capitalize text-muted-foreground">{user?.role_name}</p>
          </div>
        </div>

        <Button variant="ghost" size="icon" onClick={logout} aria-label="Log out" title="Log out">
          <LogOut className="h-5 w-5" />
        </Button>
      </div>
    </header>
  );
}
