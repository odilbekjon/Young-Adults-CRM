import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { Box, Paper, Typography, Tooltip, CircularProgress, Chip } from "@mui/material";
import {
  LineChart, Line, XAxis, YAxis, Tooltip as RTooltip,
  CartesianGrid, ResponsiveContainer, ReferenceDot,
} from "recharts";

import { ScheduleTab, ScheduleEvent } from "../../types/dashboardTypes";
import type { RootState } from "../../app/store";
import {
  useDashboardStatsQuery,
  useDashboardScheduleQuery,
  useDashboardAttendanceStatsQuery,
  useDashboardRecentActivitiesQuery,
  useDashboardTeacherPerformanceQuery,
} from "../../app/api/dashboardApi/dashboardApi";
import type { ScheduleItem } from "../../app/api/dashboardApi/types";
import { useAllLeadsQuery } from "../../app/api/leadsApi";
import { useAllGroupsQuery, useStudentGroupsQuery } from "../../app/api/groupsApi";
import type { Group } from "../../app/api/groupsApi/types";
import { useDebtorsQuery, usePaymentsListQuery, useFinanceChartQuery } from "../../app/api/financeApi";
import { useReportLeftStudentsQuery } from "../../app/api/reportsApi";
import { SCHEDULE_COLORS, DEFAULT_LESSON_DURATION } from "../../constants/DashboardData";
import { STATS } from "../../constants/DashboardStats";
import { useActiveStudentCount } from "../../hooks/useActiveStudentCount";
import { useNearViewport } from "./useNearViewport";
import { ScheduleCard } from "./ScheduleCard";

// "This month" as [firstOfMonth, today] in the plain YYYY-MM-DD format every
// finance list endpoint expects (same format the date-range filters on the
// Finance pages already send).
const pad2 = (n: number) => String(n).padStart(2, "0");
const toISODate = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

// -1 = the backend has no start time for this group (it can't be placed on the
// time axis; it's listed under the grid instead).
const parseTimeToMinutes = (time: string | null | undefined) => {
  if (!time) return -1;
  const [h, m] = time.split(":").map(Number);
  if (Number.isNaN(h)) return -1;
  return h * 60 + (m || 0);
};

const mapDaysType = (daysType: string): ScheduleTab => {
  if (daysType === "ODD") return "odd";
  if (daysType === "EVEN") return "even";
  return "other";
};

// A course ending within this many days gets the "X days left" ribbon —
// matches the reference design, which only flags imminent endings, not
// every lesson.
const DAYS_LEFT_THRESHOLD = 5;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

// Backend sends trainingStart/End either as a plain date ("2026-07-01") or a full
// ISO datetime ("2026-07-01T00:00:00.000Z") — only the date part is used, and an
// unparseable value yields null instead of throwing (Intl.format throws RangeError
// on an Invalid Date, which used to crash the whole Dashboard).
const parseDay = (d: string | null | undefined): Date | null => {
  if (!d) return null;
  const date = new Date(`${d.slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatDateRange = (start: string | null | undefined, end: string | null | undefined, locale: string): string => {
  const s = parseDay(start);
  const e = parseDay(end);
  if (!s || !e) return "";
  const fmt = new Intl.DateTimeFormat(locale, { day: "numeric", month: "short" });
  return `${fmt.format(s)} – ${fmt.format(e)}`;
};

// GroupDetail.students (the legacy relation Group.students comes from) keeps
// listing a student after they've been removed from the group — same quirk
// already worked around on the Groups list page. archivedMembershipKeys
// (confirmed-real INACTIVE/DELETED /student-groups rows) strips those back
// out so this card's student count is the real current headcount, not a
// stale one.
const realStudentCount = (group: Group, archivedMembershipKeys: Set<string>): number =>
  (group.students ?? []).filter((s) => !archivedMembershipKeys.has(`${s.id}|${group.id}`)).length;

// Enriches the backend's own schedule rows (which only carry group/course/
// room/time/teacher — see ScheduleItem) with real data cross-referenced by
// groupId from GET /groups: training date range, room capacity, and current
// active headcount — the same values Groups/SingleGroup already treat as
// authoritative, not invented placeholders.
const toScheduleEvents = (
  items: ScheduleItem[],
  groupById: Map<string, Group>,
  archivedMembershipKeys: Set<string>,
  t: (key: string, options?: Record<string, unknown>) => string,
  locale: string,
): ScheduleEvent[] =>
  items.map((item, i) => {
    const group = groupById.get(item.groupId);
    let daysLeftLabel: string | undefined;
    const trainingEnd = parseDay(group?.trainingEnd);
    if (trainingEnd) {
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const daysLeft = Math.round((trainingEnd.getTime() - today.getTime()) / MS_PER_DAY);
      if (daysLeft >= 0 && daysLeft <= DAYS_LEFT_THRESHOLD) {
        daysLeftLabel = t("dashboard.schedule.daysLeft", { count: daysLeft });
      }
    }
    return {
      id: item.groupId,
      room: item.roomName,
      start: parseTimeToMinutes(item.time),
      duration: DEFAULT_LESSON_DURATION,
      groupName: item.groupName,
      courseName: item.courseName,
      teacher: item.teachers,
      dateRange: formatDateRange(group?.trainingStart, group?.trainingEnd, locale),
      students: group ? realStudentCount(group, archivedMembershipKeys) : 0,
      maxStudents: group?.room?.capacity ?? 0,
      color: SCHEDULE_COLORS[i % SCHEDULE_COLORS.length],
      daysLeftLabel,
      days: [mapDaysType(item.daysType)],
    };
  });

// Full targets (route + query) for the cards that open a pre-filtered list —
// Students reads ?status=trial / ?financial=paid_month, Settings > Office >
// Student Left Group (Router.tsx: settings/office/students-left-group) reads
// ?leftType=active|trial. Override the route/filter in constants/DashboardStats.
const STAT_TARGETS: Record<string, string> = {
  students:   "/students?status=active",
  trial:      "/students?status=trial",
  paid:       "/students?financial=paid_month",
  leftActive: "/settings/office/students-left-group?leftType=active",
  leftTrial:  "/settings/office/students-left-group?leftType=trial",
};

const formatChartValue = (value: number, currency: string) => {
  if (value >= 1000000000) return `${(value / 1000000000).toFixed(1)}B ${currency}`;
  if (value >= 1000000) return `${(value / 1000000).toFixed(0)} 000 000 ${currency}`;
  return `${new Intl.NumberFormat("uz-UZ").format(value)} ${currency}`;
};

// ─── Custom chart tooltip ─────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ChartTooltip = ({ active, payload, label }: any) => {
  const { t } = useTranslation();
  if (!active || !payload?.length) return null;
  return (
    <Box sx={{
      background: "var(--color-surface)", border: "1px solid var(--color-border)",
      borderRadius: 2, px: 2.2, py: 1.6,
      boxShadow: "0 6px 24px rgba(0,0,0,0.12)",
    }}>
      <Typography sx={{ fontSize: 12, color: "var(--color-text-secondary)", fontWeight: 700 }}>{label}</Typography>
      <Typography sx={{ fontSize: 15, fontWeight: 800, color: "#f97316", mt: 0.3 }}>
        {formatChartValue(payload[0].value, t("dashboard.chart.currency"))}
      </Typography>
    </Box>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

export const Dashboard = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  // Branch-scoped everywhere below, same as Students/Groups/Teachers/Finance —
  // baseApi already attaches this as the `x-branch-id` header on every
  // request, and switching branches resets the whole RTK Query cache
  // (changeSelectedBranch → baseApi.util.resetApiState()), but the list/report
  // endpoints below also accept `branchId` explicitly (matching how the other
  // pages that already call them pass it), and reports/left-students in
  // particular documents branchId as a distinct filter from the header.
  const selectedBranchId = useSelector((s: RootState) => s.branch.selectedBranchId);
  const branchId = selectedBranchId ?? undefined;

  // Coming back to the Dashboard within baseApi's cache window costs no
  // requests: whatever the user changed in the meantime has already evicted the
  // affected entries (the dashboard queries provide the tags of the data they
  // are computed from, see dashboardApi).
  //
  // Requests start in the order the hooks are declared and baseApi caps how many
  // run at once, so the cheap counts behind the stat tiles come first, the big
  // lists behind "Active students" next, and the cards further down the page
  // last — those only start once they are about to scroll into view.
  const { data: statsData } = useDashboardStatsQuery();

  // "Active leads" — GET /leads?status=ACTIVE (leadsApi's own definition of
  // an active lead, same enum the Leads Kanban board and Reports use). Only the
  // count is shown, so a one-row page is requested and meta.total is read.
  const { data: activeLeadsData, isFetching: activeLeadsLoading } =
    useAllLeadsQuery({ status: "ACTIVE", page: 1, limit: 1, branchId });

  // "Left after trial period" — there's no dedicated backend flag for this,
  // but the lead pipeline itself models it: a lead only leaves leadsApi's
  // domain by either being CANCELLED or CONVERTED (a CONVERTED lead becomes
  // a real Student, tracked separately from here on via studentsApi/
  // groupsApi). A CANCELLED lead is therefore, by construction, someone who
  // never made it past the lead/trial stage — the closest real, non-invented
  // proxy for "left after trial period" the API actually supports. Counted from
  // meta.total of a one-row page, like the active leads above.
  const { data: cancelledLeadsData, isFetching: leftTrialLoading } =
    useAllLeadsQuery({ status: "CANCELLED", page: 1, limit: 1, branchId });

  // "Debtors" — same GET /finance/debtors list the Debtors page itself reads
  // its count from (meta.total), not the separate /finance/debtors/total
  // (which is a currency sum, not a row count).
  const { data: debtorsData, isFetching: debtorsLoading } =
    useDebtorsQuery({ page: 1, limit: 1, branchId });

  // "In a trial lesson" — a PROBATION student-group membership is exactly
  // what graduate-trial (PROBATION → ACTIVE) confirms trial students are
  // modeled as.
  const { data: trialGroupsData, isFetching: trialLoading } =
    useStudentGroupsQuery({ status: "PROBATION", page: 1, limit: 1, branchId });

  // "Paid during the month" — count of payments recorded this month (GET
  // /finance/payments date-filtered), matching what the card originally
  // showed (a small integer, not a currency sum like finance/stats' income).
  const now = new Date();
  const monthStart = toISODate(new Date(now.getFullYear(), now.getMonth(), 1));
  const monthEnd = toISODate(now);
  const { data: paymentsThisMonthData, isFetching: paidLoading } =
    usePaymentsListQuery({ startDate: monthStart, endDate: monthEnd, page: 1, limit: 1, branchId });

  // "Left active group" — the backend's own left-students report, which is
  // exactly students who had an actual (non-trial) group membership end.
  const { data: leftStudentsData, isFetching: leftActiveLoading } =
    useReportLeftStudentsQuery({ branchId });

  // Revenue chart — GET /finance/chart for the current year, the same
  // endpoint AllPayments' own chart already uses.
  const currentYear = now.getFullYear();
  const { data: chartMonths, isLoading: chartLoading, isError: chartIsError } =
    useFinanceChartQuery({ year: currentYear, branchId });

  // "Active students": a group AND an ACTIVE status in it (see the hook).
  const activeStudents = useActiveStudentCount(branchId);

  // Attendance / Recent activity / Teacher performance cards.
  const [summaryRef, summaryNear] = useNearViewport();
  const summaryOptions = { skip: !summaryNear };
  const { data: attendanceData, isLoading: attendanceQueryLoading, isError: attendanceError } = useDashboardAttendanceStatsQuery(undefined, summaryOptions);
  const { data: activitiesData, isLoading: activitiesQueryLoading, isError: activitiesError } = useDashboardRecentActivitiesQuery(undefined, summaryOptions);
  const { data: teacherPerfData, isLoading: teacherPerfQueryLoading, isError: teacherPerfError } = useDashboardTeacherPerformanceQuery(undefined, summaryOptions);
  // A card that hasn't been asked for yet shows its spinner like a loading one.
  const attendanceLoading = !summaryNear || attendanceQueryLoading;
  const activitiesLoading = !summaryNear || activitiesQueryLoading;
  const teacherPerfLoading = !summaryNear || teacherPerfQueryLoading;

  // Schedule card and the data its cards are enriched with.
  const [scheduleRef, scheduleNear] = useNearViewport();
  const { data: scheduleData, isLoading: scheduleQueryLoading, isError: scheduleError } = useDashboardScheduleQuery(undefined, { skip: !scheduleNear });
  const scheduleLoading = !scheduleNear || scheduleQueryLoading;
  // Enrichment source for the schedule cards below (real training dates, room
  // capacity, current headcount) — GET /groups' own schedule endpoint
  // (ScheduleItem) only carries group/course/room/time/teacher, nothing else.
  const { data: scheduleGroupsData } = useAllGroupsQuery({ page: 1, limit: 100 }, { skip: !scheduleNear });
  // Same "legacy relation keeps listing removed students" workaround already
  // used on the Groups list page — see realStudentCount's own comment.
  const { data: inactiveMembershipsData } = useStudentGroupsQuery({ status: "INACTIVE", branchId, limit: 1000 }, { skip: !scheduleNear });
  const { data: deletedMembershipsData } = useStudentGroupsQuery({ status: "DELETED", branchId, limit: 1000 }, { skip: !scheduleNear });

  const peakPoint = useMemo(() => {
    if (!chartMonths || chartMonths.length === 0) return null;
    return chartMonths.reduce((max, point) => (point.totalPayments > max.totalPayments ? point : max), chartMonths[0]);
  }, [chartMonths]);

  // Backend's /dashboard/stats figure only while the real count is unavailable
  // (loading / the lists failed) - never as the answer once it is known.
  const activeStudentsStat =
    activeStudents.count !== null
      ? { value: activeStudents.count, loading: false }
      : { value: statsData?.data.activeStudentsCount ?? 0, loading: activeStudents.isLoading && !statsData };

  const liveStatValues: Record<string, { value: number; loading: boolean }> = {
    leads:      { value: activeLeadsData?.meta?.total ?? 0, loading: activeLeadsLoading },
    students:   activeStudentsStat,
    groups:     { value: statsData?.data.activeGroupsCount ?? 0, loading: !statsData },
    debtors:    { value: debtorsData?.meta.total ?? 0, loading: debtorsLoading },
    trial:      { value: trialGroupsData?.meta.total ?? 0, loading: trialLoading },
    paid:       { value: paymentsThisMonthData?.meta.total ?? 0, loading: paidLoading },
    leftActive: { value: leftStudentsData?.total ?? 0, loading: leftActiveLoading },
    leftTrial:  { value: cancelledLeadsData?.meta?.total ?? 0, loading: leftTrialLoading },
  };

  const attendance = attendanceData?.data;
  const activities = activitiesData?.data ?? [];
  const teacherPerf = teacherPerfData?.data ?? [];

  const groupById = useMemo(
    () => new Map((scheduleGroupsData?.data ?? []).map((g) => [g.id, g])),
    [scheduleGroupsData],
  );
  const archivedMembershipKeys = useMemo(() => {
    const set = new Set<string>();
    [...(inactiveMembershipsData?.rows ?? []), ...(deletedMembershipsData?.rows ?? [])].forEach((r) => {
      if (r.studentId && r.groupId) set.add(`${r.studentId}|${r.groupId}`);
    });
    return set;
  }, [inactiveMembershipsData, deletedMembershipsData]);
  const events = useMemo(
    () => toScheduleEvents(scheduleData?.data ?? [], groupById, archivedMembershipKeys, t, i18n.language),
    [scheduleData, groupById, archivedMembershipKeys, t, i18n.language],
  );
  // Navigate stat card → page (with optional ?filter=xxx). trial/paid/
  // leftActive/leftTrial land on a pre-filtered list via STAT_TARGETS.
  const goTo = (key: string, route: string, filter?: string) => {
    const override = STAT_TARGETS[key];
    if (override) {
      navigate(override);
      return;
    }
    const url = filter ? `${route}?filter=${filter}` : route;
    navigate(url);
  };

  return (
    <Box sx={{
      minHeight: "100vh",
      backgroundColor: "var(--color-bg-page)",
      pt: 3, px: { xs: 2, md: 4 }, pb: 6,
    }}>

      {/* ═══════════════════════════════════════════════════════════════
          STAT CARDS — one row, clickable → navigate
      ════════════════════════════════════════════════════════════════ */}
      <Box sx={{
        display: "grid",
        gridTemplateColumns: "repeat(8,1fr)",
        gap: 1.5,
        mb: 3,
        "@media(max-width:1280px)": { gridTemplateColumns: "repeat(4,1fr)" },
        "@media(max-width:640px)":  { gridTemplateColumns: "repeat(2,1fr)" },
      }}>
        {STATS.map(({ key, labelKey, route, filter, icon }) => {
          const stat = liveStatValues[key];
          return (
          <Tooltip key={key} title={t("dashboard.stats.goToPage", { label: t(labelKey) })} placement="top" arrow>
            <Paper
              elevation={0}
              onClick={() => goTo(key, route, filter)}
              sx={{
                px: 1.5, py: 2,
                borderRadius: "12px",
                border: "1px solid var(--color-border)",
                background: "var(--color-surface)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                textAlign: "center",
                gap: 0.5,
                cursor: "pointer",
                userSelect: "none",
                transition: "all 0.18s ease",
                "&:hover": {
                  borderColor: "#f97316",
                  boxShadow: "0 4px 20px rgba(249,115,22,0.14)",
                  transform: "translateY(-2px)",
                },
                "&:active": { transform: "translateY(0)" },
              }}
            >
              <Box sx={{ color: "#f97316", mb: 0.25 }}>{icon}</Box>
              <Typography sx={{
                fontSize: 15, color: "var(--color-text-secondary)", lineHeight: 1.3,
                 minHeight: 32, display: "flex",
                alignItems: "center", justifyContent: "center",
              }}>
                {t(labelKey)}
              </Typography>
              <Typography sx={{ fontSize: 32,  color: "var(--color-primary)", lineHeight: 1 }}>
                {stat.loading ? <CircularProgress size={20} /> : stat.value}
              </Typography>
            </Paper>
          </Tooltip>
          );
        })}
      </Box>

      {/* ═══════════════════════════════════════════════════════════════
          CHART — monthly revenue (current year), always the same
          regardless of which schedule tab (Odd/Even/Other) is selected
          below. Same GET /finance/chart data AllPayments' own chart uses.
      ════════════════════════════════════════════════════════════════ */}
      <Paper elevation={0} sx={{
        borderRadius: "16px", border: "1px solid var(--color-border)",
        p: 3, mb: 3, background: "var(--color-surface)",
      }}>
        {chartLoading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
            <CircularProgress size={28} />
          </Box>
        ) : chartIsError ? (
          <Box sx={{ py: 6, textAlign: "center" }}>
            <Typography sx={{ color: "var(--color-danger)", fontSize: 13 }}>
              {t("dashboard.loadError")}
            </Typography>
          </Box>
        ) : !chartMonths || chartMonths.length === 0 ? (
          <Box sx={{ py: 6, textAlign: "center" }}>
            <Typography sx={{ color: "var(--color-text-muted)", fontSize: 14 }}>
              {t("dashboard.chart.emptyState")}
            </Typography>
          </Box>
        ) : (
          <Box height={230}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartMonths} margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 11, fill: "var(--color-text-secondary)" }}
                  axisLine={false} tickLine={false}
                  interval={0}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: "var(--color-text-secondary)" }}
                  axisLine={false} tickLine={false}
                  tickFormatter={(v) => formatChartValue(v as number, t("dashboard.chart.currency"))}
                  width={130}
                />
                <RTooltip content={<ChartTooltip />} />
                <Line
                  type="monotone" dataKey="totalPayments"
                  stroke="#f97316" strokeWidth={2.5}
                  dot={{ r: 4, fill: "var(--color-surface)", stroke: "#f97316", strokeWidth: 2 }}
                  activeDot={{ r: 6, fill: "#f97316" }}
                  isAnimationActive
                />
                {peakPoint && (
                  <ReferenceDot
                    x={peakPoint.month}
                    y={peakPoint.totalPayments}
                    r={5} fill="#f97316" stroke="var(--color-surface)" strokeWidth={2}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </Box>
        )}
      </Paper>

      {/* ═══════════════════════════════════════════════════════════════
          SUMMARY PANELS — Attendance / Recent activity / Teacher performance
      ════════════════════════════════════════════════════════════════ */}
      <Box ref={summaryRef} sx={{
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: 1.5, mb: 3,
        "@media(max-width:960px)": { gridTemplateColumns: "1fr" },
      }}>
        {/* Attendance */}
        <Paper elevation={0} sx={{ borderRadius: "16px", border: "1px solid var(--color-border)", background: "var(--color-surface)", p: 2.5 }}>
          <Typography sx={{ fontWeight: 700, fontSize: 14, color: "var(--color-text-primary)", mb: 1.5 }}>
            {t("dashboard.attendance.title")}
          </Typography>
          {attendanceLoading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}><CircularProgress size={22} /></Box>
          ) : attendanceError ? (
            <Typography sx={{ color: "var(--color-danger)", fontSize: 12 }}>{t("dashboard.loadError")}</Typography>
          ) : (
            <Box sx={{ display: "flex", alignItems: "center", gap: 2.5 }}>
              <Typography sx={{ fontSize: 32, fontWeight: 700, color: "#f97316" }}>
                {attendance?.percentage ?? 0}%
              </Typography>
              <Box>
                <Typography sx={{ fontSize: 12, color: "var(--color-text-secondary)" }}>
                  {t("dashboard.attendance.present")}: {attendance?.present ?? 0}
                </Typography>
                <Typography sx={{ fontSize: 12, color: "var(--color-text-secondary)" }}>
                  {t("dashboard.attendance.absent")}: {attendance?.absent ?? 0}
                </Typography>
              </Box>
            </Box>
          )}
        </Paper>

        {/* Recent activities */}
        <Paper elevation={0} sx={{ borderRadius: "16px", border: "1px solid var(--color-border)", background: "var(--color-surface)", p: 2.5, maxHeight: 220, overflowY: "auto" }}>
          <Typography sx={{ fontWeight: 700, fontSize: 14, color: "var(--color-text-primary)", mb: 1.5 }}>
            {t("dashboard.recentActivities.title")}
          </Typography>
          {activitiesLoading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}><CircularProgress size={22} /></Box>
          ) : activitiesError ? (
            <Typography sx={{ color: "var(--color-danger)", fontSize: 12 }}>{t("dashboard.loadError")}</Typography>
          ) : activities.length === 0 ? (
            <Typography sx={{ fontSize: 12, color: "var(--color-text-muted)" }}>{t("dashboard.recentActivities.emptyState")}</Typography>
          ) : (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
              {activities.map((a, i) => (
                <Box key={i} sx={{ borderBottom: "1px solid var(--color-border-subtle)", pb: 0.75 }}>
                  <Typography sx={{ fontSize: 12.5, color: "var(--color-text-secondary)" }}>{a.message}</Typography>
                  <Typography sx={{ fontSize: 10.5, color: "var(--color-text-muted)" }}>{new Date(a.date).toLocaleString()}</Typography>
                </Box>
              ))}
            </Box>
          )}
        </Paper>

        {/* Teacher performance */}
        <Paper elevation={0} sx={{ borderRadius: "16px", border: "1px solid var(--color-border)", background: "var(--color-surface)", p: 2.5, maxHeight: 220, overflowY: "auto" }}>
          <Typography sx={{ fontWeight: 700, fontSize: 14, color: "var(--color-text-primary)", mb: 1.5 }}>
            {t("dashboard.teacherPerformance.title")}
          </Typography>
          {teacherPerfLoading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}><CircularProgress size={22} /></Box>
          ) : teacherPerfError ? (
            <Typography sx={{ color: "var(--color-danger)", fontSize: 12 }}>{t("dashboard.loadError")}</Typography>
          ) : teacherPerf.length === 0 ? (
            <Typography sx={{ fontSize: 12, color: "var(--color-text-muted)" }}>{t("dashboard.teacherPerformance.emptyState")}</Typography>
          ) : (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
              {teacherPerf.map((tp) => (
                <Box key={tp.id} sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1 }}>
                  <Typography sx={{ fontSize: 12.5, color: "var(--color-text-secondary)" }}>{tp.name}</Typography>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                    <Typography sx={{ fontSize: 10.5, color: "var(--color-text-muted)" }}>
                      {t("dashboard.teacherPerformance.activityScore")}: {tp.activityScore}
                    </Typography>
                    <Chip
                      label={`${t("dashboard.teacherPerformance.activeGroups")}: ${tp.activeGroups}`}
                      size="small"
                      sx={{ fontSize: 10.5, height: 20, bgcolor: "var(--color-accent-surface)", color: "#f97316" }}
                    />
                  </Box>
                </Box>
              ))}
            </Box>
          )}
        </Paper>
      </Box>

      <ScheduleCard events={events} loading={scheduleLoading} error={scheduleError} containerRef={scheduleRef} />
    </Box>
  );
};

export default Dashboard;