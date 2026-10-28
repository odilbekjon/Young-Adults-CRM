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
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Student } from "../../../types/group";
import {
  useGroupAttendanceDatesQuery,
  useGroupAttendanceQuery,
  useSaveAttendanceMutation,
  useLazyGroupAttendanceExcelQuery,
} from "../../../app/api/attendancesApi";
import type { AttendanceStatus } from "../../../app/api/attendancesApi/types";
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

export const Attendance = ({ groupId, students, restrictToToday, groupName, branchName }: Props) => {
  const { t } = useTranslation();
  const toast = useToast();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());

  // Optimistic overrides layered on top of server data — cleared implicitly
  // once a refetch (triggered by the "attendance" tag invalidation) brings
  // the server value in sync; kept meanwhile so the UI reacts instantly.
  const [overrides, setOverrides] = useState<
    Record<string, Record<string, AttVal>>
  >({});

  const monthStr = `${year}-${pad2(month + 1)}`;

  const {
    data: lessonDates = [], isFetching: datesLoading, isError: datesError, error: datesErr, refetch: refetchDates,
  } = useGroupAttendanceDatesQuery({ groupId, month: monthStr }, { skip: !groupId });
  const {
    data: records = [], isFetching: recordsLoading, isError: recordsError, error: recordsErr, refetch: refetchRecords,
  } = useGroupAttendanceQuery({ groupId, month: monthStr }, { skip: !groupId });
  const loadFailed = datesError || recordsError;
  const [saveAttendance] = useSaveAttendanceMutation();
  const [fetchExcel, { isFetching: isExporting }] = useLazyGroupAttendanceExcelQuery();

  const handleExportExcel = async () => {
    try {
      const blob = await fetchExcel({ groupId, month: monthStr }).unwrap();
      downloadExcelBlob(blob, `attendance-${groupName || groupId}-${monthStr}`, branchName);
    } catch {
      toast.error(t("singleGroup.tabs.attendance.exportError"));
    }
  };

  const totalDays = getDaysInMonth(year, month);
  const today = now.getDate();
  const isCurrentMonth =
    year === now.getFullYear() && month === now.getMonth();

  // If the backend hasn't returned any lesson dates for this month (e.g. no
  // schedule set yet), fall back to showing every calendar day so the tab
  // still stays usable instead of rendering an empty table.
  const days = useMemo(() => {
    if (lessonDates.length > 0) {
      return [...lessonDates].sort().map((d) => Number(d.slice(-2)));
    }
    return Array.from({ length: totalDays }, (_, i) => i + 1);
  }, [lessonDates, totalDays]);

  const dateFor = (day: number) => `${year}-${pad2(month + 1)}-${pad2(day)}`;

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
    setMonth(now.getMonth());
    setYear(now.getFullYear());
  };

  const todayIso = dateFor(today);

  // Whether a given day column may be marked. Staff can mark any column; a
  // TEACHER only today's column, and only if it is a scheduled lesson day
  // (when the backend returned a lesson-day list for this month — if it
  // returned none, every day is shown and the server stays the judge).
  const isDayEditable = (day: number) => {
    if (!restrictToToday) return true;
    // TEACHER: nothing is markable while the month failed to load — whether
    // today is a lesson day can't be verified. Staff keep the old behavior
    // (all-days fallback grid, the server stays the judge).
    if (loadFailed) return false;
    if (!isCurrentMonth || day !== today) return false;
    return lessonDates.length === 0 || lessonDates.some((d) => d.slice(0, 10) === todayIso);
  };
  // TEACHER view: today's column exists in the grid but isn't a lesson day, so
  // every cell is frozen — say why instead of leaving a silently dead table.
  const showNotLessonDay =
    !!restrictToToday && !loadFailed && !datesLoading && isCurrentMonth && !isDayEditable(today);

  const handleSet = (studentId: string, day: number, val: "Was" | "Not") => {
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
        if (restrictToToday) toast.success(t("singleGroup.tabs.attendance.saveSuccess"));
      })
      .catch((err) => {
        setOverrides((prev) => ({
          ...prev,
          [studentId]: {
            ...(prev[studentId] || {}),
            [date]: serverMap[studentId]?.[date] ?? null,
          },
        }));
        // Show the backend's own reason (e.g. "not a lesson day", "student is
        // frozen") instead of a generic message, so the cause is visible.
        const detail = extractApiError(err);
        const generic = t("singleGroup.tabs.attendance.saveError");
        toast.error(detail ? `${generic} ${detail}` : generic);
      });
  };

  // Remove (X) button on hover — clears the mark locally; the API contract
  // doesn't expose a delete/clear endpoint, so a removed mark reappears
  // after the next refetch if it was already saved on the backend.
  const handleRemove = (
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
  };

  const getVal = (studentId: string, day: number): AttVal => {
    const date = dateFor(day);
    const override = overrides[studentId]?.[date];
    if (override !== undefined) return override;
    return serverMap[studentId]?.[date] ?? null;
  };

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
              // Every cell gets the hover tint (not MUI's `hover` prop): the
              // sticky name cell is opaque, so only an explicit background
              // keeps it in step with the rest of the row.
              <TableRow key={student.id} sx={{ "&:hover > td": { bgcolor: "var(--color-surface-hover)" } }}>
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
                      {student.name[0]}
                    </Avatar>
                    <StudentStatusDot active={student.active} archived={student.archived} balance={student.balance} />
                    <Tooltip title={student.name} placement="top-start" enterDelay={400} disableInteractive>
                      <Typography
                        fontSize={13}
                        noWrap
                        sx={{
                          minWidth: 0,
                          color: student.archived ? "text.secondary" : undefined,
                          textDecoration: student.archived ? "line-through" : "none",
                        }}
                      >
                        {student.name}
                      </Typography>
                    </Tooltip>
                  </Stack>
                </TableCell>

                {days.map((d) => {
                  const val = getVal(student.realId, d);
                  const isToday = isCurrentMonth && d === today;
                  const isPast =
                    year < now.getFullYear() ||
                    (year === now.getFullYear() &&
                      month < now.getMonth()) ||
                    (isCurrentMonth && d < today);
                  const isEditable = isDayEditable(d);

                  return (
                    <TableCell
                      key={d}
                      align="center"
                      sx={{
                        px: 0.5,
                        overflow: "visible",
                        bgcolor: isToday ? "var(--color-primary-surface)" : undefined,
                      }}
                    >
                      <Box
                        sx={{
                          position: "relative",
                          width: 48,
                          height: 24,
                          mx: "auto",
                          "& .cell-value": { transition: "opacity 0.12s" },
                          "&:hover .cell-value": { opacity: isEditable ? 0 : 1 },
                          "& .att-picker": {
                            opacity: 0,
                            pointerEvents: "none",
                            transition: "opacity 0.12s",
                          },
                          "&:hover .att-picker": isEditable ? {
                            opacity: 1,
                            pointerEvents: "auto",
                          } : undefined,
                          "& .remove-btn": { display: "none" },
                          "&:hover .remove-btn": {
                            display: isEditable && val && !restrictToToday ? "flex" : "none",
                          },
                        }}
                      >
                        <Box
                          className="cell-value"
                          sx={{
                            width: "100%",
                            height: "100%",
                            borderRadius: "6px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 11,
                            fontWeight: 600,
                            userSelect: "none",
                            cursor: isEditable ? "default" : "not-allowed",
                            // Frozen (read-only) day for a TEACHER session.
                            opacity: restrictToToday && !isEditable ? 0.55 : 1,
                            border: isToday
                              ? "2px solid var(--color-primary)"
                              : "1px solid var(--color-border)",
                            bgcolor:
                              val === "Was"
                                ? "#00897b"
                                : val === "Not"
                                ? "#ef5350"
                                : isPast
                                ? "var(--color-surface-alt)"
                                : "var(--color-surface)",
                            color:
                              val === "Was" || val === "Not"
                                ? "#fff"
                                : "#bdbdbd",
                          }}
                        >
                          {val ? t(`singleGroup.tabs.attendance.${ATT_VAL_LABEL_KEYS[val]}`) : "·"}
                        </Box>

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
                          }}
                        >
                          <Tooltip title={t("singleGroup.tabs.attendance.was")} placement="top" arrow disableInteractive>
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSet(student.realId, d, "Was");
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
                          <Tooltip title={t("singleGroup.tabs.attendance.notPresent")} placement="top" arrow disableInteractive>
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSet(student.realId, d, "Not");
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

                        {val && (
                          <Box
                            className="remove-btn"
                            onClick={(e) => handleRemove(e, student.realId, d)}
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
                      </Box>
                    </TableCell>
                  );
                })}
                <TableCell sx={{ p: 0 }} />
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};
