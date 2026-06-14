import { useState, type FormEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Boxes } from "lucide-react";
import { toast } from "sonner";
import { useLogin } from "@/features/auth/useLogin";
import { ThemeToggle } from "@/features/theme/ThemeToggle";
import { apiErrorMessage } from "@/shared/api/client";
import { Button, Card, CardContent, Input, Label } from "@/shared/ui";

export default function LoginPage() {
  const [email, setEmail] = useState("superadmin@company.com");
  const [password, setPassword] = useState("ChangeMe@123");
  const login = useLogin();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? "/";

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    login.mutate(
      { email, password },
      {
        onSuccess: (data) => {
          toast.success("Welcome back!");
          // Field staff land in the mobile portal; admins in the dashboard.
          const dest = data.user.role === "staff" ? "/portal" : from;
          navigate(dest, { replace: true });
        },
        onError: (err) => toast.error(apiErrorMessage(err, "Login failed")),
      },
    );
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-muted/40 p-4">
      <div className="pointer-events-none absolute -top-24 -right-24 h-96 w-96 rounded-full bg-primary/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-24 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />

      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>

      <Card className="w-full max-w-md shadow-xl">
        <CardContent className="p-8">
          <div className="mb-8 flex flex-col items-center text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
              <Boxes className="h-7 w-7" />
            </div>
            <h1 className="text-xl font-semibold">Distribution Management</h1>
            <p className="mt-1 text-sm text-muted-foreground">Sign in to your account</p>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" loading={login.isPending}>
              Sign in
            </Button>
          </form>

          <p className="mt-6 rounded-md bg-muted p-3 text-center text-xs text-muted-foreground">
            Seeded super admin · <span className="font-medium">superadmin@company.com</span> /{" "}
            <span className="font-medium">ChangeMe@123</span>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
