import { useState, useRef, useEffect } from "react";
import { FiCalendar, FiChevronDown, FiChevronUp } from "react-icons/fi";
import { useTranslation } from "react-i18next";

// ---------- Types ----------
interface Student {
  id: number;
  name: string;
  groupName: string;
  status: "Active" | "Demo" | "Frozen";
  attended: boolean | null; // true=green, false=absent, null=not set
}

// ---------- Mock data ----------
const MOCK_STUDENTS: Student[] = [
  { id: 1, name: "Baxromov Quvonchbek", groupName: "The Speech Sphere", status: "Active", attended: true },
  { id: 2, name: "Shaymardonova Marjona", groupName: "English Planet", status: "Active", attended: true },
  { id: 3, name: "Zoirov Bobur", groupName: "English Planet", status: "Active", attended: true },
  { id: 4, name: "Eshnazarov Diyorbek", groupName: "English Planet", status: "Active", attended: true },
  { id: 5, name: "O'rolova Diyora", groupName: "English Planet", status: "Active", attended: true },
  { id: 6, name: "Ramazonov Qahramon", groupName: "Cobandence", status: "Active", attended: null },
  { id: 7, name: "Ramazonov Farrux", groupName: "Cobandence", status: "Active", attended: null },
  { id: 8, name: "Toshmatov Jasur", groupName: "Math Masters", status: "Active", attended: false },
  { id: 9, name: "Karimova Nilufar", groupName: "Math Masters", status: "Frozen", attended: null },
  { id: 10, name: "Yusupov Sardor", groupName: "The Speech Sphere", status: "Active", attended: true },
  { id: 11, name: "Ergasheva Mohira", groupName: "Cobandence", status: "Demo", attended: null },
  { id: 12, name: "Nazarov Ulugbek", groupName: "English Planet", status: "Active", attended: true },
  { id: 13, name: "Rahimova Dilnoza", groupName: "Math Masters", status: "Active", attended: false },
  { id: 14, name: "Abdullayev Temur", groupName: "The Speech Sphere", status: "Active", attended: null },
  { id: 15, name: "Xoliqova Zulfiya", groupName: "English Planet", status: "Frozen", attended: null },
];

const BRANCHES = ["YA IELTS Campus", "Main Campus", "North Branch"];
const GROUPS = ["The Speech Sphere", "English Planet", "Cobandence", "Math Masters"];

type SortKey = "name" | "status" | "group" | "attendance";
type SortDir = "asc" | "desc";

// ---------- SelectBox ----------
const SelectBox = ({
  value, onChange, options, placeholder, disabled,
}: { value: string; onChange: (v: string) => void; options: string[]; placeholder?: string; disabled?: boolean }) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  return (
    <div className="relative" ref={ref}>
      <button type="button" disabled={disabled} onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between border border-gray-300 rounded px-3 py-2 text-sm bg-white text-left hover:border-gray-400 transition-colors disabled:bg-gray-50 disabled:cursor-not-allowed">
        <span className={value ? "text-gray-800" : "text-gray-400"}>{value || placeholder || t("reports.attendance.filters.select")}</span>
        <FiChevronDown size={14} className="text-gray-400 flex-shrink-0" />
      </button>
      {open && !disabled && (
        <div className="absolute left-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 w-full py-1">
          <button className="w-full text-left px-3 py-2 text-sm text-gray-400 hover:bg-gray-50"
            onClick={() => { onChange(""); setOpen(false); }}>
            {placeholder || t("reports.attendance.filters.select")}
          </button>
          {options.map(opt => (
            <button key={opt} type="button"
              className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
              onClick={() => { onChange(opt); setOpen(false); }}>
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// ---------- Sort icon ----------
const SortIcon = ({ col, sortKey, sortDir }: { col: SortKey; sortKey: SortKey; sortDir: SortDir }) => (
  <span className="inline-flex flex-col ml-1 opacity-50">
    <FiChevronUp size={10} className={col === sortKey && sortDir === "asc" ? "opacity-100 text-blue-600" : ""} />
    <FiChevronDown size={10} className={col === sortKey && sortDir === "desc" ? "opacity-100 text-blue-600" : ""} />
  </span>
);

// ---------- Attendance dot ----------
const AttDot = ({ val }: { val: boolean | null }) => {
  const cls = val === true
    ? "bg-green-500"
    : val === false
    ? "bg-red-400"
    : "bg-gray-400";
  return <span className={`inline-block w-7 h-7 rounded-md ${cls}`} />;
};

// ---------- Summary table ----------
const SummaryTable = ({ students }: { students: Student[] }) => {
  const { t } = useTranslation();
  const visited = students.filter(s => s.attended === true).length;
  const absent = students.filter(s => s.attended === false).length;
  const notSet = students.filter(s => s.attended === null).length;
  const all = students.length;
  const active = students.filter(s => s.status === "Active").length;
  const demo = students.filter(s => s.status === "Demo").length;
  const frozen = students.filter(s => s.status === "Frozen").length;
  const allStatus = students.length;

  // const rowCls = "flex items-center border-b border-gray-100 last:border-0";
  // const cellCls = "py-2.5 text-sm text-gray-600";

  return (
    <div className="grid grid-cols-2 gap-0 border border-gray-200 rounded-lg overflow-hidden bg-white mb-5 shadow-sm">
      {/* Left */}
      <div className="border-r border-gray-200 divide-y divide-gray-100">
        {[
          { id: "visits", label: t("reports.attendance.summary.visits"), val: visited },
          { id: "absent", label: t("reports.attendance.summary.absent"), val: absent },
          { id: "notSet", label: t("reports.attendance.summary.notSet"), val: notSet },
        ].map(r => (
          <div key={r.id} className="flex items-center justify-between px-4 py-2.5">
            <span className="text-sm text-gray-600">{r.label}</span>
            <span className="text-sm text-gray-700 font-medium">{r.val}</span>
          </div>
        ))}
        <div className="flex items-center justify-between px-4 py-2.5 bg-blue-50">
          <span className="text-sm text-gray-700 font-medium">{t("reports.attendance.summary.all")}</span>
          <span className="text-sm text-gray-700 font-medium">{all}</span>
        </div>
      </div>
      {/* Right */}
      <div className="divide-y divide-gray-100">
        {[
          { id: "active", label: t("reports.attendance.summary.statusActive"), val: active },
          { id: "demo", label: t("reports.attendance.summary.statusDemo"), val: demo },
          { id: "frozen", label: t("reports.attendance.summary.statusFrozen"), val: frozen },
        ].map(r => (
          <div key={r.id} className="flex items-center justify-between px-4 py-2.5">
            <span className="text-sm text-gray-600">{r.label}</span>
            <span className="text-sm text-gray-700 font-medium">{r.val}</span>
          </div>
        ))}
        <div className="flex items-center justify-between px-4 py-2.5">
          <span className="text-sm text-gray-600">{t("reports.attendance.summary.all")}</span>
          <span className="text-sm text-gray-700 font-medium">{allStatus}</span>
        </div>
      </div>
    </div>
  );
};

// ---------- Main Component ----------
export const AttendanceReports = () => {
  const { t } = useTranslation();
  const [dateFrom, setDateFrom] = useState("13.05.2026");
  const [dateTo, setDateTo] = useState("13.05.2026");
  const [branch, setBranch] = useState("YA IELTS Campus");
  const [group, setGroup] = useState("");
  const [, setActiveBranch] = useState("YA IELTS Campus");
  const [activeGroup, setActiveGroup] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  };

  const handleFilter = () => { setActiveBranch(branch); setActiveGroup(group); };
  const handleReset = () => { setBranch("YA IELTS Campus"); setGroup(""); setActiveBranch("YA IELTS Campus"); setActiveGroup(""); };

  const filtered = MOCK_STUDENTS.filter(s => {
    if (activeGroup && s.groupName !== activeGroup) return false;
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    let cmp = 0;
    if (sortKey === "name") cmp = a.name.localeCompare(b.name);
    else if (sortKey === "status") cmp = a.status.localeCompare(b.status);
    else if (sortKey === "group") cmp = a.groupName.localeCompare(b.groupName);
    else if (sortKey === "attendance") cmp = (a.attended === b.attended ? 0 : a.attended ? -1 : 1);
    return sortDir === "asc" ? cmp : -cmp;
  });

  const thCls = "px-5 py-3 text-left text-gray-500 font-medium text-sm cursor-pointer select-none hover:text-gray-700 transition-colors";

  return (
    <div className="min-h-screen bg-gray-100 font-sans">
      <div className="flex">
        {/* ===== Main content ===== */}
        <div className="flex-1 p-6 pr-4">
          <h1 className="text-2xl font-semibold text-gray-800 mb-5">{t("reports.attendance.title")}</h1>

          {/* Summary */}
          <SummaryTable students={filtered} />

          {/* Table */}
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className={thCls} onClick={() => handleSort("name")}>
                    {t("reports.attendance.table.name")} <SortIcon col="name" sortKey={sortKey} sortDir={sortDir} />
                  </th>
                  <th className={thCls} onClick={() => handleSort("status")}>
                    {t("reports.attendance.table.status")} <SortIcon col="status" sortKey={sortKey} sortDir={sortDir} />
                  </th>
                  <th className={thCls} onClick={() => handleSort("group")}>
                    {t("reports.attendance.table.group")} <SortIcon col="group" sortKey={sortKey} sortDir={sortDir} />
                  </th>
                  <th className={thCls} onClick={() => handleSort("attendance")}>
                    {t("reports.attendance.table.attendance")} <SortIcon col="attendance" sortKey={sortKey} sortDir={sortDir} />
                  </th>
                </tr>
              </thead>
              <tbody>
                {sorted.map(s => (
                  <tr key={s.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3.5 text-gray-800">{s.name}</td>
                    <td className="px-5 py-3.5 text-gray-700">
                      <span className="font-semibold">{s.groupName}:</span>{" "}
                      <span className="text-gray-600">{s.status}</span>
                    </td>
                    <td className="px-5 py-3.5 text-gray-700">{s.groupName}</td>
                    <td className="px-5 py-3.5">
                      <AttDot val={s.attended} />
                    </td>
                  </tr>
                ))}
                {sorted.length === 0 && (
                  <tr><td colSpan={4} className="text-center py-10 text-gray-400">{t("reports.attendance.table.noData")}</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ===== Right sidebar filter ===== */}
        <div className="w-72 flex-shrink-0 bg-white border-l border-gray-200 p-5 min-h-screen">
          <h2 className="text-base font-semibold text-gray-700 mb-5">{t("reports.attendance.filters.title")}</h2>

          <div className="flex flex-col gap-4">
            <div>
              <label className="text-sm text-gray-600 mb-1.5 block">{t("reports.attendance.filters.dateFrom")}</label>
              <div className="relative">
                <FiCalendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={13} />
                <input type="text" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2 pl-8 text-sm bg-white focus:outline-none focus:border-blue-400 text-gray-700" />
              </div>
            </div>

            <div>
              <label className="text-sm text-gray-600 mb-1.5 block">{t("reports.attendance.filters.dateTo")}</label>
              <div className="relative">
                <FiCalendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={13} />
                <input type="text" value={dateTo} onChange={e => setDateTo(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2 pl-8 text-sm bg-white focus:outline-none focus:border-blue-400 text-gray-700" />
              </div>
            </div>

            <div>
              <label className="text-sm text-gray-600 mb-1.5 block">{t("reports.attendance.filters.branches")}</label>
              <SelectBox value={branch} onChange={setBranch} options={BRANCHES} placeholder={t("reports.attendance.filters.selectBranch")} />
            </div>

            <div>
              <label className="text-sm text-gray-600 mb-1.5 block">{t("reports.attendance.filters.group")}</label>
              <SelectBox value={group} onChange={setGroup} options={GROUPS} placeholder={t("reports.attendance.filters.select")} />
            </div>

            <div className="flex gap-2 mt-1">
              <button onClick={handleFilter}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded px-4 py-2 text-sm font-medium transition-colors">
                {t("reports.attendance.filters.filterBtn")}
              </button>
              <button onClick={handleReset}
                className="flex-1 border border-gray-300 text-gray-600 hover:bg-gray-50 rounded px-4 py-2 text-sm font-medium transition-colors">
                {t("reports.attendance.filters.reset")}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};