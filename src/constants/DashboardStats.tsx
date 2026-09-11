import {
  FiUsers, FiUserCheck, FiLayers, FiAlertTriangle,
  FiPlayCircle, FiDollarSign, FiUserMinus, FiUserX,
} from "react-icons/fi";

// Every card's number now comes from a real backend-backed query in
// Dashboard.tsx (see STAT_SOURCES there) — this array only holds the
// per-card display metadata (label/route/icon), not any data.
export const STATS = [
  { key: "leads",      labelKey: "dashboard.stats.activeLeads",     route: "/leads",    icon: <FiUsers size={35} /> },
  { key: "students",   labelKey: "dashboard.stats.activeStudents",  route: "/students", icon: <FiUserCheck size={35} /> },
  { key: "groups",     labelKey: "dashboard.stats.groups",          route: "/groups",   icon: <FiLayers size={35} /> },
  { key: "debtors",    labelKey: "dashboard.stats.debtors",         route: "/students", filter: "debt",        icon: <FiAlertTriangle size={35} /> },
  { key: "trial",      labelKey: "dashboard.stats.inTrialLesson",   route: "/students", filter: "trial",       icon: <FiPlayCircle size={35} /> },
  { key: "paid",       labelKey: "dashboard.stats.paidDuringMonth", route: "/payments", icon: <FiDollarSign size={35} /> },
  { key: "leftActive", labelKey: "dashboard.stats.leftActiveGroup", route: "/students", filter: "left_active", icon: <FiUserMinus size={35} /> },
  { key: "leftTrial",  labelKey: "dashboard.stats.leftAfterTrial",  route: "/students", filter: "left_trial",  icon: <FiUserX size={40} /> },
];
