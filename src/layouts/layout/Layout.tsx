import { Box } from "@mui/material";
import { Header } from "../Header/Header";
import { SidebarProvider, useSidebar } from "../../Context/SidebarContext";
import { Sidebar, SIDEBAR_WIDTH, SUBMENU_WIDTH, HEADER_HEIGHT } from "../Sidebar/Sidebar";
import { ReactNode } from "react";

// ─── Inner layout ─────────────────────────────────────────────────────────────

interface Props {
  children: ReactNode;
}

const LayoutInner = ({ children }: Props) => {
  const { openSubmenu } = useSidebar();

  const contentLeft = SIDEBAR_WIDTH + (openSubmenu ? SUBMENU_WIDTH : 0);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      <Header />
      <Box sx={{ display: "flex", flex: 1, overflow: "hidden" }}>
        <Sidebar />
        <Box
          sx={{
            marginLeft: { xs: 0, md: `${contentLeft}px` },
            marginTop: `${HEADER_HEIGHT}px`,
            flex: 1,
            minWidth: 0,
            overflowY: "auto",
            overflowX: "hidden",
            transition: "margin-left 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
            backgroundColor: "#f4f6fa",
          }}
        >
          {children}
        </Box>
      </Box>
    </Box>
  );
};

// ─── Layout ───────────────────────────────────────────────────────────────────

export const Layout = ({ children }: Props) => (
  <SidebarProvider>
    <LayoutInner>{children}</LayoutInner>
  </SidebarProvider>
);