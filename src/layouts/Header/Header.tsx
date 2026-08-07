// src/components/Header/Header.tsx

import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Box, Avatar, Typography, Menu, MenuItem } from "@mui/material";
import { Link, useNavigate } from "react-router-dom";
import { useBranch, BRANCH_OPTIONS, type BranchId } from "../../Context/BranchContext";
import { useSidebar } from "../../Context/SidebarContext";

import { SIDEBAR_WIDTH, HEADER_HEIGHT } from "../Sidebar/Sidebar";
import { AddStudent } from "../../components/AddStudent/AddStudent";
import { AddPayment } from "../../components/AddPayment/AddPayment";


import {
  MdSearch, MdFullscreen, MdFullscreenExit,
  MdHelpOutline, MdHistory, MdNotificationsNone,
  MdKeyboardArrowDown, MdAdd, MdMenu,
} from "react-icons/md";

import logo from "../../assets/logo.svg";



/* ══════════════════════════════════════════
   Icon Button helper
══════════════════════════════════════════ */
const IconBtn = ({ children, onClick, active, title }: {
  children: React.ReactNode; onClick?: () => void; active?: boolean; title?: string;
}) => (
  <button
    title={title}
    onClick={onClick}
    style={{
      width: 34, height: 34, border: "1px solid #e0e5ec", borderRadius: 8,
      background: active ? "#f0f4f9" : "#fff", display: "flex",
      alignItems: "center", justifyContent: "center", cursor: "pointer",
      color: "#6b7a8d", flexShrink: 0, transition: "background 0.15s, color 0.15s",
    }}
    onMouseEnter={(e) => {
      (e.currentTarget as HTMLButtonElement).style.background = "#f0f4f9";
      (e.currentTarget as HTMLButtonElement).style.color = "#1a2332";
    }}
    onMouseLeave={(e) => {
      (e.currentTarget as HTMLButtonElement).style.background = active ? "#f0f4f9" : "#fff";
      (e.currentTarget as HTMLButtonElement).style.color = "#6b7a8d";
    }}
  >
    {children}
  </button>
);

/* ─── Branch Dropdown ─── */
const BranchDropdown = ({ branch, setBranch }: { branch: BranchId; setBranch: (b: BranchId) => void }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = BRANCH_OPTIONS.find((o) => o.value === branch);

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((p) => !p)}
        style={{
          display: "flex", alignItems: "center", gap: 4,
          border: "none", background: "none", cursor: "pointer",
          padding: "4px 8px", borderRadius: 8, fontSize: 14,
          fontWeight: 500, color: "#1a2332", transition: "background 0.15s",
        }}
        onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "#f0f4f9")}
        onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "none")}
      >
        {current?.label ?? "Branch"}
        <MdKeyboardArrowDown
          size={16} color="#6b7a8d"
          style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}
        />
      </button>
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 8px)", left: 0,
          background: "#fff", border: "1px solid #e0e5ec", borderRadius: 10,
          boxShadow: "0 8px 24px rgba(0,0,0,0.1)", zIndex: 500,
          minWidth: 200, animation: "dropDown 0.15s ease", overflow: "hidden",
        }}>
          <style>{`@keyframes dropDown{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:translateY(0)}}`}</style>
          {BRANCH_OPTIONS.map((opt) => (
            <div
              key={opt.value}
              onClick={() => { setBranch(opt.value); setOpen(false); }}
              style={{
                padding: "10px 14px", fontSize: 13, cursor: "pointer",
                fontWeight: opt.value === branch ? 600 : 400,
                color: opt.value === branch ? "#185FA5" : "#1a2332",
                background: opt.value === branch ? "#f0f7ff" : "#fff",
              }}
              onMouseEnter={(e) => { if (opt.value !== branch) (e.currentTarget as HTMLDivElement).style.background = "#f7f8fa"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = opt.value === branch ? "#f0f7ff" : "#fff"; }}
            >
              {opt.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/* ─── Search Bar ─── */
const SearchBar = () => {
  const { t } = useTranslation();
  const [focused, setFocused] = useState(false);
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 8,
      background: "#f5f6f8", border: `1px solid ${focused ? "#185FA5" : "#e0e5ec"}`,
      borderRadius: 10, padding: "0 14px", height: 36,
      flex: 1, maxWidth: 380, transition: "border-color 0.15s",
    }}>
      <MdSearch size={17} color="#6b7a8d" />
      <input
        placeholder={t("header.search")}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          border: "none", background: "none", outline: "none",
          fontSize: 13, color: "#1a2332", width: "100%", fontFamily: "inherit",
        }}
      />
    </div>
  );
};

/* ─── Language Toggle ─── */
const LANGUAGE_OPTIONS: { code: "en" | "ru" | "uz"; label: string }[] = [
  { code: "en", label: "English" },
  { code: "ru", label: "Русский" },
  { code: "uz", label: "O'zbekcha" },
];

const LangToggle = () => {
  const { i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const currentLang = (i18n.language as "en" | "ru" | "uz") || "en";

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  const handleSelect = (code: "en" | "ru" | "uz") => {
    i18n.changeLanguage(code);
    localStorage.setItem("appLanguage", code);
    setOpen(false);
  };

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((p) => !p)}
        style={{
          display: "flex", alignItems: "center", gap: 4,
          height: 34, padding: "0 10px", border: "1px solid #e0e5ec",
          borderRadius: 8, background: "#fff", cursor: "pointer",
          fontSize: 12, fontWeight: 600, color: "#6b7a8d",
        }}
        onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "#f0f4f9")}
        onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "#fff")}
      >
        {currentLang}
        <MdKeyboardArrowDown
          size={14} color="#6b7a8d"
          style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}
        />
      </button>

      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 8px)", right: 0,
          background: "#fff", border: "1px solid #e0e5ec", borderRadius: 10,
          boxShadow: "0 8px 24px rgba(0,0,0,0.1)", zIndex: 500,
          minWidth: 160, animation: "dropDown 0.15s ease", overflow: "hidden",
        }}>
          <style>{`@keyframes dropDown{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:translateY(0)}}`}</style>
          {LANGUAGE_OPTIONS.map((opt) => (
            <div
              key={opt.code}
              onClick={() => handleSelect(opt.code)}
              style={{
                padding: "10px 14px", fontSize: 13, cursor: "pointer",
                fontWeight: opt.code === currentLang ? 600 : 400,
                color: opt.code === currentLang ? "#185FA5" : "#1a2332",
                background: opt.code === currentLang ? "#f0f7ff" : "#fff",
              }}
              onMouseEnter={(e) => { if (opt.code !== currentLang) (e.currentTarget as HTMLDivElement).style.background = "#f7f8fa"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = opt.code === currentLang ? "#f0f7ff" : "#fff"; }}
            >
              {opt.code} - {opt.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/* ─── Notifications ─── */
const NotificationBtn = () => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((p) => !p)}
        style={{
          width: 34, height: 34, border: "1px solid #e0e5ec", borderRadius: 8,
          background: "#fff", display: "flex", alignItems: "center",
          justifyContent: "center", cursor: "pointer", color: "#6b7a8d", position: "relative",
        }}
        onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "#f0f4f9")}
        onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "#fff")}
      >
        <MdNotificationsNone size={18} />
        <span style={{
          position: "absolute", top: 4, right: 4, width: 7, height: 7,
          background: "#e53935", borderRadius: "50%", border: "1.5px solid #fff",
        }} />
      </button>
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 8px)", right: 0,
          background: "#fff", border: "1px solid #e0e5ec", borderRadius: 10,
          boxShadow: "0 8px 24px rgba(0,0,0,0.1)", zIndex: 500,
          width: 280, animation: "dropDown 0.15s ease", overflow: "hidden",
        }}>
          <div style={{ padding: "12px 14px 8px", fontSize: 13, fontWeight: 600, color: "#1a2332", borderBottom: "1px solid #f0f0f0" }}>
            {t("header.notifications")}
          </div>
          {[
            { text: "New student added to KIDS English", time: "2 min ago" },
            { text: "Payment received from Aliyev Bobur", time: "15 min ago" },
            { text: "Group IELTS updated", time: "1 hr ago" },
          ].map((n, i) => (
            <div
              key={i}
              style={{ padding: "10px 14px", borderBottom: "1px solid #f5f5f5", cursor: "pointer" }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLDivElement).style.background = "#f7f8fa")}
              onMouseLeave={(e) => ((e.currentTarget as HTMLDivElement).style.background = "#fff")}
            >
              <div style={{ fontSize: 12, color: "#1a2332", marginBottom: 2 }}>{n.text}</div>
              <div style={{ fontSize: 11, color: "#aaa" }}>{n.time}</div>
            </div>
          ))}
          <div style={{ padding: "10px 14px", textAlign: "center" }}>
            <span style={{ fontSize: 12, color: "#185FA5", cursor: "pointer" }}>{t("header.viewAll")}</span>
          </div>
        </div>
      )}
    </div>
  );
};

/* ─── History ─── */
const HistoryBtn = () => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <IconBtn onClick={() => setOpen((p) => !p)} title={t("header.recentPages")} active={open}>
        <MdHistory size={18} />
      </IconBtn>
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 8px)", right: 0,
          background: "#fff", border: "1px solid #e0e5ec", borderRadius: 10,
          boxShadow: "0 8px 24px rgba(0,0,0,0.1)", zIndex: 500,
          width: 240, animation: "dropDown 0.15s ease", overflow: "hidden",
        }}>
          <div style={{ padding: "12px 14px 8px", fontSize: 13, fontWeight: 600, color: "#1a2332", borderBottom: "1px solid #f0f0f0" }}>
            {t("header.recentPages")}
          </div>
          {["Teachers list", "KIDS English group", "Pardayev Jahongir", "Students"].map((p, i) => (
            <div
              key={i}
              style={{
                padding: "9px 14px", fontSize: 12, color: "#555", cursor: "pointer",
                display: "flex", gap: 8, alignItems: "center", borderBottom: "1px solid #f5f5f5",
              }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLDivElement).style.background = "#f7f8fa")}
              onMouseLeave={(e) => ((e.currentTarget as HTMLDivElement).style.background = "#fff")}
            >
              <MdHistory size={13} color="#aaa" /> {p}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/* ══════════════════════════════════════════
   Quick Add Dropdown (➕)
══════════════════════════════════════════ */
const QuickAddBtn = ({ onAddStudent, onAddPayment }: {
  onAddStudent: () => void; onAddPayment: () => void;
}) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  const items = [
    { label: t("quickAdd.addStudent"), emoji: "🎓", action: onAddStudent },
    { label: t("quickAdd.addPayment"), emoji: "💳", action: onAddPayment },
  ];

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <IconBtn onClick={() => setOpen((p) => !p)} title={t("quickAdd.addStudent")} active={open}>
        <MdAdd size={18} />
      </IconBtn>
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 8px)", left: 0,
          background: "#fff", border: "1px solid #e0e5ec", borderRadius: 10,
          boxShadow: "0 8px 24px rgba(0,0,0,0.1)", zIndex: 500,
          minWidth: 180, animation: "dropDown 0.15s ease", overflow: "hidden",
        }}>
          {items.map((item) => (
            <div
              key={item.label}
              onClick={() => { setOpen(false); item.action(); }}
              style={{
                padding: "11px 16px", fontSize: 13, cursor: "pointer",
                display: "flex", alignItems: "center", gap: 10,
                color: "#1a2332", transition: "background 0.1s",
              }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLDivElement).style.background = "#f7f8fa")}
              onMouseLeave={(e) => ((e.currentTarget as HTMLDivElement).style.background = "#fff")}
            >
              <span style={{ fontSize: 16 }}>{item.emoji}</span>
              <span>{item.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/* ══════════════════════════════════════════
   Main Header
══════════════════════════════════════════ */
export const Header = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { branch, setBranch } = useBranch();
  const { toggleMobile } = useSidebar();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [userMenuAnchor, setUserMenuAnchor] = useState<null | HTMLElement>(null);
  const [addStudentOpen, setAddStudentOpen] = useState(false);
  const [addPaymentOpen, setAddPaymentOpen] = useState(false);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  return (
    <>
      <Box
        component="header"
        sx={{
          position: "fixed", top: 0, left: 0, right: 0,
          height: HEADER_HEIGHT, zIndex: 100,
          backgroundColor: "#fff", borderBottom: "1px solid #e0e5ec",
          display: "flex", alignItems: "center",
        }}
      >
        {/* Mobile hamburger */}
        <Box sx={{
          display: { xs: "flex", md: "none" }, alignItems: "center", justifyContent: "center",
          width: 56, height: "100%", flexShrink: 0, pl: 1,
        }}>
          <IconBtn onClick={toggleMobile} title={t("header.hamburgerMenu")}>
            <MdMenu size={20} />
          </IconBtn>
        </Box>

        {/* Logo — desktop rail column */}
        <Box sx={{
          width: SIDEBAR_WIDTH, flexShrink: 0,
          display: { xs: "none", md: "flex" }, alignItems: "center", justifyContent: "center",
          height: "100%", borderRight: "1px solid #e0e5ec", px: 1.5,
        }}>
          <Link to="/dashboard" style={{ display: "flex", alignItems: "center" }}>
            <img
              src={logo} alt="logo"
              style={{ width: SIDEBAR_WIDTH - 24, height: "auto", maxHeight: 36, objectFit: "contain", display: "block" }}
            />
          </Link>
        </Box>

        {/* Logo — mobile, visually centered */}
        <Box sx={{
          display: { xs: "flex", md: "none" }, flex: 1,
          alignItems: "center", justifyContent: "center", height: "100%",
        }}>
          <Link to="/dashboard" style={{ display: "flex", alignItems: "center" }}>
            <img
              src={logo} alt="logo"
              style={{ width: 96, height: "auto", maxHeight: 32, objectFit: "contain", display: "block" }}
            />
          </Link>
        </Box>

        {/* Main area — desktop */}
        <Box sx={{ flex: 1, display: { xs: "none", md: "flex" }, alignItems: "center", gap: 2, px: 3, height: "100%" }}>
          <BranchDropdown branch={branch} setBranch={setBranch} />

          <QuickAddBtn
            onAddStudent={() => setAddStudentOpen(true)}
            onAddPayment={() => setAddPaymentOpen(true)}
          />

          <SearchBar />
          <Box sx={{ flex: 1 }} />

          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <LangToggle />
            <IconBtn onClick={toggleFullscreen} title={isFullscreen ? t("header.exitFullscreen") : t("header.fullscreen")}>
              {isFullscreen ? <MdFullscreenExit size={18} /> : <MdFullscreen size={18} />}
            </IconBtn>
            <IconBtn title={t("header.help")}><MdHelpOutline size={18} /></IconBtn>
            <HistoryBtn />
            <NotificationBtn />
          </Box>

          <div style={{ width: 1, height: 28, background: "#e0e5ec", marginLeft: 4, marginRight: 4 }} />

          <button
            onClick={(e) => setUserMenuAnchor(e.currentTarget)}
            style={{
              display: "flex", alignItems: "center", gap: 10,
              border: "none", background: "none", cursor: "pointer",
              borderRadius: 10, padding: "4px 8px", transition: "background 0.15s",
            }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "#f0f4f9")}
            onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "none")}
          >
            <Typography sx={{ fontSize: 13, fontWeight: 500, color: "#1a2332" }}>
              Odilbek Safarov
            </Typography>
            <Avatar sx={{ width: 32, height: 32, backgroundColor: "#c8cdd4", fontSize: 13, fontWeight: 600 }}>
              O
            </Avatar>
          </button>
        </Box>

        {/* Main area — mobile compact controls */}
        <Box sx={{ display: { xs: "flex", md: "none" }, alignItems: "center", gap: 0.5, pr: 1, height: "100%" }}>
          <BranchDropdown branch={branch} setBranch={setBranch} />
          <LangToggle />
          <NotificationBtn />
          <button
            onClick={(e) => setUserMenuAnchor(e.currentTarget)}
            style={{ border: "none", background: "none", cursor: "pointer", padding: 4, borderRadius: 10, display: "flex" }}
          >
            <Avatar sx={{ width: 30, height: 30, backgroundColor: "#c8cdd4", fontSize: 13, fontWeight: 600 }}>
              O
            </Avatar>
          </button>
        </Box>

        <Menu
          anchorEl={userMenuAnchor}
          open={Boolean(userMenuAnchor)}
          onClose={() => setUserMenuAnchor(null)}
          transformOrigin={{ horizontal: "right", vertical: "top" }}
          anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
          PaperProps={{ sx: { borderRadius: 2, mt: 1, minWidth: 160, boxShadow: "0 8px 24px rgba(0,0,0,0.1)" } }}
        >
          <MenuItem sx={{ fontSize: 13 }} onClick={() => { setUserMenuAnchor(null); navigate("/profile"); }}>
            {t("header.account")}
          </MenuItem>

          <MenuItem sx={{ fontSize: 13, color: "#e53935" }} onClick={() => setUserMenuAnchor(null)}>
            {t("header.signOut")}
          </MenuItem>
        </Menu>
      </Box>

      {/* Drawers */}
      <AddStudent open={addStudentOpen} onClose={() => setAddStudentOpen(false)} />
      <AddPayment open={addPaymentOpen} onClose={() => setAddPaymentOpen(false)} />
    </>
  );
};
