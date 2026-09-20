import { useMemo, useState } from "react";
import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
  MenuItem, Select, FormControl, TextField, IconButton, CircularProgress,
} from "@mui/material";
import { FiX, FiAlertCircle } from "react-icons/fi";
import { useAllGroupsQuery } from "../../app/api/groupsApi";
import { useAllTeachersQuery } from "../../app/api/teachersApi";
import { useAttendanceReportQuery } from "../../app/api/attendancesApi";
import { DatePickerField } from "../SingleGroup/DatePickerField";
import type {
  AttendanceReportGroupStatus,
  AttendanceReportAttendanceStatus,
} from "../../app/api/attendancesApi/types";

const STATUSES: AttendanceReportGroupStatus[] = ["ACTIVE", "INACTIVE", "PROBATION", "FROZEN", "DELETED"];
const ATTENDANCES: AttendanceReportAttendanceStatus[] = ["PRESENT", "ABSENT", "EXCUSED", "UNMARKED"];

const STATUS_LABELS: Record<AttendanceReportGroupStatus, string> = {
  ACTIVE: "Active",
  INACTIVE: "Inactive",
  PROBATION: "Probation",
  FROZEN: "Frozen",
  DELETED: "Deleted",
};

const ATTENDANCE_LABELS: Record<AttendanceReportAttendanceStatus, string> = {
  PRESENT: "Present",
  ABSENT: "Absent",
  EXCUSED: "Excused",
  UNMARKED: "Unmarked",
};

function attendanceColor(a: AttendanceReportAttendanceStatus | null) {
  if (a === "PRESENT") return "#22c55e";
  if (a === "ABSENT") return "#ef4444";
  if (a === "EXCUSED") return "#3b82f6";
  return "var(--color-text-muted)";
}

function statusColor(s: AttendanceReportGroupStatus | null) {
  if (s === "ACTIVE") return "#22c55e";
  if (s === "INACTIVE") return "#ef4444";
  if (s === "PROBATION") return "#f59e0b";
  if (s === "DELETED") return "#991b1b";
  return "var(--color-text-secondary)";
}

function getPaginationRange(current: number, total: number): (number | "…")[] {
  const range: (number | "…")[] = [];
  for (let p = 1; p <= total; p++) {
    if (p === 1 || p === total || Math.abs(p - current) <= 1) {
      range.push(p);
    } else if (range[range.length - 1] !== "…") {
      range.push("…");
    }
  }
  return range;
}

interface AppliedFilters {
  date: string;
  name: string;
  phone: string;
  status: AttendanceReportGroupStatus | "";
  groupId: string;
  teacherId: string;
  attendanceStatus: AttendanceReportAttendanceStatus | "";
  page: number;
}

const LIMIT = 10;

export const AttendanceReport = () => {
  const today = new Date().toISOString().slice(0, 10);

  // Draft inputs (secondary filters only apply on "Filter" click)
  const [draftName, setDraftName] = useState("");
  const [draftPhone, setDraftPhone] = useState("");
  const [draftStatus, setDraftStatus] = useState<AttendanceReportGroupStatus | "">("");
  const [draftGroupId, setDraftGroupId] = useState("");
  const [draftTeacherId, setDraftTeacherId] = useState("");
  const [draftAttendance, setDraftAttendance] = useState<AttendanceReportAttendanceStatus | "">("");

  // Committed filters that actually drive the request
  const [applied, setApplied] = useState<AppliedFilters>({
    date: today,
    name: "",
    phone: "",
    status: "",
    groupId: "",
    teacherId: "",
    attendanceStatus: "",
    page: 1,
  });

  const { data: groupsData } = useAllGroupsQuery({ page: 1, limit: 100 });
  const { data: teachersData } = useAllTeachersQuery({ page: 1, limit: 100 });
  const groups = groupsData?.data ?? [];
  const teachers = teachersData?.data ?? [];

  const queryArgs = useMemo(
    () => ({
      date: applied.date || undefined,
      name: applied.name || undefined,
      phone: applied.phone || undefined,
      status: applied.status || undefined,
      groupId: applied.groupId || undefined,
      teacherId: applied.teacherId || undefined,
      attendanceStatus: applied.attendanceStatus || undefined,
      page: applied.page,
      limit: LIMIT,
    }),
    [applied]
  );

  const { data, isLoading, isFetching, isError, refetch } = useAttendanceReportQuery(queryArgs);

  const rows = data?.rows ?? [];
  const meta = data?.meta;
  const totalPages = Math.max(1, meta?.totalPages ?? 1);
  const total = meta?.total ?? 0;
  const paginationRange = getPaginationRange(applied.page, totalPages);

  function handleDateChange(next: string) {
    setApplied((prev) => ({ ...prev, date: next, page: 1 }));
  }

  function applyFilters() {
    setApplied((prev) => ({
      ...prev,
      name: draftName,
      phone: draftPhone,
      status: draftStatus,
      groupId: draftGroupId,
      teacherId: draftTeacherId,
      attendanceStatus: draftAttendance,
      page: 1,
    }));
  }

  function clearFilters() {
    setDraftName(""); setDraftPhone(""); setDraftStatus("");
    setDraftGroupId(""); setDraftTeacherId(""); setDraftAttendance("");
    setApplied((prev) => ({
      ...prev,
      name: "", phone: "", status: "", groupId: "", teacherId: "", attendanceStatus: "",
      page: 1,
    }));
  }

  function goToPage(p: number) {
    setApplied((prev) => ({ ...prev, page: p }));
  }

  const inputSx = {
    "& .MuiInputBase-input": { fontSize: 13, py: "7px" },
    "& .MuiOutlinedInput-notchedOutline": { borderColor: "var(--color-border)" },
    "& .MuiInputBase-root": { backgroundColor: "var(--color-surface)" },
  };

  const selectSx = {
    fontSize: 13,
    "& .MuiOutlinedInput-notchedOutline": { borderColor: "var(--color-border)" },
    backgroundColor: "var(--color-surface)",
  };

  return (
    <div className="p-5 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-baseline gap-3 mb-5">
        <h1 className="text-2xl font-semibold text-gray-800 dark:text-gray-100">Attendance reports</h1>
        <span className="text-gray-400 dark:text-gray-500 text-sm">
          {isLoading ? "…" : `Quantity — ${total}`}
        </span>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap gap-2 items-center mb-5">
        <DatePickerField value={applied.date} onChange={handleDateChange} />

        <TextField placeholder="Name" value={draftName} onChange={(e) => setDraftName(e.target.value)} size="small" sx={{ ...inputSx, minWidth: 130 }} />
        <TextField placeholder="Phone" value={draftPhone} onChange={(e) => setDraftPhone(e.target.value)} size="small" sx={{ ...inputSx, minWidth: 120 }} />

        <FormControl size="small" sx={{ minWidth: 140 }}>
          <Select displayEmpty value={draftStatus} onChange={(e) => setDraftStatus(e.target.value as AttendanceReportGroupStatus | "")} sx={selectSx}>
            <MenuItem value="" sx={{ fontSize: 13, color: "var(--color-text-muted)" }}>Status</MenuItem>
            {STATUSES.map((s) => <MenuItem key={s} value={s} sx={{ fontSize: 13 }}>{STATUS_LABELS[s]}</MenuItem>)}
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 160 }}>
          <Select displayEmpty value={draftGroupId} onChange={(e) => setDraftGroupId(e.target.value)} sx={selectSx}>
            <MenuItem value="" sx={{ fontSize: 13, color: "var(--color-text-muted)" }}>Group</MenuItem>
            {groups.map((g) => <MenuItem key={g.id} value={g.id} sx={{ fontSize: 13 }}>{g.name}</MenuItem>)}
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 160 }}>
          <Select displayEmpty value={draftTeacherId} onChange={(e) => setDraftTeacherId(e.target.value)} sx={selectSx}>
            <MenuItem value="" sx={{ fontSize: 13, color: "var(--color-text-muted)" }}>Teacher</MenuItem>
            {teachers.map((t) => <MenuItem key={t.id} value={t.id} sx={{ fontSize: 13 }}>{t.name}</MenuItem>)}
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 150 }}>
          <Select displayEmpty value={draftAttendance} onChange={(e) => setDraftAttendance(e.target.value as AttendanceReportAttendanceStatus | "")} sx={selectSx}>
            <MenuItem value="" sx={{ fontSize: 13, color: "var(--color-text-muted)" }}>Attendance</MenuItem>
            {ATTENDANCES.map((a) => <MenuItem key={a} value={a} sx={{ fontSize: 13 }}>{ATTENDANCE_LABELS[a]}</MenuItem>)}
          </Select>
        </FormControl>

        <button onClick={applyFilters} className="px-5 py-[7px] bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded transition-colors">
          Filter
        </button>
        <IconButton size="small" onClick={clearFilters} sx={{ color: "var(--color-text-muted)" }}>
          <FiX size={18} />
        </IconButton>
      </div>

      {/* Table */}
      <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2, overflowX: "auto" }}>
        <Table size="small" sx={{ minWidth: 900 }}>
          <TableHead>
            <TableRow sx={{ backgroundColor: "var(--color-surface-alt)" }}>
              <TableCell sx={thSx}>№</TableCell>
              <TableCell sx={thSx}>Name</TableCell>
              <TableCell sx={thSx}>Phone</TableCell>
              <TableCell sx={thSx}>Status</TableCell>
              <TableCell sx={thSx}>Group</TableCell>
              <TableCell sx={thSx}>Teacher</TableCell>
              <TableCell sx={thSx}>Date</TableCell>
              <TableCell sx={thSx}>Attendance</TableCell>
              <TableCell sx={thSx}>Comment</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={9} align="center" sx={{ py: 6 }}>
                  <CircularProgress size={24} />
                </TableCell>
              </TableRow>
            ) : isError ? (
              <TableRow>
                <TableCell colSpan={9} align="center" sx={{ py: 6 }}>
                  <div className="flex flex-col items-center gap-2 text-gray-500 dark:text-gray-400">
                    <FiAlertCircle size={22} className="text-red-400" />
                    <span className="text-sm">Failed to load attendance report.</span>
                    <button
                      onClick={() => refetch()}
                      className="mt-1 px-4 py-1.5 text-xs font-medium border border-gray-200 dark:border-gray-700 rounded hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                      Retry
                    </button>
                  </div>
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} align="center" sx={{ py: 6, color: "var(--color-text-muted)", fontSize: 14 }}>
                  No Data
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row, i) => (
                <TableRow key={row.id} hover sx={{ "&:last-child td": { borderBottom: 0 }, opacity: isFetching ? 0.6 : 1 }}>
                  <TableCell sx={{ color: "var(--color-text-muted)", fontSize: 13, width: 48 }}>{(applied.page - 1) * LIMIT + i + 1}</TableCell>
                  <TableCell sx={{ fontSize: 14, minWidth: 180 }}>{row.studentName || "—"}</TableCell>
                  <TableCell sx={{ fontSize: 13, color: "var(--color-primary)", whiteSpace: "nowrap" }}>{row.phone || "—"}</TableCell>
                  <TableCell sx={{ fontSize: 13, whiteSpace: "nowrap" }}>
                    {row.status ? (
                      <span style={{ color: statusColor(row.status) }} className="font-medium">{STATUS_LABELS[row.status]}</span>
                    ) : "—"}
                  </TableCell>
                  <TableCell sx={{ fontSize: 13 }}>{row.groupName || "—"}</TableCell>
                  <TableCell sx={{ fontSize: 13 }}>{row.teacherName || "—"}</TableCell>
                  <TableCell sx={{ fontSize: 13, whiteSpace: "nowrap" }}>{row.date || "—"}</TableCell>
                  <TableCell sx={{ fontSize: 13, whiteSpace: "nowrap" }}>
                    {row.attendanceStatus ? (
                      <span style={{ color: attendanceColor(row.attendanceStatus) }} className="font-medium">
                        {ATTENDANCE_LABELS[row.attendanceStatus]}
                      </span>
                    ) : (
                      <span style={{ color: attendanceColor(null) }} className="font-medium">{ATTENDANCE_LABELS.UNMARKED}</span>
                    )}
                  </TableCell>
                  <TableCell sx={{ fontSize: 13, color: "var(--color-text-secondary)" }}>{row.comment || ""}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Pagination */}
      {!isLoading && !isError && total > 0 && (
        <div className="flex items-center justify-between mt-4 flex-wrap gap-3">
          <span className="text-sm text-gray-400 dark:text-gray-500">
            {`${(applied.page - 1) * LIMIT + 1}–${Math.min(applied.page * LIMIT, total)} / ${total}`}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => goToPage(Math.max(1, applied.page - 1))}
              disabled={applied.page === 1}
              className="px-3 py-1 text-sm border border-gray-200 dark:border-gray-700 rounded hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              ‹
            </button>
            {paginationRange.map((p, idx) =>
              p === "…" ? (
                <span key={`ellipsis-${idx}`} className="px-2 text-sm text-gray-400 dark:text-gray-500">…</span>
              ) : (
                <button
                  key={p}
                  onClick={() => goToPage(p)}
                  className={`px-3 py-1 text-sm border rounded transition-colors ${
                    p === applied.page
                      ? "bg-blue-500 text-white border-blue-500"
                      : "border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                  }`}
                >
                  {p}
                </button>
              )
            )}
            <button
              onClick={() => goToPage(Math.min(totalPages, applied.page + 1))}
              disabled={applied.page === totalPages}
              className="px-3 py-1 text-sm border border-gray-200 dark:border-gray-700 rounded hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              ›
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const thSx = {
  fontWeight: 600,
  fontSize: 13,
  color: "var(--color-text-secondary)",
  whiteSpace: "nowrap" as const,
  userSelect: "none" as const,
};
