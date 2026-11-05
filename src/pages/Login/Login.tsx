import { Box, Button, TextField, Typography, Alert, InputAdornment, IconButton, CircularProgress } from "@mui/material";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import { useState } from "react";
import { useDispatch } from "react-redux";
import { useTranslation } from "react-i18next";
import { FiEye, FiEyeOff } from "react-icons/fi";
import logo from "../../assets/logo_ya.png";
import blackLogo from "../../assets/logo_ya_black.png"
import { useLoginMutation } from "../../app/api/authApi";
import type { LoginResponse } from "../../app/api/authApi/types";
import { loginSuccess } from "../../app/store/authSlice";
import type { AppDispatch } from "../../app/store";
import { FetchBaseQueryError } from "@reduxjs/toolkit/query";
import { extractApiError } from "../../utils/extractApiError";

const LANGUAGE_OPTIONS: { code: "en" | "ru" | "uz"; label: string }[] = [
  { code: "en", label: "EN" },
  { code: "ru", label: "RU" },
  { code: "uz", label: "UZ" },
];

// The card below always renders on hardcoded light/navy backgrounds, so it
// must stay on the light MUI palette regardless of the app-wide dark mode
// (which follows the OS by default) — otherwise text colors flip to the
// dark palette's white/light-gray and become invisible on the white card.
const loginLightTheme = createTheme({ palette: { mode: "light" } });

const LoginPage = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { t, i18n } = useTranslation();
  const [login, { isLoading: loading }] = useLoginMutation();

  // Backend accepts either an email or a phone number in the single
  // `identifier` field (AUTH_ROLE_DOCS.md §1) — one input, no format switch.
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");

  const currentLang = (i18n.language as "en" | "ru" | "uz") || "uz";

  const handleChangeLanguage = (code: "en" | "ru" | "uz") => {
    i18n.changeLanguage(code);
    localStorage.setItem("appLanguage", code);
  };

  const canSubmit = !loading && identifier.trim() !== "" && password !== "";

  // Why a login attempt was refused, in words for the person typing:
  //  - no answer at all            -> network problem
  //  - the server broke (5xx)      -> not their credentials, say so
  //  - anything else               -> the backend's own message (a 401 carries
  //    "wrong login or password", a blocked account says so), or the stock
  //    wrong-credentials text when it sent none
  const describeLoginError = (err: unknown): string => {
    const status = (err as FetchBaseQueryError | undefined)?.status;
    if (status === "FETCH_ERROR" || status === "TIMEOUT_ERROR") return t("login.networkError");
    if (typeof status === "number" && status >= 500) return extractApiError(err) || t("login.serverError");
    return extractApiError(err) || t("login.error");
  };

  const handleLogin = async () => {
    if (loading) return;
    if (!identifier.trim() || !password) {
      setError(t("login.requiredFields"));
      return;
    }
    setError("");
    // Only the request itself can mean "wrong login or password". What happens
    // after the server has accepted the credentials is reported separately below.
    let res: LoginResponse;
    try {
      // The password goes as typed; the identifier is normalized in authApi's login.
      res = await login({ identifier, password }).unwrap();
    } catch (err: unknown) {
      setError(describeLoginError(err));
      return;
    }
    try {
      if (!res?.data?.token) throw new Error("The login response carries no token");
      // No manual navigate() here: PublicRoute reacts to the auth state
      // change and redirects to the originally-requested page (or
      // /dashboard for staff, /portal for a STUDENT-role user).
      dispatch(loginSuccess(res.data.token, res.data.refreshToken, res.data.user?.role));
    } catch (err: unknown) {
      console.error("[login] signed in, but the session could not be started", err);
      setError(t("login.sessionError"));
    }
  };

  return (
    <ThemeProvider theme={loginLightTheme}>
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
                label={t("login.identifier")}
                required
                size="small"
                type="text"
                autoComplete="username"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                placeholder={t("login.identifierPlaceholder")}
                sx={{ mb: 2 }}
              />

              <TextField
                fullWidth
                label={t("login.password")}
                required
                size="small"
                type={showPass ? "text" : "password"}
                autoComplete="current-password"
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
                disabled={!canSubmit}
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
    </ThemeProvider>
  );
};

export default LoginPage;
