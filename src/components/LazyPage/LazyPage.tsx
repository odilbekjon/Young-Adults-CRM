import { Component, Suspense, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Box, Button, CircularProgress, Typography } from "@mui/material";

// Wraps a route page that is loaded on demand (see Router.tsx): while its code
// downloads, the surrounding shell (header, sidebar) stays on screen and this
// spinner takes the page's place; if the page cannot be loaded or crashes while
// rendering, a message with a reload button replaces it instead of a blank app.

const PageSpinner = () => (
  <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
    <CircularProgress size={28} />
  </Box>
);

const PageFailed = () => {
  const { t } = useTranslation();
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "60vh",
        gap: 2,
        px: 3,
        textAlign: "center",
      }}
    >
      <Typography sx={{ fontSize: 16, color: "text.secondary" }}>{t("routeError.message")}</Typography>
      <Button
        variant="contained"
        onClick={() => window.location.reload()}
        sx={{ borderRadius: "24px", px: 4, py: 1, textTransform: "none", bgcolor: "#1e3a5f", "&:hover": { bgcolor: "#1565c0" } }}
      >
        {t("routeError.reload")}
      </Button>
    </Box>
  );
};

interface BoundaryProps {
  // Changes with the route, so leaving a failed page clears the failure.
  resetKey: string;
  children: ReactNode;
}

class Boundary extends Component<BoundaryProps, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.error("A page failed to load or render", error);
  }

  componentDidUpdate(prev: BoundaryProps) {
    if (this.state.failed && prev.resetKey !== this.props.resetKey) this.setState({ failed: false });
  }

  render() {
    return this.state.failed ? <PageFailed /> : this.props.children;
  }
}

export const LazyPage = ({ children }: { children: ReactNode }) => {
  const { pathname } = useLocation();
  return (
    <Boundary resetKey={pathname}>
      <Suspense fallback={<PageSpinner />}>{children}</Suspense>
    </Boundary>
  );
};
