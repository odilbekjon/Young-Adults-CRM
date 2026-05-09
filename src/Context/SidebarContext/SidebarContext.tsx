import { createContext, useContext, useState, ReactNode } from "react";
import { useLocation } from "react-router-dom";

// ─── Submenu paths that have children ────────────────────────────────────────

const SUBMENU_PATHS = ["/finance", "/reports", "/settings"];

// ─── Types ────────────────────────────────────────────────────────────────────

interface SidebarContextValue {
  openSubmenu: string | null;
  setOpenSubmenu: (path: string | null) => void;
  toggleSubmenu: (path: string) => void;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const SidebarContext = createContext<SidebarContextValue | null>(null);

export const useSidebar = (): SidebarContextValue => {
  const ctx = useContext(SidebarContext);
  if (!ctx) throw new Error("useSidebar must be used inside SidebarProvider");
  return ctx;
};

// ─── Provider ─────────────────────────────────────────────────────────────────

interface ProviderProps {
  children: ReactNode;
}

export const SidebarProvider = ({ children }: ProviderProps) => {
  const { pathname } = useLocation();

  const [openSubmenu, setOpenSubmenu] = useState<string | null>(() => {
    // auto-open if current path belongs to a submenu group
    return SUBMENU_PATHS.find((p) => pathname.startsWith(p)) ?? null;
  });

  const toggleSubmenu = (path: string) => {
    setOpenSubmenu((prev) => (prev === path ? null : path));
  };

  return (
    <SidebarContext.Provider value={{ openSubmenu, setOpenSubmenu, toggleSubmenu }}>
      {children}
    </SidebarContext.Provider>
  );
};