import { Box, Button, TextField, Typography, Alert, InputAdornment, IconButton, CircularProgress } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { FiEye, FiEyeOff } from "react-icons/fi";
import logo from "../../assets/logo_ya.png";
import blackLogo from "../../assets/logo_ya_black.png"

const LANGUAGE_OPTIONS: { code: "en" | "ru" | "uz"; label: string }[] = [
  { code: "en", label: "EN" },
  { code: "ru", label: "RU" },
  { code: "uz", label: "UZ" },
];

const CORRECT_PHONE = "915179774";
const CORRECT_PASSWORD = "1111";

const LoginPage = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();

  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const currentLang = (i18n.language as "en" | "ru" | "uz") || "uz";

  const handleChangeLanguage = (code: "en" | "ru" | "uz") => {
    i18n.changeLanguage(code);
    localStorage.setItem("appLanguage", code);
  };

  const handleLogin = () => {
    if (loading) return;
    setLoading(true);
    // brief delay so the loading state is visible; swap for a real API call later
    setTimeout(() => {
      const cleaned = phone.replace(/\s/g, "");
      if (cleaned === CORRECT_PHONE && password === CORRECT_PASSWORD) {
        setError("");
        navigate("/dashboard");
      } else {
        setError(t("login.error"));
      }
      setLoading(false);
    }, 400);
  };

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        bgcolor: "#b0bec5",
        overflowY: "auto",
        px: { xs: 2, sm: 3 },
        py: { xs: 3, sm: 4 },
      }}
    >
      <Box
        sx={{
          width: "100%",
          maxWidth: { xs: 420, sm: 480, md: 560, lg: 640 },
          bgcolor: "transparent",
          display: "flex",
          flexDirection: "column",
          mx: "auto",
        }}
      >
        <Box
          sx={{
            bgcolor: "#1f2937",
            width: "100%",
            height: { xs: 108, sm: 128, md: 144 },
            borderRadius: 3,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <img
            src={logo}
            style={{ display: "block", width: "min(70%, 300px)", height: "auto" }}
            alt="Logo"
          />
        </Box>

        <Box sx={{ bgcolor: "white", mt: 1.5, px: { xs: 2, sm: 2.5 }, py: 2, borderRadius: 3 }}>
          <Typography sx={{ fontWeight: 600, fontSize: { xs: 14, sm: 15 } }}>
            {t("login.companyName")}
          </Typography>
          <Typography sx={{ fontSize: { xs: 13, sm: 14 }, color: "text.secondary", mt: 0.5 }}>
            {t("login.tagline")}
          </Typography>
        </Box>

        {/* LOGIN CARD */}
        <Box sx={{ bgcolor: "white", mt: 1, mb: 3, px: { xs: 2, sm: 2.5 }, py: { xs: 2.5, sm: 3 }, borderRadius: 3 }}>
          <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1, mb: 2 }}>
            {LANGUAGE_OPTIONS.map((opt) => (
              <Button
                key={opt.code}
                onClick={() => handleChangeLanguage(opt.code)}
                size="small"
                sx={{
                  minWidth: 0,
                  px: 1,
                  py: 0.2,
                  fontSize: 13,
                  fontWeight: currentLang === opt.code ? 700 : 400,
                  color: currentLang === opt.code ? "#1e2a3a" : "text.secondary",
                  textTransform: "none",
                  bgcolor: "transparent",
                  "&:hover": { bgcolor: "transparent" },
                }}
              >
                {opt.label}
              </Button>
            ))}
          </Box>

          <Box sx={{ display: "flex", gap: 3 }}>
            <Box sx={{ display: { xs: "none",  }, alignItems: "center", gap: 1, flexShrink: 0, pt: 1 }}>
              <img src={blackLogo} style={{ width: "min(100px, 22%)", height: "auto" }} alt="logo" />
            </Box>

            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography sx={{ fontWeight: 600, fontSize: { xs: 16, sm: 18 }, mb: 2 }}>
                {t("login.title")}
              </Typography>

              {error && (
                <Alert severity="error" sx={{ mb: 2, fontSize: 13 }}>
                  {error}
                </Alert>
              )}

              <TextField
                fullWidth
                label={t("login.phone")}
                required
                size="small"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="99 891 51 79"
                inputProps={{ maxLength: 12 }}
                sx={{ mb: 2 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Box
                        sx={{
                          pr: 1.5,
                          mr: 0.5,
                          borderRight: "1px solid",
                          borderColor: "divider",
                          fontSize: 14,
                          fontWeight: 500,
                          color: "text.primary",
                          whiteSpace: "nowrap",
                        }}
                      >
                        +998
                      </Box>
                    </InputAdornment>
                  ),
                }}
              />

              <TextField
                fullWidth
                label={t("login.password")}
                required
                size="small"
                type={showPass ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                sx={{ mb: 2.5 }}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton size="small" onClick={() => setShowPass((p) => !p)} edge="end">
                        {showPass ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />

              <Button
                variant="contained"
                onClick={handleLogin}
                disabled={loading}
                startIcon={loading ? <CircularProgress size={16} color="inherit" /> : undefined}
                fullWidth={false}
                sx={{
                  bgcolor: "#1e3a5f",
                  color: "white",
                  borderRadius: "24px",
                  px: 4,
                  py: 1.2,
                  fontSize: 13,
                  fontWeight: 700,
                  letterSpacing: 1,
                  textTransform: "uppercase",
                  width: { xs: "100%", sm: "auto" },
                  "&:hover": { bgcolor: "#1565c0" },
                  "&.Mui-disabled": { bgcolor: "#1e3a5f", opacity: 0.7, color: "white" },
                }}
              >
                {t("login.submit")}
              </Button>
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default LoginPage;
