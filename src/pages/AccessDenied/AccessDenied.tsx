import { Box, Button, Typography } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

// Rendered by PermissionRoute when an authenticated user's role/permissions
// don't cover the route they requested (AUTH_ROLE_DOCS.md's 403 case) —
// mirrors NotFound's layout so the two read as a matched pair.
// `variant="error"` is used when the permissions themselves couldn't be
// loaded (GET /auth/sidebar failed) — a retry button is offered.
interface AccessDeniedProps {
  variant?: "denied" | "error";
  onRetry?: () => void;
}

export const AccessDenied = ({ variant = "denied", onRetry }: AccessDeniedProps = {}) => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        gap: 2,
        px: 3,
        textAlign: "center",
      }}
    >
      <Typography sx={{ fontSize: 72, fontWeight: 800, color: "#1e3a5f" }}>403</Typography>
      <Typography sx={{ fontSize: 16, color: "text.secondary" }}>
        {variant === "error" ? t("accessDenied.loadError") : t("accessDenied.message")}
      </Typography>
      {variant === "error" && onRetry && (
        <Button
          variant="outlined"
          onClick={onRetry}
          sx={{ borderRadius: "24px", px: 4, py: 1, textTransform: "none", color: "#1e3a5f", borderColor: "#1e3a5f" }}
        >
          {t("accessDenied.retry")}
        </Button>
      )}
      <Button
        variant="contained"
        onClick={() => navigate("/dashboard")}
        sx={{ borderRadius: "24px", px: 4, py: 1, textTransform: "none", bgcolor: "#1e3a5f", "&:hover": { bgcolor: "#1565c0" } }}
      >
        {t("accessDenied.backHome")}
      </Button>
    </Box>
  );
};

export default AccessDenied;
