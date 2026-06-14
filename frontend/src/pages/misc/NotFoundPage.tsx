import { useNavigate } from "react-router-dom";
import { Button } from "@/shared/ui";

export default function NotFoundPage() {
  const navigate = useNavigate();
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-muted/30 p-4 text-center">
      <p className="text-7xl font-bold text-primary">404</p>
      <h1 className="text-xl font-semibold">Page not found</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        The page you’re looking for doesn’t exist or has moved.
      </p>
      <Button onClick={() => navigate("/")}>Back to dashboard</Button>
    </div>
  );
}
