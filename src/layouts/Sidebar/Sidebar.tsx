import { useRef, useEffect, useState } from "react";
import { Box, Tooltip, Collapse, Drawer, useMediaQuery, useTheme } from "@mui/material";
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";

import {
  FiDownload, FiUsers, FiLayers,  FiHome,
  FiChevronDown, FiChevronRight, FiMail, FiPhone,
  FiStar, FiSettings, FiUser, FiFileText, FiTag,
  FiBriefcase, FiBook, FiMap, FiArchive, FiCalendar,
  FiGrid, FiUserMinus, FiSmartphone, FiTrendingUp, FiList, FiPauseCircle
} from "react-icons/fi";
import { MdOutlineDiamond } from "react-icons/md";
import { PiStudentDuotone } from "react-icons/pi";
import { IoMdSettings } from "react-icons/io";
// import { IoTrophyOutline } from "react-icons/io5";
import { FaRegCalendarAlt } from "react-icons/fa";
import { AiOutlineDollar, AiOutlinePieChart } from "react-icons/ai";
import { HiBuildingLibrary } from "react-icons/hi2";
import { useSidebar } from "../../Context/SidebarContext";

export const SIDEBAR_WIDTH = 140;
export const SUBMENU_WIDTH = 200;
export const HEADER_HEIGHT = 64;
export const MOBILE_DRAWER_WIDTH = 280;

// ─── Icon map ─────────────────────────────────────────────────────────────────

const ICON_MAP: Record<string, React.ReactNode> = {
  mail:      <FiMail size={17} />,
  phone:     <FiPhone size={17} />,
  star:      <FiStar size={17} />,
  settings:  <FiSettings size={17} />,
  users:     <FiUsers size={17} />,
  file:      <FiFileText size={17} />,
  tag:       <FiTag size={17} />,
  brief:     <FiBriefcase size={17} />,
  book:      <FiBook size={17} />,
  map:       <FiMap size={17} />,
  user:      <FiUser size={17} />,
  archive:   <FiArchive size={17} />,
  calendar:  <FiCalendar size={17} />,
  diamond:   <MdOutlineDiamond size={17} />,
  grid:      <FiGrid size={17} />,
  userMinus: <FiUserMinus size={17} />,
  pauseCircle: <FiPauseCircle size={17} />,
  layers:    <FiLayers size={17} />,
  rss:       <FiBook size={17} />,
  // Reports uchun yangi iconlar
  userCheck: <FiUsers size={17} />,
  trending:  <FiTrendingUp size={17} />,
  smartphone:<FiSmartphone size={17} />,
  list:      <FiList size={17} />,
  branch:    <HiBuildingLibrary size={17} />,
};

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SubMenuItem {
  labelKey: string;
  path: string;
  icon?: string;
  dividerBefore?: boolean;
  children?: SubMenuItem[];
}

// ─── SUBMENUS config ──────────────────────────────────────────────────────────

const SUBMENUS: Record<string, SubMenuItem[]> = {
  "/finance": [
    { labelKey: "sidebar.finance.allPayments",   path: "/finance/all-payments",   icon: "file" },
    { labelKey: "sidebar.finance.withdraw",       path: "/finance/withdraw",        icon: "file" },
    { labelKey: "sidebar.finance.totalExpenses", path: "/finance/total-expenses",  icon: "file" },
    { labelKey: "sidebar.finance.salaries",       path: "/finance/salaries",        icon: "brief" },
    { labelKey: "sidebar.finance.debtors",        path: "/finance/debtors",         icon: "user", dividerBefore: true },
  ],
  "/reports": [
    { labelKey: "sidebar.reports.conversion",    path: "/reports/conversation",       icon: "userCheck" },
    { labelKey: "sidebar.reports.attendance",    path: "/reports/attendance",       icon: "userCheck" },
    { labelKey: "sidebar.reports.leads",         path: "/reports/leads",            icon: "userCheck" },
    { labelKey: "sidebar.reports.studentsLeft", path: "/reports/students-left", icon: "trending" },
    {
      labelKey: "sidebar.reports.logs",
      path: "/reports/logs",
      children: [
        { labelKey: "sidebar.reports.logsWorkly", path: "/reports/logs/workly",   icon: "user" },
        { labelKey: "sidebar.reports.logsSms",    path: "/reports/logs/sms",      icon: "smartphone" },
        { labelKey: "sidebar.reports.logsCall",   path: "/reports/logs/call",     icon: "phone" },
        { labelKey: "sidebar.reports.logsLog",    path: "/reports/logs/log",      icon: "list" },
      ],
    },
  ],
  "/settings": [
    { labelKey: "sidebar.settings.sms",  path: "/settings/sms",  icon: "mail" },
    { labelKey: "sidebar.settings.voip", path: "/settings/voip", icon: "phone" },
    { labelKey: "sidebar.settings.grade", path: "/settings/grade", icon: "star" },
    {
      labelKey: "sidebar.settings.ceo",
      path: "/settings/ceo",
      children: [
        { labelKey: "sidebar.settings.ceoGeneral", path: "/settings/ceo/general", icon: "settings" },
        { labelKey: "sidebar.settings.ceoStaff",   path: "/settings/ceo/staff",   icon: "users" },
        { labelKey: "sidebar.settings.ceoBilling", path: "/settings/ceo/billing", icon: "brief" },
        { labelKey: "sidebar.settings.ceoRoadmap", path: "/settings/ceo/roadmap", icon: "map" },
        { labelKey: "sidebar.settings.ceoBranches", path: "/settings/ceo/branches", icon: "branch" },
      ],
    },
    {
      labelKey: "sidebar.settings.office",
      path: "/settings/office",
      children: [
        { labelKey: "sidebar.settings.officeCourses",     path: "/settings/office/courses",             icon: "diamond" },
        { labelKey: "sidebar.settings.officeRooms",       path: "/settings/office/rooms",               icon: "grid" },
        { labelKey: "sidebar.settings.officeHolidays",    path: "/settings/office/holidays",            icon: "calendar" },
        { labelKey: "sidebar.settings.officeArchive",     path: "/settings/office/archive",             icon: "archive" },
        { labelKey: "sidebar.settings.officeStudentsLeft", path: "/settings/office/students-left-group", icon: "userMinus" },
        { labelKey: "sidebar.settings.officeStudentFreezes", path: "/settings/office/student-freezes", icon: "pauseCircle" },
      ],
    },
    {
      labelKey: "sidebar.settings.forms",
      path: "/settings/forms",
      children: [
        { labelKey: "sidebar.settings.formsList", path: "/settings/forms/list", icon: "layers" },
      ],
    },
    {
      labelKey: "sidebar.settings.blog",
      path: "/settings/blog",
      children: [
        { labelKey: "sidebar.settings.blogWhatsNew", path: "/settings/blog/whats-new", icon: "rss" },
      ],
    },
    {
      labelKey: "sidebar.settings.tags",
      path: "/settings/tags",
      children: [
        { labelKey: "sidebar.settings.tagsList", path: "/settings/tags/list", icon: "tag" },
      ],
    },
  ],
};

// ─── NAV ITEMS ────────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { labelKey: "sidebar.nav.dashboard",          path: "/dashboard",                  icon: <FiHome size={40}  /> },
  { labelKey: "sidebar.nav.leads",               path: "/leads",                      icon: <FiDownload size={40}  /> },
  { labelKey: "sidebar.nav.teachers",            path: "/teachers",                   icon: <FiUsers size={40}/> },
  { labelKey: "sidebar.nav.groups",              path: "/groups",                     icon: <FiLayers size={40} /> },
  { labelKey: "sidebar.nav.students",            path: "/students",                   icon: <PiStudentDuotone size={40} /> },
  // { labelKey: "sidebar.nav.reminders",           path: "/reminders",                  icon: <FiClock size={40}  /> },
  // { labelKey: "sidebar.nav.rating",              path: "/rating",                     icon: <IoTrophyOutline size={40} /> },
  { labelKey: "sidebar.nav.attendanceReports",  path: "/attendance-reports",         icon: <FaRegCalendarAlt size={40} /> },
  // { labelKey: "sidebar.nav.teacherAttendanceReports", path: "/teacher-attendance-reports", icon: <FaRegCalendarAlt size={40} /> },
  { labelKey: "sidebar.nav.finance",             path: "/finance",                    icon: <AiOutlineDollar size={40} /> },
  { labelKey: "sidebar.nav.reports",             path: "/reports",                    icon: <AiOutlinePieChart size={40} /> },
  { labelKey: "sidebar.nav.settings",            path: "/settings",                   icon: <IoMdSettings size={40} /> },
];

// ─── SubMenuLeaf ──────────────────────────────────────────────────────────────

const SubMenuLeaf = ({ item, depth = 0 }: { item: SubMenuItem; depth?: number }) => {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const isActive = pathname === item.path;
  const iconNode = item.icon ? ICON_MAP[item.icon] : null;

  return (
    <Link to={item.path} style={{ textDecoration: "none" }}>
      <Box
        sx={{
          pl: depth === 0 ? 2 : 3,
          pr: 2,
          py: 1.2,
          fontSize: 13,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 1.2,
          color: isActive ? "var(--color-nav-active)" : "var(--color-text-secondary)",
          fontWeight: isActive ? 600 : 400,
          backgroundColor: isActive ? "var(--color-primary-surface)" : "transparent",
          transition: "background 0.12s, color 0.12s",
          "&:hover": { backgroundColor: "var(--color-primary-surface)", color: "var(--color-nav-active)" },
        }}
      >
        {iconNode && (
          <Box sx={{ display: "flex", alignItems: "center", color: "inherit", flexShrink: 0 }}>
            {iconNode}
          </Box>
        )}
        {t(item.labelKey)}
      </Box>
    </Link>
  );
};

// ─── SubMenuGroup ─────────────────────────────────────────────────────────────

const SubMenuGroup = ({ item }: { item: SubMenuItem }) => {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const isChildActive = item.children?.some((c) => pathname.startsWith(c.path));
  const [open, setOpen] = useState(!!isChildActive);

  return (
    <Box>
      <Box
        onClick={() => setOpen((p) => !p)}
        sx={{
          px: 2,
          py: 1.2,
          fontSize: 13,
          fontWeight: 500,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          color: "var(--color-text-muted)",
          userSelect: "none",
          "&:hover": { color: "var(--color-text-secondary)" },
        }}
      >
        <span>{t(item.labelKey)}</span>
        {open ? <FiChevronDown size={14} /> : <FiChevronRight size={14} />}
      </Box>
      <Collapse in={open}>
        <Box>
          {item.children?.map((child) => (
            <SubMenuLeaf key={child.path} item={child} depth={1} />
          ))}
        </Box>
      </Collapse>
    </Box>
  );
};

// ─── SubMenuPanel (desktop flyout) ─────────────────────────────────────────────

interface SubMenuPanelProps {
  parentPath: string;
  items: SubMenuItem[];
}

const SubMenuPanel = ({ items }: SubMenuPanelProps) => {
  const { setOpenSubmenu } = useSidebar();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const sidebar = document.getElementById("main-sidebar");
      if (
        panelRef.current?.contains(e.target as Node) ||
        sidebar?.contains(e.target as Node)
      ) return;
      setOpenSubmenu(null);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [setOpenSubmenu]);

  return (
    <Box
      ref={panelRef}
      sx={{
        position: "fixed",
        top: HEADER_HEIGHT,
        left: SIDEBAR_WIDTH,
        width: SUBMENU_WIDTH,
        height: `calc(100vh - ${HEADER_HEIGHT}px)`,
        backgroundColor: "var(--color-surface)",
        borderRight: "1px solid var(--color-border)",
        zIndex: 10,
        overflowY: "auto",
        scrollbarWidth: "none",
        display: { xs: "none", md: "block" },
        "&::-webkit-scrollbar": { display: "none" },
      }}
    >
      <Box sx={{ pt: 1 }}>
        {items.map((item) => {
          if (item.dividerBefore) {
            return (
              <Box key={item.path}>
                <Box sx={{ height: "0.5px", bgcolor: "var(--color-border)", mx: 2, my: 0.5 }} />
                <SubMenuLeaf item={item} />
              </Box>
            );
          }
          if (item.children?.length) {
            return <SubMenuGroup key={item.path} item={item} />;
          }
          return <SubMenuLeaf key={item.path} item={item} />;
        })}
      </Box>
    </Box>
  );
};

// ─── NavItem (desktop icon rail) ───────────────────────────────────────────────

interface NavItemProps {
  labelKey: string;
  path: string;
  icon: React.ReactNode;
  active: boolean;
  hasSubmenu: boolean;
  submenuOpen: boolean;
  // boshqa biror submenu ochiqmi?
  anySubmenuOpen: boolean;
  onClick: () => void;
}

const NavItem = ({
  labelKey,
  path,
  icon,
  active,
  hasSubmenu,
  submenuOpen,
  anySubmenuOpen,
  onClick,
}: NavItemProps) => {
  const { t } = useTranslation();
  // Submenu ochiq bo'lsa → shu item highlight
  // Submenu yopiq bo'lsa → active path highlight
  // Boshqa biror submenu ochiq bo'lsa → bu item highlight EMAS (active bo'lsa ham)
  const isHighlighted = submenuOpen || (active && !anySubmenuOpen);
  const label = t(labelKey);

  const inner = (
    <Box
      onClick={onClick}
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        py: 1.2,
        px: 0.5,
        cursor: "pointer",
        borderLeft: isHighlighted ? "3px solid var(--color-nav-active)" : "3px solid transparent",
        borderBottom: "1px solid var(--color-border)",
        backgroundColor: isHighlighted ? "var(--color-primary-surface)" : "transparent",
        transition: "background-color 0.15s, border-color 0.15s",
        "&:hover": {
          backgroundColor: "var(--color-primary-surface)",
          "& .nav-icon": { color: "var(--color-nav-active)" },
          "& .nav-label": { color: "var(--color-nav-active)" },
        },
      }}
    >
      <Box
        className="nav-icon"
        sx={{
          color: isHighlighted ? "var(--color-nav-active)" : "var(--color-text-secondary)",
          display: "flex",
          alignItems: "center",
          mb: 0.4,
          transition: "color 0.15s",
        }}
      >
        {icon}
      </Box>
      <span
        className="nav-label"
        style={{
          fontSize: 12,
          fontWeight: isHighlighted ? 600 : 400,
          color: isHighlighted ? "var(--color-nav-active)" : "var(--color-text-secondary)",
          lineHeight: 1.2,
          textAlign: "center",
          whiteSpace: "normal",
          wordBreak: "break-word",
          maxWidth: 84,
          transition: "color 0.15s",
        }}
      >
        {label}
      </span>
    </Box>
  );

  if (hasSubmenu) {
    return (
      <Tooltip title={label} placement="right" arrow>
        {inner}
      </Tooltip>
    );
  }

  return (
    <Tooltip title={label} placement="right" arrow>
      <Link to={path} style={{ textDecoration: "none" }} onClick={onClick}>
        {inner}
      </Link>
    </Tooltip>
  );
};

// ─── Mobile drawer nav ─────────────────────────────────────────────────────────

const MobileSubMenuItem = ({ item, depth = 0 }: { item: SubMenuItem; depth?: number }) => {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const { setMobileOpen } = useSidebar();
  const iconNode = item.icon ? ICON_MAP[item.icon] : null;
  const isChildActive = !!item.children?.some((c) => pathname.startsWith(c.path));
  const [open, setOpen] = useState(isChildActive);

  if (item.children?.length) {
    return (
      <Box>
        <Box
          onClick={() => setOpen((p) => !p)}
          sx={{
            pl: 2 + depth * 1.5,
            pr: 2,
            py: 1.3,
            fontSize: 13.5,
            fontWeight: 500,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            color: "var(--color-text-secondary)",
            userSelect: "none",
          }}
        >
          <span>{t(item.labelKey)}</span>
          {open ? <FiChevronDown size={14} /> : <FiChevronRight size={14} />}
        </Box>
        <Collapse in={open}>
          <Box>
            {item.children.map((child) => (
              <MobileSubMenuItem key={child.path} item={child} depth={depth + 1} />
            ))}
          </Box>
        </Collapse>
      </Box>
    );
  }

  const isActive = pathname === item.path;
  return (
    <Link to={item.path} onClick={() => setMobileOpen(false)} style={{ textDecoration: "none" }}>
      <Box
        sx={{
          pl: 2 + depth * 1.5,
          pr: 2,
          py: 1.3,
          fontSize: 13.5,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 1.2,
          color: isActive ? "var(--color-nav-active)" : "var(--color-text-secondary)",
          fontWeight: isActive ? 600 : 400,
          backgroundColor: isActive ? "var(--color-primary-surface)" : "transparent",
          "&:hover": { backgroundColor: "var(--color-primary-surface)" },
        }}
      >
        {iconNode && (
          <Box sx={{ display: "flex", alignItems: "center", flexShrink: 0 }}>{iconNode}</Box>
        )}
        {t(item.labelKey)}
      </Box>
    </Link>
  );
};

const MobileNavItem = ({ item }: { item: (typeof NAV_ITEMS)[number] }) => {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const { setMobileOpen } = useSidebar();
  const hasSubmenu = !!SUBMENUS[item.path];
  const isActive = hasSubmenu
    ? pathname === item.path || pathname.startsWith(item.path + "/")
    : pathname === item.path;
  const [open, setOpen] = useState(isActive && hasSubmenu);

  const row = (
    <Box
      onClick={hasSubmenu ? () => setOpen((p) => !p) : () => setMobileOpen(false)}
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1.5,
        px: 2,
        py: 1.5,
        cursor: "pointer",
        color: isActive ? "var(--color-nav-active)" : "var(--color-text-primary)",
        backgroundColor: isActive && !hasSubmenu ? "var(--color-primary-surface)" : "transparent",
        fontWeight: isActive ? 600 : 500,
        "&:hover": { backgroundColor: "var(--color-primary-surface)" },
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", "& svg": { fontSize: 20 } }}>
        {item.icon}
      </Box>
      <Box sx={{ fontSize: 14, flex: 1 }}>{t(item.labelKey)}</Box>
      {hasSubmenu && (open ? <FiChevronDown size={16} /> : <FiChevronRight size={16} />)}
    </Box>
  );

  return (
    <Box>
      {hasSubmenu ? row : (
        <Link to={item.path} style={{ textDecoration: "none", color: "inherit" }}>
          {row}
        </Link>
      )}
      {hasSubmenu && (
        <Collapse in={open}>
          <Box sx={{ backgroundColor: "var(--color-surface-alt)" }}>
            {SUBMENUS[item.path].map((sub) =>
              sub.dividerBefore ? (
                <Box key={sub.path}>
                  <Box sx={{ height: "0.5px", bgcolor: "var(--color-border)", mx: 2, my: 0.5 }} />
                  <MobileSubMenuItem item={sub} depth={1} />
                </Box>
              ) : (
                <MobileSubMenuItem key={sub.path} item={sub} depth={1} />
              )
            )}
          </Box>
        </Collapse>
      )}
    </Box>
  );
};

// ─── Sidebar ──────────────────────────────────────────────────────────────────

export const Sidebar = () => {
  const { pathname } = useLocation();
  const { openSubmenu, toggleSubmenu, setOpenSubmenu, mobileOpen, setMobileOpen } = useSidebar();
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up("md"));

  const handleNavClick = (path: string) => {
    if (SUBMENUS[path]) {
      toggleSubmenu(path);
    } else {
      setOpenSubmenu(null);
    }
  };

  return (
    <>
      {/* Desktop icon rail */}
      <Box
        id="main-sidebar"
        sx={{
          display: { xs: "none", md: "flex" },
          width: SIDEBAR_WIDTH,
          height: `calc(100vh - ${HEADER_HEIGHT}px)`,
          position: "fixed",
          top: HEADER_HEIGHT,
          left: 0,
          overflowY: "auto",
          overflowX: "hidden",
          zIndex: 11,
          borderRight: "1px solid var(--color-border)",
          backgroundColor: "var(--color-surface)",
          flexDirection: "column",
          boxSizing: "border-box",
          scrollbarWidth: "none",
          "&::-webkit-scrollbar": { display: "none" },
        }}
      >
        <Box sx={{ pt: 1, pb: 4 }}>
          {NAV_ITEMS.map((item) => {
            const hasSubmenu = !!SUBMENUS[item.path];
            const submenuOpen = openSubmenu === item.path;
            const isActive = hasSubmenu
              ? pathname === item.path || pathname.startsWith(item.path + "/")
              : pathname === item.path;

            return (
              <NavItem
                key={item.path}
                {...item}
                active={isActive}
                hasSubmenu={hasSubmenu}
                submenuOpen={submenuOpen}
                anySubmenuOpen={!!openSubmenu}
                onClick={() => handleNavClick(item.path)}
              />
            );
          })}
        </Box>
      </Box>

      {isDesktop && openSubmenu && SUBMENUS[openSubmenu] && (
        <SubMenuPanel parentPath={openSubmenu} items={SUBMENUS[openSubmenu]} />
      )}

      {/* Mobile / tablet drawer */}
      <Drawer
        anchor="left"
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: "block", md: "none" },
          "& .MuiDrawer-paper": {
            width: MOBILE_DRAWER_WIDTH,
            boxSizing: "border-box",
          },
        }}
      >
        <Box sx={{ pt: 1, pb: 4, overflowY: "auto" }}>
          {NAV_ITEMS.map((item) => (
            <MobileNavItem key={item.path} item={item} />
          ))}
        </Box>
      </Drawer>
    </>
  );
};
