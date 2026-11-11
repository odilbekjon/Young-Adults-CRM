import type { DashboardStats } from "../../app/api/dashboardApi/types";

// The first of these figures the backend actually sent, by the long name first and
// then by the short alias GET /dashboard/stats also carries. null when it sent
// none of them: the card shows a dash, not a made-up 0.
const firstCount = (...values: (number | undefined | null)[]): number | null => {
  const found = values.find((v) => typeof v === "number" && Number.isFinite(v));
  return found === undefined ? null : (found as number);
};

// What each stat card of the Dashboard (keys of constants/DashboardStats) shows.
// All eight come out of the one GET /dashboard/stats answer, so they appear
// together and cost one request - no list is downloaded just to be counted.
export const statCounts = (stats: DashboardStats | undefined): Record<string, number | null> => ({
  leads: firstCount(stats?.activeLeadsCount, stats?.leads),
  // "Active students" is the number of ACTIVE group memberships (a student in two
  // groups counts twice) - activeStudentsCount also counts archived students. The
  // older figure is only the fallback for a backend that does not send this one.
  students: firstCount(stats?.activeStudentGroupsCount, stats?.activeStudentsCount, stats?.students),
  groups: firstCount(stats?.activeGroupsCount, stats?.groups),
  debtors: firstCount(stats?.debtorsCount, stats?.debtors),
  trial: firstCount(stats?.trialLessonStudentsCount, stats?.trial),
  // The payments made this month (the card opens the payments list).
  paid: firstCount(stats?.paidThisMonthCount, stats?.paidThisMonthPaymentsCount, stats?.paid),
  leftActive: firstCount(stats?.leftActiveGroupsCount, stats?.leftActive),
  leftTrial: firstCount(stats?.leftTrialLessonsCount, stats?.leftTrial),
});
