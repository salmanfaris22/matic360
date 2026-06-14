import { QueryClientProvider } from "@tanstack/react-query";
import { type ReactNode, useEffect } from "react";
import { BrowserRouter } from "react-router-dom";
import { Toaster } from "sonner";
import { queryClient } from "./queryClient";
import { setAuthFailureHandler } from "@/shared/api/client";
import { useSessionStore } from "@/entities/auth/session.store";
import { useThemeStore } from "@/shared/store/theme.store";

export function AppProviders({ children }: { children: ReactNode }) {
  const theme = useThemeStore((s) => s.theme);

  // Wire the API client's refresh-failure handler to the session store.
  useEffect(() => {
    setAuthFailureHandler(() => {
      useSessionStore.getState().logout();
      if (window.location.pathname !== "/login") {
        window.location.assign("/login");
      }
    });
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>{children}</BrowserRouter>
      <Toaster richColors position="top-right" theme={theme} />
    </QueryClientProvider>
  );
}
