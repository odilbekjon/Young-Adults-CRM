import { useState } from "react";
import {
  Box,
  Typography,
  TextField,
  Paper,
  List,
  ListItemButton,
  ListItemText,
  Divider,
} from "@mui/material";
import { useTranslation } from "react-i18next";

const navItemIds = [
  "generalSettings",
  "signIn",
  "leadForm",
  "paymentMethods",
  "communication",
  "integrations",
  "exams",
  "check",
  "accrualAndPayment",
  "landingPage",
];

export const Workly = () => {
  const { t } = useTranslation();
  const [activeNav, setActiveNav] = useState("integrations");
  const [form, setForm] = useState({
    clientId: "",
    secret: "",
    username: "",
    password: "",
  });

  const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#f5f5f5", p: 3 }}>
      {/* Page Title */}
      <Typography
        variant="h5"
        sx={{ fontWeight: 500, mb: 3, color: "#212121" }}
      >
        {t("reports.logs.workly.title")}
      </Typography>

      <Paper
        elevation={0}
        sx={{
          border: "1px solid #e0e0e0",
          borderRadius: 1,
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <Box sx={{ p: 3, borderBottom: "1px solid #e0e0e0" }}>
          <Typography variant="h6" sx={{ fontWeight: 500, mb: 1 }}>
            {t("reports.logs.workly.connection.heading")}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t("reports.logs.workly.connection.description")}
          </Typography>
        </Box>

        <Box sx={{ display: "flex" }}>
          {/* Sidebar */}
          <Box
            sx={{
              width: 200,
              borderRight: "1px solid #e0e0e0",
              flexShrink: 0,
            }}
          >
            <List disablePadding>
              {navItemIds.map((itemId, index) => (
                <Box key={itemId}>
                  <ListItemButton
                    selected={activeNav === itemId}
                    onClick={() => setActiveNav(itemId)}
                    sx={{
                      py: 1.25,
                      px: 2,
                      "&.Mui-selected": {
                        bgcolor: "transparent",
                        "& .MuiListItemText-primary": {
                          color: "#1976d2",
                          fontWeight: 500,
                        },
                      },
                      "&:hover": {
                        bgcolor: "#f5f5f5",
                      },
                    }}
                  >
                    <ListItemText
                      primary={t(`reports.logs.workly.nav.${itemId}`)}
                      primaryTypographyProps={{
                        fontSize: "0.875rem",
                        color: activeNav === itemId ? "#1976d2" : "#555",
                      }}
                    />
                  </ListItemButton>
                  {index < navItemIds.length - 1 && (
                    <Divider sx={{ mx: 0 }} />
                  )}
                </Box>
              ))}
            </List>
          </Box>

          {/* Main Content */}
          <Box sx={{ flex: 1, p: 3 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 500, mb: 2 }}>
              {t("reports.logs.workly.nav.integrations")}
            </Typography>

            <Paper
              variant="outlined"
              sx={{ p: 2.5, maxWidth: 420, borderRadius: 1 }}
            >
              <Typography
                variant="caption"
                sx={{ color: "#888", display: "block", mb: 1.5 }}
              >
                {t("reports.logs.workly.caption")}
              </Typography>

              {/* Workly Client ID */}
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" sx={{ mb: 0.5 }}>
                  {t("reports.logs.workly.form.clientId")}
                </Typography>
                <TextField
                  fullWidth
                  size="small"
                  value={form.clientId}
                  onChange={handleChange("clientId")}
                  variant="outlined"
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      borderRadius: 0.5,
                      fontSize: "0.875rem",
                    },
                  }}
                />
              </Box>

              {/* Workly Secret */}
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" sx={{ mb: 0.5 }}>
                  {t("reports.logs.workly.form.secret")}
                </Typography>
                <TextField
                  fullWidth
                  size="small"
                  value={form.secret}
                  onChange={handleChange("secret")}
                  variant="outlined"
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      borderRadius: 0.5,
                      fontSize: "0.875rem",
                    },
                  }}
                />
              </Box>

              {/* Workly Username */}
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" sx={{ mb: 0.5 }}>
                  {t("reports.logs.workly.form.username")}
                </Typography>
                <TextField
                  fullWidth
                  size="small"
                  value={form.username}
                  onChange={handleChange("username")}
                  variant="outlined"
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      borderRadius: 0.5,
                      fontSize: "0.875rem",
                    },
                  }}
                />
              </Box>

              {/* Workly Password */}
              <Box>
                <Typography variant="body2" sx={{ mb: 0.5 }}>
                  {t("reports.logs.workly.form.password")}
                </Typography>
                <TextField
                  fullWidth
                  size="small"
                  type="password"
                  value={form.password}
                  onChange={handleChange("password")}
                  variant="outlined"
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      borderRadius: 0.5,
                      fontSize: "0.875rem",
                    },
                  }}
                />
              </Box>
            </Paper>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
};