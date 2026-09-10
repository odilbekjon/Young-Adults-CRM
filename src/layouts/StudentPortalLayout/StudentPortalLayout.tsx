// A small, dedicated shell for the student self-service portal (/portal/*).
// Deliberately NOT the staff Header/Sidebar (src/layouts/Header,
// src/layouts/Sidebar) — those are staff-CRM-specific (branch switcher,
// staff quick-add, a large staff nav) with no reusable piece for a
// 7-page, self-service-only shell.
import { useState, type ReactNode } from "react";
import {
  AppBar, Toolbar, Box, Typography, IconButton, Drawer, List, ListItemButton,
  ListItemIcon, ListItemText, Menu, MenuItem, Avatar, Divider, useMediaQuery,
} from "@mui/material";
import { useTranslation } from "react-i18next";
import { useDispatch } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom";
import { MdMenu, MdLightMode, MdDarkMode, MdLogout } from "react-icons/md";
import {
  TbLayoutDashboard, TbCalendarCheck, TbWallet, TbCreditCard, TbUsers, TbUser, TbClock,
} from "react-icons/tb";
import { useThemeMode } from "../../Context/ThemeContext/ThemeContext";
import { logout } from "../../app/store/authSlice";
import type { AppDispatch } from "../../app/store";
import { useStudentPortalProfileQuery } from "../../app/api/studentPortalApi";

const LANGUAGE_OPTIONS: { code: "en" | "ru" | "uz"; label: string }[] = [
  { code: "en", label: "EN" },
  { code: "ru", label: "RU" },
  { code: "uz", label: "UZ" },
];

const NAV_WIDTH = 220;

const NAV_ITEMS = [
  { path: "/portal/dashboard", labelKey: "studentPortal.nav.dashboard", icon: TbLayoutDashboard },
  { path: "/portal/attendance", labelKey: "studentPortal.nav.attendance", icon: TbCalendarCheck },
  { path: "/portal/balance", labelKey: "studentPortal.nav.balance", icon: TbWallet },
  { path: "/portal/payments", labelKey: "studentPortal.nav.payments", icon: TbCreditCard },
  { path: "/portal/groups", labelKey: "studentPortal.nav.groups", icon: TbUsers },
  { path: "/portal/schedule", labelKey: "studentPortal.nav.schedule", icon: TbClock },
  { path: "/portal/profile", labelKey: "studentPortal.nav.profile", icon: TbUser },
];

const NavList = ({ onNavigate }: { onNavigate?: () => void }) => {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <List sx={{ py: 1 }}>
      {NAV_ITEMS.map((item) => {
        const active = location.pathname === item.path;
        const Icon = item.icon;
        return (
          <ListItemButton
            key={item.path}
            selected={active}
            onClick={() => { navigate(item.path); onNavigate?.(); }}
            sx={{
              mx: 1, mb: 0.5, borderRadius: "8px",
              color: active ? "var(--color-primary)" : "var(--color-text-secondary)",
              bgcolor: active ? "var(--color-primary-surface)" : "transparent",
              "&:hover": { bgcolor: "var(--color-surface-hover)" },
              "&.Mui-selected": { "&:hover": { bgcolor: "var(--color-primary-surface)" } },
            }}
          >
            <ListItemIcon sx={{ minWidth: 34, color: "inherit" }}>
              <Icon size={18} />
            </ListItemIcon>
            <ListItemText
              primary={t(item.labelKey)}
              primaryTypographyProps={{ fontSize: 13.5, fontWeight: active ? 600 : 500 }}
            />
          </ListItemButton>
        );
      })}
    </List>
  );
};

export const StudentPortalLayout = ({ children }: { children: ReactNode }) => {
  const { t, i18n } = useTranslation();
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { mode, toggleMode } = useThemeMode();
  const { data: profile } = useStudentPortalProfileQuery();
  const isNarrow = useMediaQuery("(max-width:900px)");

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [userMenuAnchor, setUserMenuAnchor] = useState<null | HTMLElement>(null);

  const currentLang = (i18n.language as "en" | "ru" | "uz") || "uz";
  const handleChangeLanguage = (code: "en" | "ru" | "uz") => {
    i18n.changeLanguage(code);
    localStorage.setItem("appLanguage", code);
  };

  const handleSignOut = () => {
    setUserMenuAnchor(null);
    dispatch(logout());
    navigate("/login");
  };

  const displayName = profile?.name || t("studentPortal.nav.student");
  const initials = displayName.trim().slice(0, 1).toUpperCase() || "S";

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "var(--color-bg-page)" }}>
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          bgcolor: "var(--color-surface)", color: "var(--color-text-primary)",
          borderBottom: "1px solid var(--color-border)", zIndex: (theme) => theme.zIndex.drawer + 1,
        }}
      >
        <Toolbar sx={{ gap: 1 }}>
          {isNarrow && (
            <IconButton onClick={() => setDrawerOpen(true)} sx={{ color: "var(--color-text-secondary)" }}>
              <MdMenu size={22} />
            </IconButton>
          )}
          <Typography sx={{ fontWeight: 700, fontSize: 16, flexShrink: 0 }}>
            {t("studentPortal.appTitle")}
          </Typography>

          <Box sx={{ flex: 1 }} />

          <Box sx={{ display: "flex", gap: 0.5, mr: 1 }}>
            {LANGUAGE_OPTIONS.map((opt) => (
              <Box
                key={opt.code}
                onClick={() => handleChangeLanguage(opt.code)}
                sx={{
                  cursor: "pointer", fontSize: 12.5, px: 0.8, py: 0.2, borderRadius: "4px",
                  fontWeight: currentLang === opt.code ? 700 : 400,
                  color: currentLang === opt.code ? "var(--color-primary)" : "var(--color-text-muted)",
                }}
              >
                {opt.label}
              </Box>
            ))}
          </Box>

          <IconButton onClick={toggleMode} sx={{ color: "var(--color-text-secondary)" }} title={t("studentPortal.toggleTheme")}>
            {mode === "dark" ? <MdLightMode size={18} /> : <MdDarkMode size={18} />}
          </IconButton>

          <IconButton onClick={(e) => setUserMenuAnchor(e.currentTarget)} sx={{ ml: 0.5 }}>
            <Avatar sx={{ width: 32, height: 32, fontSize: 13, bgcolor: "var(--color-primary)" }}>
              {initials}
            </Avatar>
          </IconButton>
          <Menu
            anchorEl={userMenuAnchor}
            open={Boolean(userMenuAnchor)}
            onClose={() => setUserMenuAnchor(null)}
            PaperProps={{ sx: { minWidth: 180, borderRadius: 2, mt: 1 } }}
          >
            <Box sx={{ px: 2, py: 1 }}>
              <Typography fontSize={13} fontWeight={600} color="var(--color-text-primary)">
                {displayName}
              </Typography>
            </Box>
            <Divider />
            <MenuItem onClick={handleSignOut} sx={{ fontSize: 13, gap: 1, color: "var(--color-danger)" }}>
              <MdLogout size={16} /> {t("studentPortal.signOut")}
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      <Toolbar />

      <Box sx={{ display: "flex" }}>
        {!isNarrow && (
          <Box
            component="nav"
            sx={{
              width: NAV_WIDTH, flexShrink: 0, borderRight: "1px solid var(--color-border)",
              bgcolor: "var(--color-surface)", height: "calc(100vh - 64px)", position: "sticky", top: 64,
            }}
          >
            <NavList />
          </Box>
        )}

        {isNarrow && (
          <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)}>
            <Box sx={{ width: NAV_WIDTH, pt: 2 }}>
              <NavList onNavigate={() => setDrawerOpen(false)} />
            </Box>
          </Drawer>
        )}

        <Box component="main" sx={{ flex: 1, minWidth: 0, p: { xs: 2, md: 3 } }}>
          {children}
        </Box>
      </Box>
    </Box>
  );
};

export default StudentPortalLayout;
