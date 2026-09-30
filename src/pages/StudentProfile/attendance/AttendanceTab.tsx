// Student profile → "Attendance" tab (reference: Calendar / List views with
// Was / Not / Not attended stat cards).
//
// Data sources:
//  - lesson days + the student's own marks for the selected group(s) and
//    month: attendancesApi's `studentMonthAttendance` (built on the existing
//    GET /attendances/group/{id}/dates + GET /attendances/group/{id});
//  - overall all-time stats across every group: GET
//    /students/{id}/attendance-report (studentsApi).
import { useMemo, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import {
  Box, Button, Checkbox, CircularProgress, FormControl, FormControlLabel, IconButton,
  MenuItem, Select, Tooltip, Typography,
} from "@mui/material";
import { FiChevronLeft, FiChevronRight, FiRefreshCw } from "react-icons/fi";
import { useTranslation } from "react-i18next";

import { useStudentMonthAttendanceQuery } from "../../../app/api/attendancesApi";
import type { StudentAttendanceDay } from "../../../app/api/attendancesApi/types";
import { useStudentAttendanceReportQuery } from "../../../app/api/studentsApi";
import type { StudentGroupMembership } from "../../../app/api/studentsApi/types";
import type { Group } from "../../../app/api/groupsApi/types";

/* ─── helpers ─────────────────────────────────────────── */
type Kind = "was" | "not" | "notAttended" | "upcoming";
type ViewMode = "calendar" | "list";

const pad2 = (n: number) => String(n).padStart(2, "0");
const isoOf = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

// "YYYY-MM-DD" -> "DD.MM.YYYY" without going through Date (a malformed value
// is returned as-is instead of "Invalid Date"/throwing).
const formatDMY = (iso: string) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso ?? "");
  return m ? `${m[3]}.${m[2]}.${m[1]}` : iso || "—";
};

// Calendar-month key for a membership date field ("2026-09-01T..." or
// "2026-09-01"); null when missing/unparseable.
const dayOf = (raw: string | null | undefined): string | null => {
  const m = /^(\d{4}-\d{2}-\d{2})/.exec(raw ?? "");
  return m ? m[1] : null;
};

const kindOf = (day: StudentAttendanceDay, todayIso: string): Kind => {
  if (day.status === "PRESENT") return "was";
  if (day.status === "ABSENT") return "not";
  if (day.status === "EXCUSED") return "notAttended";
  // Scheduled lesson with no mark: "not attended" only once the day is over
  // (today's lesson may simply not be marked yet).
  return day.date < todayIso ? "notAttended" : "upcoming";
};

// Theme-aware tones — every color goes through the app's CSS variables
// (index.css :root / html.dark) with light-theme fallbacks.
const tone = (kind: Kind) => {
  switch (kind) {
    case "was":
      return {
        fg: "var(--color-success-text, #0f6e56)",
        bg: "color-mix(in srgb, var(--color-success, #22c55e) 18%, var(--color-surface, #fff))",
        border: "color-mix(in srgb, var(--color-success, #22c55e) 45%, var(--color-surface, #fff))",
        solid: "var(--color-success, #22c55e)",
      };
    case "not":
      return {
        fg: "var(--color-danger, #e53935)",
        bg: "color-mix(in srgb, var(--color-danger, #e53935) 14%, var(--color-surface, #fff))",
        border: "color-mix(in srgb, var(--color-danger, #e53935) 40%, var(--color-surface, #fff))",
        solid: "var(--color-danger, #e53935)",
      };
    case "notAttended":
      return {
        fg: "var(--color-text-secondary, #6b7a8d)",
        bg: "var(--color-surface-alt, #f5f6f8)",
        border: "var(--color-border, #e0e5ec)",
        solid: "var(--color-text-muted, #9ca3af)",
      };
    default:
      return {
        fg: "var(--color-text-muted, #9ca3af)",
        bg: "var(--color-surface, #fff)",
        border: "var(--color-border, #e0e5ec)",
        solid: "var(--color-border, #e0e5ec)",
      };
  }
};

const WEEKDAY_KEYS = ["mo", "tu", "we", "th", "fr", "sa", "su"] as const;

interface Props {
  studentId: string;
  memberships: StudentGroupMembership[];
  membershipsLoading?: boolean;
  // Group records from GET /groups (already loaded by StudentProfile) — used
  // only to show the lesson time.
  groupsById?: Map<string, Group>;
}

interface Row {
  key: string;
  day: StudentAttendanceDay;
  kind: Kind;
  groupName: string;
  courseName: string | null;
  time: string | null;
}

/* ─── small UI pieces ─────────────────────────────────── */
const StatCard = ({
  kind, label, value, footer,
}: { kind: Kind; label: string; value: ReactNode; footer?: ReactNode }) => {
  const c = tone(kind);
  return (
    <Box
      sx={{
        borderRadius: "12px",
        p: "12px 16px",
        background: c.bg,
        border: `1px solid ${c.border}`,
        minWidth: 0,
      }}
    >
      <Typography sx={{ fontSize: 13, color: c.fg, fontWeight: 500 }}>{label}</Typography>
      <Typography sx={{ fontSize: 26, lineHeight: 1.2, fontWeight: 700, color: c.fg }}>{value}</Typography>
      {footer}
    </Box>
  );
};

const StatusBadge = ({ kind, label }: { kind: Kind; label: string }) => {
  const c = tone(kind);
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 10px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 600,
        color: c.fg,
        background: c.bg,
        border: `1px solid ${c.border}`,
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </span>
  );
};

/* ─── main component ──────────────────────────────────── */
export const AttendanceTab = ({ studentId, memberships, membershipsLoading, groupsById }: Props) => {
  const { t } = useTranslation();

  const now = new Date();
  const todayIso = isoOf(now);
  const [cursor, setCursor] = useState({ year: now.getFullYear(), month: now.getMonth() });
  const [view, setView] = useState<ViewMode>("calendar");
  const [showAll, setShowAll] = useState(false);
  const [pickedGroupId, setPickedGroupId] = useState("");

  const monthStr = `${cursor.year}-${pad2(cursor.month + 1)}`;

  // Default group: first ACTIVE membership, else the first one.
  const defaultGroupId = (memberships.find((m) => m.status === "ACTIVE") ?? memberships[0])?.id ?? "";
  const selectedGroupId = memberships.some((m) => m.id === pickedGroupId) ? pickedGroupId : defaultGroupId;
  const groupIds = showAll ? memberships.map((m) => m.id) : selectedGroupId ? [selectedGroupId] : [];

  const membershipById = useMemo(() => {
    const map = new Map<string, StudentGroupMembership>();
    memberships.forEach((m) => map.set(m.id, m));
    return map;
  }, [memberships]);

  const { data, isFetching, isError, refetch } = useStudentMonthAttendanceQuery(
    { studentId, groupIds, month: monthStr },
    { skip: !studentId || groupIds.length === 0 }
  );
  const { data: overall } = useStudentAttendanceReportQuery(studentId, { skip: !studentId });

  const rows: Row[] = useMemo(() => {
    const out: Row[] = [];
    (data ?? []).forEach((day, i) => {
      const m = membershipById.get(day.groupId);
      // Ignore unmarked lessons outside the period the student was actually
      // in the group (before joining / after leaving).
      const joined = dayOf(m?.joinedAt);
      const exited = dayOf(m?.exitedAt);
      if (!day.status && ((joined && day.date < joined) || (exited && day.date > exited))) return;
      out.push({
        key: `${day.groupId}-${day.date}-${i}`,
        day,
        kind: kindOf(day, todayIso),
        groupName: m?.name ?? "",
        courseName: m?.courseName ?? null,
        time: groupsById?.get(day.groupId)?.time ?? null,
      });
    });
    return out;
  }, [data, membershipById, groupsById, todayIso]);

  const counts = useMemo(() => {
    const c = { was: 0, not: 0, notAttended: 0 };
    rows.forEach((r) => {
      if (r.kind === "was") c.was += 1;
      else if (r.kind === "not") c.not += 1;
      else if (r.kind === "notAttended") c.notAttended += 1;
    });
    const total = c.was + c.not + c.notAttended;
    return { ...c, total, rate: total > 0 ? Math.round((c.was / total) * 100) : null };
  }, [rows]);

  const rowsByDate = useMemo(() => {
    const map = new Map<string, Row[]>();
    rows.forEach((r) => {
      const list = map.get(r.day.date) ?? [];
      list.push(r);
      map.set(r.day.date, list);
    });
    return map;
  }, [rows]);

  const kindLabel = (k: Kind, r?: Row) =>
    k === "was" ? t("studentAttendance.was", "Was")
    : k === "not" ? t("studentAttendance.not", "Not")
    : k === "notAttended"
      ? r?.day.status === "EXCUSED" ? t("studentAttendance.excused", "Excused") : t("studentAttendance.notAttended", "Not attended")
    : t("studentAttendance.upcoming", "Upcoming");

  /* month navigation */
  const shiftMonth = (delta: number) =>
    setCursor((c) => {
      const d = new Date(c.year, c.month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  const monthLabel = (() => {
    let name = t(`studentAttendance.months.${cursor.month}`, { defaultValue: "" });
    if (!name) {
      try {
        name = new Date(cursor.year, cursor.month, 1).toLocaleString("en", { month: "long" });
      } catch {
        name = pad2(cursor.month + 1);
      }
    }
    return `${name} ${cursor.year}`;
  })();

  /* calendar grid (Mo–Su) */
  const cells = useMemo(() => {
    const first = new Date(cursor.year, cursor.month, 1);
    const offset = (first.getDay() + 6) % 7;
    const daysInMonth = new Date(cursor.year, cursor.month + 1, 0).getDate();
    const list: (number | null)[] = Array(offset).fill(null);
    for (let d = 1; d <= daysInMonth; d++) list.push(d);
    while (list.length % 7 !== 0) list.push(null);
    return list;
  }, [cursor]);

  if (membershipsLoading && memberships.length === 0) {
    return (
      <Box sx={{ py: 5, display: "flex", justifyContent: "center" }}>
        <CircularProgress size={24} />
      </Box>
    );
  }
  if (memberships.length === 0) {
    return (
      <Box sx={{ py: 5, textAlign: "center", fontSize: 14, color: "var(--color-text-muted, #9ca3af)" }}>
        {t("studentAttendance.noGroups", "This student is not in any group yet")}
      </Box>
    );
  }

  const stats: { kind: Kind; label: string; value: ReactNode }[] = [
    { kind: "was", label: t("studentAttendance.was", "Was"), value: counts.was },
    { kind: "not", label: t("studentAttendance.not", "Not"), value: counts.not },
    { kind: "notAttended", label: t("studentAttendance.notAttended", "Not attended"), value: counts.notAttended },
  ];
  const rateTone = tone(counts.rate === null ? "notAttended" : "was");

  return (
    <Box sx={{ background: "var(--color-surface, #fff)", color: "var(--color-text-primary, #1a2332)", borderRadius: "12px" }}>
      {/* Toolbar: group select + month switch + refresh */}
      <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 1.5, mb: 2 }}>
        <FormControl size="small" sx={{ minWidth: 220, maxWidth: "100%", flex: "1 1 220px" }}>
          <Select
            value={showAll ? "__all__" : selectedGroupId}
            disabled={showAll}
            onChange={(e) => setPickedGroupId(String(e.target.value))}
            displayEmpty
            inputProps={{ "aria-label": t("studentAttendance.group", "Group") }}
            sx={{ fontSize: 14, background: "var(--color-surface, #fff)" }}
            MenuProps={{ PaperProps: { sx: { maxWidth: "calc(100vw - 32px)" } } }}
          >
            {showAll && <MenuItem value="__all__">{t("studentAttendance.allGroups", "All groups")}</MenuItem>}
            {memberships.map((m) => (
              <MenuItem key={m.id} value={m.id} sx={{ whiteSpace: "normal" }}>
                {m.courseName ? `${m.name} — ${m.courseName}` : m.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          <IconButton size="small" onClick={() => shiftMonth(-1)} aria-label={t("studentAttendance.prevMonth", "Previous month")}>
            <FiChevronLeft size={18} />
          </IconButton>
          <Typography sx={{ minWidth: 130, textAlign: "center", fontSize: 14, fontWeight: 600 }}>{monthLabel}</Typography>
          <IconButton size="small" onClick={() => shiftMonth(1)} aria-label={t("studentAttendance.nextMonth", "Next month")}>
            <FiChevronRight size={18} />
          </IconButton>
        </Box>

        <Button
          size="small"
          variant="outlined"
          onClick={() => refetch()}
          disabled={isFetching || groupIds.length === 0}
          startIcon={isFetching ? <CircularProgress size={14} /> : <FiRefreshCw size={14} />}
          sx={{ textTransform: "none", borderRadius: "8px" }}
        >
          {t("studentAttendance.refresh", "Refresh")}
        </Button>
      </Box>

      {/* Stat cards */}
      <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 1.5, mb: 1 }}>
        {stats.map((s) => (
          <StatCard key={s.kind} kind={s.kind} label={s.label} value={s.value} />
        ))}
        <StatCard
          kind={counts.rate === null ? "notAttended" : "was"}
          label={t("studentAttendance.rate", "Attendance rate")}
          value={counts.rate === null ? "—" : `${counts.rate}%`}
          footer={
            <Box sx={{ mt: 0.75, height: 6, borderRadius: 3, background: "color-mix(in srgb, var(--color-text-muted, #9ca3af) 30%, transparent)", overflow: "hidden" }}>
              <Box sx={{ width: `${counts.rate ?? 0}%`, height: "100%", background: rateTone.solid, transition: "width 0.2s" }} />
            </Box>
          }
        />
      </Box>

      {overall && overall.total > 0 && (
        <Typography sx={{ fontSize: 12, color: "var(--color-text-secondary, #6b7a8d)", mb: 2 }}>
          {t("studentAttendance.overall", "All groups, all time")}:{" "}
          {t("studentAttendance.was", "Was")} <strong>{overall.attended}</strong> ·{" "}
          {t("studentAttendance.excused", "Excused")} <strong>{overall.excused}</strong> ·{" "}
          {t("studentAttendance.absent", "Absent")} <strong>{overall.absent}</strong>
        </Typography>
      )}
      {!(overall && overall.total > 0) && <Box sx={{ mb: 1 }} />}

      {/* View toggle + "All" */}
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 1, mb: 2 }}>
        <Box
          role="tablist"
          sx={{
            display: "inline-flex",
            border: "1px solid var(--color-primary, #185fa5)",
            borderRadius: 999,
            overflow: "hidden",
          }}
        >
          {(["calendar", "list"] as ViewMode[]).map((v) => {
            const active = view === v;
            return (
              <Box
                key={v}
                component="button"
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setView(v)}
                sx={{
                  px: 2.5,
                  py: 0.75,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  border: 0,
                  background: active ? "var(--color-primary, #185fa5)" : "transparent",
                  color: active ? "#fff" : "var(--color-primary, #185fa5)",
                }}
              >
                {v === "calendar" ? t("studentAttendance.calendar", "Calendar") : t("studentAttendance.list", "List")}
              </Box>
            );
          })}
        </Box>
        <Tooltip title={t("studentAttendance.allHint", "Show lessons of all the student's groups")} arrow>
          <FormControlLabel
            sx={{ m: 0, "& .MuiFormControlLabel-label": { fontSize: 14 } }}
            control={<Checkbox size="small" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} sx={{ color: "var(--color-primary, #185fa5)", "&.Mui-checked": { color: "var(--color-primary, #185fa5)" } }} />}
            label={t("studentAttendance.all", "All")}
          />
        </Tooltip>
      </Box>

      {/* Body */}
      {isError ? (
        <Box sx={{ py: 4, textAlign: "center", fontSize: 14, color: "var(--color-danger, #e53935)" }}>
          {t("studentAttendance.loadError", "Failed to load attendance.")}{" "}
          <Button size="small" onClick={() => refetch()} sx={{ textTransform: "none" }}>
            {t("studentAttendance.retry", "Retry")}
          </Button>
        </Box>
      ) : isFetching && !data ? (
        <Box sx={{ py: 5, display: "flex", justifyContent: "center" }}>
          <CircularProgress size={24} />
        </Box>
      ) : view === "calendar" ? (
        <Box sx={{ overflowX: "auto", opacity: isFetching ? 0.6 : 1, transition: "opacity 0.15s" }}>
          <Box sx={{ minWidth: 560 }}>
            <Box sx={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: "6px", mb: "6px" }}>
              {WEEKDAY_KEYS.map((k) => (
                <Typography
                  key={k}
                  sx={{ fontSize: 12, fontWeight: 600, textAlign: "center", color: "var(--color-text-secondary, #6b7a8d)" }}
                >
                  {t(`studentAttendance.weekdays.${k}`, k[0].toUpperCase() + k[1])}
                </Typography>
              ))}
            </Box>
            <Box sx={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: "6px" }}>
              {cells.map((d, i) => {
                if (d === null) return <Box key={`e-${i}`} sx={{ minHeight: 84 }} />;
                const iso = `${monthStr}-${pad2(d)}`;
                const lessons = rowsByDate.get(iso) ?? [];
                const first = lessons[0];
                const c = tone(first?.kind ?? "upcoming");
                const isToday = iso === todayIso;
                return (
                  <Box
                    key={iso}
                    sx={{
                      minHeight: 84,
                      borderRadius: "8px",
                      p: "6px 8px",
                      minWidth: 0,
                      background: first ? c.bg : "var(--color-surface, #fff)",
                      border: `1px solid ${isToday ? "var(--color-primary, #185fa5)" : first ? c.border : "var(--color-border-subtle, #f0f0f0)"}`,
                      boxShadow: isToday ? "0 0 0 1px var(--color-primary, #185fa5)" : undefined,
                    }}
                  >
                    <Typography
                      sx={{ fontSize: 12, fontWeight: isToday ? 700 : 500, color: first ? c.fg : "var(--color-text-muted, #9ca3af)" }}
                    >
                      {d}
                    </Typography>
                    {lessons.slice(0, 2).map((r) => {
                      const rc = tone(r.kind);
                      const title = r.courseName ? `${r.groupName} — ${r.courseName}` : r.groupName;
                      return (
                        <Box key={r.key} title={title} sx={{ mt: 0.25, minWidth: 0 }}>
                          <Typography
                            sx={{ fontSize: 11, lineHeight: 1.25, color: rc.fg, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                          >
                            {r.groupName}
                          </Typography>
                          <Typography sx={{ fontSize: 11, fontWeight: 700, lineHeight: 1.25, color: rc.fg, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {kindLabel(r.kind, r)}
                          </Typography>
                        </Box>
                      );
                    })}
                    {lessons.length > 2 && (
                      <Typography sx={{ fontSize: 11, color: "var(--color-text-secondary, #6b7a8d)" }}>+{lessons.length - 2}</Typography>
                    )}
                  </Box>
                );
              })}
            </Box>
            {rows.length === 0 && !isFetching && (
              <Typography sx={{ mt: 2, fontSize: 13, textAlign: "center", color: "var(--color-text-muted, #9ca3af)" }}>
                {t("studentAttendance.noLessons", "No lessons this month")}
              </Typography>
            )}
          </Box>
        </Box>
      ) : rows.length === 0 ? (
        <Box sx={{ py: 4, textAlign: "center", fontSize: 14, color: "var(--color-text-muted, #9ca3af)" }}>
          {t("studentAttendance.noLessons", "No lessons this month")}
        </Box>
      ) : (
        <Box sx={{ overflowX: "auto", opacity: isFetching ? 0.6 : 1, transition: "opacity 0.15s" }}>
          <table style={{ width: "100%", minWidth: 560, borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr>
                {[
                  t("studentAttendance.createdAt", "Create at"),
                  t("studentAttendance.topic", "Topic"),
                  t("studentAttendance.lessonTime", "Lesson time"),
                  t("studentAttendance.status", "Status"),
                  t("studentAttendance.updatedBy", "Updated by"),
                ].map((h) => (
                  <th
                    key={h}
                    style={{
                      textAlign: "left",
                      padding: "10px 12px",
                      fontWeight: 600,
                      color: "var(--color-text-secondary, #6b7a8d)",
                      background: "var(--color-surface-alt, #f5f6f8)",
                      borderBottom: "1px solid var(--color-border, #e0e5ec)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.key}>
                  <td style={cellStyle}>{formatDMY(r.day.date)}</td>
                  <td style={cellStyle}>{r.groupName || "—"}</td>
                  <td style={cellStyle}>{r.time || "—"}</td>
                  <td style={cellStyle}>
                    <StatusBadge kind={r.kind} label={kindLabel(r.kind, r)} />
                  </td>
                  <td style={cellStyle}>{r.day.updatedBy || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Box>
      )}
    </Box>
  );
};

const cellStyle: CSSProperties = {
  padding: "10px 12px",
  color: "var(--color-text-primary, #1a2332)",
  borderBottom: "1px solid var(--color-border-subtle, #f0f0f0)",
};

export default AttendanceTab;
