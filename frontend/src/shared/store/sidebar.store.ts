import { create } from "zustand";

const KEY = "dms.sidebar_collapsed";

interface SidebarState {
  collapsed: boolean;
  toggle: () => void;
  setCollapsed: (v: boolean) => void;
}

// Desktop sidebar collapsed state, persisted across reloads.
export const useSidebarStore = create<SidebarState>((set) => ({
  collapsed: typeof window !== "undefined" && localStorage.getItem(KEY) === "1",
  toggle: () =>
    set((s) => {
      const next = !s.collapsed;
      localStorage.setItem(KEY, next ? "1" : "0");
      return { collapsed: next };
    }),
  setCollapsed: (v) => {
    localStorage.setItem(KEY, v ? "1" : "0");
    set({ collapsed: v });
  },
}));
