import { useState } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "@/widgets/sidebar/Sidebar";
import { Header } from "@/widgets/header/Header";

export function AppLayout() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-muted/30">
      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />

      <div className="flex min-w-0 flex-1 flex-col">
        <Header onMenu={() => setMenuOpen(true)} />
        <main className="flex-1 p-4 lg:p-6">
          <div className="mx-auto w-full max-w-7xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
