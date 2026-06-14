import { AppProviders } from "./providers/AppProviders";
import { AppRouter } from "./router/AppRouter";
import { useBootstrapSession } from "@/features/auth/useBootstrapSession";

function Bootstrap() {
  // Restore the session from a stored token on first load.
  useBootstrapSession();
  return <AppRouter />;
}

export default function App() {
  return (
    <AppProviders>
      <Bootstrap />
    </AppProviders>
  );
}
