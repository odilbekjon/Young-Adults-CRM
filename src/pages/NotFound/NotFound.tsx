import { Box, Button, Typography } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

export const NotFound = () => {
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
      <Typography sx={{ fontSize: 72, fontWeight: 800, color: "#1e3a5f" }}>404</Typography>
      <Typography sx={{ fontSize: 16, color: "text.secondary" }}>{t("notFound.message")}</Typography>
      <Button
        variant="contained"
        onClick={() => navigate("/")}
        sx={{ borderRadius: "24px", px: 4, py: 1, textTransform: "none", bgcolor: "#1e3a5f", "&:hover": { bgcolor: "#1565c0" } }}
      >
        {t("notFound.backHome")}
      </Button>
    </Box>
  );
};

export default NotFound;
