import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Button,
  Checkbox,
  MenuItem,
  Pagination,
  Select,
  TextField,
  Typography,
} from "@mui/material";
import { MdCalendarToday, MdRefresh, MdTune, MdViewColumn } from "react-icons/md";

// ─── Types ────────────────────────────────────────────────────────────────────
interface StudentRecord {
  id: number;
  name: string;
  phone: string;
  course: string;
  group: string;
  teacher: string;
  status: string;
  reason: string;
  comment: string;
  staff: string;
  staffTime: string;
}

// ─── Mock data ────────────────────────────────────────────────────────────────
const COURSES = ["IELTS", "Speaking Course", "Grammar", "General English"];
const GROUPS = ["CRAM", "Cobandence", "Learning Legends", "Sunrise", "Moonlight"];
const TEACHERS = ["Pardayev Jahongir", "Toshmirza Jumaev", "Nilufar Karimova", "Bobur Toshmatov"];
const STAFF_LIST = ["Ugilbeka Abdullaeva", "Maksuda Abraykulova", "Iskandar Tojiyev"];
const REASONS = ["Sababsiz", "Can't handle", "Changed The Group", "Finished", "Moving Away", "No contact"];
const STATUSES = ["Active", "Inactive", "Pending"];

const MOCK_DATA: StudentRecord[] = Array.from({ length: 97 }, (_, i) => ({
  id: i + 1,
  name: [
    "Mamaraimov Og'abek",
    "Matiyev Ilyos",
    "Nazarov Fayzullo",
    "To'ramurodov Ramazon",
    "Jumayeva Shaxlo",
    "Abdullayev Sardor",
    "G'iyomova Nilufar",
    "Karimov Jasur",
    "Toshmatova Malika",
    "Yusupov Bekzod",
  ][i % 10],
  phone: [
    "93 075 29 06",
    "97 227 00 51",
    "88 155 00 81",
    "97 808 10 79",
    "97 900 83 87",
    "88 008 88 25",
    "97 851 22 79",
    "90 123 45 67",
    "91 234 56 78",
    "93 456 78 90",
  ][i % 10],
  course: COURSES[i % COURSES.length],
  group: GROUPS[i % GROUPS.length],
  teacher: TEACHERS[i % TEACHERS.length],
  status: STATUSES[i % STATUSES.length],
  reason: REASONS[i % REASONS.length],
  comment: i % 4 === 0 ? "No comment" : i % 4 === 1 ? "Part time ishlaydi" : "No comment",
  staff: STAFF_LIST[i % STAFF_LIST.length],
  staffTime: ["17:38 / 20.05.2026", "16:12 / 20.05.2026", "17:37 / 20.05.2026", "15:00 / 19.05.2026"][i % 4],
}));

const PAGE_SIZE = 10;

// Maps the tab id (used for state/comparison) to its translation key.
const TAB_LABEL_KEYS: Record<"new" | "old", string> = {
  new: "settings.office.studentLeft.tabs.new",
  old: "settings.office.studentLeft.tabs.old",
};

const selectSx = {
  height: 38,
  fontSize: "0.82rem",
  borderRadius: "6px",
  backgroundColor: "#fff",
  "& fieldset": { borderColor: "#e5e7eb" },
  "&:hover fieldset": { borderColor: "#9ca3af" },
  "&.Mui-focused fieldset": { borderColor: "#29b6f6" },
};

const inputSx = {
  "& .MuiOutlinedInput-root": {
    borderRadius: "6px",
    fontSize: "0.82rem",
    height: 38,
    backgroundColor: "#fff",
    "& fieldset": { borderColor: "#e5e7eb" },
    "&:hover fieldset": { borderColor: "#9ca3af" },
    "&.Mui-focused fieldset": { borderColor: "#29b6f6" },
  },
};

// ─── Component ────────────────────────────────────────────────────────────────
export const StudentLeft = () => {
  const { t } = useTranslation();
  const [tab, setTab] = useState<"new" | "old">("new");
  const [page, setPage] = useState(1);

  // Filters
  const [startDate, setStartDate] = useState("01.05.2026");
  const [endDate, setEndDate] = useState("20.05.2026");
  const [search, setSearch] = useState("");
  const [course, setCourse] = useState("");
  const [group, setGroup] = useState("");
  const [teacher, setTeacher] = useState("");
  const [staff, setStaff] = useState("");
  const [reasonFilter, setReasonFilter] = useState("");
  const [status, setStatus] = useState("");

  // Applied filters (only applied on "Filter" click)
  const [applied, setApplied] = useState({
    search: "",
    course: "",
    group: "",
    teacher: "",
    staff: "",
    reason: "",
    status: "",
  });

  const handleFilter = () => {
    setApplied({ search, course, group, teacher, staff, reason: reasonFilter, status });
    setPage(1);
  };

  const handleReset = () => {
    setSearch(""); setCourse(""); setGroup(""); setTeacher("");
    setStaff(""); setReasonFilter(""); setStatus("");
    setApplied({ search: "", course: "", group: "", teacher: "", staff: "", reason: "", status: "" });
    setPage(1);
  };

  const filtered = MOCK_DATA.filter((r) => {
    return (
      (!applied.search ||
        r.name.toLowerCase().includes(applied.search.toLowerCase()) ||
        r.phone.includes(applied.search)) &&
      (!applied.course || r.course === applied.course) &&
      (!applied.group || r.group === applied.group) &&
      (!applied.teacher || r.teacher === applied.teacher) &&
      (!applied.staff || r.staff === applied.staff) &&
      (!applied.reason || r.reason === applied.reason) &&
      (!applied.status || r.status === applied.status)
    );
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const pageData = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <Typography variant="h5" sx={{ fontWeight: 700, color: "#1f2937" }}>
          {t("settings.office.studentLeft.title")}
        </Typography>
        <Typography variant="body2" sx={{ color: "#6b7280" }}>
          {t("settings.office.studentLeft.quantity", { count: filtered.length })}
        </Typography>
      </div>

      {/* Attention Banner */}
      <div className="flex items-start gap-3 bg-green-50 border border-green-200 rounded-lg px-4 py-3 mb-5">
        <div className="mt-0.5 flex-shrink-0 bg-green-500 rounded-full p-0.5">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M2 7l3.5 3.5L12 3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div>
          <p className="text-green-700 font-semibold text-sm mb-0.5">{t("settings.office.studentLeft.attentionBanner.title")}</p>
          <p className="text-green-700 text-xs leading-relaxed">
            {t("settings.office.studentLeft.attentionBanner.message")}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-0 mb-5 border border-gray-200 rounded-md w-fit bg-white overflow-hidden">
        {(["new", "old"] as const).map((tabKey) => (
          <button
            key={tabKey}
            onClick={() => setTab(tabKey)}
            className={`px-5 py-1.5 text-sm font-medium capitalize transition-colors ${
              tab === tabKey
                ? "bg-white text-gray-800 border-b-2 border-blue-400"
                : "text-gray-500 hover:bg-gray-50"
            }`}
          >
            {t(TAB_LABEL_KEYS[tabKey])}
          </button>
        ))}
      </div>

      {/* Filters Row 1 */}
      <div className="flex flex-wrap gap-2 mb-2">
        {/* Start date */}
        <TextField
          size="small"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          InputProps={{ startAdornment: <MdCalendarToday size={14} className="mr-1 text-gray-400" /> }}
          sx={{ ...inputSx, width: 160 }}
        />
        {/* End date */}
        <TextField
          size="small"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          InputProps={{ startAdornment: <MdCalendarToday size={14} className="mr-1 text-gray-400" /> }}
          sx={{ ...inputSx, width: 160 }}
        />
        {/* Search */}
        <TextField
          size="small"
          placeholder={t("settings.office.studentLeft.filters.searchByNameOrPhone")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ ...inputSx, width: 200 }}
        />
        {/* Course */}
        <Select displayEmpty size="small" value={course} onChange={(e) => setCourse(e.target.value)} sx={{ ...selectSx, width: 150 }}>
          <MenuItem value=""><em style={{ color: "#9ca3af", fontStyle: "normal" }}>{t("settings.office.studentLeft.filters.course")}</em></MenuItem>
          {COURSES.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
        </Select>
        {/* Group */}
        <Select displayEmpty size="small" value={group} onChange={(e) => setGroup(e.target.value)} sx={{ ...selectSx, width: 150 }}>
          <MenuItem value=""><em style={{ color: "#9ca3af", fontStyle: "normal" }}>{t("settings.office.studentLeft.filters.group")}</em></MenuItem>
          {GROUPS.map((g) => <MenuItem key={g} value={g}>{g}</MenuItem>)}
        </Select>
        {/* Teachers */}
        <Select displayEmpty size="small" value={teacher} onChange={(e) => setTeacher(e.target.value)} sx={{ ...selectSx, width: 170 }}>
          <MenuItem value=""><em style={{ color: "#9ca3af", fontStyle: "normal" }}>{t("settings.office.studentLeft.filters.teachers")}</em></MenuItem>
          {TEACHERS.map((tc) => <MenuItem key={tc} value={tc}>{tc}</MenuItem>)}
        </Select>
        {/* Staff */}
        <Select displayEmpty size="small" value={staff} onChange={(e) => setStaff(e.target.value)} sx={{ ...selectSx, width: 160 }}>
          <MenuItem value=""><em style={{ color: "#9ca3af", fontStyle: "normal" }}>{t("settings.office.studentLeft.filters.staff")}</em></MenuItem>
          {STAFF_LIST.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
        </Select>
        {/* Reasons */}
        <Select displayEmpty size="small" value={reasonFilter} onChange={(e) => setReasonFilter(e.target.value)} sx={{ ...selectSx, width: 190 }}>
          <MenuItem value=""><em style={{ color: "#9ca3af", fontStyle: "normal" }}>{t("settings.office.studentLeft.filters.reasonsForArchiving")}</em></MenuItem>
          {REASONS.map((r) => <MenuItem key={r} value={r}>{r}</MenuItem>)}
        </Select>
      </div>

      {/* Filters Row 2 */}
      <div className="flex items-center gap-2 mb-5">
        <Select displayEmpty size="small" value={status} onChange={(e) => setStatus(e.target.value)} sx={{ ...selectSx, width: 140 }}>
          <MenuItem value=""><em style={{ color: "#9ca3af", fontStyle: "normal" }}>{t("settings.office.studentLeft.filters.status")}</em></MenuItem>
          {STATUSES.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
        </Select>
        <Button
          variant="contained"
          onClick={handleFilter}
          sx={{
            backgroundColor: "#29b6f6",
            "&:hover": { backgroundColor: "#0288d1" },
            textTransform: "none",
            fontWeight: 600,
            borderRadius: "6px",
            height: 38,
            px: 3,
            boxShadow: "none",
          }}
        >
          {t("settings.office.studentLeft.filters.filter")}
        </Button>
        <button
          onClick={handleReset}
          className="flex items-center justify-center w-9 h-9 border border-gray-200 rounded-md bg-white text-gray-500 hover:bg-gray-50 transition-colors"
        >
          <MdRefresh size={18} />
        </button>
      </div>

      {/* Table toolbar */}
      <div className="flex justify-end gap-2 mb-3">
        <button className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-md bg-white text-gray-500 text-sm hover:bg-gray-50 transition-colors">
          <MdTune size={15} /> {t("settings.office.studentLeft.toolbar.filters")}
        </button>
        <button className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-md bg-white text-gray-500 text-sm hover:bg-gray-50 transition-colors">
          <MdViewColumn size={15} /> {t("settings.office.studentLeft.toolbar.columns")}
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="px-3 py-3 w-8 text-left">
                <Checkbox size="small" sx={{ color: "#d1d5db", "&.Mui-checked": { color: "#29b6f6" } }} />
              </th>
              {[
                t("settings.office.studentLeft.table.number"),
                t("settings.office.studentLeft.table.student"),
                t("settings.office.studentLeft.table.phone"),
                t("settings.office.studentLeft.table.course"),
                t("settings.office.studentLeft.table.group"),
                t("settings.office.studentLeft.table.teacher"),
                t("settings.office.studentLeft.table.status"),
                t("settings.office.studentLeft.table.reasonsForRemoval"),
                t("settings.office.studentLeft.table.comment"),
                t("settings.office.studentLeft.table.staff"),
              ].map((h) => (
                <th key={h} className="text-left px-3 py-3 text-gray-600 font-semibold text-xs whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageData.length === 0 ? (
              <tr>
                <td colSpan={11} className="text-center py-12 text-gray-400">{t("settings.office.studentLeft.noData")}</td>
              </tr>
            ) : (
              pageData.map((r, idx) => (
                <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="px-3 py-3">
                    <Checkbox size="small" sx={{ color: "#d1d5db", "&.Mui-checked": { color: "#29b6f6" } }} />
                  </td>
                  <td className="px-3 py-3 text-gray-500 text-sm">{(page - 1) * PAGE_SIZE + idx + 1}</td>
                  <td className="px-3 py-3">
                    <span className="text-blue-500 cursor-pointer hover:underline font-medium whitespace-nowrap">
                      {r.name}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-gray-700 font-medium whitespace-nowrap">{r.phone}</td>
                  <td className="px-3 py-3">
                    <span className="text-blue-500 cursor-pointer hover:underline">{r.course}</span>
                  </td>
                  <td className="px-3 py-3">
                    <span className="text-blue-500 cursor-pointer hover:underline">{r.group}</span>
                  </td>
                  <td className="px-3 py-3">
                    <span className="text-blue-500 cursor-pointer hover:underline whitespace-nowrap">{r.teacher}</span>
                  </td>
                  <td className="px-3 py-3 text-gray-700">{r.status}</td>
                  <td className="px-3 py-3 text-gray-600 whitespace-nowrap">{r.reason}</td>
                  <td className="px-3 py-3 text-gray-500">{r.comment}</td>
                  <td className="px-3 py-3">
                    <div className="text-blue-500 cursor-pointer hover:underline whitespace-nowrap text-sm">{r.staff}</div>
                    <div className="text-gray-400 text-xs">{r.staffTime}</div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center py-4 border-t border-gray-100">
            <Pagination
              count={totalPages}
              page={page}
              onChange={(_, v) => setPage(v)}
              size="small"
              sx={{
                "& .MuiPaginationItem-root": { color: "#6b7280", borderRadius: "6px" },
                "& .Mui-selected": { backgroundColor: "#29b6f6 !important", color: "#fff !important" },
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
};