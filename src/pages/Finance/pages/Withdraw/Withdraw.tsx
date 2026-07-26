import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Dot,
} from "recharts";
import {
  Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Pagination,
} from "@mui/material";
import { FiXCircle } from "react-icons/fi";
import { BsCash } from "react-icons/bs";

// ── Reuse the SAME student data source & types as the Students page ─────────
import { buildFlatStudents, FlatStudent } from "../../../../constants/FlatStudents";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Withdrawal {
  id: number;
  studentUid: string; // links back to the FlatStudent this withdrawal belongs to
  date: string;
  name: string;
  sum: number;
  comment: string;
  commentBadge?: string;
  commentLessons?: string;
  commentDateRange?: string;
  creator: string;
  createdAt: string;
}

// ─── Mock data ────────────────────────────────────────────────────────────────

const CREATORS = ["Maksuda Abraykulova", "Iskandar Tojiyev", "Nodira Yusupova"];
const BADGES   = ["Royal Students", "Achievers", "Developers", "Dominators", "Leaders", "Pioneers"];
const LESSONS  = ["12 les.", "9 les.", "4 les.", "2 les.", "7 les.", "15 les.", "6 les."];

const RAW_DATES = [
  "2024-02-27","2024-10-07","2024-10-11","2024-10-25","2025-02-10",
  "2025-03-15","2025-04-02","2025-05-18","2025-06-22","2025-07-09",
  "2025-08-14","2025-09-03","2025-10-19","2025-11-28","2025-12-05",
  "2026-01-11","2026-01-25","2026-02-08","2026-02-20","2026-03-03",
  "2026-03-17","2026-03-29","2026-04-04","2026-04-14","2026-04-22",
  "2026-05-01","2026-05-05","2026-05-07","2026-05-09","2026-05-09",
];

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function generateWithdrawals(students: FlatStudent[]): Withdrawal[] {
  const list: Withdrawal[] = [];
  if (students.length === 0) return list;

  for (let i = 0; i < 30; i++) {
    const dateRaw  = RAW_DATES[i % RAW_DATES.length];
    const student  = students[i % students.length];
    const hasGroup = i % 5 !== 0; // har 5-chida "not assigned"
    const badge    = BADGES[i % BADGES.length];
    const lessons  = LESSONS[i % LESSONS.length];
    const endDate  = addDays(dateRaw, 21);
    const startDate = addDays(dateRaw, -7);
    const h  = String(17 + (i % 5)).padStart(2, "0");
    const m  = String((i * 7) % 60).padStart(2, "0");
    const s  = String((i * 13) % 60).padStart(2, "0");
    const cr = CREATORS[i % CREATORS.length];
    const fmtD = (d: string) => d.split("-").reverse().join(".");

    list.push({
      id: i + 1,
      studentUid: student.uid,
      date: dateRaw,
      name: student.name,
      sum: 30000 + (i * 17483) % 200000,
      comment: hasGroup ? "" : "not assigned",
      commentBadge:     hasGroup ? badge : undefined,
      commentLessons:   hasGroup ? lessons : undefined,
      commentDateRange: hasGroup ? `${fmtD(startDate)} - ${fmtD(endDate)}` : undefined,
      creator: cr,
      createdAt: `${fmtD(dateRaw)} ${h}:${m}:${s}`,
    });
  }
  return list;
}

// ─── Chart ────────────────────────────────────────────────────────────────────

const CHART_DATA = [
  { label: "Sep 23", value: 2000000 },
  { label: "Oct 23", value: 8000000 },
  { label: "Nov 23", value: 15000000 },
  { label: "Dec 23", value: 20000000 },
  { label: "Jan 24", value: 35000000 },
  { label: "Feb 24", value: 60000000 },
  { label: "Mar 24", value: 42000000 },
  { label: "Apr 24", value: 100000000 },
  { label: "May 24", value: 95000000 },
  { label: "Jun 24", value: 88000000 },
  { label: "Jul 24", value: 90000000 },
  { label: "Aug 24", value: 92000000 },
  { label: "Sep 24", value: 88000000 },
  { label: "Oct 24", value: 90000000 },
  { label: "Nov 24", value: 88000000 },
  { label: "Dec 24", value: 92000000 },
  { label: "Jan 25", value: 95000000 },
  { label: "Feb 25", value: 90000000 },
  { label: "Mar 25", value: 88000000 },
  { label: "Apr 25", value: 85000000 },
  { label: "May 25", value: 88000000 },
  { label: "Jun 25", value: 90000000 },
  { label: "Jul 25", value: 92000000 },
  { label: "Aug 25", value: 90000000 },
  { label: "Sep 25", value: 88000000 },
  { label: "Oct 25", value: 85000000 },
  { label: "Nov 25", value: 130000000 },
  { label: "Dec 25", value: 150000000 },
  { label: "Jan 26", value: 160000000 },
  { label: "Feb 26", value: 170000000 },
  { label: "Mar 26", value: 175000000 },
  { label: "Apr 26", value: 190000000 },
  { label: "May 26", value: 178000000 },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt     = (n: number) => n.toLocaleString("ru-RU");
const fmtDate = (d: string) => d.split("-").reverse().join(".");

const PAGE_SIZE = 20;

// ─── Small UI pieces ──────────────────────────────────────────────────────────

const Label = ({ text }: { text: string }) => (
  <label className="block text-[10px] text-gray-500 font-medium mb-1">{text}</label>
);

const Input = ({ value, onChange, placeholder }: {
  value: string; onChange: (v: string) => void; placeholder?: string;
}) => (
  <input
    value={value}
    onChange={(e) => onChange(e.target.value)}
    placeholder={placeholder}
    className="w-full border border-gray-200 rounded-md px-2 py-[7px] text-xs text-gray-700 bg-white focus:outline-none focus:ring-1 focus:ring-[#003366]"
  />
);

const Select = ({ value, onChange, options, placeholder = "Select" }: {
  value: string; onChange: (v: string) => void; options: string[]; placeholder?: string;
}) => (
  <select
    value={value}
    onChange={(e) => onChange(e.target.value)}
    className="w-full border border-gray-200 rounded-md px-2 py-[7px] text-xs text-gray-700 bg-white focus:outline-none focus:ring-1 focus:ring-[#003366] cursor-pointer"
  >
    <option value="">{placeholder}</option>
    {options.map((o) => <option key={o} value={o}>{o}</option>)}
  </select>
);

const SortIcon = ({ active, dir }: { active: boolean; dir: "asc" | "desc" }) => (
  <span className={`ml-1 text-[10px] ${active ? "text-[#003366]" : "text-gray-300"}`}>
    {active ? (dir === "asc" ? "▲" : "▼") : "⇅"}
  </span>
);

// ─── Main ─────────────────────────────────────────────────────────────────────

type SortKey = "date" | "name" | "sum" | "creator";

export const Withdraw = () => {
  const navigate = useNavigate();

  // Same student source/structure as the Students page
  const students = useMemo(() => buildFlatStudents(), []);
  const ALL_WITHDRAWALS = useMemo(() => generateWithdrawals(students), [students]);
  const ALL_COURSES = useMemo(() => [...new Set(students.map((s) => s.course))], [students]);
  const TOTAL = useMemo(() => ALL_WITHDRAWALS.reduce((a, w) => a + w.sum, 0), [ALL_WITHDRAWALS]);

  const [dateFrom,  setDateFrom]  = useState("01.05.2026");
  const [dateTo,    setDateTo]    = useState("31.05.2026");
  const [namePhone, setNamePhone] = useState("");
  const [sum,       setSum]       = useState("");
  const [course,    setCourse]    = useState("");

  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page,    setPage]    = useState(1);

  const filtered = useMemo(() => {
    return ALL_WITHDRAWALS
      .filter((w) => {
        if (namePhone && !w.name.toLowerCase().includes(namePhone.toLowerCase())) return false;
        if (sum && String(w.sum) !== sum) return false;
        return true;
      })
      .sort((a, b) => {
        const cmp = String(a[sortKey]).localeCompare(String(b[sortKey]), undefined, { numeric: true });
        return sortDir === "asc" ? cmp : -cmp;
      });
  }, [ALL_WITHDRAWALS, namePhone, sum, sortKey, sortDir]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  };

  const handleDelete = (id: number) => {
    console.log("Delete withdrawal:", id);
  };

  const goToStudent = (uid: string) => navigate(`/students/${uid}`);

  return (
    <div className="p-6 bg-gray-50 min-h-screen">

      {/* Title */}
      <h1 className="text-2xl font-semibold text-gray-900 mb-5">Withdraw</h1>

      {/* Top: stat card + chart */}
      <div className="grid grid-cols-5 gap-4 mb-5">

        {/* Stat card */}
        <div className="col-span-2">
          <div className="bg-white rounded-xl border border-gray-200 border-l-[5px] border-l-[#003366] px-6 py-5 flex items-center justify-between shadow-sm h-full">
            <div>
              <p className="text-sm text-gray-500 font-medium mb-2">Total withdrawals:</p>
              <p className="text-2xl font-bold text-gray-900 tracking-tight">
                {fmt(TOTAL)}{" "}
                <span className="text-base font-semibold text-gray-500">UZS</span>
              </p>
              <p className="text-xs text-gray-400 mt-2">
                📅 {dateFrom} — {dateTo}
              </p>
            </div>
            <BsCash size={40} className="text-[#003366] opacity-80 shrink-0 ml-4" />
          </div>
        </div>

        {/* Chart */}
        <div className="col-span-3 bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={CHART_DATA} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 8, fill: "#9ca3af" }}
                interval={1}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 8, fill: "#9ca3af" }}
                tickFormatter={(v) => `${Math.round(v / 1000000)}M`}
                tickLine={false}
                axisLine={false}
                width={52}
              />
              <Tooltip
                formatter={(v) => v !== undefined ? [`${fmt(v as number)} UZS`, "Revenue"] : null}
                contentStyle={{ fontSize: 11, borderRadius: 6, border: "1px solid #e5e9f0" }}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#e07020"
                strokeWidth={2}
                dot={<Dot r={3} fill="#e07020" stroke="#fff" strokeWidth={1.5} />}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm mb-4 px-5 py-4">
        <div className="grid grid-cols-6 gap-3 items-end">
          <div>
            <Label text="Date from" />
            <Input value={dateFrom} onChange={setDateFrom} placeholder="01.05.2026" />
          </div>
          <div>
            <Label text="Date to" />
            <Input value={dateTo} onChange={setDateTo} placeholder="31.05.2026" />
          </div>
          <div>
            <Label text="Name or Phone" />
            <Input value={namePhone} onChange={setNamePhone} placeholder="" />
          </div>
          <div>
            <Label text="Sum" />
            <Input value={sum} onChange={setSum} placeholder="" />
          </div>
          <div>
            <Label text="Course" />
            <Select value={course} onChange={setCourse} options={ALL_COURSES} />
          </div>
          <div>
            <button
              className="w-full bg-[#003366] text-white rounded-md py-[7px] text-xs font-medium hover:bg-[#002244] transition-colors"
              onClick={() => setPage(1)}
            >
              Filter
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ backgroundColor: "#f9fafb" }}>
                {(
                  [
                    { key: "date",    label: "Date" },
                    { key: "name",    label: "Name" },
                    { key: "sum",     label: "Sum" },
                    { key: null,      label: "Comment" },
                    { key: "creator", label: "Creator" },
                    { key: null,      label: "Actions" },
                  ] as { key: SortKey | null; label: string }[]
                ).map(({ key, label }) => (
                  <TableCell
                    key={label}
                    onClick={() => key && handleSort(key)}
                    align={label === "Actions" ? "center" : "left"}
                    sx={{
                      fontWeight: 700,
                      fontSize: 12,
                      color: "#374151",
                      cursor: key ? "pointer" : "default",
                      whiteSpace: "nowrap",
                      borderBottom: "2px solid #e5e9f0",
                      py: 1.5,
                      userSelect: "none",
                    }}
                  >
                    {label}
                    {key && <SortIcon active={sortKey === key} dir={sortDir} />}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>

            <TableBody>
              {paginated.map((w, i) => {
                const rowNum = (page - 1) * PAGE_SIZE + i + 1;
                return (
                  <TableRow
                    key={w.id}
                    hover
                    onClick={() => goToStudent(w.studentUid)}
                    sx={{
                      cursor: "pointer",
                      "&:hover": { backgroundColor: "#f0f6ff !important" },
                      backgroundColor: i % 2 === 0 ? "#fff" : "#fafbfc",
                    }}
                  >
                    {/* Date */}
                    <TableCell sx={{ fontSize: 12, py: 1.5, whiteSpace: "nowrap", fontWeight: 500, color: "#374151", minWidth: 110 }}>
                      {rowNum}. {fmtDate(w.date)}
                    </TableCell>

                    {/* Name */}
                    <TableCell sx={{ fontSize: 12, py: 1.5, color: "#374151", minWidth: 180 }}>
                      {w.name}
                    </TableCell>

                    {/* Sum */}
                    <TableCell sx={{ fontSize: 12, py: 1.5, whiteSpace: "nowrap", minWidth: 130 }}>
                      <span className="font-bold text-gray-900 text-sm">{fmt(w.sum)}</span>
                      <span className="text-[11px] text-gray-400 ml-1">UZS</span>
                    </TableCell>

                    {/* Comment */}
                    <TableCell sx={{ fontSize: 12, py: 1.5, minWidth: 200 }}>
                      {w.comment === "not assigned" ? (
                        <span className="text-gray-400 italic text-xs">not assigned</span>
                      ) : (
                        <div>
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="bg-gray-800 text-white text-[10px] font-medium px-2 py-[2px] rounded">
                              {w.commentBadge}
                            </span>
                            <span className="text-xs text-gray-500">{w.commentLessons}</span>
                          </div>
                          <p className="text-[11px] text-gray-400">{w.commentDateRange}</p>
                        </div>
                      )}
                    </TableCell>

                    {/* Creator */}
                    <TableCell sx={{ fontSize: 12, py: 1.5, minWidth: 160 }}>
                      <span className="text-gray-700 text-xs">{w.creator}</span>
                      <br />
                      <span className="text-[11px] text-gray-400">{w.createdAt}</span>
                    </TableCell>

                    {/* Actions */}
                    <TableCell align="center" sx={{ py: 1.5 }} onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleDelete(w.id)}
                        className="text-red-400 hover:text-red-600 transition-colors"
                        title="Delete"
                      >
                        <FiXCircle size={20} />
                      </button>
                    </TableCell>
                  </TableRow>
                );
              })}

              {paginated.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4, color: "#9ca3af", fontSize: 13 }}>
                    No withdrawals found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Footer */}
        <div className="flex justify-between items-center px-4 py-3 border-t border-gray-100">
          <span className="text-xs text-gray-500">
            Showing{" "}
            <strong className="text-gray-700">
              {Math.min((page - 1) * PAGE_SIZE + 1, filtered.length)}–{Math.min(page * PAGE_SIZE, filtered.length)}
            </strong>{" "}
            of <strong className="text-gray-700">{filtered.length}</strong> withdrawals
          </span>

          {totalPages > 1 && (
            <Pagination
              count={totalPages}
              page={page}
              onChange={(_, v) => setPage(v)}
              size="small"
              shape="rounded"
              sx={{
                "& .MuiPaginationItem-root": { fontSize: 12, color: "#374151" },
                "& .Mui-selected": {
                  backgroundColor: "#003366 !important",
                  color: "#fff !important",
                },
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
};