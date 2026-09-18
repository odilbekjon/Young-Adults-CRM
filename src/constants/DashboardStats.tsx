import {
  FiUsers, FiUserCheck, FiLayers, FiAlertTriangle,
  FiPlayCircle, FiDollarSign, FiUserMinus, FiUserX,
} from "react-icons/fi";

// Every card's number now comes from a real backend-backed query in
// Dashboard.tsx (see STAT_SOURCES there) — this array only holds the
// per-card display metadata (label/route/icon), not any data.
//
// "debtors" and "leftActive" route straight to the dedicated pages that
// already back their counts (/finance/debtors, /reports/students-left) —
// they used to point at /students?filter=... but Students.tsx never reads
// that param, so the "filter" was silently dropped. "paid" used to point at
// /payments, which isn't a registered route at all (404) — it now goes to
// the real Finance > All Payments page; Dashboard.tsx's click handler adds
// the current month's startDate/endDate query params (that page supports
// them) so the list opens pre-filtered.
export const STATS = [
  { key: "leads",      labelKey: "dashboard.stats.activeLeads",     route: "/leads",               icon: <FiUsers size={35} /> },
  { key: "students",   labelKey: "dashboard.stats.activeStudents",  route: "/students",             icon: <FiUserCheck size={35} /> },
  { key: "groups",     labelKey: "dashboard.stats.groups",          route: "/groups",               icon: <FiLayers size={35} /> },
  { key: "debtors",    labelKey: "dashboard.stats.debtors",         route: "/finance/debtors",      icon: <FiAlertTriangle size={35} /> },
  { key: "trial",      labelKey: "dashboard.stats.inTrialLesson",   route: "/students", filter: "trial",       icon: <FiPlayCircle size={35} /> },
  { key: "paid",       labelKey: "dashboard.stats.paidDuringMonth", route: "/finance/all-payments", icon: <FiDollarSign size={35} /> },
  { key: "leftActive", labelKey: "dashboard.stats.leftActiveGroup", route: "/reports/students-left", icon: <FiUserMinus size={35} /> },
  { key: "leftTrial",  labelKey: "dashboard.stats.leftAfterTrial",  route: "/students", filter: "left_trial",  icon: <FiUserX size={40} /> },
];
