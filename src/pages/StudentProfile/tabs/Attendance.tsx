// Dedicated "Attendance" tab for a single student's profile — distinct from
// the small per-group donut summary already shown on each Groups-tab card
// (StudentProfile.tsx's AttendanceSummary). That widget only gives a total;
// this tab shows the real per-day calendar (which day, what status), scoped
// to one of the student's groups at a time, matching the SingleGroup
// Attendance tab's own data source so both stay consistent.
import { useMemo, useState } from "react";
import {
  Box, Stack, Typography, Select, MenuItem, IconButton, Button,
  ToggleButtonGroup, ToggleButton, Checkbox, FormControlLabel, CircularProgress,
  LinearProgress, Table, TableHead, TableBody, TableRow, TableCell,
} from "@mui/material";
import { MdChevronLeft, MdChevronRight, MdRefresh } from "react-icons/md";
import { useTranslation } from "react-i18next";
import {
  useGroupAttendanceDatesQuery,
  useGroupAttendanceQuery,
} from "../../../app/api/attendancesApi";
import type { Group } from "../../../app/api/groupsApi/types";
import { getScheduledDaysInMonth } from "../../../utils";

interface AttendanceGroupOption {
  id: string;
  name: string;
}

interface Props {
  studentId: string;
  groups: AttendanceGroupOption[];
  groupsById: Map<string, Group>;
}

const pad2 = (n: number) => String(n).padStart(2, "0");
const WEEKDAY_LABELS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

const StatCard = ({
  label, value, bg, color,
}: {
  label: string;
  value: string;
  bg: string;
  color: string;
}) => (
  <Box sx={{ flex: 1, minWidth: 120, bgcolor: bg, borderRadius: 2, p: 1.5 }}>
    <Typography fontSize={12.5} color={color} sx={{ opacity: 0.85 }}>{label}</Typography>
    <Typography fontSize={22} fontWeight={700} color={color}>{value}</Typography>
  </Box>
);

export const StudentAttendanceTab = ({ studentId, groups, groupsById }: Props) => {
  const { t } = useTranslation();
  const now = useMemo(() => new Date(), []);
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [view, setView] = useState<"calendar" | "list">("calendar");
  const [showAll, setShowAll] = useState(true);

  const effectiveGroupId = selectedGroupId || groups[0]?.id || "";
  const group = groupsById.get(effectiveGroupId);
  const monthStr = `${year}-${pad2(month + 1)}`;

  const { data: lessonDates = [], isFetching: datesLoading, refetch: refetchDates } =
    useGroupAttendanceDatesQuery({ groupId: effectiveGroupId, month: monthStr }, { skip: !effectiveGroupId });
  const { data: records = [], isFetching: recordsLoading, refetch: refetchRecords } =
    useGroupAttendanceQuery({ groupId: effectiveGroupId, month: monthStr }, { skip: !effectiveGroupId });

  const totalDays = new Date(year, month + 1, 0).getDate();

  // Same priority order as SingleGroup's own Attendance tab: server-reported
  // dates first, then computed from the group's schedule, so a student who
  // meets e.g. only Tue/Thu/Sat doesn't get every calendar day marked as a
  // missed lesson.
  const lessonDays = useMemo(() => {
    if (lessonDates.length > 0) return [...lessonDates].sort().map((d) => Number(d.slice(-2)));
    if (group) {
      return getScheduledDaysInMonth(year, month, {
        daysType: group.daysType,
        days: group.days,
        trainingStart: group.trainingStart,
        trainingEnd: group.trainingEnd,
      });
    }
    return [];
  }, [lessonDates, group, year, month]);

  const statusByDay = useMemo(() => {
    const map = new Map<number, "PRESENT" | "ABSENT">();
    records
      .filter((r) => r.studentId === studentId && r.status)
      .forEach((r) => map.set(Number(r.date.slice(-2)), r.status as "PRESENT" | "ABSENT"));
    return map;
  }, [records, studentId]);

  const stats = useMemo(() => {
    let present = 0;
    let absent = 0;
    lessonDays.forEach((day) => {
      const status = statusByDay.get(day);
      if (status === "PRESENT") present += 1;
      else if (status === "ABSENT") absent += 1;
    });
    const notAttended = Math.max(0, lessonDays.length - present - absent);
    const marked = present + absent;
    const rate = marked > 0 ? Math.round((present / marked) * 100) : 0;
    return { present, absent, notAttended, rate };
  }, [lessonDays, statusByDay]);

  const isLoading = datesLoading || recordsLoading;

  const goPrevMonth = () => {
    if (month === 0) { setMonth(11); setYear((y) => y - 1); } else setMonth((m) => m - 1);
  };
  const goNextMonth = () => {
    if (month === 11) { setMonth(0); setYear((y) => y + 1); } else setMonth((m) => m + 1);
  };
  const handleRefresh = () => { refetchDates(); refetchRecords(); };

  const monthLabel = new Date(year, month, 1).toLocaleDateString("en-US", { month: "long" });

  if (groups.length === 0) {
    return (
      <Box sx={{ py: 4, textAlign: "center", color: "#9ca3af", fontSize: 14 }}>
        No groups yet
      </Box>
    );
  }

  // Monday-first month grid — leading/trailing cells from the neighboring
  // months are left empty rather than showing their numbers, so the grid
  // stays unambiguous about which week belongs to this month.
  const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7; // 0 = Monday
  const cells: (number | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: totalDays }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  const dayStatusLabel = (day: number): { label: string; bg: string; fg: string } | null => {
    if (!lessonDays.includes(day)) return null;
    const status = statusByDay.get(day);
    if (status === "PRESENT") return { label: t("singleGroup.tabs.attendance.was"), bg: "#dcfce7", fg: "#15803d" };
    if (status === "ABSENT") return { label: t("singleGroup.tabs.attendance.notPresent"), bg: "#fee2e2", fg: "#b91c1c" };
    return { label: "Not attended", bg: "#f3f4f6", fg: "#6b7280" };
  };

  return (
    <Box>
      {/* Header: group picker + month nav + refresh */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1.5} mb={2}>
        <Select
          size="small"
          value={effectiveGroupId}
          onChange={(e) => setSelectedGroupId(e.target.value)}
          sx={{ minWidth: 220, fontSize: 13.5 }}
        >
          {groups.map((g) => (
            <MenuItem key={g.id} value={g.id} sx={{ fontSize: 13.5 }}>{g.name}</MenuItem>
          ))}
        </Select>

        <Stack direction="row" alignItems="center" spacing={0.5}>
          <IconButton size="small" onClick={goPrevMonth}><MdChevronLeft /></IconButton>
          <Typography fontSize={14} fontWeight={600} sx={{ minWidth: 130, textAlign: "center" }}>
            {monthLabel} {year}
          </Typography>
          <IconButton size="small" onClick={goNextMonth}><MdChevronRight /></IconButton>
          <Button
            size="small"
            variant="outlined"
            startIcon={isLoading ? <CircularProgress size={13} /> : <MdRefresh />}
            onClick={handleRefresh}
            sx={{ textTransform: "none", ml: 1 }}
          >
            Refresh
          </Button>
        </Stack>
      </Stack>

      {/* Stat cards */}
      <Stack direction="row" flexWrap="wrap" gap={1.5} mb={2}>
        <StatCard label={t("singleGroup.tabs.attendance.was")} value={String(stats.present)} bg="#e8f9ee" color="#15803d" />
        <StatCard label={t("singleGroup.tabs.attendance.notPresent")} value={String(stats.absent)} bg="#fdeaea" color="#b91c1c" />
        <StatCard
          label="Not attended"
          value={String(stats.notAttended)}
          bg="#f3f4f6"
          color="#4b5563"
        />
        <Box sx={{ flex: 1, minWidth: 160, bgcolor: "#e8f9ee", borderRadius: 2, p: 1.5 }}>
          <Typography fontSize={12.5} color="#15803d" sx={{ opacity: 0.85 }}>
            Attendance rate
          </Typography>
          <Typography fontSize={22} fontWeight={700} color="#15803d">{stats.rate}%</Typography>
          <LinearProgress
            variant="determinate"
            value={stats.rate}
            sx={{
              mt: 0.5, height: 6, borderRadius: 3, bgcolor: "rgba(21,128,61,0.15)",
              "& .MuiLinearProgress-bar": { bgcolor: "#22c55e" },
            }}
          />
        </Box>
      </Stack>

      {/* View toggle + "show every day" checkbox */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1.5} mb={2}>
        <ToggleButtonGroup
          size="small"
          exclusive
          value={view}
          onChange={(_, v) => v && setView(v)}
          sx={{
            "& .MuiToggleButton-root": { textTransform: "none", px: 2, fontSize: 13 },
            "& .Mui-selected": { bgcolor: "#111827 !important", color: "#fff !important" },
          }}
        >
          <ToggleButton value="calendar">Calendar</ToggleButton>
          <ToggleButton value="list">List</ToggleButton>
        </ToggleButtonGroup>

        <FormControlLabel
          control={<Checkbox size="small" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} />}
          label={<Typography fontSize={13}>All</Typography>}
        />
      </Stack>

      {isLoading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 5 }}><CircularProgress size={26} /></Box>
      ) : view === "calendar" ? (
        <Box sx={{ border: "1px solid #e5e7eb", borderRadius: 2, overflow: "hidden" }}>
          <Box sx={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", bgcolor: "#fafafa" }}>
            {WEEKDAY_LABELS.map((w) => (
              <Box key={w} sx={{ p: 1, textAlign: "center", fontSize: 12.5, fontWeight: 600, color: "#6b7280", borderBottom: "1px solid #e5e7eb" }}>
                {w}
              </Box>
            ))}
          </Box>
          {weeks.map((week, wi) => (
            <Box key={wi} sx={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)" }}>
              {week.map((day, di) => {
                const status = day ? dayStatusLabel(day) : null;
                const isLessonDay = day ? lessonDays.includes(day) : false;
                if (day && !isLessonDay && !showAll) {
                  return <Box key={di} sx={{ minHeight: 64, border: "1px solid #f3f4f6" }} />;
                }
                return (
                  <Box
                    key={di}
                    sx={{
                      minHeight: 64, border: "1px solid #f3f4f6", p: 0.75,
                      bgcolor: status ? status.bg : "transparent",
                    }}
                  >
                    {day && (
                      <>
                        <Typography fontSize={12} color={status ? status.fg : "#9ca3af"} fontWeight={isLessonDay ? 700 : 400}>
                          {day}
                        </Typography>
                        {status && (
                          <>
                            <Typography fontSize={10.5} color={status.fg} sx={{ mt: 0.5, lineHeight: 1.2 }} noWrap>
                              {group?.name ?? groups.find((g) => g.id === effectiveGroupId)?.name}
                            </Typography>
                            <Typography fontSize={10.5} color={status.fg} fontWeight={600}>
                              {status.label}
                            </Typography>
                          </>
                        )}
                      </>
                    )}
                  </Box>
                );
              })}
            </Box>
          ))}
        </Box>
      ) : (
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 600 }}>Date</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {(showAll ? Array.from({ length: totalDays }, (_, i) => i + 1) : lessonDays)
              .map((day) => {
                const status = dayStatusLabel(day);
                const dateObj = new Date(year, month, day);
                return (
                  <TableRow key={day}>
                    <TableCell sx={{ fontSize: 13 }}>
                      {pad2(day)}.{pad2(month + 1)}.{year} — {dateObj.toLocaleDateString("en-US", { weekday: "short" })}
                    </TableCell>
                    <TableCell>
                      {status ? (
                        <Typography component="span" fontSize={12.5} fontWeight={600} sx={{ color: status.fg, bgcolor: status.bg, px: 1, py: 0.25, borderRadius: 1 }}>
                          {status.label}
                        </Typography>
                      ) : (
                        <Typography fontSize={12.5} color="text.disabled">—</Typography>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
          </TableBody>
        </Table>
      )}
    </Box>
  );
};

export default StudentAttendanceTab;
