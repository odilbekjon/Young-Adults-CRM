import { memo, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Box, Paper, Typography, Tooltip, CircularProgress } from "@mui/material";
import { MdViewColumn, MdViewStream } from "react-icons/md";

import { ScheduleTab, ScheduleOrientation, ScheduleEvent } from "../../types/dashboardTypes";
import { SCHEDULE_TIME_START, SCHEDULE_TIME_END } from "../../constants/DashboardData";

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

interface ScheduleCardProps {
  events: ScheduleEvent[];
  loading: boolean;
  error: boolean;
  containerRef: (el: HTMLElement | null) => void;
}

// The schedule owns its tab / orientation state and is memoised: switching them
// re-renders only this card, and the Dashboard's other queries arriving don't
// redraw the grid.
export const ScheduleCard = memo(({ events, loading: scheduleLoading, error: scheduleError, containerRef: scheduleRef }: ScheduleCardProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [tab,         setTab        ] = useState<ScheduleTab>("odd");
  const [orientation, setOrientation] = useState<ScheduleOrientation>("horizontal");

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

  const tabLabel: Record<ScheduleTab, string> = {
    odd: t("dashboard.schedule.tabs.odd"),
    even: t("dashboard.schedule.tabs.even"),
    other: t("dashboard.schedule.tabs.other"),
  };
  const tabs: ScheduleTab[] = ["odd", "even", "other"];

  return (
    <Paper ref={scheduleRef} elevation={0} sx={{
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
  );
});
