import { useState, useMemo } from "react";
import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
  MenuItem, Select, FormControl, TextField, IconButton,
} from "@mui/material";
import { FiCalendar, FiX, FiEdit2 } from "react-icons/fi";
import { TEACHERS_DATA } from "../../constants/Teachers";

// ─── Types ────────────────────────────────────────────────────────────────────
type AttendanceStatus = "Attended" | "Not attended" | "Excused";
type StudentStatus = "Active" | "Inactive" | "Frozen (paused)";

interface AttendanceRow {
  uid: string;
  name: string;
  phone: string;
  status: StudentStatus;
  group: string;
  teacher: string;
  lessonTime: string;
  days: string;
  course: string;
  attendance: AttendanceStatus;
  lastComment: string;
}

// ─── Ma'lumotlarni TEACHERS_DATA dan generatsiya qilish ───────────────────────
const ATTEND_OPTS: AttendanceStatus[] = ["Attended", "Not attended", "Excused"];

function seedRand(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

function buildRows(): AttendanceRow[] {
  const rows: AttendanceRow[] = [];
  let uid = 1;

  TEACHERS_DATA.forEach((teacher) => {
    teacher.groups.forEach((group) => {
      group.students.forEach((student) => {
        const rand = seedRand(uid * 31 + group.id);
        const r1 = rand();
        const r2 = rand();

        const status: StudentStatus = student.active
          ? "Active"
          : r1 > 0.5
          ? "Inactive"
          : "Frozen (paused)";

        const attendance = ATTEND_OPTS[Math.floor(r2 * 3)];

        rows.push({
          uid: `${teacher.id}-${group.id}-${student.id}`,
          name: student.name,
          phone: student.phone,
          status,
          group: group.name,
          teacher: teacher.fullName,
          lessonTime: group.lessonStartTime,
          days: group.days,
          course: group.course,
          attendance,
          lastComment: "",
        });
        uid++;
      });
    });
  });

  return rows;
}

const ALL_DATA = buildRows();

// ─── Constants ────────────────────────────────────────────────────────────────
const STATUSES: StudentStatus[] = ["Active", "Inactive", "Frozen (paused)"];
const ATTENDANCES: AttendanceStatus[] = ["Attended", "Not attended", "Excused"];

function attendanceColor(a: AttendanceStatus) {
  if (a === "Attended") return "#22c55e";
  if (a === "Not attended") return "#f59e0b";
  return "#3b82f6";
}

function statusColor(s: StudentStatus) {
  if (s === "Active") return "#22c55e";
  if (s === "Inactive") return "#ef4444";
  return "#6b7280";
}

type SortKey = "name" | "group";
type SortDir = "asc" | "desc";

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  return (
    <span className="inline-flex flex-col ml-1 leading-none text-[9px]">
      <span style={{ color: active && dir === "asc" ? "#3b82f6" : "#ccc" }}>▲</span>
      <span style={{ color: active && dir === "desc" ? "#3b82f6" : "#ccc" }}>▼</span>
    </span>
  );
}

// ─── Pagination ───────────────────────────────────────────────────────────────
const PER_PAGE = 10;

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

// ─── Main ─────────────────────────────────────────────────────────────────────
export const AttendanceReport = () => {
  const today = new Date().toISOString().slice(0, 10);

  const [date, setDate] = useState(today);
  const [filterName, setFilterName] = useState("");
  const [filterPhone, setFilterPhone] = useState("");
  const [filterStatus, setFilterStatus] = useState<StudentStatus | "">("");
  const [filterGroup, setFilterGroup] = useState("");
  const [filterTeacher, setFilterTeacher] = useState("");
  const [filterAttend, setFilterAttend] = useState<AttendanceStatus | "">("");
  const [applied, setApplied] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [page, setPage] = useState(1);

  const groups = [...new Set(ALL_DATA.map((d) => d.group))];
  const teachers = [...new Set(ALL_DATA.map((d) => d.teacher))];

  const filtered = useMemo(() => {
    let data = [...ALL_DATA];
    if (applied) {
      if (filterName) data = data.filter((d) => d.name.toLowerCase().includes(filterName.toLowerCase()));
      if (filterPhone) data = data.filter((d) => d.phone.includes(filterPhone));
      if (filterStatus) data = data.filter((d) => d.status === filterStatus);
      if (filterGroup) data = data.filter((d) => d.group === filterGroup);
      if (filterTeacher) data = data.filter((d) => d.teacher === filterTeacher);
      if (filterAttend) data = data.filter((d) => d.attendance === filterAttend);
    }
    data.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
    });
    return data;
  }, [applied, filterName, filterPhone, filterStatus, filterGroup, filterTeacher, filterAttend, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const pageSlice = filtered.slice((safePage - 1) * PER_PAGE, safePage * PER_PAGE);
  const paginationRange = getPaginationRange(safePage, totalPages);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  }

  function applyFilters() {
    setApplied(true);
    setPage(1);
  }

  function clearFilters() {
    setFilterName(""); setFilterPhone(""); setFilterStatus("");
    setFilterGroup(""); setFilterTeacher(""); setFilterAttend("");
    setApplied(false);
    setPage(1);
  }

  const inputSx = {
    "& .MuiInputBase-input": { fontSize: 13, py: "7px" },
    "& .MuiOutlinedInput-notchedOutline": { borderColor: "#e5e7eb" },
    "& .MuiInputBase-root": { backgroundColor: "#fff" },
  };

  const selectSx = {
    fontSize: 13,
    "& .MuiOutlinedInput-notchedOutline": { borderColor: "#e5e7eb" },
    backgroundColor: "#fff",
  };

  return (
    <div className="p-5 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-baseline gap-3 mb-5">
        <h1 className="text-2xl font-semibold text-gray-800">Attendance reports</h1>
        <span className="text-gray-400 text-sm">Quantity — {filtered.length}</span>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap gap-2 items-center mb-5">
        {/* Date */}
        <div className="relative">
          <FiCalendar className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 z-10" size={14} />
          <TextField
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            size="small"
            sx={{ ...inputSx, "& .MuiInputBase-root": { pl: "2rem", backgroundColor: "#fff", minWidth: 150 } }}
          />
        </div>

        <TextField placeholder="Name" value={filterName} onChange={(e) => setFilterName(e.target.value)} size="small" sx={{ ...inputSx, minWidth: 130 }} />
        <TextField placeholder="Phone" value={filterPhone} onChange={(e) => setFilterPhone(e.target.value)} size="small" sx={{ ...inputSx, minWidth: 120 }} />

        <FormControl size="small" sx={{ minWidth: 140 }}>
          <Select displayEmpty value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as StudentStatus | "")} sx={selectSx}>
            <MenuItem value="" sx={{ fontSize: 13, color: "#9ca3af" }}>Status</MenuItem>
            {STATUSES.map((s) => <MenuItem key={s} value={s} sx={{ fontSize: 13 }}>{s}</MenuItem>)}
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 140 }}>
          <Select displayEmpty value={filterGroup} onChange={(e) => setFilterGroup(e.target.value)} sx={selectSx}>
            <MenuItem value="" sx={{ fontSize: 13, color: "#9ca3af" }}>Group</MenuItem>
            {groups.map((g) => <MenuItem key={g} value={g} sx={{ fontSize: 13 }}>{g}</MenuItem>)}
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 160 }}>
          <Select displayEmpty value={filterTeacher} onChange={(e) => setFilterTeacher(e.target.value)} sx={selectSx}>
            <MenuItem value="" sx={{ fontSize: 13, color: "#9ca3af" }}>Teacher</MenuItem>
            {teachers.map((t) => <MenuItem key={t} value={t} sx={{ fontSize: 13 }}>{t}</MenuItem>)}
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 150 }}>
          <Select displayEmpty value={filterAttend} onChange={(e) => setFilterAttend(e.target.value as AttendanceStatus | "")} sx={selectSx}>
            <MenuItem value="" sx={{ fontSize: 13, color: "#9ca3af" }}>Attendance</MenuItem>
            {ATTENDANCES.map((a) => <MenuItem key={a} value={a} sx={{ fontSize: 13 }}>{a}</MenuItem>)}
          </Select>
        </FormControl>

        <button onClick={applyFilters} className="px-5 py-[7px] bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded transition-colors">
          Filter
        </button>
        <IconButton size="small" onClick={clearFilters} sx={{ color: "#9ca3af" }}>
          <FiX size={18} />
        </IconButton>
      </div>

      {/* Table */}
      <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ backgroundColor: "#fafafa" }}>
              <TableCell sx={thSx}>№</TableCell>
              <TableCell sx={{ ...thSx, cursor: "pointer" }} onClick={() => toggleSort("name")}>
                Name <SortIcon active={sortKey === "name"} dir={sortDir} />
              </TableCell>
              <TableCell sx={thSx}>Phone</TableCell>
              <TableCell sx={thSx}>Status</TableCell>
              <TableCell sx={{ ...thSx, cursor: "pointer" }} onClick={() => toggleSort("group")}>
                Group <SortIcon active={sortKey === "group"} dir={sortDir} />
              </TableCell>
              <TableCell sx={thSx}>Teacher</TableCell>
              <TableCell sx={thSx}>Lesson time</TableCell>
              <TableCell sx={thSx}>Attendance</TableCell>
              <TableCell sx={thSx}>Last comment</TableCell>
              <TableCell sx={thSx}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {pageSlice.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} align="center" sx={{ py: 6, color: "#9ca3af", fontSize: 14 }}>
                  No Data
                </TableCell>
              </TableRow>
            ) : (
              pageSlice.map((row, i) => (
                <TableRow key={row.uid} hover sx={{ "&:last-child td": { borderBottom: 0 } }}>
                  <TableCell sx={{ color: "#9ca3af", fontSize: 13, width: 48 }}>{(safePage - 1) * PER_PAGE + i + 1}</TableCell>
                  <TableCell sx={{ fontSize: 14, minWidth: 180 }}>{row.name}</TableCell>
                  <TableCell sx={{ fontSize: 13, color: "#3b82f6", whiteSpace: "nowrap" }}>{row.phone}</TableCell>
                  <TableCell sx={{ fontSize: 13, whiteSpace: "nowrap" }}>
                    <span style={{ color: statusColor(row.status) }} className="font-medium">{row.status}</span>
                  </TableCell>
                  <TableCell sx={{ fontSize: 13 }}>{row.group}</TableCell>
                  <TableCell sx={{ fontSize: 13 }}>{row.teacher}</TableCell>
                  <TableCell sx={{ fontSize: 13, whiteSpace: "nowrap" }}>{row.lessonTime}</TableCell>
                  <TableCell sx={{ fontSize: 13, whiteSpace: "nowrap" }}>
                    <span style={{ color: attendanceColor(row.attendance) }} className="font-medium">{row.attendance}</span>
                  </TableCell>
                  <TableCell sx={{ fontSize: 13, color: "#6b7280" }}>{row.lastComment || ""}</TableCell>
                  <TableCell sx={{ fontSize: 13 }}>
                    <IconButton size="small" sx={{ color: "#3b82f6" }}>
                      <FiEdit2 size={15} />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Pagination */}
      <div className="flex items-center justify-between mt-4 flex-wrap gap-3">
        <span className="text-sm text-gray-400">
          {filtered.length > 0
            ? `${(safePage - 1) * PER_PAGE + 1}–${Math.min(safePage * PER_PAGE, filtered.length)} / ${filtered.length}`
            : ""}
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={safePage === 1}
            className="px-3 py-1 text-sm border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            ‹
          </button>
          {paginationRange.map((p, idx) =>
            p === "…" ? (
              <span key={`ellipsis-${idx}`} className="px-2 text-sm text-gray-400">…</span>
            ) : (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`px-3 py-1 text-sm border rounded transition-colors ${
                  p === safePage
                    ? "bg-blue-500 text-white border-blue-500"
                    : "border-gray-200 hover:bg-gray-50"
                }`}
              >
                {p}
              </button>
            )
          )}
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={safePage === totalPages}
            className="px-3 py-1 text-sm border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            ›
          </button>
        </div>
      </div>
    </div>
  );
};

const thSx = {
  fontWeight: 600,
  fontSize: 13,
  color: "#6b7280",
  whiteSpace: "nowrap" as const,
  userSelect: "none" as const,
};