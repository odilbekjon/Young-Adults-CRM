import { useRef, useEffect, useState } from "react";
import { Box, Tooltip, Collapse } from "@mui/material";
import { Link, useLocation } from "react-router-dom";

import {
  FiDownload, FiUsers, FiLayers, FiClock, FiHome,
  FiChevronDown, FiChevronRight, FiMail, FiPhone,
  FiStar, FiSettings, FiUser, FiFileText, FiTag,
  FiBriefcase, FiBook, FiMap, FiArchive, FiCalendar,
  FiGrid, FiUserMinus, FiSmartphone, FiTrendingUp, FiList
} from "react-icons/fi";
import { MdOutlineDiamond } from "react-icons/md";
import { PiStudentDuotone } from "react-icons/pi";
import { IoMdSettings } from "react-icons/io";
import { IoTrophyOutline } from "react-icons/io5";
import { FaRegCalendarAlt } from "react-icons/fa";
import { AiOutlineDollar, AiOutlinePieChart } from "react-icons/ai";

import { useSidebar } from "../../Context/SidebarContext";

export const SIDEBAR_WIDTH = 120;
export const SUBMENU_WIDTH = 200;
export const HEADER_HEIGHT = 64;

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
  layers:    <FiLayers size={17} />,
  rss:       <FiBook size={17} />,
  // Reports uchun yangi iconlar
  userCheck: <FiUsers size={17} />,
  trending:  <FiTrendingUp size={17} />,
  smartphone:<FiSmartphone size={17} />,
  list:      <FiList size={17} />,
};

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SubMenuItem {
  label: string;
  path: string;
  icon?: string;
  dividerBefore?: boolean;
  children?: SubMenuItem[];
}

// ─── SUBMENUS config ──────────────────────────────────────────────────────────

const SUBMENUS: Record<string, SubMenuItem[]> = {
  "/finance": [
    { label: "All payments",   path: "/finance/all-payments",   icon: "file" },
    { label: "Withdraw",       path: "/finance/withdraw",        icon: "file" },
    { label: "Total Expenses", path: "/finance/total-expenses",  icon: "file" },
    { label: "Salaries new",   path: "/finance/salaries",        icon: "brief" },
    { label: "Debtors",        path: "/finance/debtors",         icon: "user", dividerBefore: true },
  ],
  "/reports": [
    { label: "Conversion reports",    path: "/reports/conversion",       icon: "userCheck" },
    { label: "Attendance reports",    path: "/reports/attendance",       icon: "userCheck" },
    { label: "Leads reports",         path: "/reports/leads",            icon: "userCheck" },
    { label: "Students left the group", path: "/reports/students-left", icon: "trending" },
    {
      label: "Logs",
      path: "/reports/logs",
      children: [
        { label: "Workly Report", path: "/reports/logs/workly",   icon: "user" },
        { label: "Sent SMS log",  path: "/reports/logs/sms",      icon: "smartphone" },
        { label: "Call log",      path: "/reports/logs/call",     icon: "phone" },
        { label: "Logs",          path: "/reports/logs/all",      icon: "list" },
      ],
    },
  ],
  "/settings": [
    { label: "SMS settings",  path: "/settings/sms",  icon: "mail" },
    { label: "VoIP settings", path: "/settings/voip", icon: "phone" },
    { label: "Grade",         path: "/settings/grade", icon: "star" },
    {
      label: "CEO",
      path: "/settings/ceo",
      children: [
        { label: "General settings", path: "/settings/ceo/general", icon: "settings" },
        { label: "Staff",            path: "/settings/ceo/staff",   icon: "users" },
        { label: "Billing",          path: "/settings/ceo/billing", icon: "brief" },
        { label: "Roadmap",          path: "/settings/ceo/roadmap", icon: "map" },
      ],
    },
    {
      label: "Office",
      path: "/settings/office",
      children: [
        { label: "Courses",             path: "/settings/office/courses",             icon: "diamond" },
        { label: "Rooms",               path: "/settings/office/rooms",               icon: "grid" },
        { label: "Holidays",            path: "/settings/office/holidays",            icon: "calendar" },
        { label: "Archive",             path: "/settings/office/archive",             icon: "archive" },
        { label: "Students left group", path: "/settings/office/students-left-group", icon: "userMinus" },
      ],
    },
    {
      label: "Forms",
      path: "/settings/forms",
      children: [
        { label: "Forms", path: "/settings/forms/list", icon: "layers" },
      ],
    },
    {
      label: "Blog",
      path: "/settings/blog",
      children: [
        { label: "What's new", path: "/settings/blog/whats-new", icon: "rss" },
      ],
    },
    {
      label: "Tags",
      path: "/settings/tags",
      children: [
        { label: "Tags", path: "/settings/tags/list", icon: "tag" },
      ],
    },
  ],
};

// ─── NAV ITEMS ────────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { label: "Dashboard",                  path: "/dashboard",                  icon: <FiHome size={35} strokeWidth={1.5} /> },
  { label: "Leads",                      path: "/leads",                      icon: <FiDownload size={35} strokeWidth={1.5} /> },
  { label: "Teachers",                   path: "/teachers",                   icon: <FiUsers size={35} strokeWidth={1.5} /> },
  { label: "Groups",                     path: "/groups",                     icon: <FiLayers size={35} strokeWidth={1.5} /> },
  { label: "Students",                   path: "/students",                   icon: <PiStudentDuotone size={35} /> },
  { label: "Reminders",                  path: "/reminders",                  icon: <FiClock size={35} strokeWidth={1.5} /> },
  { label: "Rating",                     path: "/rating",                     icon: <IoTrophyOutline size={35} /> },
  { label: "Attendance reports",         path: "/attendance-reports",         icon: <FaRegCalendarAlt size={35} /> },
  { label: "Teacher attendance reports", path: "/teacher-attendance-reports", icon: <FaRegCalendarAlt size={35} /> },
  { label: "Finance",                    path: "/finance",                    icon: <AiOutlineDollar size={35} /> },
  { label: "Reports",                    path: "/reports",                    icon: <AiOutlinePieChart size={35} /> },
  { label: "Settings",                   path: "/settings",                   icon: <IoMdSettings size={35} /> },
];

// ─── SubMenuLeaf ──────────────────────────────────────────────────────────────

const SubMenuLeaf = ({ item, depth = 0 }: { item: SubMenuItem; depth?: number }) => {
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
          color: isActive ? "#003366" : "#374151",
          fontWeight: isActive ? 600 : 400,
          backgroundColor: isActive ? "#eef2f9" : "transparent",
          transition: "background 0.12s, color 0.12s",
          "&:hover": { backgroundColor: "#f5f8ff", color: "#003366" },
        }}
      >
        {iconNode && (
          <Box sx={{ display: "flex", alignItems: "center", color: "inherit", flexShrink: 0 }}>
            {iconNode}
          </Box>
        )}
        {item.label}
      </Box>
    </Link>
  );
};

// ─── SubMenuGroup ─────────────────────────────────────────────────────────────

const SubMenuGroup = ({ item }: { item: SubMenuItem }) => {
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
          color: "#9ca3af",
          userSelect: "none",
          "&:hover": { color: "#374151" },
        }}
      >
        <span>{item.label}</span>
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

// ─── SubMenuPanel ─────────────────────────────────────────────────────────────

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
        backgroundColor: "#fff",
        borderRight: "1px solid #e0e5ec",
        zIndex: 10,
        overflowY: "auto",
        scrollbarWidth: "none",
        "&::-webkit-scrollbar": { display: "none" },
      }}
    >
      <Box sx={{ pt: 1 }}>
        {items.map((item) => {
          if (item.dividerBefore) {
            return (
              <Box key={item.path}>
                <Box sx={{ height: "0.5px", bgcolor: "#e0e5ec", mx: 2, my: 0.5 }} />
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

// ─── NavItem ──────────────────────────────────────────────────────────────────

interface NavItemProps {
  label: string;
  path: string;
  icon: React.ReactNode;
  active: boolean;
  hasSubmenu: boolean;
  submenuOpen: boolean;
  // ✅ YANGI: boshqa biror submenu ochiqmi?
  anySubmenuOpen: boolean;
  onClick: () => void;
}

const NavItem = ({
  label,
  path,
  icon,
  active,
  hasSubmenu,
  submenuOpen,
  anySubmenuOpen,
  onClick,
}: NavItemProps) => {
  // ✅ TO'G'RILANDI:
  // - Submenu ochiq bo'lsa → shu item highlight
  // - Submenu yopiq bo'lsa → active path highlight
  // - Boshqa biror submenu ochiq bo'lsa → bu item highlight EMAS (active bo'lsa ham)
  const isHighlighted = submenuOpen || (active && !anySubmenuOpen);

  const inner = (
    <Box
      onClick={onClick}
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        py: 1,
        px: 0.5,
        cursor: "pointer",
        borderLeft: isHighlighted ? "3px solid #003366" : "3px solid transparent",
        backgroundColor: isHighlighted ? "#eef2f9" : "transparent",
        transition: "background-color 0.15s, border-color 0.15s",
        "&:hover": {
          backgroundColor: "#eef2f9",
          "& .nav-icon": { color: "#003366" },
          "& .nav-label": { color: "#003366" },
        },
      }}
    >
      <Box
        className="nav-icon"
        sx={{
          color: isHighlighted ? "#003366" : "#6b7a8d",
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
          fontSize: 10,
          fontWeight: isHighlighted ? 600 : 400,
          color: isHighlighted ? "#003366" : "#6b7a8d",
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

// ─── Sidebar ──────────────────────────────────────────────────────────────────

export const Sidebar = () => {
  const { pathname } = useLocation();
  const { openSubmenu, toggleSubmenu, setOpenSubmenu } = useSidebar();

  const handleNavClick = (path: string) => {
    if (SUBMENUS[path]) {
      toggleSubmenu(path);
    } else {
      setOpenSubmenu(null);
    }
  };

  return (
    <>
      <Box
        id="main-sidebar"
        sx={{
          width: SIDEBAR_WIDTH,
          height: `calc(100vh - ${HEADER_HEIGHT}px)`,
          position: "fixed",
          top: HEADER_HEIGHT,
          left: 0,
          overflowY: "auto",
          overflowX: "hidden",
          zIndex: 11,
          borderRight: "1px solid #e0e5ec",
          backgroundColor: "#fff",
          display: "flex",
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

            // ✅ TO'G'RILANDI: exact match yoki to'g'ridan child path
            // "/finance".startsWith("/finance/") → false ✓
            // "/finance/all-payments".startsWith("/finance/") → true ✓
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
                anySubmenuOpen={!!openSubmenu} // ✅ YANGI prop
                onClick={() => handleNavClick(item.path)}
              />
            );
          })}
        </Box>
      </Box>

      {openSubmenu && SUBMENUS[openSubmenu] && (
        <SubMenuPanel
          parentPath={openSubmenu}
          items={SUBMENUS[openSubmenu]}
        />
      )}
    </>
  );
};