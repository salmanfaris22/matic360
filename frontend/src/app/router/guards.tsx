import { type ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useSessionStore } from "@/entities/auth/session.store";
import { CenteredSpinner } from "@/shared/ui";

// Blocks access until authenticated; redirects guests to /login.
export function ProtectedRoute({ children }: { children: ReactNode }) {
  const status = useSessionStore((s) => s.status);
  const location = useLocation();

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <CenteredSpinner label="Loading your session…" />
      </div>
    );
  }
  if (status !== "authenticated") {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return <>{children}</>;
}

// Keeps authenticated users out of /login (routed by role).
export function GuestRoute({ children }: { children: ReactNode }) {
  const status = useSessionStore((s) => s.status);
  const user = useSessionStore((s) => s.user);
  if (status === "authenticated") {
    return <Navigate to={user?.role === "staff" ? "/portal" : "/"} replace />;
  }
  return <>{children}</>;
}

// Restricts a branch to specific roles; others are redirected.
export function RoleRoute({
  allow,
  redirect,
  children,
}: {
  allow: string[];
  redirect: string;
  children: ReactNode;
}) {
  const user = useSessionStore((s) => s.user);
  if (user && !allow.includes(user.role)) {
    return <Navigate to={redirect} replace />;
  }
  return <>{children}</>;
}
