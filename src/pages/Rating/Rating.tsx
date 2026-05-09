import { useState, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  MenuItem,
  Select,
  FormControl,
  TextField,
  IconButton,
  Tabs,
  Tab,
  Box,
} from "@mui/material";
import {
  FiCalendar,
  FiChevronLeft,
  FiChevronRight,
} from "react-icons/fi";
import { MdBarChart, MdTableChart } from "react-icons/md";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { ALL_STUDENTS } from "../../constants/Students";



const PAGE_SIZES = [10, 20, 50];

// ─── Grade color helper ───────────────────────────────────────────────────────
function gradeColor(g: number) {
  if (g >= 90) return "#22c55e";
  if (g >= 75) return "#3b82f6";
  if (g >= 60) return "#f59e0b";
  return "#ef4444";
}

// ─── Sort icon ────────────────────────────────────────────────────────────────
type SortKey = "name" | "group" | "grade";
type SortDir = "asc" | "desc";

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  return (
    <span className="inline-flex flex-col ml-1 leading-none text-[10px]">
      <span style={{ color: active && dir === "asc" ? "#3b82f6" : "#bbb" }}>▲</span>
      <span style={{ color: active && dir === "desc" ? "#3b82f6" : "#bbb" }}>▼</span>
    </span>
  );
}

// ─── DatePicker wrapper ───────────────────────────────────────────────────────
function DateField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="relative flex-1">
      <FiCalendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 z-10" size={16} />
      <TextField
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        size="small"
        fullWidth
        sx={{
          "& .MuiInputBase-root": { paddingLeft: "2rem", backgroundColor: "#fff" },
          "& .MuiOutlinedInput-notchedOutline": { borderColor: "#e5e7eb" },
          "& .MuiInputBase-input": { fontSize: 14, color: "#374151" },
        }}
      />
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export const Rating = () => {
  const today = new Date();
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);

  const [dateFrom, setDateFrom] = useState(fmt(yesterday));
  const [dateTo,   setDateTo]   = useState(fmt(today));
  const [tab,      setTab]      = useState(1);   // 0=Graph, 1=Table
  const [page,     setPage]     = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sortKey,  setSortKey]  = useState<SortKey>("grade");
  const [sortDir,  setSortDir]  = useState<SortDir>("desc");

  // filter by date range (demo: just use all data)
  const filtered = useMemo(() => {
    return [...ALL_STUDENTS].sort((a, b) => {
      const av = a[sortKey]; const bv = b[sortKey];
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [sortKey, sortDir]);

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
    setPage(1);
  }

  // chart data: group averages
  const chartData = useMemo(() => {
    const map: Record<string, number[]> = {};
    ALL_STUDENTS.forEach(s => {
      if (!map[s.group]) map[s.group] = [];
      map[s.group].push(s.grade);
    });
    return Object.entries(map).map(([group, grades]) => ({
      group,
      avg: Math.round(grades.reduce((a, b) => a + b, 0) / grades.length),
    }));
  }, []);

  const headerCell = (label: string, key: SortKey) => (
    <TableCell
      onClick={() => toggleSort(key)}
      sx={{ cursor: "pointer", fontWeight: 600, fontSize: 13, color: "#6b7280", userSelect: "none", whiteSpace: "nowrap" }}
    >
      {label}
      <SortIcon active={sortKey === key} dir={sortDir} />
    </TableCell>
  );

  return (
    <div className="p-5 max-w-8xl mx-auto">
      {/* Title */}
      <h1 className="text-2xl font-semibold text-gray-800 mb-5">Rating</h1>

      {/* Date pickers */}
      <div className="flex gap-4 mb-4">
        <DateField value={dateFrom} onChange={v => { setDateFrom(v); setPage(1); }} />
        <DateField value={dateTo}   onChange={v => { setDateTo(v);   setPage(1); }} />
      </div>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 2 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ minHeight: 36 }}>
          <Tab
            icon={<MdBarChart size={16} />}
            iconPosition="start"
            label="Graph"
            sx={{ minHeight: 36, fontSize: 13, textTransform: "none", gap: 0.5 }}
          />
          <Tab
            icon={<MdTableChart size={16} />}
            iconPosition="start"
            label="Table"
            sx={{ minHeight: 36, fontSize: 13, textTransform: "none" }}
          />
        </Tabs>
      </Box>

      {/* Graph tab */}
      {tab === 0 && (
        <Paper variant="outlined" sx={{ p: 3, borderRadius: 2 }}>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={chartData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="group" tick={{ fontSize: 13 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
              <Tooltip
                // formatter={(v: number) => [`${v}`, "Avg grade"]}
                contentStyle={{ borderRadius: 8, fontSize: 13 }}
              />
              <Bar dataKey="avg" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, i) => (
                  <Cell key={i} fill={gradeColor(entry.avg)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Paper>
      )}

      {/* Table tab */}
      {tab === 1 && (
        <>
          <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ backgroundColor: "#fafafa" }}>
                  <TableCell sx={{ fontWeight: 600, fontSize: 13, color: "#6b7280", width: 56 }}>№</TableCell>
                  {headerCell("Name", "name")}
                  {headerCell("Group", "group")}
                  {headerCell("Grade", "grade")}
                </TableRow>
              </TableHead>
              <TableBody>
                {paged.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} align="center" sx={{ py: 6, color: "#9ca3af", fontSize: 14 }}>
                      No Data
                    </TableCell>
                  </TableRow>
                ) : (
                  paged.map((row, i) => (
                    <TableRow
                      key={row.id}
                      hover
                      sx={{ "&:last-child td": { borderBottom: 0 } }}
                    >
                      <TableCell sx={{ color: "#9ca3af", fontSize: 13 }}>
                        {(page - 1) * pageSize + i + 1}
                      </TableCell>
                      <TableCell sx={{ fontSize: 14, fontWeight: 500 }}>{row.name}</TableCell>
                      <TableCell>
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-600">
                          {row.group}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span
                          className="px-2.5 py-0.5 rounded-full text-xs font-semibold"
                          style={{
                            backgroundColor: gradeColor(row.grade) + "22",
                            color: gradeColor(row.grade),
                          }}
                        >
                          {row.grade}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Pagination */}
          <div className="flex items-center gap-3 mt-3">
            <FormControl size="small" sx={{ minWidth: 100 }}>
              <Select
                value={pageSize}
                onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}
                sx={{ fontSize: 13 }}
              >
                {PAGE_SIZES.map(s => (
                  <MenuItem key={s} value={s} sx={{ fontSize: 13 }}>{s}/page</MenuItem>
                ))}
              </Select>
            </FormControl>

            <div className="flex items-center gap-1 ml-auto">
              <IconButton
                size="small"
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
              >
                <FiChevronLeft size={16} />
              </IconButton>

              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                .reduce<(number | "...")[]>((acc, p, idx, arr) => {
                  if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push("...");
                  acc.push(p);
                  return acc;
                }, [])
                .map((p, i) =>
                  p === "..." ? (
                    <span key={`el-${i}`} className="px-1 text-gray-400 text-sm">…</span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => setPage(p as number)}
                      className={`w-8 h-8 rounded text-sm font-medium transition-colors ${
                        page === p
                          ? "bg-blue-500 text-white"
                          : "text-gray-600 hover:bg-gray-100"
                      }`}
                    >
                      {p}
                    </button>
                  )
                )}

              <IconButton
                size="small"
                disabled={page === totalPages}
                onClick={() => setPage(p => p + 1)}
              >
                <FiChevronRight size={16} />
              </IconButton>
            </div>
          </div>
        </>
      )}
    </div>
  );
};