// src/components/Header/Header.tsx

import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Box, Avatar, Typography, Menu, MenuItem, CircularProgress } from "@mui/material";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { useBranch, type BranchId } from "../../Context/BranchContext";
import { useSidebar } from "../../Context/SidebarContext";
import { useThemeMode } from "../../Context/ThemeContext";
import { useAuth } from "../../hooks/useAuth";

import { SIDEBAR_WIDTH, HEADER_HEIGHT } from "../Sidebar/Sidebar";
import { AddStudent } from "../../components/AddStudent/AddStudent";
import { AddPayment } from "../../components/AddPayment/AddPayment";
import { logout } from "../../app/store/authSlice";
import { changeSelectedBranch } from "../../app/store/branchSlice";
import type { AppDispatch, RootState } from "../../app/store";
import { useGetMeQuery } from "../../app/api/authApi/authApi";
import { useAllBranchesQuery } from "../../app/api/branchesApi/branchesApi";
import { useAllStudentsQuery } from "../../app/api/studentsApi";
import type { Student } from "../../app/api/studentsApi/types";
import { LANGUAGE_OPTIONS } from "../../constants/LanguageOptions";


import {
  MdSearch, MdFullscreen, MdFullscreenExit,
  MdHelpOutline, MdHistory, MdNotificationsNone,
  MdKeyboardArrowDown, MdAdd, MdMenu,
  MdLightMode, MdDarkMode,
} from "react-icons/md";
import { FiAlertCircle } from "react-icons/fi";

// logo.svg is a flat (non-transparent) raster export baked with a white
// background, so it leaves a white box behind it in dark mode. The login
// page already ships light/dark variants with real alpha channels — reuse
// those here instead, swapped by theme mode.
import logoOnLight from "../../assets/logo_ya_black.png";
import logoOnDark from "../../assets/logo_ya.png";



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
      width: 34, height: 34, border: "1px solid var(--color-border)", borderRadius: 8,
      background: active ? "var(--color-surface-hover)" : "var(--color-surface)", display: "flex",
      alignItems: "center", justifyContent: "center", cursor: "pointer",
      color: "var(--color-text-secondary)", flexShrink: 0, transition: "background 0.15s, color 0.15s",
    }}
    onMouseEnter={(e) => {
      (e.currentTarget as HTMLButtonElement).style.background = "var(--color-surface-hover)";
      (e.currentTarget as HTMLButtonElement).style.color = "var(--color-text-primary)";
    }}
    onMouseLeave={(e) => {
      (e.currentTarget as HTMLButtonElement).style.background = active ? "var(--color-surface-hover)" : "var(--color-surface)";
      (e.currentTarget as HTMLButtonElement).style.color = "var(--color-text-secondary)";
    }}
  >
    {children}
  </button>
);

/* ─── Branch Dropdown ─── */
const BranchDropdown = ({ branch, setBranch }: { branch: BranchId; setBranch: (b: BranchId) => void }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const dispatch = useDispatch<AppDispatch>();
  const selectedBranchId = useSelector((s: RootState) => s.branch.selectedBranchId);
  const { data: branchesData, isLoading: branchesLoading } = useAllBranchesQuery();
  const { isSuperAdmin, branchIds } = useAuth();

  // Only SUPERADMIN (CEO) sees every branch / the "All branches" shortcut —
  // everyone else is scoped to the branches their own account was assigned
  // (AUTH_ROLE_DOCS.md's branchIds), so they can't select their way into a
  // branch's data they don't otherwise have access to.
  const activeBranches = (branchesData?.data ?? []).filter((b) => b.status === "ACTIVE");
  const scopedBranches = isSuperAdmin ? activeBranches : activeBranches.filter((b) => branchIds.includes(b.id));

  const options: { value: BranchId; label: string; id: string | null }[] = isSuperAdmin
    ? [{ value: "all", label: "All branches", id: null }, ...scopedBranches.map((b) => ({ value: b.name, label: b.name, id: b.id }))]
    : scopedBranches.map((b) => ({ value: b.name, label: b.name, id: b.id }));
  const current = options.find((o) => o.value === branch);

  // Restores the visible selection after a page reload: the real branch id
  // persists in Redux/localStorage, but the label state (`branch`) resets to
  // "all" on mount, so once branches load we re-sync the label to match.
  useEffect(() => {
    if (!selectedBranchId || branch !== "all") return;
    const match = options.find((o) => o.id === selectedBranchId);
    if (match) setBranch(match.value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBranchId, branchesData]);

  const handleSelect = (opt: { value: BranchId; id: string | null }) => {
    setBranch(opt.value);
    dispatch(changeSelectedBranch(opt.id));
    setOpen(false);
  };

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
          fontWeight: 500, color: "var(--color-text-primary)", transition: "background 0.15s",
        }}
        onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "var(--color-surface-hover)")}
        onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "none")}
      >
        {current?.label ?? "Branch"}
        <MdKeyboardArrowDown
          size={16} color="var(--color-text-secondary)"
          style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}
        />
      </button>
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 8px)", left: 0,
          background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 10,
          boxShadow: "0 8px 24px var(--color-shadow)", zIndex: 500,
          minWidth: 200, animation: "dropDown 0.15s ease", overflow: "hidden",
        }}>
          <style>{`@keyframes dropDown{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:translateY(0)}}`}</style>
          {branchesLoading ? (
            <div style={{ padding: "10px 14px", fontSize: 13, color: "var(--color-text-muted)" }}>Loading…</div>
          ) : (
            options.map((opt) => (
              <div
                key={opt.value}
                onClick={() => handleSelect(opt)}
                style={{
                  padding: "10px 14px", fontSize: 13, cursor: "pointer",
                  fontWeight: opt.value === branch ? 600 : 400,
                  color: opt.value === branch ? "var(--color-primary)" : "var(--color-text-primary)",
                  background: opt.value === branch ? "var(--color-primary-surface)" : "var(--color-surface)",
                }}
                onMouseEnter={(e) => { if (opt.value !== branch) (e.currentTarget as HTMLDivElement).style.background = "var(--color-surface-alt)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = opt.value === branch ? "var(--color-primary-surface)" : "var(--color-surface)"; }}
              >
                {opt.label}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

/* ─── Search Bar ─── */
const SEARCH_DEBOUNCE_MS = 350;
const SEARCH_RESULT_LIMIT = 8;

const StudentSearchResultRow = ({ student, onSelect }: { student: Student; onSelect: () => void }) => (
  <div
    onClick={onSelect}
    style={{
      display: "flex", alignItems: "center", gap: 10,
      padding: "9px 14px", cursor: "pointer",
      borderBottom: "1px solid var(--color-border-subtle)",
    }}
    onMouseEnter={(e) => ((e.currentTarget as HTMLDivElement).style.background = "var(--color-surface-alt)")}
    onMouseLeave={(e) => ((e.currentTarget as HTMLDivElement).style.background = "var(--color-surface)")}
  >
    <Avatar src={student.photo || undefined} sx={{ width: 30, height: 30, fontSize: 13, bgcolor: "#c8cdd4" }}>
      {student.name?.charAt(0)?.toUpperCase()}
    </Avatar>
    <div style={{ minWidth: 0, flex: 1 }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
        {student.name}
      </div>
      {student.phone && (
        <div style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>{student.phone}</div>
      )}
    </div>
  </div>
);

const SearchBar = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const ref = useRef<HTMLDivElement>(null);
  const [focused, setFocused] = useState(false);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  useEffect(() => {
    const handle = setTimeout(() => setDebouncedQuery(query.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [query]);

  const selectedBranchId = useSelector((s: RootState) => s.branch.selectedBranchId);
  const {
    data: searchData, isFetching: isSearching, isError: searchFailed,
  } = useAllStudentsQuery(
    { page: 1, limit: SEARCH_RESULT_LIMIT, search: debouncedQuery, branchId: selectedBranchId ?? undefined },
    { skip: !debouncedQuery }
  );

  // Falls back to a client-side name/phone filter in case the backend
  // doesn't actually honor the `search` query param yet (same defensive
  // pattern as AddStudentDrawer's local student search).
  const results = (searchData?.data ?? []).filter(
    (s) =>
      s.name?.toLowerCase().includes(debouncedQuery.toLowerCase()) ||
      s.phone?.includes(debouncedQuery)
  );

  const showDropdown = focused && debouncedQuery.length > 0;

  useEffect(() => {
    if (!focused) return;
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setFocused(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [focused]);

  const handleSelect = (id: string) => {
    setFocused(false);
    setQuery("");
    setDebouncedQuery("");
    navigate(`/students/${id}`);
  };

  return (
    <div ref={ref} style={{ position: "relative", flex: 1, maxWidth: 380 }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        background: "var(--color-surface-alt)", border: `1px solid ${focused ? "var(--color-primary)" : "var(--color-border)"}`,
        borderRadius: 10, padding: "0 14px", height: 36,
        transition: "border-color 0.15s",
      }}>
        <MdSearch size={17} color="var(--color-text-secondary)" />
        <input
          placeholder={t("header.search")}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          style={{
            border: "none", background: "none", outline: "none",
            fontSize: 13, color: "var(--color-text-primary)", width: "100%", fontFamily: "inherit",
          }}
        />
      </div>

      {showDropdown && (
        <div style={{
          position: "absolute", top: "calc(100% + 8px)", left: 0, right: 0,
          background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 10,
          boxShadow: "0 8px 24px var(--color-shadow)", zIndex: 500,
          maxHeight: 360, overflowY: "auto", animation: "dropDown 0.15s ease",
        }}>
          <style>{`@keyframes dropDown{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:translateY(0)}}`}</style>
          {isSearching ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "14px", fontSize: 13, color: "var(--color-text-muted)" }}>
              <CircularProgress size={14} thickness={5} /> {t("header.searching")}
            </div>
          ) : searchFailed ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "14px", fontSize: 13, color: "var(--color-danger)" }}>
              <FiAlertCircle size={15} /> {t("header.searchError")}
            </div>
          ) : results.length === 0 ? (
            <div style={{ padding: "14px", fontSize: 13, color: "var(--color-text-muted)" }}>
              {t("header.searchNoResults")}
            </div>
          ) : (
            results.map((s) => (
              <StudentSearchResultRow key={s.id} student={s} onSelect={() => handleSelect(s.id)} />
            ))
          )}
        </div>
      )}
    </div>
  );
};

/* ─── Language Toggle ─── */
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
          height: 34, padding: "0 10px", border: "1px solid var(--color-border)",
          borderRadius: 8, background: "var(--color-surface)", cursor: "pointer",
          fontSize: 12, fontWeight: 600, color: "var(--color-text-secondary)",
        }}
        onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "var(--color-surface-hover)")}
        onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "var(--color-surface)")}
      >
        {currentLang}
        <MdKeyboardArrowDown
          size={14} color="var(--color-text-secondary)"
          style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}
        />
      </button>

      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 8px)", right: 0,
          background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 10,
          boxShadow: "0 8px 24px var(--color-shadow)", zIndex: 500,
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
                color: opt.code === currentLang ? "var(--color-primary)" : "var(--color-text-primary)",
                background: opt.code === currentLang ? "var(--color-primary-surface)" : "var(--color-surface)",
              }}
              onMouseEnter={(e) => { if (opt.code !== currentLang) (e.currentTarget as HTMLDivElement).style.background = "var(--color-surface-alt)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = opt.code === currentLang ? "var(--color-primary-surface)" : "var(--color-surface)"; }}
            >
              {opt.code} - {opt.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/* ─── Theme Toggle ─── */
const ThemeToggle = () => {
  const { t } = useTranslation();
  const { mode, toggleMode } = useThemeMode();
  const isDark = mode === "dark";
  return (
    <IconBtn
      onClick={toggleMode}
      title={isDark ? t("header.lightMode") : t("header.darkMode")}
    >
      {isDark ? <MdLightMode size={18} /> : <MdDarkMode size={18} />}
    </IconBtn>
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
          width: 34, height: 34, border: "1px solid var(--color-border)", borderRadius: 8,
          background: "var(--color-surface)", display: "flex", alignItems: "center",
          justifyContent: "center", cursor: "pointer", color: "var(--color-text-secondary)", position: "relative",
        }}
        onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "var(--color-surface-hover)")}
        onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "var(--color-surface)")}
      >
        <MdNotificationsNone size={18} />
        <span style={{
          position: "absolute", top: 4, right: 4, width: 7, height: 7,
          background: "var(--color-danger)", borderRadius: "50%", border: "1.5px solid var(--color-surface)",
        }} />
      </button>
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 8px)", right: 0,
          background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 10,
          boxShadow: "0 8px 24px var(--color-shadow)", zIndex: 500,
          width: 280, animation: "dropDown 0.15s ease", overflow: "hidden",
        }}>
          <div style={{ padding: "12px 14px 8px", fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)", borderBottom: "1px solid var(--color-border-subtle)" }}>
            {t("header.notifications")}
          </div>
          {[
            { text: "New student added to KIDS English", time: "2 min ago" },
            { text: "Payment received from Aliyev Bobur", time: "15 min ago" },
            { text: "Group IELTS updated", time: "1 hr ago" },
          ].map((n, i) => (
            <div
              key={i}
              style={{ padding: "10px 14px", borderBottom: "1px solid var(--color-border-subtle)", cursor: "pointer" }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLDivElement).style.background = "var(--color-surface-alt)")}
              onMouseLeave={(e) => ((e.currentTarget as HTMLDivElement).style.background = "var(--color-surface)")}
            >
              <div style={{ fontSize: 12, color: "var(--color-text-primary)", marginBottom: 2 }}>{n.text}</div>
              <div style={{ fontSize: 11, color: "var(--color-text-muted)" }}>{n.time}</div>
            </div>
          ))}
          <div style={{ padding: "10px 14px", textAlign: "center" }}>
            <span style={{ fontSize: 12, color: "var(--color-primary)", cursor: "pointer" }}>{t("header.viewAll")}</span>
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
          background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 10,
          boxShadow: "0 8px 24px var(--color-shadow)", zIndex: 500,
          width: 240, animation: "dropDown 0.15s ease", overflow: "hidden",
        }}>
          <div style={{ padding: "12px 14px 8px", fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)", borderBottom: "1px solid var(--color-border-subtle)" }}>
            {t("header.recentPages")}
          </div>
          {["Teachers list", "KIDS English group", "Pardayev Jahongir", "Students"].map((p, i) => (
            <div
              key={i}
              style={{
                padding: "9px 14px", fontSize: 12, color: "var(--color-text-secondary)", cursor: "pointer",
                display: "flex", gap: 8, alignItems: "center", borderBottom: "1px solid var(--color-border-subtle)",
              }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLDivElement).style.background = "var(--color-surface-alt)")}
              onMouseLeave={(e) => ((e.currentTarget as HTMLDivElement).style.background = "var(--color-surface)")}
            >
              <MdHistory size={13} color="var(--color-text-muted)" /> {p}
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
  const { hasPermission } = useAuth();
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  // AUTH_ROLE_DOCS.md: action buttons are shown only when the user actually
  // holds the matching CREATE permission (e.g. a Manager without PAYMENTS
  // CREATE shouldn't see "Add payment" here at all).
  const items = [
    ...(hasPermission("STUDENTS", "CREATE") ? [{ label: t("quickAdd.addStudent"), emoji: "🎓", action: onAddStudent }] : []),
    ...(hasPermission("PAYMENTS", "CREATE") ? [{ label: t("quickAdd.addPayment"), emoji: "💳", action: onAddPayment }] : []),
  ];

  if (items.length === 0) return null;

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <IconBtn onClick={() => setOpen((p) => !p)} title={t("quickAdd.addStudent")} active={open}>
        <MdAdd size={18} />
      </IconBtn>
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 8px)", left: 0,
          background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 10,
          boxShadow: "0 8px 24px var(--color-shadow)", zIndex: 500,
          minWidth: 180, animation: "dropDown 0.15s ease", overflow: "hidden",
        }}>
          {items.map((item) => (
            <div
              key={item.label}
              onClick={() => { setOpen(false); item.action(); }}
              style={{
                padding: "11px 16px", fontSize: 13, cursor: "pointer",
                display: "flex", alignItems: "center", gap: 10,
                color: "var(--color-text-primary)", transition: "background 0.1s",
              }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLDivElement).style.background = "var(--color-surface-alt)")}
              onMouseLeave={(e) => ((e.currentTarget as HTMLDivElement).style.background = "var(--color-surface)")}
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
  const dispatch = useDispatch<AppDispatch>();
  const { branch, setBranch } = useBranch();
  const { toggleMobile } = useSidebar();
  const { mode } = useThemeMode();
  const logo = mode === "dark" ? logoOnDark : logoOnLight;
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [userMenuAnchor, setUserMenuAnchor] = useState<null | HTMLElement>(null);
  const [addStudentOpen, setAddStudentOpen] = useState(false);
  const [addPaymentOpen, setAddPaymentOpen] = useState(false);

  const { data: meData } = useGetMeQuery();
  const currentUser = meData?.data;
  const displayName = currentUser?.name || currentUser?.email || t("header.account");
  const avatarInitial = displayName.charAt(0).toUpperCase();

  const handleSignOut = () => {
    setUserMenuAnchor(null);
    dispatch(logout());
    navigate("/login", { replace: true });
  };

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
          backgroundColor: "var(--color-surface)", borderBottom: "1px solid var(--color-border)", color: "var(--color-text-primary)",
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
          height: "100%", borderRight: "1px solid var(--color-border)", px: 1.5,
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
            <ThemeToggle />
            <IconBtn onClick={toggleFullscreen} title={isFullscreen ? t("header.exitFullscreen") : t("header.fullscreen")}>
              {isFullscreen ? <MdFullscreenExit size={18} /> : <MdFullscreen size={18} />}
            </IconBtn>
            <IconBtn title={t("header.help")}><MdHelpOutline size={18} /></IconBtn>
            <HistoryBtn />
            <NotificationBtn />
          </Box>

          <div style={{ width: 1, height: 28, background: "var(--color-border)", marginLeft: 4, marginRight: 4 }} />

          <button
            onClick={(e) => setUserMenuAnchor(e.currentTarget)}
            style={{
              display: "flex", alignItems: "center", gap: 10,
              border: "none", background: "none", cursor: "pointer",
              borderRadius: 10, padding: "4px 8px", transition: "background 0.15s",
            }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "var(--color-surface-hover)")}
            onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "none")}
          >
            <Typography sx={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-primary)" }}>
              {displayName}
            </Typography>
            <Avatar
              src={currentUser?.photo || undefined}
              sx={{ width: 32, height: 32, backgroundColor: "#c8cdd4", fontSize: 13, fontWeight: 600 }}
            >
              {avatarInitial}
            </Avatar>
          </button>
        </Box>

        {/* Main area — mobile compact controls */}
        <Box sx={{ display: { xs: "flex", md: "none" }, alignItems: "center", gap: 0.5, pr: 1, height: "100%" }}>
          <BranchDropdown branch={branch} setBranch={setBranch} />
          <LangToggle />
          <ThemeToggle />
          <NotificationBtn />
          <button
            onClick={(e) => setUserMenuAnchor(e.currentTarget)}
            style={{ border: "none", background: "none", cursor: "pointer", padding: 4, borderRadius: 10, display: "flex" }}
          >
            <Avatar
              src={currentUser?.photo || undefined}
              sx={{ width: 30, height: 30, backgroundColor: "#c8cdd4", fontSize: 13, fontWeight: 600 }}
            >
              {avatarInitial}
            </Avatar>
          </button>
        </Box>

        <Menu
          anchorEl={userMenuAnchor}
          open={Boolean(userMenuAnchor)}
          onClose={() => setUserMenuAnchor(null)}
          transformOrigin={{ horizontal: "right", vertical: "top" }}
          anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
          PaperProps={{ sx: { borderRadius: 2, mt: 1, minWidth: 160, boxShadow: "0 8px 24px var(--color-shadow)" } }}
        >
          <MenuItem sx={{ fontSize: 13 }} onClick={() => { setUserMenuAnchor(null); navigate("/profile"); }}>
            {t("header.account")}
          </MenuItem>

          <MenuItem sx={{ fontSize: 13, color: "var(--color-danger)" }} onClick={handleSignOut}>
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
