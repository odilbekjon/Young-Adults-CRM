// TEACHER-role landing page: this teacher's own stats
// (GET /teacher-portal/dashboard) above their own lesson schedule
// (GET /teacher-portal/schedule). Independent of the admin Dashboard — that
// page (and its schedule helpers) is left untouched; the grid below is a
// small standalone version of the same Odd/Even/Other + Horizontal/Vertical
// room x time layout. Which dashboard a role gets is decided in the router.
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Box, Button, CircularProgress, Paper, Tooltip, Typography } from "@mui/material";
import { MdViewColumn, MdViewStream } from "react-icons/md";
import { TbCalendarEvent, TbUsers, TbUsersGroup } from "react-icons/tb";
import {
  useTeacherPortalDashboardQuery,
  useTeacherPortalScheduleQuery,
} from "../../app/api/teacherPortalApi";
import type { TeacherPortalScheduleItem } from "../../app/api/teacherPortalApi/types";
import type { ScheduleOrientation, ScheduleTab } from "../../types/dashboardTypes";
import {
  DEFAULT_LESSON_DURATION,
  SCHEDULE_COLORS,
  SCHEDULE_TIME_END,
  SCHEDULE_TIME_START,
} from "../../constants/DashboardData";

interface TeacherEvent {
  key: string;
  groupId: string;
  room: string;
  /** minutes from 00:00, -1 when the backend has no start time */
  start: number;
  duration: number;
  groupName: string;
  courseName: string;
  dateRange: string;
  students: number | null;
  maxStudents: number | null;
  color: string;
  daysLeftLabel?: string;
  tab: ScheduleTab;
}

// ─── Parsing helpers ─────────────────────────────────────────────────────────

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const DAYS_LEFT_THRESHOLD = 5;
const SLOT_MINS = 30;

// "14:00", "14:00:00", "14:00-16:00", "14:00 - 16:00" -> { start, end? } in minutes.
const parseTimeRange = (time: string | null): { start: number; end: number | null } => {
  if (!time) return { start: -1, end: null };
  const matches = [...time.matchAll(/(\d{1,2}):(\d{2})/g)].map((m) => Number(m[1]) * 60 + Number(m[2]));
  if (matches.length === 0) return { start: -1, end: null };
  return { start: matches[0], end: matches.length > 1 ? matches[1] : null };
};

const ODD_DAYS = ["MONDAY", "WEDNESDAY", "FRIDAY"];
const EVEN_DAYS = ["TUESDAY", "THURSDAY", "SATURDAY"];

const classifyDayList = (days: string[]): ScheduleTab => {
  if (days.length === 0) return "other";
  if (days.every((d) => ODD_DAYS.includes(d))) return "odd";
  if (days.every((d) => EVEN_DAYS.includes(d))) return "even";
  return "other";
};

const toTab = (item: TeacherPortalScheduleItem): ScheduleTab => {
  if (item.daysType === "ODD") return "odd";
  if (item.daysType === "EVEN") return "even";
  if (item.daysType) return "other";
  return classifyDayList(item.days.length ? item.days : item.day ? [item.day] : []);
};

const parseDay = (d: string | null): Date | null => {
  if (!d) return null;
  const date = new Date(`${d.slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
};

// DD.MM – DD.MM (locale-independent; Intl short month names come out
// unreadable for some UI languages).
const formatDateRange = (start: string | null, end: string | null): string => {
  const s = parseDay(start);
  const e = parseDay(end);
  if (!s || !e) return "";
  const fmt = (d: Date) => `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}`;
  return `${fmt(s)} – ${fmt(e)}`;
};

const formatSlot = (m: number) =>
  `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

// The axis always covers the full working day (08:00-20:00, 30-min slots) so
// an empty day still shows an empty grid; lessons outside that window extend
// it just enough to be visible. gapBefore[i] marks a slot that follows a
// skipped stretch.
const buildSlots = (events: TeacherEvent[]) => {
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

const slotSpan = (ev: TeacherEvent, slotIndex: Map<number, number>) => ({
  pos: (slotIndex.get(Math.floor(ev.start / SLOT_MINS) * SLOT_MINS) ?? 0) + (ev.start % SLOT_MINS) / SLOT_MINS,
  len: ev.duration / SLOT_MINS,
});

const SLOT_W = 64;
const ROOM_COL_W = 170;
const SLOT_H = 76;
const TIME_COL_W = 76;
const VERTICAL_ROOM_MIN_W = 210;
const DIVIDER_HEAVY = "2px solid var(--color-text-muted)";
const DIVIDER_LIGHT = "1px solid var(--color-border)";

// ─── Stat card ───────────────────────────────────────────────────────────────

const StatCard = ({
  icon, label, value, loading, onClick,
}: { icon: React.ReactNode; label: string; value: number | null; loading: boolean; onClick?: () => void }) => (
  <Paper
    elevation={0}
    onClick={onClick}
    sx={{
      px: 2, py: 2.25, borderRadius: "12px",
      border: "1px solid var(--color-border)", background: "var(--color-surface)",
      display: "flex", alignItems: "center", gap: 2,
      cursor: onClick ? "pointer" : "default", userSelect: "none",
      transition: "all 0.18s ease",
      ...(onClick && {
        "&:hover": { borderColor: "#f97316", boxShadow: "0 4px 20px rgba(249,115,22,0.14)", transform: "translateY(-2px)" },
      }),
    }}
  >
    <Box sx={{ color: "#f97316", display: "flex", fontSize: 30 }}>{icon}</Box>
    <Box sx={{ minWidth: 0 }}>
      <Typography sx={{ fontSize: 14, color: "var(--color-text-secondary)", lineHeight: 1.3 }}>{label}</Typography>
      <Typography sx={{ fontSize: 30, fontWeight: 700, color: "var(--color-primary)", lineHeight: 1.15 }}>
        {loading ? <CircularProgress size={20} /> : value === null ? "—" : value}
      </Typography>
    </Box>
  </Paper>
);

// ─── Lesson card ─────────────────────────────────────────────────────────────

const LessonCard = ({ ev, orientation }: { ev: TeacherEvent; orientation: ScheduleOrientation }) => {
  const { t } = useTranslation();
  const horizontal = orientation === "horizontal";
  const fraction =
    ev.students === null
      ? null
      : ev.maxStudents
        ? t("teacherDashboard.schedule.studentsFraction", { count: ev.students, max: ev.maxStudents })
        : t("teacherDashboard.schedule.studentsCount", { count: ev.students });
  return (
    <>
      {ev.daysLeftLabel && (
        <Box sx={{
          position: "absolute", top: horizontal ? -9 : -8, right: 8,
          background: "var(--color-danger)", borderRadius: "10px",
          px: 1, py: 0.2, fontSize: 11, fontWeight: 700,
          color: "#fff", whiteSpace: "nowrap", boxShadow: "0 1px 3px rgba(0,0,0,0.25)",
        }}>
          {ev.daysLeftLabel}
        </Box>
      )}
      <Box sx={{ display: "contents" }}>
        <Box sx={{
          alignSelf: "flex-start", maxWidth: "100%",
          background: "rgba(255,255,255,0.3)", borderRadius: "5px",
          px: 0.8, fontSize: 13, fontWeight: 800, color: "#fff", lineHeight: 1.5,
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          {ev.groupName}
        </Box>
        {ev.courseName && (
          <Typography sx={{ fontSize: 14, fontWeight: 700, color: "#fff", lineHeight: 1.3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {ev.courseName}
          </Typography>
        )}
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 0.5 }}>
          <Typography sx={{ fontSize: 12, color: "rgba(255,255,255,0.9)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {ev.dateRange}
          </Typography>
          {fraction && (
            <Box sx={{ background: "rgba(0,0,0,0.22)", borderRadius: "4px", px: 0.8, fontSize: 12, color: "#fff", fontWeight: 700, whiteSpace: "nowrap", flexShrink: 0 }}>
              {fraction}
            </Box>
          )}
        </Box>
      </Box>
    </>
  );
};

const eventBoxSx = (color: string) => ({
  position: "absolute" as const,
  backgroundColor: color,
  borderRadius: "10px",
  boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
  display: "flex", flexDirection: "column" as const, justifyContent: "center",
  cursor: "pointer",
  transition: "filter 0.15s",
  "&:hover": { filter: "brightness(0.9)" },
});

// ─── Main component ──────────────────────────────────────────────────────────

export const TeacherDashboard = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [tab, setTab] = useState<ScheduleTab>("odd");
  const [orientation, setOrientation] = useState<ScheduleOrientation>("horizontal");

  // Nothing invalidates these on lesson/attendance changes made elsewhere, so
  // refetch when the landing page is (re)opened.
  const refetchOnMount = { refetchOnMountOrArgChange: true };
  const { data: stats, isLoading: statsLoading, isError: statsError } = useTeacherPortalDashboardQuery(undefined, refetchOnMount);
  const {
    data: scheduleData, isLoading: scheduleLoading, isError: scheduleError, refetch: refetchSchedule,
  } = useTeacherPortalScheduleQuery(undefined, refetchOnMount);

  const events = useMemo<TeacherEvent[]>(() => {
    const colorByGroup = new Map<string, string>();
    const seen = new Set<string>();
    const result: TeacherEvent[] = [];
    (scheduleData ?? []).forEach((item, i) => {
      const { start, end } = parseTimeRange(item.time);
      const eventTab = toTab(item);
      const room = item.roomName;
      // A per-weekday response can repeat the same lesson on every day of a
      // day type — one card per (group, time, room, day type) is enough.
      const key = `${item.groupId || item.groupName}|${start}|${room}|${eventTab}`;
      if (seen.has(key)) return;
      seen.add(key);
      if (!colorByGroup.has(item.groupId || item.groupName)) {
        colorByGroup.set(item.groupId || item.groupName, SCHEDULE_COLORS[colorByGroup.size % SCHEDULE_COLORS.length]);
      }
      let daysLeftLabel: string | undefined;
      const trainingEnd = parseDay(item.trainingEnd);
      if (trainingEnd) {
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const daysLeft = Math.round((trainingEnd.getTime() - today.getTime()) / MS_PER_DAY);
        if (daysLeft >= 0 && daysLeft <= DAYS_LEFT_THRESHOLD) {
          daysLeftLabel = t("teacherDashboard.schedule.daysLeft", { count: daysLeft });
        }
      }
      result.push({
        key: `${key}|${i}`,
        groupId: item.groupId,
        room,
        start,
        duration: end !== null && end > start ? end - start : DEFAULT_LESSON_DURATION,
        groupName: item.groupName,
        courseName: item.courseName,
        dateRange: formatDateRange(item.trainingStart, item.trainingEnd),
        students: item.studentsCount,
        maxStudents: item.maxStudents,
        color: colorByGroup.get(item.groupId || item.groupName) ?? SCHEDULE_COLORS[0],
        daysLeftLabel,
        tab: eventTab,
      });
    });
    return result;
  }, [scheduleData, t]);

  // Rooms come from every day type so an empty tab still draws its rows.
  const rooms = useMemo(() => {
    const all = [...new Set(events.map((e) => e.room))];
    return all.length ? all : [""];
  }, [events]);

  const tabEvents = useMemo(() => events.filter((e) => e.tab === tab), [events, tab]);
  const visibleEvents = useMemo(() => tabEvents.filter((e) => e.start >= 0), [tabEvents]);
  const unscheduledEvents = useMemo(() => tabEvents.filter((e) => e.start < 0), [tabEvents]);
  const { slots, slotIndex, gapBefore } = useMemo(() => buildSlots(visibleEvents), [visibleEvents]);
  const slotCount = slots.length;

  const openGroup = (ev: TeacherEvent) => {
    if (ev.groupId) navigate(`/groups/${ev.groupId}`);
  };
  const roomLabel = (room: string) => room || t("teacherDashboard.schedule.noRoom");
  const tooltipFor = (ev: TeacherEvent) =>
    [ev.groupName, ev.courseName, formatSlot(Math.max(ev.start, 0)), ev.dateRange].filter(Boolean).join(" · ");

  const tabs: ScheduleTab[] = ["odd", "even", "other"];
  const showGrid = !scheduleLoading && !scheduleError && slotCount > 0;

  const toggleBtn = (value: ScheduleOrientation, Icon: typeof MdViewStream, label: string, title: string) => (
    <button
      onClick={() => setOrientation(value)}
      title={title}
      style={{
        background: orientation === value ? "var(--color-accent-surface)" : "transparent",
        border: orientation === value ? "1px solid #f97316" : "1px solid var(--color-border)",
        borderRadius: 8, padding: "4px 10px",
        cursor: "pointer", display: "flex", alignItems: "center", gap: 4,
        color: orientation === value ? "#f97316" : "var(--color-text-muted)",
        fontSize: 12, fontWeight: 600, transition: "all 0.15s",
      }}
    >
      <Icon size={16} />
      {label}
    </button>
  );

  return (
    <Box sx={{ minHeight: "100vh", backgroundColor: "var(--color-bg-page)", pt: 3, px: { xs: 2, md: 4 }, pb: 6 }}>
      {/* ── Stats ── */}
      <Box sx={{
        display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 1.5, mb: statsError ? 1 : 3,
        "@media(max-width:760px)": { gridTemplateColumns: "1fr" },
      }}>
        <StatCard
          icon={<TbCalendarEvent />} label={t("teacherDashboard.stats.todayLessons")}
          value={statsError ? null : stats?.todayLessonsCount ?? 0} loading={statsLoading}
        />
        <StatCard
          icon={<TbUsers />} label={t("teacherDashboard.stats.totalStudents")}
          value={statsError ? null : stats?.totalStudentsCount ?? 0} loading={statsLoading}
        />
        <StatCard
          icon={<TbUsersGroup />} label={t("teacherDashboard.stats.activeGroups")}
          value={statsError ? null : stats?.activeGroupsCount ?? 0} loading={statsLoading}
          onClick={() => navigate("/groups")}
        />
      </Box>
      {statsError && (
        <Typography sx={{ color: "var(--color-danger)", fontSize: 13, mb: 3 }}>
          {t("teacherDashboard.statsError")}
        </Typography>
      )}

      {/* ── Schedule ── */}
      <Paper elevation={0} sx={{
        borderRadius: "16px", border: "1px solid var(--color-border)",
        background: "var(--color-surface)", overflow: "hidden",
      }}>
        <Box sx={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          px: { xs: 1.5, md: 3 }, py: 1.5, borderBottom: "1px solid var(--color-border)",
          flexWrap: "wrap", gap: 1,
        }}>
          <Box sx={{ display: "flex", alignItems: "center" }}>
            {tabs.map((value) => (
              <button
                key={value}
                onClick={() => setTab(value)}
                style={{
                  background: "none", border: "none", cursor: "pointer", padding: "6px 14px",
                  fontSize: 13, fontWeight: 600,
                  color: tab === value ? "#f97316" : "var(--color-text-muted)",
                  borderBottom: tab === value ? "2px solid #f97316" : "2px solid transparent",
                  transition: "all 0.15s",
                }}
              >
                {t(`teacherDashboard.schedule.tabs.${value}`)}
              </button>
            ))}
          </Box>

          <Typography sx={{ fontWeight: 700, fontSize: 15, color: "var(--color-text-primary)" }}>
            {t("teacherDashboard.schedule.title")}
          </Typography>

          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            {toggleBtn("horizontal", MdViewStream, t("teacherDashboard.schedule.horizontal"), t("teacherDashboard.schedule.horizontalTitle"))}
            {toggleBtn("vertical", MdViewColumn, t("teacherDashboard.schedule.vertical"), t("teacherDashboard.schedule.verticalTitle"))}
          </Box>
        </Box>

        {scheduleLoading && (
          <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}><CircularProgress size={28} /></Box>
        )}

        {!scheduleLoading && scheduleError && (
          <Box sx={{ py: 6, textAlign: "center" }}>
            <Typography sx={{ color: "var(--color-danger)", fontSize: 13, mb: 1.5 }}>
              {t("teacherDashboard.schedule.loadError")}
            </Typography>
            <Button size="small" variant="outlined" onClick={() => refetchSchedule()} sx={{ textTransform: "none" }}>
              {t("teacherDashboard.schedule.retry")}
            </Button>
          </Box>
        )}

        {/* ── HORIZONTAL ── */}
        {showGrid && orientation === "horizontal" && (
          <Box sx={{ overflowX: "auto" }}>
            <Box sx={{ minWidth: ROOM_COL_W + slotCount * SLOT_W }}>
              <Box sx={{
                display: "grid", gridTemplateColumns: `${ROOM_COL_W}px 1fr`,
                borderBottom: "1px solid var(--color-border)", background: "var(--color-surface-alt)",
              }}>
                <Box sx={{ borderRight: "1px solid var(--color-border)", py: 1 }} />
                <Box sx={{ display: "grid", gridTemplateColumns: `repeat(${slotCount}, 1fr)` }}>
                  {slots.map((m, i) => {
                    const isHourMark = m % 60 === 0;
                    return (
                      <Box key={m} sx={{
                        py: 1.25, textAlign: "center",
                        borderLeft: gapBefore[i] ? DIVIDER_HEAVY : i > 0 ? DIVIDER_LIGHT : "none",
                      }}>
                        <Typography sx={{
                          fontSize: 14, whiteSpace: "nowrap", fontWeight: isHourMark ? 800 : 500,
                          color: isHourMark ? "var(--color-text-primary)" : "var(--color-text-muted)",
                        }}>
                          {formatSlot(m)}
                        </Typography>
                      </Box>
                    );
                  })}
                </Box>
              </Box>

              {rooms.map((room) => {
                const roomEvents = visibleEvents.filter((e) => e.room === room);
                return (
                  <Box key={room || "__none"} sx={{
                    display: "grid", gridTemplateColumns: `${ROOM_COL_W}px 1fr`,
                    borderBottom: "1px solid var(--color-border-subtle)", minHeight: 128,
                    "&:hover": { background: "var(--color-surface-hover)" },
                  }}>
                    <Box sx={{ px: 2, display: "flex", alignItems: "center", borderRight: "1px solid var(--color-border)" }}>
                      <Typography sx={{ fontSize: 15, fontWeight: 700, color: "var(--color-text-primary)", wordBreak: "break-word" }}>
                        {roomLabel(room)}
                      </Typography>
                    </Box>
                    <Box sx={{ position: "relative", minHeight: 128 }}>
                      {slots.map((m, i) => i > 0 && (
                        <Box key={m} sx={{
                          position: "absolute", left: `${(i / slotCount) * 100}%`, top: 0, bottom: 0,
                          borderLeft: gapBefore[i] ? DIVIDER_HEAVY : DIVIDER_LIGHT,
                        }} />
                      ))}
                      {roomEvents.map((ev) => {
                        const { pos, len } = slotSpan(ev, slotIndex);
                        return (
                          <Tooltip key={ev.key} title={tooltipFor(ev)} placement="top" arrow>
                            <Box
                              onClick={() => openGroup(ev)}
                              sx={{
                                ...eventBoxSx(ev.color),
                                left: `calc(${(pos / slotCount) * 100}% + 3px)`,
                                width: `calc(${(len / slotCount) * 100}% - 6px)`,
                                top: 8, bottom: 8, px: 1.5, py: 1, gap: 0.4,
                              }}
                            >
                              <LessonCard ev={ev} orientation="horizontal" />
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

        {/* ── VERTICAL ── */}
        {showGrid && orientation === "vertical" && (
          <Box sx={{ overflowX: "auto" }}>
            <Box sx={{ minWidth: TIME_COL_W + rooms.length * VERTICAL_ROOM_MIN_W }}>
              <Box sx={{
                display: "grid",
                gridTemplateColumns: `${TIME_COL_W}px repeat(${rooms.length}, minmax(${VERTICAL_ROOM_MIN_W}px, 1fr))`,
                borderBottom: "1px solid var(--color-border)", background: "var(--color-surface-alt)",
              }}>
                <Box sx={{ borderRight: "1px solid var(--color-border)", py: 1 }} />
                {rooms.map((r) => (
                  <Box key={r || "__none"} sx={{ py: 1.25, px: 1, borderRight: "1px solid var(--color-border)", textAlign: "center" }}>
                    <Typography sx={{ fontSize: 15, fontWeight: 700, color: "var(--color-text-primary)" }}>{roomLabel(r)}</Typography>
                  </Box>
                ))}
              </Box>

              <Box sx={{
                display: "grid",
                gridTemplateColumns: `${TIME_COL_W}px repeat(${rooms.length}, minmax(${VERTICAL_ROOM_MIN_W}px, 1fr))`,
              }}>
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

                {rooms.map((room) => {
                  const roomEvents = visibleEvents.filter((e) => e.room === room);
                  return (
                    <Box key={room || "__none"} sx={{
                      position: "relative", height: slotCount * SLOT_H, borderRight: "1px solid var(--color-border)",
                    }}>
                      {slots.map((m, i) => i > 0 && (
                        <Box key={m} sx={{
                          position: "absolute", left: 0, right: 0, top: i * SLOT_H,
                          borderTop: gapBefore[i] ? DIVIDER_HEAVY : "1px solid var(--color-border-subtle)",
                        }} />
                      ))}
                      {roomEvents.map((ev) => {
                        const { pos, len } = slotSpan(ev, slotIndex);
                        return (
                          <Tooltip key={ev.key} title={tooltipFor(ev)} placement="top" arrow>
                            <Box
                              onClick={() => openGroup(ev)}
                              sx={{
                                ...eventBoxSx(ev.color),
                                left: 4, right: 4, top: pos * SLOT_H + 3, height: len * SLOT_H - 6,
                                px: 1.25, py: 0.75, gap: 0.3,
                              }}
                            >
                              <LessonCard ev={ev} orientation="vertical" />
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
            <span>{t("teacherDashboard.schedule.noTime")}:</span>
            {unscheduledEvents.map((ev) => (
              <span
                key={ev.key}
                onClick={() => openGroup(ev)}
                style={{ cursor: "pointer", color: "var(--color-primary)", fontWeight: 600 }}
              >
                {ev.groupName}
              </span>
            ))}
          </Box>
        )}

        {!scheduleLoading && !scheduleError && tabEvents.length === 0 && (
          <Box sx={{ py: 6, textAlign: "center" }}>
            <Typography sx={{ color: "var(--color-text-muted)", fontSize: 14 }}>
              {t("teacherDashboard.schedule.empty")}
            </Typography>
          </Box>
        )}
      </Paper>
    </Box>
  );
};

export default TeacherDashboard;
