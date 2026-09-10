import { Box, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";
import { Header } from "../Header/Header";
import { SidebarProvider, useSidebar } from "../../Context/SidebarContext";
import { Sidebar, SIDEBAR_WIDTH, SUBMENU_WIDTH, HEADER_HEIGHT } from "../Sidebar/Sidebar";
import { ReactNode } from "react";
import { useBranchDetailRedirect } from "../../hooks/useBranchDetailRedirect";

// ─── Page footer ──────────────────────────────────────────────────────────────
// Sits at the bottom of each page's scrollable content (not fixed to the
// viewport) — Support/Video tutorials/Payment mode currently have no page
// or feature behind them yet, so they're plain text rather than links.

const PageFooter = () => {
  const { t } = useTranslation();
  return (
    <Box
      sx={{
        mt: "auto", px: { xs: 2, md: 3 }, py: 1.5,
        borderTop: "1px solid var(--color-border)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        flexWrap: "wrap", gap: 1,
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
        <Typography fontSize={13} color="var(--color-text-secondary)">{t("layout.footer.support")}</Typography>
        <Typography fontSize={13} color="var(--color-text-secondary)">{t("layout.footer.videoTutorials")}</Typography>
        <Typography fontSize={13} color="var(--color-text-secondary)">{t("layout.footer.paymentMode")}</Typography>
      </Box>
      <Typography fontSize={14} fontWeight={700} color="var(--color-text-primary)">
        {t("layout.footer.brand")}
      </Typography>
    </Box>
  );
};

// ─── Inner layout ─────────────────────────────────────────────────────────────

interface Props {
  children: ReactNode;
}

const LayoutInner = ({ children }: Props) => {
  const { openSubmenu } = useSidebar();
  useBranchDetailRedirect();

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
            backgroundColor: "var(--color-bg-page)",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <Box sx={{ flex: 1 }}>{children}</Box>
          <PageFooter />
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