import {
  FiUsers, FiUserCheck, FiLayers, FiAlertTriangle,
  FiPlayCircle, FiDollarSign, FiUserMinus, FiUserX,
} from "react-icons/fi";

// "students" and "groups" are overridden with live data from
// /dashboard/stats — the rest have no backend endpoint yet, so they stay
// as static placeholders.
export const STATS = [
  { key: "leads",      labelKey: "dashboard.stats.activeLeads",     value: 1,  route: "/leads",    icon: <FiUsers size={35} /> },
  { key: "students",   labelKey: "dashboard.stats.activeStudents",  value: 26, route: "/students", icon: <FiUserCheck size={35} /> },
  { key: "groups",     labelKey: "dashboard.stats.groups",          value: 6,  route: "/groups",   icon: <FiLayers size={35} /> },
  { key: "debtors",    labelKey: "dashboard.stats.debtors",         value: 6,  route: "/students", filter: "debt",        icon: <FiAlertTriangle size={35} /> },
  { key: "trial",      labelKey: "dashboard.stats.inTrialLesson",   value: 2,  route: "/students", filter: "trial",       icon: <FiPlayCircle size={35} /> },
  { key: "paid",       labelKey: "dashboard.stats.paidDuringMonth", value: 4,  route: "/payments", icon: <FiDollarSign size={35} /> },
  { key: "leftActive", labelKey: "dashboard.stats.leftActiveGroup", value: 1,  route: "/students", filter: "left_active", icon: <FiUserMinus size={35} /> },
  { key: "leftTrial",  labelKey: "dashboard.stats.leftAfterTrial",  value: 0,  route: "/students", filter: "left_trial",  icon: <FiUserX size={40} /> },
];
