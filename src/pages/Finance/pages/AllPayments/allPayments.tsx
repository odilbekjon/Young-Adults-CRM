import { useState, useMemo } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Dot,
} from "recharts";
import {
  Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Collapse, Pagination,
} from "@mui/material";
import { FiFilter, FiChevronDown, FiChevronUp, FiInfo } from "react-icons/fi";
import { BsCash, BsGraphUp } from "react-icons/bs";
import { TEACHERS_DATA } from "../../../../constants/Teachers";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Payment {
  id: number;
  date: string;
  name: string;
  sum: number;
  methodPay: "Cash" | "Click" | "Payme" | "Transfer" | "Bank" | "UZCARD" | "Uzum" | "Humo";
  teacher: string;
  comment: string;
  creator: string;
  createdAt: string;
  groupName: string;
  course: string;
}

type SortKey = keyof Pick<Payment, "date" | "name" | "sum" | "methodPay" | "teacher" | "creator">;

// ─── Constants ────────────────────────────────────────────────────────────────

const METHOD_PAY: Payment["methodPay"][] = ["Cash", "Click", "Payme", "Transfer", "Bank", "UZCARD", "Uzum", "Humo"];
const COMMENTS   = ["Computer Engineers", "BandForce", "IELTS Prep", "Kids English", "SAT Group", "Speaking Club"];
const CREATOR    = "Maksuda Abraykulova";
const PAGE_SIZE  = 20;

const DATES = [
  "2026-05-09","2026-05-09","2026-05-09","2026-05-09",
  "2026-05-08","2026-05-08","2026-05-08",
  "2026-05-07","2026-05-07","2026-05-07",
  "2026-05-06","2026-05-06",
  "2026-05-05","2026-05-05","2026-05-05",
  "2026-05-04","2026-05-04",
  "2026-05-03","2026-05-03","2026-05-03",
  "2026-05-02","2026-05-02","2026-05-02",
  "2026-05-01","2026-05-01",
  "2026-04-30","2026-04-30","2026-04-29","2026-04-29","2026-04-28",
];

// ─── Generate 30 payments (pagination demo uchun) ─────────────────────────────

function generatePayments(): Payment[] {
  const payments: Payment[] = [];
  let id = 1;
  let di = 0;

  // 3 marta aylantiramiz — 30 ta to'lov
  for (let round = 0; round < 3; round++) {
    for (const teacher of TEACHERS_DATA) {
      for (const group of teacher.groups) {
        for (const student of group.students) {
          if (id > 30) break;
          const date = DATES[di % DATES.length];
          const h = String(17 + (id % 5)).padStart(2, "0");
          const m = String((id * 7) % 60).padStart(2, "0");
          const s = String((id * 13) % 60).padStart(2, "0");
          payments.push({
            id,
            date,
            name: student.name,
            sum: group.price ?? 400000,
            methodPay: METHOD_PAY[id % METHOD_PAY.length],
            teacher: teacher.fullName,
            comment: COMMENTS[id % COMMENTS.length],
            creator: CREATOR,
            createdAt: `${date.split("-").reverse().join(".")} ${h}:${m}:${s}`,
            groupName: group.name,
            course: group.course,
          });
          id++;
          di++;
        }
        if (id > 30) break;
      }
      if (id > 30) break;
    }
    if (id > 30) break;
  }
  return payments;
}

const ALL_PAYMENTS = generatePayments();

// ─── Details breakdown (method bo'yicha) ─────────────────────────────────────

const DETAIL_METHODS = ["Bank account", "Cash", "Click", "UZCARD", "Payme", "Uzum", "Humo"] as const;

function calcDetails(payments: Payment[]) {
  const map: Record<string, number> = {
    "Bank account": 0, Cash: 0, Click: 0,
    UZCARD: 0, Payme: 0, Uzum: 0, Humo: 0,
  };
  for (const p of payments) {
    if (p.methodPay === "Bank")   map["Bank account"] += p.sum;
    else if (p.methodPay in map)  map[p.methodPay]    += p.sum;
    else                          map["Cash"]          += p.sum;
  }
  return map;
}

// ─── Chart data ───────────────────────────────────────────────────────────────

const CHART_DATA = [
  { label: "Sep 23", value: 5000000 },
  { label: "Oct 23", value: 18000000 },
  { label: "Dec 23", value: 22000000 },
  { label: "Jan 24", value: 85000000 },
  { label: "Feb 24", value: 80000000 },
  { label: "Mar 24", value: 88000000 },
  { label: "Apr 24", value: 75000000 },
  { label: "May 24", value: 82000000 },
  { label: "Jun 24", value: 78000000 },
  { label: "Jul 24", value: 80000000 },
  { label: "Aug 24", value: 85000000 },
  { label: "Sep 24", value: 88000000 },
  { label: "Oct 24", value: 90000000 },
  { label: "Nov 24", value: 85000000 },
  { label: "Dec 24", value: 92000000 },
  { label: "Jan 25", value: 88000000 },
  { label: "Feb 25", value: 95000000 },
  { label: "Mar 25", value: 155000000 },
  { label: "Apr 25", value: 100000000 },
  { label: "May 25", value: 75000000 },
  { label: "Jun 25", value: 68000000 },
  { label: "Jul 25", value: 72000000 },
  { label: "Aug 25", value: 78000000 },
  { label: "Sep 25", value: 82000000 },
  { label: "Oct 25", value: 110000000 },
  { label: "Nov 25", value: 115000000 },
  { label: "Dec 25", value: 120000000 },
  { label: "Jan 26", value: 125000000 },
  { label: "Feb 26", value: 130000000 },
  { label: "Mar 26", value: 140000000 },
  { label: "Apr 26", value: 155000000 },
  { label: "May 26", value: 30000000 },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt     = (n: number) => n.toLocaleString("ru-RU");
const fmtDate = (d: string) => d.split("-").reverse().join(".");

const ALL_TEACHERS = [...new Set(TEACHERS_DATA.map((t) => t.fullName))];
const ALL_GROUPS   = [...new Set(TEACHERS_DATA.flatMap((t) => t.groups.map((g) => g.name)))];
const ALL_COURSES  = [...new Set(TEACHERS_DATA.flatMap((t) => t.groups.map((g) => g.course)))];

// ─── Reusable UI ─────────────────────────────────────────────────────────────

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

// ─── Main Component ───────────────────────────────────────────────────────────

export const AllPayments = () => {
  // Filter
  const [dateFrom,    setDateFrom]    = useState("01.05.2026");
  const [dateTo,      setDateTo]      = useState("31.05.2026");
  const [namePhone,   setNamePhone]   = useState("");
  const [group,       setGroup]       = useState("");
  const [course,      setCourse]      = useState("");
  const [teacher,     setTeacher]     = useState("");
  const [methodPay,   setMethodPay]   = useState("");
  const [sum,         setSum]         = useState("");
  const [staffName,   setStaffName]   = useState("");
  const [fromCreated, setFromCreated] = useState("");
  const [toCreated,   setToCreated]   = useState("");

  // UI state
  const [showFilters, setShowFilters] = useState(true);
  const [showDetails, setShowDetails] = useState(false);
  const [page,        setPage]        = useState(1);

  // Sort
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const totalRevenue = ALL_PAYMENTS.reduce((a, p) => a + p.sum, 0);
  const details      = calcDetails(ALL_PAYMENTS);

  // Filtered + sorted list
  const filtered = useMemo(() => {
    return ALL_PAYMENTS
      .filter((p) => {
        if (namePhone && !p.name.toLowerCase().includes(namePhone.toLowerCase())) return false;
        if (group     && p.groupName !== group)    return false;
        if (course    && p.course    !== course)   return false;
        if (teacher   && p.teacher   !== teacher)  return false;
        if (methodPay && p.methodPay !== methodPay) return false;
        if (sum       && String(p.sum) !== sum)    return false;
        return true;
      })
      .sort((a, b) => {
        const cmp = String(a[sortKey]).localeCompare(String(b[sortKey]), undefined, { numeric: true });
        return sortDir === "asc" ? cmp : -cmp;
      });
  }, [namePhone, group, course, teacher, methodPay, sum, sortKey, sortDir]);

  // Pagination
  const totalPages  = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated   = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const filteredTotal = filtered.reduce((a, p) => a + p.sum, 0);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  };

  const resetFilters = () => {
    setNamePhone(""); setGroup(""); setCourse(""); setTeacher("");
    setMethodPay(""); setSum(""); setStaffName(""); setFromCreated(""); setToCreated("");
    setPage(1);
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">

      {/* ── Title ── */}
      <h1 className="text-2xl font-semibold text-gray-900 mb-5">All payments</h1>

      {/* ── Stats + Chart ── */}
      <div className="grid grid-cols-5 gap-4 mb-5">

        {/* Left: stat cards */}
        <div className="col-span-2 flex flex-col gap-4">

          {/* Total Revenue */}
          <div className="bg-white rounded-xl border border-gray-200 border-l-[5px] border-l-[#003366] px-6 py-5 flex items-center justify-between shadow-sm">
            <div>
              <p className="text-sm text-gray-500 font-medium mb-2">Total Revenue:</p>
              <p className="text-3xl font-bold text-gray-900 tracking-tight">
                {fmt(totalRevenue)}
                <span className="text-lg font-semibold text-gray-500 ml-2">UZS</span>
              </p>
              <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                📅 {dateFrom} — {dateTo}
              </p>
            </div>
            <BsCash size={40} className="text-[#003366] opacity-80 shrink-0 ml-4" />
          </div>

          {/* Total Net Profit */}
          <div className="bg-white rounded-xl border border-gray-200 border-l-[5px] border-l-[#003366] px-6 py-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm text-gray-500 font-medium mb-2">Total Net Profit:</p>
                <p className="text-3xl font-bold text-gray-900 tracking-tight">
                  {fmt(totalRevenue)}
                  <span className="text-lg font-semibold text-gray-500 ml-2">UZS</span>
                </p>
                <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                  📅 {dateFrom} — {dateTo}
                </p>
              </div>
              <BsGraphUp size={38} className="text-[#003366] opacity-80 shrink-0 ml-4" />
            </div>

            {/* Details toggle */}
            <button
              onClick={() => setShowDetails((v) => !v)}
              className="mt-4 flex items-center gap-1.5 text-xs text-gray-500 hover:text-[#003366] transition-colors group"
            >
              <FiInfo size={13} className="group-hover:text-[#003366]" />
              <span>Details</span>
              {showDetails
                ? <FiChevronUp size={13} />
                : <FiChevronDown size={13} />}
            </button>

            {/* Details list */}
            <Collapse in={showDetails}>
              <div className="mt-3 pt-3 border-t border-gray-100 space-y-1.5">
                {DETAIL_METHODS.map((method) => (
                  <div key={method} className="flex items-center gap-2 text-sm text-gray-700">
                    <span className="text-gray-400 text-base leading-none">•</span>
                    <span>
                      <span className="font-medium">{method}:</span>{" "}
                      <span className="font-semibold text-gray-800">
                        {fmt(details[method] ?? 0)}
                      </span>{" "}
                      <span className="text-gray-400 text-xs">UZS</span>
                    </span>
                  </div>
                ))}
              </div>
            </Collapse>
          </div>
        </div>

        {/* Right: Chart */}
        <div className="col-span-3 bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <ResponsiveContainer width="100%" height={220}>
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
                width={44}
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

      {/* ── Filter Panel ── */}
      <div className="bg-white rounded-xl border border-gray-200 mb-4 overflow-hidden shadow-sm">
        <button
          onClick={() => setShowFilters((v) => !v)}
          className="w-full flex items-center justify-between px-5 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <span className="flex items-center gap-2">
            <FiFilter size={14} /> Filters
          </span>
          {showFilters ? <FiChevronUp size={16} /> : <FiChevronDown size={16} />}
        </button>

        <Collapse in={showFilters}>
          <div className="px-5 pb-4 border-t border-gray-100">
            {/* Row 1 */}
            <div className="grid grid-cols-8 gap-3 mt-4">
              <div><Label text="Date from" />
                <Input value={dateFrom} onChange={setDateFrom} placeholder="01.05.2026" /></div>
              <div><Label text="Date to" />
                <Input value={dateTo} onChange={setDateTo} placeholder="31.05.2026" /></div>
              <div><Label text="Name or Phone" />
                <Input value={namePhone} onChange={setNamePhone} placeholder="Search..." /></div>
              <div><Label text="Select group" />
                <Select value={group} onChange={setGroup} options={ALL_GROUPS} /></div>
              <div><Label text="Course" />
                <Select value={course} onChange={setCourse} options={ALL_COURSES} /></div>
              <div><Label text="Teacher" />
                <Select value={teacher} onChange={setTeacher} options={ALL_TEACHERS} /></div>
              <div><Label text="Method pay" />
                <Select value={methodPay} onChange={setMethodPay} options={[...METHOD_PAY]} /></div>
              <div><Label text="Sum" />
                <Input value={sum} onChange={setSum} placeholder="Amount" /></div>
            </div>

            {/* Row 2 */}
            <div className="grid grid-cols-8 gap-3 mt-3 items-end">
              <div><Label text="Staff Name" />
                <Select value={staffName} onChange={setStaffName} options={[CREATOR]} /></div>
              <div><Label text="From created date" />
                <Input value={fromCreated} onChange={setFromCreated} placeholder="No date selected" /></div>
              <div><Label text="To created date" />
                <Input value={toCreated} onChange={setToCreated} placeholder="No date selected" /></div>
              <div className="flex gap-2">
                <button
                  onClick={resetFilters}
                  className="flex-1 border border-gray-200 rounded-md py-[7px] text-xs text-gray-500 hover:bg-gray-50 transition-colors"
                >
                  Reset
                </button>
                <button
                  className="flex-1 bg-[#003366] text-white rounded-md py-[7px] text-xs font-medium hover:bg-[#002244] transition-colors"
                >
                  Filter
                </button>
              </div>
            </div>
          </div>
        </Collapse>
      </div>

      {/* ── Table ── */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ backgroundColor: "#f9fafb" }}>
                {(
                  [
                    { key: "date",      label: "Date" },
                    { key: "name",      label: "Name" },
                    { key: "sum",       label: "Sum" },
                    { key: "methodPay", label: "Method pay" },
                    { key: "teacher",   label: "Teacher" },
                    { key: null,        label: "Comment" },
                    { key: "creator",   label: "Creator" },
                  ] as { key: SortKey | null; label: string }[]
                ).map(({ key, label }) => (
                  <TableCell
                    key={label}
                    onClick={() => key && handleSort(key)}
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
              {paginated.map((p, i) => {
                const rowNum = (page - 1) * PAGE_SIZE + i + 1;
                return (
                  <TableRow
                    key={p.id}
                    hover
                    sx={{
                      "&:hover": { backgroundColor: "#f0f6ff !important" },
                      backgroundColor: i % 2 === 0 ? "#fff" : "#fafbfc",
                    }}
                  >
                    <TableCell sx={{ fontSize: 12, py: 1.2, whiteSpace: "nowrap", fontWeight: 500, color: "#374151" }}>
                      {rowNum}. {fmtDate(p.date)}
                    </TableCell>
                    <TableCell sx={{ fontSize: 12, py: 1.2, color: "#374151" }}>
                      {p.name}
                    </TableCell>
                    <TableCell sx={{ fontSize: 12, py: 1.2, whiteSpace: "nowrap" }}>
                      <span className="font-semibold text-gray-900">{fmt(p.sum)}</span>
                      <span className="text-[11px] text-gray-400 ml-1">UZS</span>
                    </TableCell>
                    <TableCell sx={{ fontSize: 12, py: 1.2, color: "#374151" }}>
                      {p.methodPay}
                    </TableCell>
                    <TableCell sx={{ fontSize: 12, py: 1.2, color: "#374151" }}>
                      {p.teacher}
                    </TableCell>
                    <TableCell sx={{ fontSize: 12, py: 1.2 }}>
                      <span className="bg-gray-100 border border-gray-200 rounded px-2 py-[2px] text-[11px] text-gray-700 whitespace-nowrap">
                        {p.comment}
                      </span>
                    </TableCell>
                    <TableCell sx={{ fontSize: 12, py: 1.2 }}>
                      <span className="text-gray-700 text-xs">{p.creator}</span>
                      <br />
                      <span className="text-[11px] text-gray-400">{p.createdAt}</span>
                    </TableCell>
                  </TableRow>
                );
              })}

              {paginated.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4, color: "#9ca3af", fontSize: 13 }}>
                    No payments found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Footer: total + pagination */}
        <div className="flex justify-between items-center px-4 py-3 border-t border-gray-100">
          <span className="text-xs text-gray-500">
            Showing{" "}
            <strong className="text-gray-700">
              {Math.min((page - 1) * PAGE_SIZE + 1, filtered.length)}–{Math.min(page * PAGE_SIZE, filtered.length)}
            </strong>{" "}
            of <strong className="text-gray-700">{filtered.length}</strong> payments
            {" · "}
            <span className="font-semibold text-[#003366]">{fmt(filteredTotal)} UZS</span>
          </span>

          {totalPages > 1 && (
            <Pagination
              count={totalPages}
              page={page}
              onChange={(_, v) => setPage(v)}
              size="small"
              shape="rounded"
              sx={{
                "& .MuiPaginationItem-root": {
                  fontSize: 12,
                  color: "#374151",
                },
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