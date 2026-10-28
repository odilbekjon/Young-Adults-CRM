import {
  Alert,
  Box,
  IconButton,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Button,
  Avatar,
  Tooltip,
  CircularProgress,
} from "@mui/material";
import {
  MdKeyboardDoubleArrowLeft,
  MdKeyboardDoubleArrowRight,
  MdKeyboardArrowLeft,
  MdKeyboardArrowRight,
  MdClose,
  MdCheck,
  MdDownload,
} from "react-icons/md";
import { keyframes } from "@mui/material/styles";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Student } from "../../../types/group";
import {
  useGroupAttendanceDatesQuery,
  useGroupAttendanceQuery,
  useSaveAttendanceMutation,
  useLazyGroupAttendanceExcelQuery,
} from "../../../app/api/attendancesApi";
import type { AttendanceRecord, AttendanceStatus } from "../../../app/api/attendancesApi/types";
import { useToast } from "../../../Context/ToastContext";
import { downloadExcelBlob } from "../../../utils/downloadExcel";
import { extractApiError } from "../../../utils/extractApiError";
import { StudentStatusDot } from "../StudentStatusDot";

// `archived`/`balance` only come from the admin page's roster (they drive the
// status dot and the struck-through name); the teacher view leaves them out.
type AttendanceStudent = Student & { realId: string; archived?: boolean; balance?: number };

interface Props {
  groupId: string;
  students: AttendanceStudent[];
  // TEACHER-role sessions (SingleGroup passed via TeacherGroupDetail) can
  // only mark today's lesson, never a past or future date — and only when
  // today actually is one of the group's lesson days. Every other column is
  // frozen (read-only); viewing other months to check history is still
  // allowed, only the edit picker/remove button are gated per-cell.
  restrictToToday?: boolean;
  // Only used to build a readable download file name for the Excel export.
  groupName?: string;
  branchName?: string;
}

const MONTH_KEYS = [
  "jan", "feb", "mar", "apr", "may", "jun",
  "jul", "aug", "sep", "oct", "nov", "dec",
];

// NOTE: attendance values ("Was"/"Not") are kept as internal state codes
// (this AttVal type is local to this file, not shared with other modules);
// only the rendered text is translated via ATT_VAL_LABEL_KEYS.
const ATT_VAL_LABEL_KEYS: Record<"Was" | "Not", string> = {
  Was: "was",
  Not: "notPresent",
};

const STATUS_TO_VAL: Record<AttendanceStatus, "Was" | "Not"> = {
  PRESENT: "Was",
  ABSENT: "Not",
};
const VAL_TO_STATUS: Record<"Was" | "Not", AttendanceStatus> = {
  Was: "PRESENT",
  Not: "ABSENT",
};

const errorStatus = (err: unknown): string => {
  const status = (err as { status?: unknown } | undefined)?.status;
  return status === undefined ? "?" : String(status);
};

const getDaysInMonth = (year: number, month: number) =>
  new Date(year, month + 1, 0).getDate();

const pad2 = (n: number) => String(n).padStart(2, "0");

// Fixed column widths: a group with two lesson days in the month reads like one
// with twenty — the name first, the days right after it — instead of the spare
// width of the card being handed to the name and day columns. A trailing empty
// column absorbs that spare width.
const NAME_COL_WIDTH = 260;
const DAY_COL_WIDTH = 72;

type AttVal = "Was" | "Not" | null;

// One lesson-day column, shared by every row so a cell only re-renders when its
// own column or mark changes.
interface DayColumn {
  day: number;
  isToday: boolean;
  isPast: boolean;
  isEditable: boolean;
}

const PICKER_FADE_MS = 120;
const pickerFadeIn = keyframes`from { opacity: 0 } to { opacity: 1 }`;

// How a day cell looks, written once on the table and picked by class name. A
// month of 30 students is ~900 cells, and giving each one its own `sx` was most
// of the time it took to draw the table. The today tint is wrapped in :where so
// it stays weaker than the row's hover tint, as a per-cell `bgcolor` was.
const CELL_STYLES = {
  "& .att-day": { paddingLeft: "4px", paddingRight: "4px", overflow: "visible" },
  "& :where(.att-day.today)": { backgroundColor: "var(--color-primary-surface)" },
  "& .att-cell": { position: "relative", width: 48, height: 24, marginLeft: "auto", marginRight: "auto" },
  "& .att-cell .cell-value": {
    width: "100%",
    height: "100%",
    borderRadius: "6px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 11,
    fontWeight: 600,
    userSelect: "none",
    cursor: "not-allowed",
    border: "1px solid var(--color-border)",
    backgroundColor: "var(--color-surface)",
    color: "#bdbdbd",
    transition: "opacity 0.12s",
  },
  "& .att-cell .cell-value.editable": { cursor: "default" },
  "& .att-cell .cell-value.frozen": { opacity: 0.55 },
  "& .att-cell .cell-value.today": { border: "2px solid var(--color-primary)" },
  "& .att-cell .cell-value.past": { backgroundColor: "var(--color-surface-alt)" },
  "& .att-cell .cell-value.was": { backgroundColor: "#00897b", color: "#fff" },
  "& .att-cell .cell-value.not": { backgroundColor: "#ef5350", color: "#fff" },
  "& .att-cell:hover .cell-value": { opacity: 1 },
  "& .att-cell.editable:hover .cell-value": { opacity: 0 },
  "& .att-cell .att-picker": { opacity: 0, pointerEvents: "none", transition: "opacity 0.12s" },
  "& .att-cell.editable:hover .att-picker": { opacity: 1, pointerEvents: "auto" },
  "& .att-cell .remove-btn": { display: "none" },
  "& .att-cell:hover .remove-btn": { display: "flex" },
} as const;

interface CellProps {
  studentId: string;
  column: DayColumn;
  val: AttVal;
  wasLabel: string;
  notLabel: string;
  restrictToToday?: boolean;
  onSet: (studentId: string, day: number, val: "Was" | "Not") => void;
  onRemove: (e: React.MouseEvent, studentId: string, day: number) => void;
}

const AttendanceCell = memo(function AttendanceCell({
  studentId, column, val, wasLabel, notLabel, restrictToToday, onSet, onRemove,
}: CellProps) {
  const { day, isToday, isPast, isEditable } = column;
  // The was/not picker (two tooltips and buttons) and the remove button are only
  // built while the pointer is over the cell and for the fade-out after it —
  // a month of 30 students would otherwise carry ~1000 of them that are almost
  // never shown.
  const [hovered, setHovered] = useState(false);
  const leaveTimer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => () => clearTimeout(leaveTimer.current), []);

  const handleEnter = () => {
    clearTimeout(leaveTimer.current);
    setHovered(true);
  };
  const handleLeave = () => {
    leaveTimer.current = setTimeout(() => setHovered(false), PICKER_FADE_MS + 30);
  };

  const valueClass = [
    "cell-value",
    isToday && "today",
    isEditable && "editable",
    // Frozen (read-only) day for a TEACHER session.
    restrictToToday && !isEditable && "frozen",
    val === "Was" ? "was" : val === "Not" ? "not" : isPast && "past",
  ].filter(Boolean).join(" ");

  return (
    <TableCell align="center" className={isToday ? "att-day today" : "att-day"}>
      <div
        className={isEditable ? "att-cell editable" : "att-cell"}
        onMouseEnter={isEditable ? handleEnter : undefined}
        onMouseLeave={isEditable ? handleLeave : undefined}
      >
        <div className={valueClass}>
          {val === "Was" ? wasLabel : val === "Not" ? notLabel : "·"}
        </div>

        {hovered && isEditable && (
          <Box
            className="att-picker"
            sx={{
              position: "absolute",
              inset: 0,
              zIndex: 2,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 0.25,
              px: 0.25,
              bgcolor: "var(--color-surface)",
              border: isToday
                ? "2px solid var(--color-primary)"
                : "1px solid var(--color-border)",
              borderRadius: "6px",
              boxShadow: "0 1px 4px rgba(0,0,0,0.12)",
              animation: `${pickerFadeIn} ${PICKER_FADE_MS}ms`,
            }}
          >
            <Tooltip title={wasLabel} placement="top" arrow disableInteractive>
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  onSet(studentId, day, "Was");
                }}
                sx={{
                  width: 20,
                  height: 20,
                  p: 0,
                  bgcolor: "#00897b",
                  color: "#fff",
                  border: "2px solid #fff",
                  boxShadow: "0 0 0 1px #00897b",
                  "&:hover": { bgcolor: "#00796b" },
                }}
              >
                <MdCheck size={13} />
              </IconButton>
            </Tooltip>
            <Tooltip title={notLabel} placement="top" arrow disableInteractive>
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  onSet(studentId, day, "Not");
                }}
                sx={{
                  width: 20,
                  height: 20,
                  p: 0,
                  bgcolor: "var(--color-surface)",
                  color: "var(--color-primary)",
                  border: "2px solid var(--color-primary)",
                  "&:hover": { bgcolor: "var(--color-primary-surface)" },
                }}
              >
                <MdClose size={13} />
              </IconButton>
            </Tooltip>
          </Box>
        )}

        {hovered && isEditable && val && !restrictToToday && (
          <Box
            className="remove-btn"
            onClick={(e) => onRemove(e, studentId, day)}
            sx={{
              position: "absolute",
              top: -6,
              right: -6,
              width: 16,
              height: 16,
              borderRadius: "50%",
              bgcolor: "#616161",
              color: "#fff",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              zIndex: 4,
              "&:hover": { bgcolor: "#e53935" },
            }}
          >
            <MdClose size={10} />
          </Box>
        )}
      </div>
    </TableCell>
  );
});

interface RowProps {
  studentId: string;
  name: string;
  active: boolean;
  archived?: boolean;
  balance?: number;
  // The student's mark for each column of `columns`, in the same order.
  vals: AttVal[];
  columns: DayColumn[];
  wasLabel: string;
  notLabel: string;
  restrictToToday?: boolean;
  onSet: CellProps["onSet"];
  onRemove: CellProps["onRemove"];
}

// The roster hands over fresh student objects whenever any of its data changes,
// so a row is compared by what it shows rather than by identity.
const sameRow = (prev: RowProps, next: RowProps) =>
  (Object.keys(next) as (keyof RowProps)[]).every((key) =>
    key === "vals"
      ? prev.vals.length === next.vals.length && prev.vals.every((v, i) => v === next.vals[i])
      : prev[key] === next[key]
  );

const AttendanceRow = memo(function AttendanceRow({
  studentId, name, active, archived, balance, vals, columns, wasLabel, notLabel, restrictToToday, onSet, onRemove,
}: RowProps) {
  return (
    // Every cell gets the hover tint (not MUI's `hover` prop): the
    // sticky name cell is opaque, so only an explicit background
    // keeps it in step with the rest of the row.
    <TableRow sx={{ "&:hover > td": { bgcolor: "var(--color-surface-hover)" } }}>
      {/* Sticky name cell — the lesson days follow right after it */}
      <TableCell
        sx={{
          px: 1.5,
          position: "sticky",
          left: 0,
          zIndex: 1,
          bgcolor: "background.paper",
          borderRight: "1px solid var(--color-border)",
        }}
      >
        <Stack direction="row" alignItems="center" spacing={1}>
          <Avatar sx={{ width: 28, height: 28, fontSize: 12, flexShrink: 0 }}>
            {name[0]}
          </Avatar>
          <StudentStatusDot active={active} archived={archived} balance={balance} />
          <Tooltip title={name} placement="top-start" enterDelay={400} disableInteractive>
            <Typography
              fontSize={13}
              noWrap
              sx={{
                minWidth: 0,
                color: archived ? "text.secondary" : undefined,
                textDecoration: archived ? "line-through" : "none",
              }}
            >
              {name}
            </Typography>
          </Tooltip>
        </Stack>
      </TableCell>

      {columns.map((column, i) => (
        <AttendanceCell
          key={column.day}
          studentId={studentId}
          column={column}
          val={vals[i]}
          wasLabel={wasLabel}
          notLabel={notLabel}
          restrictToToday={restrictToToday}
          onSet={onSet}
          onRemove={onRemove}
        />
      ))}
      <TableCell sx={{ p: 0 }} />
    </TableRow>
  );
}, sameRow);

// Stand-ins for "no answer yet" that keep the same identity between renders.
const NO_DATES: string[] = [];
const NO_RECORDS: AttendanceRecord[] = [];

export const Attendance = memo(function Attendance({ groupId, students, restrictToToday, groupName, branchName }: Props) {
  const { t } = useTranslation();
  const { success: toastSuccess, error: toastError } = useToast();
  const now = new Date();
  const nowYear = now.getFullYear();
  const nowMonth = now.getMonth();
  const [year, setYear] = useState(nowYear);
  const [month, setMonth] = useState(nowMonth);

  // Optimistic overrides layered on top of server data — cleared implicitly
  // once a refetch (triggered by the "attendance" tag invalidation) brings
  // the server value in sync; kept meanwhile so the UI reacts instantly.
  const [overrides, setOverrides] = useState<
    Record<string, Record<string, AttVal>>
  >({});

  const monthStr = `${year}-${pad2(month + 1)}`;

  const {
    data: lessonDates = NO_DATES, isFetching: datesLoading, isError: datesError, error: datesErr, refetch: refetchDates,
  } = useGroupAttendanceDatesQuery({ groupId, month: monthStr }, { skip: !groupId });
  const {
    data: records = NO_RECORDS, isFetching: recordsLoading, isError: recordsError, error: recordsErr, refetch: refetchRecords,
  } = useGroupAttendanceQuery({ groupId, month: monthStr }, { skip: !groupId });
  const loadFailed = datesError || recordsError;
  const [saveAttendance] = useSaveAttendanceMutation();
  const [fetchExcel, { isFetching: isExporting }] = useLazyGroupAttendanceExcelQuery();

  const handleExportExcel = async () => {
    try {
      const blob = await fetchExcel({ groupId, month: monthStr }).unwrap();
      downloadExcelBlob(blob, `attendance-${groupName || groupId}-${monthStr}`, branchName);
    } catch {
      toastError(t("singleGroup.tabs.attendance.exportError"));
    }
  };

  const totalDays = getDaysInMonth(year, month);
  const today = now.getDate();
  const isCurrentMonth = year === nowYear && month === nowMonth;

  // If the backend hasn't returned any lesson dates for this month (e.g. no
  // schedule set yet), fall back to showing every calendar day so the tab
  // still stays usable instead of rendering an empty table.
  const days = useMemo(() => {
    if (lessonDates.length > 0) {
      return [...lessonDates].sort().map((d) => Number(d.slice(-2)));
    }
    return Array.from({ length: totalDays }, (_, i) => i + 1);
  }, [lessonDates, totalDays]);

  const dateFor = useCallback((day: number) => `${year}-${pad2(month + 1)}-${pad2(day)}`, [year, month]);

  const serverMap = useMemo(() => {
    const map: Record<string, Record<string, AttVal>> = {};
    records.forEach((r) => {
      if (!r.status) return;
      map[r.studentId] = {
        ...(map[r.studentId] || {}),
        [r.date]: STATUS_TO_VAL[r.status],
      };
    });
    return map;
  }, [records]);
  // handleSet rolls back to what the server last said; reading it from a ref
  // keeps handleSet the same function when the server data refreshes, so the
  // rows don't all re-render for it.
  const serverMapRef = useRef(serverMap);
  useEffect(() => { serverMapRef.current = serverMap; }, [serverMap]);

  // Navigation
  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear((y) => y - 1); }
    else setMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear((y) => y + 1); }
    else setMonth((m) => m + 1);
  };
  const prevYear = () => setYear((y) => y - 1);
  const nextYear = () => setYear((y) => y + 1);
  const goToCurrent = () => {
    setMonth(nowMonth);
    setYear(nowYear);
  };

  const todayIso = dateFor(today);

  // Whether a given day column may be marked. Staff can mark any column; a
  // TEACHER only today's column, and only if it is a scheduled lesson day
  // (when the backend returned a lesson-day list for this month — if it
  // returned none, every day is shown and the server stays the judge).
  const isDayEditable = useCallback((day: number) => {
    if (!restrictToToday) return true;
    // TEACHER: nothing is markable while the month failed to load — whether
    // today is a lesson day can't be verified. Staff keep the old behavior
    // (all-days fallback grid, the server stays the judge).
    if (loadFailed) return false;
    if (!isCurrentMonth || day !== today) return false;
    return lessonDates.length === 0 || lessonDates.some((d) => d.slice(0, 10) === todayIso);
  }, [restrictToToday, loadFailed, isCurrentMonth, today, lessonDates, todayIso]);
  // TEACHER view: today's column exists in the grid but isn't a lesson day, so
  // every cell is frozen — say why instead of leaving a silently dead table.
  const showNotLessonDay =
    !!restrictToToday && !loadFailed && !datesLoading && isCurrentMonth && !isDayEditable(today);

  const handleSet = useCallback((studentId: string, day: number, val: "Was" | "Not") => {
    const date = dateFor(day);
    if (!isDayEditable(day)) return;
    setOverrides((prev) => ({
      ...prev,
      [studentId]: { ...(prev[studentId] || {}), [date]: val },
    }));

    saveAttendance({
      records: [{ studentId, groupId, date, status: VAL_TO_STATUS[val] }],
    })
      .unwrap()
      .then(() => {
        // Teacher view only — staff mark many cells in a row, a toast per
        // click would just stack up.
        if (restrictToToday) toastSuccess(t("singleGroup.tabs.attendance.saveSuccess"));
      })
      .catch((err) => {
        setOverrides((prev) => ({
          ...prev,
          [studentId]: {
            ...(prev[studentId] || {}),
            [date]: serverMapRef.current[studentId]?.[date] ?? null,
          },
        }));
        // Show the backend's own reason (e.g. "not a lesson day", "student is
        // frozen") instead of a generic message, so the cause is visible.
        const detail = extractApiError(err);
        const generic = t("singleGroup.tabs.attendance.saveError");
        toastError(detail ? `${generic} ${detail}` : generic);
      });
  }, [dateFor, isDayEditable, saveAttendance, groupId, restrictToToday, toastSuccess, toastError, t]);

  // Remove (X) button on hover — clears the mark locally; the API contract
  // doesn't expose a delete/clear endpoint, so a removed mark reappears
  // after the next refetch if it was already saved on the backend.
  const handleRemove = useCallback((
    e: React.MouseEvent,
    studentId: string,
    day: number
  ) => {
    e.stopPropagation();
    if (!isDayEditable(day) || restrictToToday) return;
    setOverrides((prev) => ({
      ...prev,
      [studentId]: { ...(prev[studentId] || {}), [dateFor(day)]: null },
    }));
  }, [isDayEditable, restrictToToday, dateFor]);

  const columns = useMemo<DayColumn[]>(
    () => days.map((d) => ({
      day: d,
      isToday: isCurrentMonth && d === today,
      isPast: year < nowYear || (year === nowYear && month < nowMonth) || (isCurrentMonth && d < today),
      isEditable: isDayEditable(d),
    })),
    [days, isCurrentMonth, today, year, month, nowYear, nowMonth, isDayEditable],
  );
  const wasLabel = t(`singleGroup.tabs.attendance.${ATT_VAL_LABEL_KEYS.Was}`);
  const notLabel = t(`singleGroup.tabs.attendance.${ATT_VAL_LABEL_KEYS.Not}`);

  // One student's mark for each column: an unsaved click wins over the server's
  // answer.
  const valsFor = (studentId: string): AttVal[] =>
    columns.map(({ day }) => {
      const date = dateFor(day);
      const override = overrides[studentId]?.[date];
      if (override !== undefined) return override;
      return serverMap[studentId]?.[date] ?? null;
    });

  return (
    <Box>
      {/* HEADER */}
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        mb={2}
        flexWrap="wrap"
        gap={1}
      >
        <Stack direction="row" alignItems="center" spacing={1}>
          <Typography variant="h6" fontWeight={600}>
            {t("singleGroup.tabs.attendance.title")}
          </Typography>
          {(datesLoading || recordsLoading) && (
            <CircularProgress size={16} thickness={5} />
          )}
        </Stack>
        <Stack direction="row" alignItems="center" spacing={0.5}>
          <Button variant="outlined" size="small" onClick={goToCurrent}>
            {t("singleGroup.tabs.attendance.current")}
          </Button>
          <IconButton size="small" onClick={prevYear}>
            <MdKeyboardDoubleArrowLeft />
          </IconButton>
          <IconButton size="small" onClick={prevMonth}>
            <MdKeyboardArrowLeft />
          </IconButton>
          <Typography sx={{ minWidth: 90, textAlign: "center", fontSize: 14 }}>
            {t(`singleGroup.tabs.attendance.months.${MONTH_KEYS[month]}`)} {year}
          </Typography>
          <IconButton size="small" onClick={nextMonth}>
            <MdKeyboardArrowRight />
          </IconButton>
          <IconButton size="small" onClick={nextYear}>
            <MdKeyboardDoubleArrowRight />
          </IconButton>
          <Tooltip title={t("singleGroup.tabs.attendance.exportExcel")} placement="top" arrow>
            <span>
              <IconButton size="small" onClick={handleExportExcel} disabled={isExporting}>
                {isExporting ? <CircularProgress size={16} /> : <MdDownload />}
              </IconButton>
            </span>
          </Tooltip>
        </Stack>
      </Stack>

      {loadFailed && (
        <Alert
          severity="error"
          sx={{ mb: 2 }}
          action={
            <Button
              color="inherit"
              size="small"
              onClick={() => {
                if (datesError) void refetchDates();
                if (recordsError) void refetchRecords();
              }}
            >
              {t("singleGroup.tabs.attendance.retry")}
            </Button>
          }
        >
          {[
            t("singleGroup.tabs.attendance.loadError"),
            extractApiError(datesErr) ?? extractApiError(recordsErr),
            // Which request failed and with what status — makes a permission
            // problem (403) easy to tell apart from a network/server one.
            `[${[
              datesError && `/attendances/group/…/dates: ${errorStatus(datesErr)}`,
              recordsError && `/attendances/group/…: ${errorStatus(recordsErr)}`,
            ].filter(Boolean).join(", ")}]`,
          ].filter(Boolean).join(" ")}
        </Alert>
      )}
      {showNotLessonDay && (
        <Alert severity="info" sx={{ mb: 2 }}>
          {t("singleGroup.tabs.attendance.notLessonDay")}
        </Alert>
      )}

      {/* TABLE — scrolls on its own in both directions, so the sticky header
          row and the sticky name column stay put while a long roster or many
          lesson days are scrolled. maxHeight leaves room for the tab strip and
          the header above so the page's own scroll doesn't kick in as well. */}
      <TableContainer
        component={Paper}
        elevation={0}
        sx={{
          borderRadius: 2,
          border: "1px solid var(--color-border)",
          overflow: "auto",
          maxHeight: "calc(100vh - 340px)",
        }}
      >
        <Table
          size="small"
          stickyHeader
          sx={{
            tableLayout: "fixed",
            width: "100%",
            minWidth: NAME_COL_WIDTH + days.length * DAY_COL_WIDTH,
            "& th, & td": { boxSizing: "border-box" },
            ...CELL_STYLES,
          }}
        >
          <TableHead>
            <TableRow>
              {/* Sticky name column */}
              <TableCell
                sx={{
                  width: NAME_COL_WIDTH,
                  px: 1.5,
                  fontWeight: 600,
                  position: "sticky",
                  left: 0,
                  zIndex: 3,
                  bgcolor: "var(--color-surface-alt)",
                  borderRight: "1px solid var(--color-border)",
                }}
              >
                {t("singleGroup.tabs.attendance.name")}
              </TableCell>

              {days.map((d) => {
                const isToday = isCurrentMonth && d === today;
                return (
                  <TableCell
                    key={d}
                    align="center"
                    sx={{
                      width: DAY_COL_WIDTH,
                      px: 0.5,
                      fontWeight: isToday ? 700 : 400,
                      color: isToday ? "primary.main" : "text.secondary",
                      fontSize: 12,
                      bgcolor: isToday ? "var(--color-primary-surface)" : "var(--color-surface-alt)",
                      borderBottom: isToday
                        ? "2px solid var(--color-primary)"
                        : undefined,
                    }}
                  >
                    {d}
                    <br />
                    <span style={{ fontSize: 10, opacity: 0.7 }}>
                      {t(`singleGroup.tabs.attendance.months.${MONTH_KEYS[month]}`)}
                    </span>
                  </TableCell>
                );
              })}
              {/* Takes up the width the fixed columns leave, so the header band spans the card */}
              <TableCell sx={{ p: 0, bgcolor: "var(--color-surface-alt)" }} />
            </TableRow>
          </TableHead>

          <TableBody>
            {students.map((student) => (
              <AttendanceRow
                key={student.id}
                studentId={student.realId}
                name={student.name}
                active={student.active}
                archived={student.archived}
                balance={student.balance}
                vals={valsFor(student.realId)}
                columns={columns}
                wasLabel={wasLabel}
                notLabel={notLabel}
                restrictToToday={restrictToToday}
                onSet={handleSet}
                onRemove={handleRemove}
              />
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
});
