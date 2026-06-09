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

const navItems = [
  "General settings",
  "Sign in",
  "Lead form",
  "Payment methods",
  "Communication",
  "Integrations",
  "Exams",
  "Check",
  "Accrual and payment",
  "Landing page",
];

export const Workly = () => {
  const [activeNav, setActiveNav] = useState("Integrations");
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
        Workly Report
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
            Workly connection
          </Typography>
          <Typography variant="body2" color="text.secondary">
            To connect to Workly, you need to enter the following data in
            Settings &gt; Integrations:
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
              {navItems.map((item, index) => (
                <Box key={item}>
                  <ListItemButton
                    selected={activeNav === item}
                    onClick={() => setActiveNav(item)}
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
                      primary={item}
                      primaryTypographyProps={{
                        fontSize: "0.875rem",
                        color: activeNav === item ? "#1976d2" : "#555",
                      }}
                    />
                  </ListItemButton>
                  {index < navItems.length - 1 && (
                    <Divider sx={{ mx: 0 }} />
                  )}
                </Box>
              ))}
            </List>
          </Box>

          {/* Main Content */}
          <Box sx={{ flex: 1, p: 3 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 500, mb: 2 }}>
              Integrations
            </Typography>

            <Paper
              variant="outlined"
              sx={{ p: 2.5, maxWidth: 420, borderRadius: 1 }}
            >
              <Typography
                variant="caption"
                sx={{ color: "#888", display: "block", mb: 1.5 }}
              >
                Workly
              </Typography>

              {/* Workly Client ID */}
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" sx={{ mb: 0.5 }}>
                  Workly client id
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
                  Workly secret
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
                  Workly username
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
                  Workly password
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