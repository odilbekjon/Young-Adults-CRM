import {
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
import type { GroupDay } from "../../../app/api/groupsApi/types";
import { useToast } from "../../../Context/ToastContext";
import { DAYS_PRESETS } from "../../../utils";

type AttendanceStudent = Student & { realId: string };

interface Props {
  groupId: string;
  students: AttendanceStudent[];
  // The group's own weekly schedule (e.g. ["MONDAY","WEDNESDAY","FRIDAY"]),
  // used to fill in every lesson day of the viewed month client-side — GET
  // /attendances/group/{id}/dates alone was confirmed to under-report
  // (future dates within the current month don't come back yet, since
  // attendance can't be marked for a lesson that hasn't happened), which cut
  // the grid off partway through the month instead of showing it in full.
  scheduleDays?: GroupDay[];
  // Fallback when scheduleDays is empty but the group's classifed schedule
  // is a plain EVEN/ODD preset (see utils/groupDays.ts).
  daysType?: string;
  // TEACHER-role sessions (SingleGroup passed via TeacherGroupDetail) can
  // only mark today's lesson, never a past or future date — viewing other
  // months to check history is still allowed, only the edit picker/remove
  // button are gated per-cell.
  restrictToToday?: boolean;
}

const WEEKDAY_TO_JS_DAY: Record<GroupDay, number> = {
  SUNDAY: 0, MONDAY: 1, TUESDAY: 2, WEDNESDAY: 3, THURSDAY: 4, FRIDAY: 5, SATURDAY: 6,
};

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

const getDaysInMonth = (year: number, month: number) =>
  new Date(year, month + 1, 0).getDate();

const pad2 = (n: number) => String(n).padStart(2, "0");

type AttVal = "Was" | "Not" | null;

export const Attendance = ({ groupId, students, scheduleDays, daysType, restrictToToday }: Props) => {
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

  const { data: lessonDates = [], isFetching: datesLoading } =
    useGroupAttendanceDatesQuery({ groupId, month: monthStr }, { skip: !groupId });
  const { data: records = [], isFetching: recordsLoading } =
    useGroupAttendanceQuery({ groupId, month: monthStr }, { skip: !groupId });
  const [saveAttendance] = useSaveAttendanceMutation();
  const [fetchExcel, { isFetching: isExporting }] = useLazyGroupAttendanceExcelQuery();

  const handleExportExcel = async () => {
    try {
      const blob = await fetchExcel({ groupId, month: monthStr }).unwrap();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `attendance-${groupId}-${monthStr}.xlsx`;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error(t("singleGroup.tabs.attendance.exportError"));
    }
  };

  const totalDays = getDaysInMonth(year, month);
  const today = now.getDate();
  const isCurrentMonth =
    year === now.getFullYear() && month === now.getMonth();

  // The group's own weekly schedule, resolved the same way
  // utils/groupDays.ts's classifyDays already does elsewhere: the explicit
  // day list wins when set, EVEN/ODD is a fallback for groups whose days[]
  // came back empty but daysType didn't.
  const resolvedScheduleDays: GroupDay[] = useMemo(() => {
    if (scheduleDays && scheduleDays.length > 0) return scheduleDays;
    if (daysType === "EVEN") return DAYS_PRESETS["Even days"];
    if (daysType === "ODD") return DAYS_PRESETS["Odd days"];
    return [];
  }, [scheduleDays, daysType]);

  // Every calendar day this month that falls on one of the group's lesson
  // weekdays — computed client-side so the full month shows up front
  // (including days later this month), not just whatever the backend's
  // /dates endpoint has recorded so far.
  const scheduleDaysThisMonth = useMemo(() => {
    if (resolvedScheduleDays.length === 0) return [];
    const jsDays = new Set(resolvedScheduleDays.map((d) => WEEKDAY_TO_JS_DAY[d]));
    return Array.from({ length: totalDays }, (_, i) => i + 1)
      .filter((day) => jsDays.has(new Date(year, month, day).getDay()));
  }, [resolvedScheduleDays, year, month, totalDays]);

  // Union of the group's own schedule and whatever the backend already
  // knows about (picks up one-off makeup lessons outside the regular
  // weekday pattern too). Falls back to every calendar day only when
  // neither source has anything, so the tab never renders empty.
  const days = useMemo(() => {
    const fromBackend = lessonDates.map((d) => Number(d.slice(-2)));
    const merged = new Set([...scheduleDaysThisMonth, ...fromBackend]);
    if (merged.size > 0) return Array.from(merged).sort((a, b) => a - b);
    return Array.from({ length: totalDays }, (_, i) => i + 1);
  }, [scheduleDaysThisMonth, lessonDates, totalDays]);

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

  const handleSet = (studentId: string, day: number, val: "Was" | "Not") => {
    const date = dateFor(day);
    if (restrictToToday && (!isCurrentMonth || date !== todayIso)) return;
    setOverrides((prev) => ({
      ...prev,
      [studentId]: { ...(prev[studentId] || {}), [date]: val },
    }));

    saveAttendance({
      records: [{ studentId, groupId, date, status: VAL_TO_STATUS[val] }],
    })
      .unwrap()
      .catch(() => {
        setOverrides((prev) => ({
          ...prev,
          [studentId]: {
            ...(prev[studentId] || {}),
            [date]: serverMap[studentId]?.[date] ?? null,
          },
        }));
        toast.error(t("singleGroup.tabs.attendance.saveError"));
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

      {/* TABLE — o'zi X scroll qiladi */}
      <TableContainer
        component={Paper}
        elevation={0}
        sx={{
          borderRadius: 2,
          border: "1px solid #e0e0e0",
          overflowX: "scroll",
          overflowY: "visible",
          // width: "100%",
        }}
      >
        <Table
          size="small"
          stickyHeader
          sx={{ tableLayout: "auto", minWidth: "max-content" }}
        >
          <TableHead>
            <TableRow>
              {/* Sticky name column */}
              <TableCell
                sx={{
                  minWidth: 180,
                  fontWeight: 600,
                  position: "sticky",
                  left: 0,
                  zIndex: 3,
                  bgcolor: "#fafafa",
                  borderRight: "1px solid #e0e0e0",
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
                      minWidth: 56,
                      px: 0.5,
                      fontWeight: isToday ? 700 : 400,
                      color: isToday ? "primary.main" : "text.secondary",
                      fontSize: 12,
                      bgcolor: isToday ? "#e3f2fd" : "#fafafa",
                      borderBottom: isToday
                        ? "2px solid #1976d2"
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
            </TableRow>
          </TableHead>

          <TableBody>
            {students.map((student) => (
              <TableRow key={student.id} hover>
                {/* Sticky name cell */}
                <TableCell
                  sx={{
                    position: "sticky",
                    left: 0,
                    zIndex: 1,
                    bgcolor: "background.paper",
                    borderRight: "1px solid #e0e0e0",
                  }}
                >
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Avatar sx={{ width: 28, height: 28, fontSize: 12 }}>
                      {student.name[0]}
                    </Avatar>
                    <Typography fontSize={13} noWrap>
                      {student.name}
                    </Typography>
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
                  const isEditable = !restrictToToday || isToday;

                  return (
                    <TableCell
                      key={d}
                      align="center"
                      sx={{
                        px: 0.5,
                        overflow: "visible",
                        bgcolor: isToday ? "#f0f7ff" : undefined,
                      }}
                    >
                      <Box
                        sx={{
                          position: "relative",
                          width: 48,
                          height: 28,
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
                            display: isEditable && val ? "flex" : "none",
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
                            border: isToday
                              ? "2px solid #1976d2"
                              : "1px solid #e0e0e0",
                            bgcolor:
                              val === "Was"
                                ? "#00897b"
                                : val === "Not"
                                ? "#ef5350"
                                : isPast
                                ? "#f5f5f5"
                                : "#fff",
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
                            bgcolor: "#fff",
                            border: isToday
                              ? "2px solid #1976d2"
                              : "1px solid #e0e0e0",
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
                                bgcolor: "#fff",
                                color: "#1976d2",
                                border: "2px solid #1976d2",
                                "&:hover": { bgcolor: "#e3f2fd" },
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
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};
