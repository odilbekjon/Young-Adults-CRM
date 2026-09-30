import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { Box, Paper, Typography, Tooltip, CircularProgress, Chip } from "@mui/material";
import {
  LineChart, Line, XAxis, YAxis, Tooltip as RTooltip,
  CartesianGrid, ResponsiveContainer, ReferenceDot,
} from "recharts";
import { MdViewColumn, MdViewStream } from "react-icons/md";

import { ScheduleTab, ScheduleOrientation, ScheduleEvent } from "../../types/dashboardTypes";
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
import { SCHEDULE_COLORS, DEFAULT_LESSON_DURATION, SCHEDULE_TIME_START, SCHEDULE_TIME_END } from "../../constants/DashboardData";
import { STATS } from "../../constants/DashboardStats";

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
  trial:      "/students?status=trial",
  paid:       "/students?financial=paid_month",
  leftActive: "/settings/office/students-left-group?leftType=active",
  leftTrial:  "/settings/office/students-left-group?leftType=trial",
};

// ─── Time helpers ─────────────────────────────────────────────────────────────

const SLOT_MINS = 30;

const formatSlot = (m: number) =>
  `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

// The axis always covers the full working day (08:00-20:00, 30-min slots), so
// an empty day still shows an empty grid. Lessons outside that window extend
// the axis just enough to show them. `gapBefore[i]` marks a slot that follows a
// skipped stretch (only possible for such out-of-window lessons).
const buildSlots = (events: ScheduleEvent[]) => {
  const set = new Set<number>();
  for (let m = SCHEDULE_TIME_START; m <= SCHEDULE_TIME_END; m += SLOT_MINS) set.add(m);
  events.forEach((e) => {
    for (let m = Math.floor(e.start / SLOT_MINS) * SLOT_MINS; m < e.start + e.duration; m += SLOT_MINS) set.add(m);
  });
  const slots = [...set].sort((a, b) => a - b);
  const slotIndex = new Map(slots.map((m, i) => [m, i]));
  const gapBefore = slots.map((m, i) => i > 0 && m - slots[i - 1] > SLOT_MINS);
  return { slots, slotIndex, gapBefore };
};

// Event position/size in slot units (1 = one 30-min slot) on the compacted axis.
const slotSpan = (ev: ScheduleEvent, slotIndex: Map<number, number>) => ({
  pos: (slotIndex.get(Math.floor(ev.start / SLOT_MINS) * SLOT_MINS) ?? 0) + (ev.start % SLOT_MINS) / SLOT_MINS,
  len: ev.duration / SLOT_MINS,
});

// Sizes for the schedule grids (px) — one 30-min slot column/row.
const SLOT_W = 64;
const ROOM_COL_W = 170;
const SLOT_H = 76;
const TIME_COL_W = 76;
const VERTICAL_ROOM_MIN_W = 210;

const DIVIDER_HEAVY = "2px solid var(--color-text-muted)";
const DIVIDER_LIGHT = "1px solid var(--color-border)";

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
  const [tab,         setTab        ] = useState<ScheduleTab>("odd");
  const [orientation, setOrientation] = useState<ScheduleOrientation>("horizontal");

  // Branch-scoped everywhere below, same as Students/Groups/Teachers/Finance —
  // baseApi already attaches this as the `x-branch-id` header on every
  // request, and switching branches resets the whole RTK Query cache
  // (changeSelectedBranch → baseApi.util.resetApiState()), but the list/report
  // endpoints below also accept `branchId` explicitly (matching how the other
  // pages that already call them pass it), and reports/left-students in
  // particular documents branchId as a distinct filter from the header.
  const selectedBranchId = useSelector((s: RootState) => s.branch.selectedBranchId);
  const branchId = selectedBranchId ?? undefined;

  // No mutation anywhere in the app invalidates the "dashboard" tag (these
  // five queries are the only providers of it), so without forcing a
  // refetch on mount, these numbers would only ever update on a full page
  // reload or after the ~60s unused-cache window lapses — stale after any
  // student/payment/attendance/group action taken elsewhere and then
  // navigated back from.
  const refetchOnMount = { refetchOnMountOrArgChange: true };
  const { data: statsData } = useDashboardStatsQuery(undefined, refetchOnMount);
  const { data: scheduleData, isLoading: scheduleLoading, isError: scheduleError } = useDashboardScheduleQuery(undefined, refetchOnMount);
  // Enrichment source for the schedule cards below (real training dates, room
  // capacity, current headcount) — GET /groups' own schedule endpoint
  // (ScheduleItem) only carries group/course/room/time/teacher, nothing else.
  const { data: scheduleGroupsData } = useAllGroupsQuery({ page: 1, limit: 100 }, refetchOnMount);
  // Same "legacy relation keeps listing removed students" workaround already
  // used on the Groups list page — see realStudentCount's own comment.
  const { data: inactiveMembershipsData } = useStudentGroupsQuery({ status: "INACTIVE", branchId, limit: 1000 });
  const { data: deletedMembershipsData } = useStudentGroupsQuery({ status: "DELETED", branchId, limit: 1000 });
  const { data: attendanceData, isLoading: attendanceLoading, isError: attendanceError } = useDashboardAttendanceStatsQuery(undefined, refetchOnMount);
  const { data: activitiesData, isLoading: activitiesLoading, isError: activitiesError } = useDashboardRecentActivitiesQuery(undefined, refetchOnMount);
  const { data: teacherPerfData, isLoading: teacherPerfLoading, isError: teacherPerfError } = useDashboardTeacherPerformanceQuery(undefined, refetchOnMount);

  // "Active leads" — GET /leads?status=ACTIVE (leadsApi's own definition of
  // an active lead, same enum the Leads Kanban board and Reports use).
  const { data: activeLeadsData, isFetching: activeLeadsLoading } =
    useAllLeadsQuery({ status: "ACTIVE", page: 1, limit: 500, branchId });

  // "Left after trial period" — there's no dedicated backend flag for this,
  // but the lead pipeline itself models it: a lead only leaves leadsApi's
  // domain by either being CANCELLED or CONVERTED (a CONVERTED lead becomes
  // a real Student, tracked separately from here on via studentsApi/
  // groupsApi). A CANCELLED lead is therefore, by construction, someone who
  // never made it past the lead/trial stage — the closest real, non-invented
  // proxy for "left after trial period" the API actually supports.
  const { data: cancelledLeadsData, isFetching: leftTrialLoading } =
    useAllLeadsQuery({ status: "CANCELLED", page: 1, limit: 500, branchId });

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

  const peakPoint = useMemo(() => {
    if (!chartMonths || chartMonths.length === 0) return null;
    return chartMonths.reduce((max, point) => (point.totalPayments > max.totalPayments ? point : max), chartMonths[0]);
  }, [chartMonths]);

  const liveStatValues: Record<string, { value: number; loading: boolean }> = {
    leads:      { value: activeLeadsData?.meta?.total ?? activeLeadsData?.data.length ?? 0, loading: activeLeadsLoading },
    students:   { value: statsData?.data.activeStudentsCount ?? 0, loading: !statsData },
    groups:     { value: statsData?.data.activeGroupsCount ?? 0, loading: !statsData },
    debtors:    { value: debtorsData?.meta.total ?? 0, loading: debtorsLoading },
    trial:      { value: trialGroupsData?.meta.total ?? 0, loading: trialLoading },
    paid:       { value: paymentsThisMonthData?.meta.total ?? 0, loading: paidLoading },
    leftActive: { value: leftStudentsData?.total ?? 0, loading: leftActiveLoading },
    leftTrial:  { value: cancelledLeadsData?.meta?.total ?? cancelledLeadsData?.data.length ?? 0, loading: leftTrialLoading },
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
  // Rooms come from every day type so an empty tab still draws its rows; with
  // no rooms at all one blank row keeps the empty grid visible.
  const rooms = useMemo(() => {
    const all = [...new Set(events.map((e) => e.room))];
    return all.length ? all : [""];
  }, [events]);

  // Filtered events for current tab — this only affects the schedule below,
  // the revenue chart above is intentionally independent of it.
  const tabEvents = useMemo(
    () => events.filter((e) => e.days.includes(tab)),
    [events, tab],
  );
  const visibleEvents = useMemo(() => tabEvents.filter((e) => e.start >= 0), [tabEvents]);
  const unscheduledEvents = useMemo(() => tabEvents.filter((e) => e.start < 0), [tabEvents]);

  const { slots, slotIndex, gapBefore } = useMemo(() => buildSlots(visibleEvents), [visibleEvents]);
  const slotCount = slots.length;

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

  const tabLabel: Record<ScheduleTab, string> = {
    odd: t("dashboard.schedule.tabs.odd"),
    even: t("dashboard.schedule.tabs.even"),
    other: t("dashboard.schedule.tabs.other"),
  };
  const tabs: ScheduleTab[] = ["odd", "even", "other"];

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
      <Box sx={{
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

      {/* ═══════════════════════════════════════════════════════════════
          SCHEDULE
      ════════════════════════════════════════════════════════════════ */}
      <Paper elevation={0} sx={{
        borderRadius: "16px", border: "1px solid var(--color-border)",
        background: "var(--color-surface)", overflow: "hidden",
      }}>

        {/* Schedule header */}
        <Box sx={{
          display: "flex", alignItems: "center",
          justifyContent: "space-between",
          px: 3, py: 1.5,
          borderBottom: "1px solid var(--color-border)",
          flexWrap: "wrap", gap: 1,
        }}>
          {/* Tabs */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 0 }}>
            {tabs.map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                style={{
                  background: "none", border: "none",
                  cursor: "pointer", padding: "6px 14px",
                  fontSize: 13, fontWeight: 600,
                  color: tab === t ? "#f97316" : "var(--color-text-muted)",
                  borderBottom: tab === t ? "2px solid #f97316" : "2px solid transparent",
                  transition: "all 0.15s",
                }}
              >
                {tabLabel[t]}
              </button>
            ))}
          </Box>

          {/* Title */}
          <Typography sx={{ fontWeight: 700, fontSize: 15, color: "var(--color-text-primary)" }}>
            {t("dashboard.schedule.title")}
          </Typography>

          {/* Orientation toggle */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <button
              onClick={() => setOrientation("horizontal")}
              title={t("dashboard.schedule.horizontalViewTitle")}
              style={{
                background: orientation === "horizontal" ? "var(--color-accent-surface)" : "transparent",
                border: orientation === "horizontal" ? "1px solid #f97316" : "1px solid var(--color-border)",
                borderRadius: 8, padding: "4px 10px",
                cursor: "pointer", display: "flex", alignItems: "center", gap: 4,
                color: orientation === "horizontal" ? "#f97316" : "var(--color-text-muted)",
                fontSize: 12, fontWeight: 600, transition: "all 0.15s",
              }}
            >
              <MdViewStream size={16} />
              {t("dashboard.schedule.horizontal")}
            </button>
            <button
              onClick={() => setOrientation("vertical")}
              title={t("dashboard.schedule.verticalViewTitle")}
              style={{
                background: orientation === "vertical" ? "var(--color-accent-surface)" : "transparent",
                border: orientation === "vertical" ? "1px solid #f97316" : "1px solid var(--color-border)",
                borderRadius: 8, padding: "4px 10px",
                cursor: "pointer", display: "flex", alignItems: "center", gap: 4,
                color: orientation === "vertical" ? "#f97316" : "var(--color-text-muted)",
                fontSize: 12, fontWeight: 600, transition: "all 0.15s",
              }}
            >
              <MdViewColumn size={16} />
              {t("dashboard.schedule.vertical")}
            </button>
          </Box>
        </Box>

        {scheduleLoading && (
          <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
            <CircularProgress size={28} />
          </Box>
        )}

        {!scheduleLoading && scheduleError && (
          <Box sx={{ py: 6, textAlign: "center" }}>
            <Typography sx={{ color: "var(--color-danger)", fontSize: 13 }}>
              {t("dashboard.loadError")}
            </Typography>
          </Box>
        )}

        {/* ── HORIZONTAL layout ── */}
        {!scheduleLoading && !scheduleError && orientation === "horizontal" && slotCount > 0 && (
          <Box sx={{ overflowX: "auto" }}>
            <Box sx={{ minWidth: ROOM_COL_W + slotCount * SLOT_W }}>

              {/* Time header row */}
              <Box sx={{
                display: "grid",
                gridTemplateColumns: `${ROOM_COL_W}px 1fr`,
                borderBottom: "1px solid var(--color-border)",
                background: "var(--color-surface-alt)",
              }}>
                <Box sx={{ borderRight: "1px solid var(--color-border)", py: 1 }} />
                <Box sx={{ display: "grid", gridTemplateColumns: `repeat(${slotCount}, 1fr)` }}>
                  {slots.map((m, i) => {
                    const isHourMark = m % 60 === 0;
                    return (
                      <Box
                        key={m}
                        sx={{
                          py: 1.25, textAlign: "center",
                          borderLeft: gapBefore[i] ? DIVIDER_HEAVY : i > 0 ? DIVIDER_LIGHT : "none",
                        }}
                      >
                        <Typography sx={{
                          fontSize: 14, whiteSpace: "nowrap",
                          fontWeight: isHourMark ? 800 : 500,
                          color: isHourMark ? "var(--color-text-primary)" : "var(--color-text-muted)",
                        }}>
                          {formatSlot(m)}
                        </Typography>
                      </Box>
                    );
                  })}
                </Box>
              </Box>

              {/* Room rows */}
              {rooms.map((room: string) => {
                const roomEvents = visibleEvents.filter((e: { room: string }) => e.room === room);
                return (
                  <Box
                    key={room}
                    sx={{
                      display: "grid",
                      gridTemplateColumns: `${ROOM_COL_W}px 1fr`,
                      borderBottom: "1px solid var(--color-border-subtle)",
                      minHeight: 128,
                      "&:hover": { background: "var(--color-surface-hover)" },
                    }}
                  >
                    <Box sx={{
                      px: 2, display: "flex", alignItems: "center",
                      borderRight: "1px solid var(--color-border)",
                    }}>
                      <Typography sx={{ fontSize: 15, fontWeight: 700, color: "var(--color-text-primary)", wordBreak: "break-word" }}>
                        {room}
                      </Typography>
                    </Box>
                    <Box sx={{ position: "relative", minHeight: 128 }}>
                      {/* Grid lines — heavier where empty stretches were collapsed */}
                      {slots.map((m, i) => i > 0 && (
                        <Box key={m} sx={{
                          position: "absolute",
                          left: `${(i / slotCount) * 100}%`,
                          top: 0, bottom: 0,
                          borderLeft: gapBefore[i] ? DIVIDER_HEAVY : DIVIDER_LIGHT,
                        }} />
                      ))}
                      {/* Events */}
                      {roomEvents.map((ev: ScheduleEvent) => {
                        const { pos, len } = slotSpan(ev, slotIndex);
                        return (
                          <Tooltip
                            key={ev.id}
                            title={`${ev.groupName} · ${ev.courseName} · ${ev.teacher}${ev.dateRange ? ` · ${ev.dateRange}` : ""}`}
                            placement="top"
                            arrow
                          >
                            <Box
                              onClick={() => navigate(`/groups/${ev.id}`)}
                              sx={{
                                position: "absolute",
                                left: `calc(${(pos / slotCount) * 100}% + 3px)`,
                                width: `calc(${(len / slotCount) * 100}% - 6px)`,
                                top: 8, bottom: 8,
                                backgroundColor: ev.color,
                                borderRadius: "10px",
                                boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
                                px: 1.5, py: 1,
                                display: "flex", flexDirection: "column", justifyContent: "center", gap: 0.4,
                                overflow: "visible",
                                cursor: "pointer",
                                transition: "filter 0.15s",
                                "&:hover": { filter: "brightness(0.9)" },
                              }}
                            >
                              {ev.daysLeftLabel && (
                                <Box sx={{
                                  position: "absolute", top: -9, right: 8,
                                  background: "var(--color-danger)", borderRadius: "10px",
                                  px: 1, py: 0.2, fontSize: 11, fontWeight: 700,
                                  color: "#fff", whiteSpace: "nowrap", boxShadow: "0 1px 3px rgba(0,0,0,0.25)",
                                }}>
                                  {ev.daysLeftLabel}
                                </Box>
                              )}
                              <Box sx={{
                                alignSelf: "flex-start", maxWidth: "100%",
                                background: "rgba(255,255,255,0.3)", borderRadius: "5px",
                                px: 0.8, fontSize: 13, fontWeight: 800,
                                color: "#fff", lineHeight: 1.5,
                                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                              }}>
                                {ev.groupName}
                              </Box>
                              <Typography sx={{ fontSize: 14, fontWeight: 700, color: "#fff", lineHeight: 1.3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {ev.courseName}
                              </Typography>
                              <Typography sx={{ fontSize: 13, color: "rgba(255,255,255,0.95)", lineHeight: 1.3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {ev.teacher}
                              </Typography>
                              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 0.5 }}>
                                <Typography sx={{ fontSize: 12, color: "rgba(255,255,255,0.9)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                  {ev.dateRange}
                                </Typography>
                                <Box sx={{
                                  background: "rgba(0,0,0,0.22)", borderRadius: "4px",
                                  px: 0.8, fontSize: 12, color: "#fff", fontWeight: 700, whiteSpace: "nowrap", flexShrink: 0,
                                }}>
                                  {t("dashboard.schedule.studentsFractionSlash", { count: ev.students, max: ev.maxStudents || "-" })}
                                </Box>
                              </Box>
                            </Box>
                          </Tooltip>
                        );
                      })}
                    </Box>
                  </Box>
                );
              })}
            </Box>
          </Box>
        )}

        {/* ── VERTICAL layout ── */}
        {!scheduleLoading && !scheduleError && orientation === "vertical" && slotCount > 0 && (
          <Box sx={{ overflowX: "auto" }}>
            <Box sx={{ minWidth: TIME_COL_W + rooms.length * VERTICAL_ROOM_MIN_W }}>
              {/* Column headers = rooms */}
              <Box sx={{
                display: "grid",
                gridTemplateColumns: `${TIME_COL_W}px repeat(${rooms.length}, minmax(${VERTICAL_ROOM_MIN_W}px, 1fr))`,
                borderBottom: "1px solid var(--color-border)",
                background: "var(--color-surface-alt)",
                position: "sticky", top: 0, zIndex: 2,
              }}>
                <Box sx={{ borderRight: "1px solid var(--color-border)", py: 1 }} />
                {rooms.map((r: string) => (
                  <Box key={r} sx={{
                    py: 1.25, px: 1,
                    borderRight: "1px solid var(--color-border)",
                    textAlign: "center",
                  }}>
                    <Typography sx={{ fontSize: 15, fontWeight: 700, color: "var(--color-text-primary)" }}>{r}</Typography>
                  </Box>
                ))}
              </Box>

              <Box sx={{
                display: "grid",
                gridTemplateColumns: `${TIME_COL_W}px repeat(${rooms.length}, minmax(${VERTICAL_ROOM_MIN_W}px, 1fr))`,
              }}>
                {/* Time labels — collapsed stretches get a heavier divider */}
                <Box sx={{ borderRight: "1px solid var(--color-border)" }}>
                  {slots.map((m, i) => {
                    const isHourMark = m % 60 === 0;
                    return (
                      <Box key={m} sx={{
                        height: SLOT_H, px: 1, pt: 0.75, textAlign: "center",
                        borderTop: gapBefore[i] ? DIVIDER_HEAVY : i > 0 ? "1px solid var(--color-border-subtle)" : "none",
                      }}>
                        <Typography sx={{
                          fontSize: 14, fontWeight: isHourMark ? 800 : 500, whiteSpace: "nowrap",
                          color: isHourMark ? "var(--color-text-primary)" : "var(--color-text-muted)",
                        }}>
                          {formatSlot(m)}
                        </Typography>
                      </Box>
                    );
                  })}
                </Box>

                {/* Room columns */}
                {rooms.map((room) => {
                  const roomEvents = visibleEvents.filter((e) => e.room === room);
                  return (
                    <Box key={room} sx={{
                      position: "relative", height: slotCount * SLOT_H,
                      borderRight: "1px solid var(--color-border)",
                    }}>
                      {/* Grid lines */}
                      {slots.map((m, i) => i > 0 && (
                        <Box key={m} sx={{
                          position: "absolute", left: 0, right: 0,
                          top: i * SLOT_H,
                          borderTop: gapBefore[i] ? DIVIDER_HEAVY : "1px solid var(--color-border-subtle)",
                        }} />
                      ))}
                      {/* Events */}
                      {roomEvents.map((ev) => {
                        const { pos, len } = slotSpan(ev, slotIndex);
                        return (
                          <Tooltip
                            key={ev.id}
                            title={`${ev.groupName} · ${ev.courseName} · ${ev.teacher}${ev.dateRange ? ` · ${ev.dateRange}` : ""}`}
                            placement="top" arrow
                          >
                            <Box
                              onClick={() => navigate(`/groups/${ev.id}`)}
                              sx={{
                                position: "absolute",
                                left: 4, right: 4,
                                top: pos * SLOT_H + 3,
                                height: len * SLOT_H - 6,
                                backgroundColor: ev.color,
                                borderRadius: "10px",
                                boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
                                px: 1.25, py: 0.75,
                                display: "flex", flexDirection: "column", justifyContent: "center", gap: 0.3,
                                cursor: "pointer",
                                transition: "filter 0.15s",
                                "&:hover": { filter: "brightness(0.9)" },
                              }}
                            >
                              {ev.daysLeftLabel && (
                                <Box sx={{
                                  position: "absolute", top: -8, right: 8,
                                  background: "var(--color-danger)", borderRadius: "10px",
                                  px: 1, py: 0.1, fontSize: 11, fontWeight: 700,
                                  color: "#fff", whiteSpace: "nowrap", boxShadow: "0 1px 3px rgba(0,0,0,0.25)",
                                }}>
                                  {ev.daysLeftLabel}
                                </Box>
                              )}
                              <Box sx={{
                                alignSelf: "flex-start", maxWidth: "100%",
                                background: "rgba(255,255,255,0.3)", borderRadius: "5px",
                                px: 0.8, fontSize: 13, fontWeight: 800, color: "#fff", lineHeight: 1.5,
                                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                              }}>
                                {ev.groupName}
                              </Box>
                              <Typography sx={{ fontSize: 14, fontWeight: 700, color: "#fff", lineHeight: 1.25, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {ev.courseName}
                              </Typography>
                              <Typography sx={{ fontSize: 13, color: "rgba(255,255,255,0.95)", lineHeight: 1.25, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {ev.teacher}
                              </Typography>
                              <Typography sx={{ fontSize: 12, color: "rgba(255,255,255,0.9)", lineHeight: 1.25, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {ev.dateRange}
                              </Typography>
                              <Typography sx={{ fontSize: 12, fontWeight: 700, color: "#fff", lineHeight: 1.25 }}>
                                {t("dashboard.schedule.studentsCountSuffix", { count: ev.students, max: ev.maxStudents || "-" })}
                              </Typography>
                            </Box>
                          </Tooltip>
                        );
                      })}
                    </Box>
                  );
                })}
              </Box>
            </Box>
          </Box>
        )}

        {!scheduleLoading && !scheduleError && unscheduledEvents.length > 0 && (
          <Box sx={{ px: 2, py: 1.25, borderTop: "1px solid var(--color-border)", fontSize: 13, color: "var(--color-text-muted)", display: "flex", flexWrap: "wrap", gap: 1 }}>
            <span>{t("dashboard.schedule.noTime")}:</span>
            {unscheduledEvents.map((ev) => (
              <span
                key={`${ev.id}-${ev.room}`}
                onClick={() => navigate(`/groups/${ev.id}`)}
                style={{ cursor: "pointer", color: "var(--color-primary)", fontWeight: 600 }}
              >
                {ev.groupName}
              </span>
            ))}
          </Box>
        )}

        {/* Empty state */}
        {!scheduleLoading && !scheduleError && tabEvents.length === 0 && (
          <Box sx={{ py: 6, textAlign: "center" }}>
            <Typography sx={{ color: "var(--color-text-muted)", fontSize: 14 }}>
              {t("dashboard.schedule.emptyState")}
            </Typography>
          </Box>
        )}
      </Paper>
    </Box>
  );
};

export default Dashboard;