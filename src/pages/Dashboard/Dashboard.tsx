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
import { useStudentGroupsQuery } from "../../app/api/groupsApi";
import { useDebtorsQuery, usePaymentsListQuery, useFinanceChartQuery } from "../../app/api/financeApi";
import { useReportLeftStudentsQuery } from "../../app/api/reportsApi";
import {
  SCHEDULE_COLORS, DEFAULT_LESSON_DURATION,
  SCHEDULE_TIME_START, SCHEDULE_TIME_END,
} from "../../constants/DashboardData";
import { STATS } from "../../constants/DashboardStats";

// "This month" as [firstOfMonth, today] in the plain YYYY-MM-DD format every
// finance list endpoint expects (same format the date-range filters on the
// Finance pages already send).
const pad2 = (n: number) => String(n).padStart(2, "0");
const toISODate = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

const parseTimeToMinutes = (time: string | null | undefined) => {
  if (!time) return 0;
  const [h, m] = time.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
};

const mapDaysType = (daysType: string): ScheduleTab => {
  if (daysType === "ODD") return "odd";
  if (daysType === "EVEN") return "even";
  return "other";
};

const toScheduleEvents = (items: ScheduleItem[]): ScheduleEvent[] =>
  items.map((item, i) => ({
    id: item.groupId,
    room: item.roomName,
    start: parseTimeToMinutes(item.time),
    duration: DEFAULT_LESSON_DURATION,
    groupName: item.groupName,
    courseName: item.courseName,
    teacher: item.teachers,
    dateRange: "",
    students: 0,
    maxStudents: 0,
    color: SCHEDULE_COLORS[i % SCHEDULE_COLORS.length],
    days: [mapDaysType(item.daysType)],
  }));

// ─── Time helpers ─────────────────────────────────────────────────────────────

const TIME_START = SCHEDULE_TIME_START;
const TIME_END   = SCHEDULE_TIME_END;
const TOTAL_MINS = TIME_END - TIME_START;

const TIME_LABELS: string[] = [];
for (let m = TIME_START; m <= TIME_END; m += 30) {
  const h   = Math.floor(m / 60).toString().padStart(2, "0");
  const min = (m % 60).toString().padStart(2, "0");
  TIME_LABELS.push(`${h}:${min}`);
}

const pct = (mins: number) =>
  `${((mins / TOTAL_MINS) * 100).toFixed(3)}%`;

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
  const { t } = useTranslation();
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

  const { data: statsData } = useDashboardStatsQuery();
  const { data: scheduleData, isLoading: scheduleLoading, isError: scheduleError } = useDashboardScheduleQuery();
  const { data: attendanceData, isLoading: attendanceLoading, isError: attendanceError } = useDashboardAttendanceStatsQuery();
  const { data: activitiesData, isLoading: activitiesLoading, isError: activitiesError } = useDashboardRecentActivitiesQuery();
  const { data: teacherPerfData, isLoading: teacherPerfLoading, isError: teacherPerfError } = useDashboardTeacherPerformanceQuery();

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

  const events = useMemo(
    () => toScheduleEvents(scheduleData?.data ?? []),
    [scheduleData],
  );
  const rooms = useMemo(
    () => [...new Set(events.map((e) => e.room))],
    [events],
  );

  // Filtered events for current tab — this only affects the schedule below,
  // the revenue chart above is intentionally independent of it.
  const visibleEvents = useMemo(
    () => events.filter((e) => e.days.includes(tab)),
    [events, tab],
  );

  // Navigate stat card → page (with optional ?filter=xxx)
  const goTo = (route: string, filter?: string) => {
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
              onClick={() => goTo(route, filter)}
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
        {!scheduleLoading && !scheduleError && orientation === "horizontal" && (
          <Box sx={{ overflowX: "auto" }}>
            <Box sx={{ minWidth: 1100 }}>

              {/* Time header row */}
              <Box sx={{
                display: "grid",
                gridTemplateColumns: "110px 1fr",
                borderBottom: "1px solid var(--color-border)",
                background: "var(--color-surface-alt)",
              }}>
                <Box sx={{ borderRight: "1px solid var(--color-border)", py: 1 }} />
                <Box sx={{ position: "relative", height: 32 }}>
                  {TIME_LABELS.map((t, i) => (
                    <Typography
                      key={t}
                      sx={{
                        position: "absolute",
                        left: `${(i / (TIME_LABELS.length - 1)) * 100}%`,
                        transform: "translateX(-50%)",
                        top: "50%", mt: "-9px",
                        fontSize: 10, whiteSpace: "nowrap",
                        fontWeight: 500,
                        color: (t === "10:30" || t === "11:00") ? "#f97316" : "var(--color-text-muted)",
                      }}
                    >
                      {t}
                    </Typography>
                  ))}
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
                      gridTemplateColumns: "110px 1fr",
                      borderBottom: "1px solid var(--color-border-subtle)",
                      minHeight: 68,
                      "&:hover": { background: "var(--color-surface-hover)" },
                    }}
                  >
                    <Box sx={{
                      px: 2, display: "flex", alignItems: "center",
                      borderRight: "1px solid var(--color-border)",
                    }}>
                      <Typography sx={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-secondary)" }}>
                        {room}
                      </Typography>
                    </Box>
                    <Box sx={{ position: "relative", minHeight: 68 }}>
                      {/* Grid lines */}
                      {TIME_LABELS.map((t, i) => (
                        <Box key={t} sx={{
                          position: "absolute",
                          left: `${(i / (TIME_LABELS.length - 1)) * 100}%`,
                          top: 0, bottom: 0,
                          borderLeft: "1px solid var(--color-border)",
                        }} />
                      ))}
                      {/* Events */}
                      {roomEvents.map((ev: { id: string; groupName: string; courseName: string; teacher: string; dateRange: string; start: number; duration: number; color: string; tag?: string; tagColor?: string; students?: number; maxStudents?: number }) => {
                        const startOff = ev.start - TIME_START;
                        return (
                          <Tooltip
                            key={ev.id}
                            title={`${ev.groupName} · ${ev.courseName} · ${ev.teacher} · ${ev.dateRange}`}
                            placement="top"
                            arrow
                          >
                            <Box
                              sx={{
                                position: "absolute",
                                left: pct(startOff),
                                width: pct(ev.duration),
                                top: 8, bottom: 8,
                                backgroundColor: ev.color,
                                borderRadius: "8px",
                                px: 1, py: 0.5,
                                overflow: "hidden",
                                cursor: "pointer",
                                transition: "filter 0.15s",
                                "&:hover": { filter: "brightness(0.9)" },
                              }}
                            >
                              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, flexWrap: "wrap" }}>
                                {ev.tag && (
                                  <Box sx={{
                                    background: ev.tagColor, borderRadius: "3px",
                                    px: 0.6, fontSize: 9, fontWeight: 700,
                                    color: "var(--color-surface)", lineHeight: 1.5,
                                  }}>
                                    {ev.tag}
                                  </Box>
                                )}
                                <Typography sx={{ fontSize: 10, fontWeight: 700, color: "var(--color-surface)", lineHeight: 1.3 }}>
                                  {ev.groupName}
                                </Typography>
                              </Box>
                              <Typography sx={{ fontSize: 9, color: "rgba(255,255,255,0.9)", lineHeight: 1.3 }}>
                                {ev.courseName}
                              </Typography>
                              {ev.dateRange && (
                                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mt: 0.3 }}>
                                  <Typography sx={{ fontSize: 9, color: "rgba(255,255,255,0.8)" }}>
                                    {ev.dateRange}
                                  </Typography>
                                  {(ev.students ?? 0) > 0 && (
                                    <Box sx={{
                                      background: "rgba(0,0,0,0.2)", borderRadius: "3px",
                                      px: 0.6, fontSize: 9, color: "var(--color-surface)", fontWeight: 700,
                                    }}>
                                      {t("dashboard.schedule.studentsFractionSlash", { count: ev.students ?? 0, max: ev.maxStudents })}
                                    </Box>
                                  )}
                                </Box>
                              )}
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
        {!scheduleLoading && !scheduleError && orientation === "vertical" && (
          <Box sx={{ overflowX: "auto" }}>
            <Box sx={{ minWidth: 900 }}>
              {/* Column headers = rooms */}
              <Box sx={{
                display: "grid",
                gridTemplateColumns: `80px repeat(${rooms.length}, 1fr)`,
                borderBottom: "1px solid var(--color-border)",
                background: "var(--color-surface-alt)",
                position: "sticky", top: 0, zIndex: 2,
              }}>
                <Box sx={{ borderRight: "1px solid var(--color-border)", py: 1 }} />
                {rooms.map((r: string) => (
                  <Box key={r} sx={{
                    py: 1, px: 1,
                    borderRight: "1px solid var(--color-border)",
                    textAlign: "center",
                  }}>
                    <Typography sx={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-secondary)" }}>{r}</Typography>
                  </Box>
                ))}
              </Box>

              {/* Time rows */}
              {TIME_LABELS.map((timeLabel, tIdx) => {
                // For each time slot row, find events that START in this 30-min window
                const slotStart = TIME_START + tIdx * 30;
                const slotEnd   = slotStart + 30;

                return (
                  <Box
                    key={timeLabel}
                    sx={{
                      display: "grid",
                      gridTemplateColumns: `80px repeat(${rooms.length}, 1fr)`,
                      borderBottom: "1px solid var(--color-border-subtle)",
                      minHeight: 48,
                    }}
                  >
                    {/* Time label */}
                    <Box sx={{
                      px: 1.5,
                      display: "flex", alignItems: "flex-start", pt: 1,
                      borderRight: "1px solid var(--color-border)",
                    }}>
                      <Typography sx={{
                        fontSize: 10, fontWeight: 500,
                        color: (timeLabel === "10:30" || timeLabel === "11:00") ? "#f97316" : "var(--color-text-muted)",
                        whiteSpace: "nowrap",
                      }}>
                        {timeLabel}
                      </Typography>
                    </Box>

                    {/* Room cells */}
                    {rooms.map((room ) => {
                      const cellEvents = visibleEvents.filter(
                        (e) => e.room === room && e.start >= slotStart && e.start < slotEnd,
                      );
                      // Also check spanning events
                      const spanningEvents = visibleEvents.filter(
                        (e) =>
                          e.room === room &&
                          e.start < slotStart &&
                          e.start + e.duration > slotStart,
                      );
                      // const allCellEvents = [...cellEvents, ...spanningEvents];

                      return (
                        <Box
                          key={room}
                          sx={{
                            borderRight: "1px solid var(--color-border)",
                            p: 0.5, minHeight: 48,
                            background: tIdx % 2 === 0 ? "var(--color-surface)" : "var(--color-surface-alt)",
                          }}
                        >
                          {cellEvents.map((ev) => (
                            <Tooltip
                              key={ev.id}
                              title={`${ev.groupName} · ${ev.courseName} · ${ev.teacher}`}
                              placement="top" arrow
                            >
                              <Box
                                sx={{
                                  backgroundColor: ev.color,
                                  borderRadius: "6px",
                                  px: 1, py: 0.5,
                                  mb: 0.5,
                                  cursor: "pointer",
                                  transition: "filter 0.15s",
                                  "&:hover": { filter: "brightness(0.9)" },
                                  // span multiple rows via minHeight proportional to duration
                                  minHeight: Math.max(40, (ev.duration / 30) * 48 - 4),
                                }}
                              >
                                {ev.tag && (
                                  <Box sx={{
                                    background: ev.tagColor, borderRadius: "3px",
                                    px: 0.5, mb: 0.25, display: "inline-block",
                                    fontSize: 8, fontWeight: 700, color: "var(--color-surface)",
                                  }}>
                                    {ev.tag}
                                  </Box>
                                )}
                                <Typography sx={{ fontSize: 9, fontWeight: 700, color: "var(--color-surface)", lineHeight: 1.3 }}>
                                  {ev.groupName}
                                </Typography>
                                <Typography sx={{ fontSize: 8, color: "rgba(255,255,255,0.85)", lineHeight: 1.2 }}>
                                  {ev.courseName}
                                </Typography>
                                {ev.students > 0 && (
                                  <Typography sx={{ fontSize: 8, color: "rgba(255,255,255,0.8)", mt: 0.25 }}>
                                    {t("dashboard.schedule.studentsCountSuffix", { count: ev.students, max: ev.maxStudents })}
                                  </Typography>
                                )}
                              </Box>
                            </Tooltip>
                          ))}
                          {/* Continuing event indicator */}
                          {spanningEvents.length > 0 && cellEvents.length === 0 && (
                            <Box sx={{
                              background: spanningEvents[0].color,
                              opacity: 0.3,
                              borderRadius: "4px",
                              height: 40,
                            }} />
                          )}
                        </Box>
                      );
                    })}
                  </Box>
                );
              })}
            </Box>
          </Box>
        )}

        {/* Empty state */}
        {!scheduleLoading && !scheduleError && visibleEvents.length === 0 && (
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