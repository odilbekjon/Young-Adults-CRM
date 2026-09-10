import { useState, useRef, useEffect, useMemo } from "react";
import { FiChevronDown, FiChevronUp, FiDownload } from "react-icons/fi";
import { useTranslation } from "react-i18next";
import { CircularProgress } from "@mui/material";

import {
  useReportAttendanceQuery,
  useLazyReportAttendanceExcelQuery,
} from "../../../../app/api/reportsApi";
import type {
  AttendanceReportOrderBy,
  AttendanceReportRow,
} from "../../../../app/api/reportsApi/types";
import { useAllBranchesQuery } from "../../../../app/api/branchesApi";
import { useGroupsSelectQuery } from "../../../../app/api/groupsApi";
import { useToast } from "../../../../Context/ToastContext";

type SortKey = "name" | "status" | "group" | "attendance";
type SortDir = "asc" | "desc";

// The table's own sort keys map onto Swagger's documented `orderBy` enum
// (studentName, status, groupName, attendance). Swagger has no sort-direction
// parameter, so the direction stays a client-side flip of the ordered rows.
const ORDER_BY: Record<SortKey, AttendanceReportOrderBy> = {
  name: "studentName",
  status: "status",
  group: "groupName",
  attendance: "attendance",
};

interface Option {
  value: string;
  label: string;
}

// The backend's `attendance` value isn't documented, so it's interpreted
// defensively into the three states this table renders and otherwise left
// alone (the raw value is still surfaced as a tooltip).
const toAttended = (value: AttendanceReportRow["attendance"]): boolean | null => {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value > 0;
  if (typeof value === "string") {
    const v = value.trim().toUpperCase();
    if (["TRUE", "1", "PRESENT", "CAME", "YES", "ATTENDED"].includes(v)) return true;
    if (["FALSE", "0", "ABSENT", "NO", "MISSED"].includes(v)) return false;
  }
  return null;
};

// ---------- SelectBox ----------
const SelectBox = ({
  value, onChange, options, placeholder, disabled,
}: { value: string; onChange: (v: string) => void; options: Option[]; placeholder?: string; disabled?: boolean }) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  const selectedLabel = options.find((o) => o.value === value)?.label ?? "";
  return (
    <div className="relative" ref={ref}>
      <button type="button" disabled={disabled} onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between border border-gray-300 rounded px-3 py-2 text-sm bg-white text-left hover:border-gray-400 transition-colors disabled:bg-gray-50 disabled:cursor-not-allowed">
        <span className={selectedLabel ? "text-gray-800" : "text-gray-400"}>{selectedLabel || placeholder || t("reports.attendance.filters.select")}</span>
        <FiChevronDown size={14} className="text-gray-400 flex-shrink-0" />
      </button>
      {open && !disabled && (
        <div className="absolute left-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 w-full py-1 max-h-64 overflow-y-auto">
          <button className="w-full text-left px-3 py-2 text-sm text-gray-400 hover:bg-gray-50"
            onClick={() => { onChange(""); setOpen(false); }}>
            {placeholder || t("reports.attendance.filters.select")}
          </button>
          {options.map(opt => (
            <button key={opt.value} type="button"
              className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
              onClick={() => { onChange(opt.value); setOpen(false); }}>
              {opt.label}
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
const AttDot = ({ val, raw }: { val: boolean | null; raw: AttendanceReportRow["attendance"] }) => {
  const cls = val === true
    ? "bg-green-500"
    : val === false
    ? "bg-red-400"
    : "bg-gray-400";
  return <span title={raw === null || raw === undefined ? "" : String(raw)} className={`inline-block w-7 h-7 rounded-md ${cls}`} />;
};

// ---------- Summary table ----------
const SummaryTable = ({ students }: { students: AttendanceReportRow[] }) => {
  const { t } = useTranslation();
  const attended = students.map((s) => toAttended(s.attendance));
  const visited = attended.filter((a) => a === true).length;
  const absent = attended.filter((a) => a === false).length;
  const notSet = attended.filter((a) => a === null).length;
  const all = students.length;
  const countStatus = (name: string) =>
    students.filter((s) => s.status.trim().toUpperCase() === name).length;
  const active = countStatus("ACTIVE");
  const demo = countStatus("DEMO");
  const frozen = countStatus("FROZEN");

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
          <span className="text-sm text-gray-700 font-medium">{all}</span>
        </div>
      </div>
    </div>
  );
};

// ---------- Main Component ----------
export const AttendanceReports = () => {
  const { t } = useTranslation();
  const toast = useToast();

  // Draft filter values (the sidebar) vs. the applied ones that hit the API —
  // the existing "Filter"/"Reset" buttons keep driving that transition.
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [branch, setBranch] = useState("");
  const [group, setGroup] = useState("");
  const [applied, setApplied] = useState({ startDate: "", endDate: "", branchId: "", groupId: "" });

  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const { data: branchesData } = useAllBranchesQuery();
  const { data: groupsData } = useGroupsSelectQuery();

  const branchOptions: Option[] = useMemo(
    () => (branchesData?.data ?? []).filter((b) => b.status === "ACTIVE").map((b) => ({ value: b.id, label: b.name })),
    [branchesData]
  );
  const groupOptions: Option[] = useMemo(
    () => (groupsData ?? []).map((g) => ({ value: g.id, label: g.name })),
    [groupsData]
  );

  const queryArgs = useMemo(
    () => ({
      startDate: applied.startDate || undefined,
      endDate: applied.endDate || undefined,
      branchId: applied.branchId || undefined,
      groupId: applied.groupId || undefined,
      orderBy: ORDER_BY[sortKey],
    }),
    [applied, sortKey]
  );

  const { data: rows, isLoading, isFetching, isError } = useReportAttendanceQuery(queryArgs);
  const [fetchExcel, { isFetching: isExporting }] = useLazyReportAttendanceExcelQuery();

  const students = useMemo(() => rows ?? [], [rows]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  };

  const handleFilter = () =>
    setApplied({ startDate: dateFrom, endDate: dateTo, branchId: branch, groupId: group });

  const handleReset = () => {
    setDateFrom(""); setDateTo(""); setBranch(""); setGroup("");
    setApplied({ startDate: "", endDate: "", branchId: "", groupId: "" });
  };

  const handleExportExcel = async () => {
    try {
      const blob = await fetchExcel(queryArgs).unwrap();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "attendance-report.xlsx";
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error(t("reports.common.exportError"));
    }
  };

  // The backend already applies `orderBy`; only the direction is flipped here
  // since Swagger exposes no sort-direction parameter.
  const sorted = useMemo(
    () => (sortDir === "asc" ? students : [...students].reverse()),
    [students, sortDir]
  );

  const thCls = "px-5 py-3 text-left text-gray-500 font-medium text-sm cursor-pointer select-none hover:text-gray-700 transition-colors";

  return (
    <div className="min-h-screen bg-gray-100 font-sans">
      <div className="flex">
        {/* ===== Main content ===== */}
        <div className="flex-1 p-6 pr-4">
          <div className="flex items-center justify-between mb-5">
            <h1 className="text-2xl font-semibold text-gray-800">{t("reports.attendance.title")}</h1>
            <button
              onClick={handleExportExcel}
              disabled={isExporting}
              title={t("reports.common.exportExcel")}
              className="flex items-center gap-2 rounded border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-60"
            >
              {isExporting ? <CircularProgress size={14} /> : <FiDownload size={15} />}
              {t("reports.common.exportExcel")}
            </button>
          </div>

          {/* Summary */}
          <SummaryTable students={students} />

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
                {isLoading || isFetching ? (
                  <tr><td colSpan={4} className="text-center py-10"><CircularProgress size={26} /></td></tr>
                ) : isError ? (
                  <tr><td colSpan={4} className="text-center py-10 text-red-500">{t("reports.common.loadError")}</td></tr>
                ) : sorted.length === 0 ? (
                  <tr><td colSpan={4} className="text-center py-10 text-gray-400">{t("reports.attendance.table.noData")}</td></tr>
                ) : (
                  sorted.map(s => (
                    <tr key={s.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3.5 text-gray-800">{s.studentName}</td>
                      <td className="px-5 py-3.5 text-gray-700">
                        <span className="font-semibold">{s.groupName}:</span>{" "}
                        <span className="text-gray-600">{s.status}</span>
                      </td>
                      <td className="px-5 py-3.5 text-gray-700">{s.groupName}</td>
                      <td className="px-5 py-3.5">
                        <AttDot val={toAttended(s.attendance)} raw={s.attendance} />
                      </td>
                    </tr>
                  ))
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
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm bg-white focus:outline-none focus:border-blue-400 text-gray-700" />
            </div>

            <div>
              <label className="text-sm text-gray-600 mb-1.5 block">{t("reports.attendance.filters.dateTo")}</label>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm bg-white focus:outline-none focus:border-blue-400 text-gray-700" />
            </div>

            <div>
              <label className="text-sm text-gray-600 mb-1.5 block">{t("reports.attendance.filters.branches")}</label>
              <SelectBox value={branch} onChange={setBranch} options={branchOptions} placeholder={t("reports.attendance.filters.selectBranch")} />
            </div>

            <div>
              <label className="text-sm text-gray-600 mb-1.5 block">{t("reports.attendance.filters.group")}</label>
              <SelectBox value={group} onChange={setGroup} options={groupOptions} placeholder={t("reports.attendance.filters.select")} />
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
