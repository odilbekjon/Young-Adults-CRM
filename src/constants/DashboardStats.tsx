import {
  FiUsers, FiUserCheck, FiLayers, FiAlertTriangle,
  FiPlayCircle, FiDollarSign, FiUserMinus, FiUserX,
} from "react-icons/fi";

// Every card's number now comes from a real backend-backed query in
// Dashboard.tsx (see STAT_SOURCES there) — this array only holds the
// per-card display metadata (label/route/icon), not any data.
//
// "debtors" routes straight to the dedicated page that already backs its
// count (/finance/debtors). "paid" goes to Finance > All Payments;
// Dashboard.tsx's click handler adds the current month's startDate/endDate
// query params (that page already reads and applies them) so the list opens
// pre-filtered — a real filter, not a fake one.
//
// "leftActive" and "leftTrial" both go to Settings > Student Left Group
// (/settings/office/students-left-group) — the actual "left the group"
// list, not the /reports/students-left analytics page this used to point
// to. No sub-filter is passed: the backend has no field distinguishing
// "left before activation" from "left after activation" (both are just
// INACTIVE/DELETED /student-groups rows), so both cards land on the same
// unfiltered list rather than faking a split that isn't real.
//
// "trial"'s target page (Students) has no real, backend-confirmed way to
// filter by trial-lesson status at the student-list level (that's a
// per-group-membership concept, not a student field) — so `filter` is kept
// here for when that becomes possible, but Students.tsx does not currently
// consume it; clicking this card lands on the unfiltered Students list.
export const STATS = [
  { key: "leads",      labelKey: "dashboard.stats.activeLeads",     route: "/leads",               icon: <FiUsers size={35} /> },
  { key: "students",   labelKey: "dashboard.stats.activeStudents",  route: "/students",             icon: <FiUserCheck size={35} /> },
  { key: "groups",     labelKey: "dashboard.stats.groups",          route: "/groups",               icon: <FiLayers size={35} /> },
  { key: "debtors",    labelKey: "dashboard.stats.debtors",         route: "/finance/debtors",      icon: <FiAlertTriangle size={35} /> },
  { key: "trial",      labelKey: "dashboard.stats.inTrialLesson",   route: "/students", filter: "trial",       icon: <FiPlayCircle size={35} /> },
  { key: "paid",       labelKey: "dashboard.stats.paidDuringMonth", route: "/finance/all-payments", icon: <FiDollarSign size={35} /> },
  { key: "leftActive", labelKey: "dashboard.stats.leftActiveGroup", route: "/settings/office/students-left-group", icon: <FiUserMinus size={35} /> },
  { key: "leftTrial",  labelKey: "dashboard.stats.leftAfterTrial",  route: "/settings/office/students-left-group", icon: <FiUserX size={40} /> },
];
