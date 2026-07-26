import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Box, Paper, Typography, Tooltip } from "@mui/material";
import {
  LineChart, Line, XAxis, YAxis, Tooltip as RTooltip,
  CartesianGrid, ResponsiveContainer, ReferenceDot,
} from "recharts";
import {
  FiUsers, FiUserCheck, FiLayers, FiAlertTriangle,
  FiPlayCircle, FiDollarSign, FiUserMinus, FiUserX,
} from "react-icons/fi";
import { MdViewColumn, MdViewStream } from "react-icons/md";

import { ScheduleTab, ScheduleOrientation } from "../../types/dashboardTypes";
import { EVENTS, ROOMS } from "../../constants/ScheduleDashboard";

// ─── Monthly revenue data ──────────────────────────────────────────────────────
// This is independent from the schedule tabs below (Odd/Even/Other days only
// filter the schedule, they never change what the chart shows).

const MONTHLY_REVENUE: { month: string; value: number }[] = [
  { month: "Sep 23", value: 5000000 },   { month: "Oct 23", value: 8000000 },
  { month: "Dec 23", value: 15000000 },  { month: "Jan 24", value: 25000000 },
  { month: "Feb 24", value: 38000000 },  { month: "Mar 24", value: 55000000 },
  { month: "Apr 24", value: 70000000 },  { month: "May 24", value: 65000000 },
  { month: "Jun 24", value: 72000000 },  { month: "Jul 24", value: 78000000 },
  { month: "Aug 24", value: 80000000 },  { month: "Sep 24", value: 82000000 },
  { month: "Oct 24", value: 86000000 },  { month: "Nov 24", value: 90000000 },
  { month: "Dec 24", value: 88000000 },  { month: "Jan 25", value: 92000000 },
  { month: "Feb 25", value: 95000000 },  { month: "Mar 25", value: 110000000 },
  { month: "Apr 25", value: 148000000 }, { month: "May 25", value: 105000000 },
  { month: "Jun 25", value: 108000000 }, { month: "Jul 25", value: 112000000 },
  { month: "Aug 25", value: 115000000 }, { month: "Sep 25", value: 120000000 },
  { month: "Oct 25", value: 125000000 }, { month: "Nov 25", value: 128000000 },
  { month: "Dec 25", value: 130000000 }, { month: "Jan 26", value: 135000000 },
  { month: "Feb 26", value: 140000000 }, { month: "Mar 26", value: 142000000 },
  { month: "Apr 26", value: 145000000 }, { month: "May 26", value: 138000000 },
];

// Peak point for the chart's ReferenceDot — computed from the data itself,
// so it always matches whichever month actually has the highest value.
const PEAK_POINT = MONTHLY_REVENUE.reduce(
  (max, point) => (point.value > max.value ? point : max),
  MONTHLY_REVENUE[0],
);

// ─── Stat card config ─────────────────────────────────────────────────────────

const STATS = [
  { key: "leads",        label: "Active leads",            value: 1,   route: "/leads",    icon: <FiUsers size={35} /> },
  { key: "students",     label: "Active students",         value: 26, route: "/students", icon: <FiUserCheck size={35} /> },
  { key: "groups",       label: "Groups",                  value: 6,  route: "/groups",   icon: <FiLayers size={35} /> },
  { key: "debtors",      label: "Debtors",                 value: 6, route: "/students", filter: "debt", icon: <FiAlertTriangle size={35} /> },
  { key: "trial",        label: "In a trial lesson",       value: 2,  route: "/students", filter: "trial", icon: <FiPlayCircle size={35} /> },
  { key: "paid",         label: "Paid during the month",   value: 4, route: "/payments", icon: <FiDollarSign size={35} /> },
  { key: "leftActive",   label: "Left active group",       value: 1, route: "/students", filter: "left_active", icon: <FiUserMinus size={35} /> },
  { key: "leftTrial",    label: "Left after trial period", value: 0,   route: "/students", filter: "left_trial", icon: <FiUserX size={40} /> },
];

// ─── Time helpers ─────────────────────────────────────────────────────────────

const TIME_START = 8 * 60;
const TIME_END   = 18 * 60 + 30;
const TOTAL_MINS = TIME_END - TIME_START;

const TIME_LABELS: string[] = [];
for (let m = TIME_START; m <= TIME_END; m += 30) {
  const h   = Math.floor(m / 60).toString().padStart(2, "0");
  const min = (m % 60).toString().padStart(2, "0");
  TIME_LABELS.push(`${h}:${min}`);
}

const pct = (mins: number) =>
  `${((mins / TOTAL_MINS) * 100).toFixed(3)}%`;

const formatChartValue = (value: number) => {
  if (value >= 1000000000) return `${(value / 1000000000).toFixed(1)}B UZS`;
  if (value >= 1000000) return `${(value / 1000000).toFixed(0)} 000 000 UZS`;
  return `${new Intl.NumberFormat("uz-UZ").format(value)} UZS`;
};

// ─── Custom chart tooltip ─────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <Box sx={{
      background: "#fff", border: "1px solid #e5e7eb",
      borderRadius: 2, px: 2.2, py: 1.6,
      boxShadow: "0 6px 24px rgba(0,0,0,0.12)",
    }}>
      <Typography sx={{ fontSize: 12, color: "#6b7280", fontWeight: 700 }}>{label}</Typography>
      <Typography sx={{ fontSize: 15, fontWeight: 800, color: "#f97316", mt: 0.3 }}>
        {formatChartValue(payload[0].value)}
      </Typography>
    </Box>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

export const Dashboard = () => {
  const navigate = useNavigate();
  const [tab,         setTab        ] = useState<ScheduleTab>("odd");
  const [orientation, setOrientation] = useState<ScheduleOrientation>("horizontal");

  // Filtered events for current tab — this only affects the schedule below,
  // the revenue chart above is intentionally independent of it.
  const visibleEvents = useMemo(
    () => EVENTS.filter((e) => e.days.includes(tab)),
    [tab],
  );

  // Navigate stat card → page (with optional ?filter=xxx)
  const goTo = (route: string, filter?: string) => {
    const url = filter ? `${route}?filter=${filter}` : route;
    navigate(url);
  };

  const tabLabel: Record<ScheduleTab, string> = {
    odd: "Odd days", even: "Even days", other: "Other",
  };
  const tabs: ScheduleTab[] = ["odd", "even", "other"];

  return (
    <Box sx={{
      minHeight: "100vh",
      backgroundColor: "#f8fafc",
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
        {STATS.map(({ key, label, value, route, filter, icon }) => (
          <Tooltip key={key} title={`${label} sahifasiga o'tish`} placement="top" arrow>
            <Paper
              elevation={0}
              onClick={() => goTo(route, filter)}
              sx={{
                px: 1.5, py: 2,
                borderRadius: "12px",
                border: "1px solid #f0f0f0",
                background: "#fff",
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
                fontSize: 15, color: "#6b7280", lineHeight: 1.3,
                 minHeight: 32, display: "flex",
                alignItems: "center", justifyContent: "center",
              }}>
                {label}
              </Typography>
              <Typography sx={{ fontSize: 32,  color: "#022081", lineHeight: 1 }}>
                {value}
              </Typography>
            </Paper>
          </Tooltip>
        ))}
      </Box>

      {/* ═══════════════════════════════════════════════════════════════
          CHART — monthly revenue, always the same regardless of which
          schedule tab (Odd/Even/Other) is selected below
      ════════════════════════════════════════════════════════════════ */}
      <Paper elevation={0} sx={{
        borderRadius: "16px", border: "1px solid #f0f0f0",
        p: 3, mb: 3, background: "#fff",
      }}>
        <Box height={230}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={MONTHLY_REVENUE} margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 11, fill: "#6b7280" }}
                axisLine={false} tickLine={false}
                interval={0}
              />
              <YAxis
                tick={{ fontSize: 12, fill: "#6b7280" }}
                axisLine={false} tickLine={false}
                tickFormatter={(v) => formatChartValue(v as number)}
                width={130}
              />
              <RTooltip content={<ChartTooltip />} />
              <Line
                type="monotone" dataKey="value"
                stroke="#f97316" strokeWidth={2.5}
                dot={{ r: 4, fill: "#fff", stroke: "#f97316", strokeWidth: 2 }}
                activeDot={{ r: 6, fill: "#f97316" }}
                isAnimationActive
              />
              <ReferenceDot
                x={PEAK_POINT.month}
                y={PEAK_POINT.value}
                r={5} fill="#f97316" stroke="#fff" strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </Box>
      </Paper>

      {/* ═══════════════════════════════════════════════════════════════
          SCHEDULE
      ════════════════════════════════════════════════════════════════ */}
      <Paper elevation={0} sx={{
        borderRadius: "16px", border: "1px solid #f0f0f0",
        background: "#fff", overflow: "hidden",
      }}>

        {/* Schedule header */}
        <Box sx={{
          display: "flex", alignItems: "center",
          justifyContent: "space-between",
          px: 3, py: 1.5,
          borderBottom: "1px solid #f3f4f6",
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
                  color: tab === t ? "#f97316" : "#9ca3af",
                  borderBottom: tab === t ? "2px solid #f97316" : "2px solid transparent",
                  transition: "all 0.15s",
                }}
              >
                {tabLabel[t]}
              </button>
            ))}
          </Box>

          {/* Title */}
          <Typography sx={{ fontWeight: 700, fontSize: 15, color: "#111827" }}>
            Schedule
          </Typography>

          {/* Orientation toggle */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <button
              onClick={() => setOrientation("horizontal")}
              title="Gorizontal ko'rinish"
              style={{
                background: orientation === "horizontal" ? "#fff7ed" : "transparent",
                border: orientation === "horizontal" ? "1px solid #f97316" : "1px solid #e5e7eb",
                borderRadius: 8, padding: "4px 10px",
                cursor: "pointer", display: "flex", alignItems: "center", gap: 4,
                color: orientation === "horizontal" ? "#f97316" : "#9ca3af",
                fontSize: 12, fontWeight: 600, transition: "all 0.15s",
              }}
            >
              <MdViewStream size={16} />
              Horizontal
            </button>
            <button
              onClick={() => setOrientation("vertical")}
              title="Vertikal ko'rinish"
              style={{
                background: orientation === "vertical" ? "#fff7ed" : "transparent",
                border: orientation === "vertical" ? "1px solid #f97316" : "1px solid #e5e7eb",
                borderRadius: 8, padding: "4px 10px",
                cursor: "pointer", display: "flex", alignItems: "center", gap: 4,
                color: orientation === "vertical" ? "#f97316" : "#9ca3af",
                fontSize: 12, fontWeight: 600, transition: "all 0.15s",
              }}
            >
              <MdViewColumn size={16} />
              Vertical
            </button>
          </Box>
        </Box>

        {/* ── HORIZONTAL layout ── */}
        {orientation === "horizontal" && (
          <Box sx={{ overflowX: "auto" }}>
            <Box sx={{ minWidth: 1100 }}>

              {/* Time header row */}
              <Box sx={{
                display: "grid",
                gridTemplateColumns: "110px 1fr",
                borderBottom: "1px solid #f3f4f6",
                background: "#fafafa",
              }}>
                <Box sx={{ borderRight: "1px solid #f3f4f6", py: 1 }} />
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
                        color: (t === "10:30" || t === "11:00") ? "#f97316" : "#9ca3af",
                      }}
                    >
                      {t}
                    </Typography>
                  ))}
                </Box>
              </Box>

              {/* Room rows */}
              {ROOMS.map((room: string) => {
                const roomEvents = visibleEvents.filter((e: { room: string }) => e.room === room);
                return (
                  <Box
                    key={room}
                    sx={{
                      display: "grid",
                      gridTemplateColumns: "110px 1fr",
                      borderBottom: "1px solid #f9fafb",
                      minHeight: 68,
                      "&:hover": { background: "#fffbf7" },
                    }}
                  >
                    <Box sx={{
                      px: 2, display: "flex", alignItems: "center",
                      borderRight: "1px solid #f3f4f6",
                    }}>
                      <Typography sx={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>
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
                          borderLeft: "1px solid #f3f4f6",
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
                                    color: "#fff", lineHeight: 1.5,
                                  }}>
                                    {ev.tag}
                                  </Box>
                                )}
                                <Typography sx={{ fontSize: 10, fontWeight: 700, color: "#fff", lineHeight: 1.3 }}>
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
                                      px: 0.6, fontSize: 9, color: "#fff", fontWeight: 700,
                                    }}>
                                      {ev.students ?? 0} st./{ev.maxStudents}
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
        {orientation === "vertical" && (
          <Box sx={{ overflowX: "auto" }}>
            <Box sx={{ minWidth: 900 }}>
              {/* Column headers = rooms */}
              <Box sx={{
                display: "grid",
                gridTemplateColumns: `80px repeat(${ROOMS.length}, 1fr)`,
                borderBottom: "1px solid #f3f4f6",
                background: "#fafafa",
                position: "sticky", top: 0, zIndex: 2,
              }}>
                <Box sx={{ borderRight: "1px solid #f3f4f6", py: 1 }} />
                {ROOMS.map((r: string) => (
                  <Box key={r} sx={{
                    py: 1, px: 1,
                    borderRight: "1px solid #f3f4f6",
                    textAlign: "center",
                  }}>
                    <Typography sx={{ fontSize: 11, fontWeight: 700, color: "#374151" }}>{r}</Typography>
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
                      gridTemplateColumns: `80px repeat(${ROOMS.length}, 1fr)`,
                      borderBottom: "1px solid #f9fafb",
                      minHeight: 48,
                    }}
                  >
                    {/* Time label */}
                    <Box sx={{
                      px: 1.5,
                      display: "flex", alignItems: "flex-start", pt: 1,
                      borderRight: "1px solid #f3f4f6",
                    }}>
                      <Typography sx={{
                        fontSize: 10, fontWeight: 500,
                        color: (timeLabel === "10:30" || timeLabel === "11:00") ? "#f97316" : "#9ca3af",
                        whiteSpace: "nowrap",
                      }}>
                        {timeLabel}
                      </Typography>
                    </Box>

                    {/* Room cells */}
                    {ROOMS.map((room ) => {
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
                            borderRight: "1px solid #f3f4f6",
                            p: 0.5, minHeight: 48,
                            background: tIdx % 2 === 0 ? "#fff" : "#fafafa",
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
                                    fontSize: 8, fontWeight: 700, color: "#fff",
                                  }}>
                                    {ev.tag}
                                  </Box>
                                )}
                                <Typography sx={{ fontSize: 9, fontWeight: 700, color: "#fff", lineHeight: 1.3 }}>
                                  {ev.groupName}
                                </Typography>
                                <Typography sx={{ fontSize: 8, color: "rgba(255,255,255,0.85)", lineHeight: 1.2 }}>
                                  {ev.courseName}
                                </Typography>
                                {ev.students > 0 && (
                                  <Typography sx={{ fontSize: 8, color: "rgba(255,255,255,0.8)", mt: 0.25 }}>
                                    {ev.students}/{ev.maxStudents} st.
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
        {visibleEvents.length === 0 && (
          <Box sx={{ py: 6, textAlign: "center" }}>
            <Typography sx={{ color: "#9ca3af", fontSize: 14 }}>
              Bu kun turi uchun jadval mavjud emas
            </Typography>
          </Box>
        )}
      </Paper>
    </Box>
  );
};

export default Dashboard;