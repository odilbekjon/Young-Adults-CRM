import { useMemo, useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { FiChevronDown, FiRefreshCw, FiDownload } from "react-icons/fi";
import { CircularProgress } from "@mui/material";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, LabelList, ResponsiveContainer,
} from "recharts";

import {
  useReportLeftStudentsQuery,
  useLazyReportLeftStudentsExcelQuery,
} from "../../../../app/api/reportsApi";
import type { ReportBreakdownItem } from "../../../../app/api/reportsApi/types";
import { useAllCoursesQuery } from "../../../../app/api/coursesApi";
import { useAllTeachersQuery } from "../../../../app/api/teachersApi";
import { useReasonsSelectQuery } from "../../../../app/api/reasonsApi";
import { useToast } from "../../../../Context/ToastContext";

// ---------- SelectBox ----------
const SelectBox = ({ value, onChange, options, placeholder }: {
  value: string; onChange: (v: string) => void; options: string[]; placeholder?: string;
}) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => setOpen(o => !o)}
        className="flex items-center justify-between gap-2 border border-gray-300 rounded px-3 py-1.5 text-sm bg-white text-left hover:border-gray-400 transition-colors min-w-[130px]">
        <span className={value ? "text-gray-700" : "text-gray-400"}>{value || placeholder}</span>
        <FiChevronDown size={13} className="text-gray-400 flex-shrink-0" />
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-full py-1 max-h-64 overflow-y-auto">
          <button className="w-full text-left px-3 py-2 text-sm text-gray-400 hover:bg-gray-50"
            onClick={() => { onChange(""); setOpen(false); }}>{placeholder}</button>
          {options.map(opt => (
            <button key={opt} type="button"
              className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 whitespace-nowrap"
              onClick={() => { onChange(opt); setOpen(false); }}>{opt}</button>
          ))}
        </div>
      )}
    </div>
  );
};

// ---------- Custom XAxis tick (angled) ----------
const AngledTick = (props: { x?: number; y?: number; payload?: { value?: string | number } }) => {
  const { x, y, payload } = props;
  return (
    <g transform={`translate(${x},${y})`}>
      <text x={0} y={0} dy={8} textAnchor="end"
        transform="rotate(-40)"
        style={{ fontSize: 11, fill: "#6b7280" }}>
        {payload?.value}
      </text>
    </g>
  );
};

// ---------- Chart wrapper ----------
const ChartCard = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
    <h2 className="text-sm font-semibold text-gray-700 mb-3">{title}</h2>
    {children}
  </div>
);

// ---------- Main Component ----------
export const StudentsLeftGroup = () => {
  const { t } = useTranslation();
  const toast = useToast();

  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [applied, setApplied] = useState({ startDate: "", endDate: "" });

  // Swagger's /reports/left-students accepts only startDate/endDate/branchId/
  // groupId, so course/teacher/reason are applied to the returned breakdowns
  // client-side rather than being invented as query parameters.
  const [course, setCourse] = useState("");
  const [teacher, setTeacher] = useState("");
  const [reason, setReason] = useState("");

  const queryArgs = useMemo(
    () => ({
      startDate: applied.startDate || undefined,
      endDate: applied.endDate || undefined,
    }),
    [applied]
  );

  const { data, isLoading, isFetching, isError } = useReportLeftStudentsQuery(queryArgs);
  const [fetchExcel, { isFetching: isExporting }] = useLazyReportLeftStudentsExcelQuery();

  // Filter option lists come from the real reference endpoints instead of
  // hardcoded names.
  const { data: coursesData } = useAllCoursesQuery();
  const { data: teachersData } = useAllTeachersQuery({ page: 1, limit: 100 });
  const { data: reasonOptions } = useReasonsSelectQuery();

  const courseNames = useMemo(() => (coursesData?.data ?? []).map((c) => c.name), [coursesData]);
  const teacherNames = useMemo(() => (teachersData?.data ?? []).map((tc) => tc.name), [teachersData]);
  const reasonNames = useMemo(() => (reasonOptions ?? []).map((r) => r.name), [reasonOptions]);

  const only = (items: ReportBreakdownItem[], selected: string) =>
    selected ? items.filter((i) => i.name === selected) : items;

  const byTeacher = only(data?.byTeacher ?? [], teacher);
  const byCourse = only(data?.byCourse ?? [], course);
  const byReason = only(data?.byReason ?? [], reason);
  const byMonth = data?.byMonth ?? [];
  const total = data?.total ?? 0;

  const handleFilter = () => setApplied({ startDate: dateFrom, endDate: dateTo });
  const handleReset = () => {
    setDateFrom(""); setDateTo(""); setCourse(""); setTeacher(""); setReason("");
    setApplied({ startDate: "", endDate: "" });
  };

  const handleExportExcel = async () => {
    try {
      const blob = await fetchExcel(queryArgs).unwrap();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "left-students-report.xlsx";
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error(t("reports.common.exportError"));
    }
  };

  const busy = isLoading || isFetching;
  const isEmpty = !busy && !isError &&
    byTeacher.length === 0 && byCourse.length === 0 && byMonth.length === 0 && byReason.length === 0;

  return (
    <div className="min-h-screen bg-gray-100 p-6 font-sans">
      {/* Title */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold text-gray-800">{t("reports.studentsLeft.title")}</h1>
          <span className="text-sm text-gray-500">{t("reports.studentsLeft.quantity", { count: total })}</span>
        </div>
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

      {/* Filter bar */}
      <div className="flex items-center gap-2 flex-wrap mb-5">
        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
          className="border border-gray-300 rounded px-3 py-1.5 text-sm bg-white focus:outline-none focus:border-blue-400 w-36 text-gray-600" />
        <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
          className="border border-gray-300 rounded px-3 py-1.5 text-sm bg-white focus:outline-none focus:border-blue-400 w-36 text-gray-600" />
        <SelectBox value={course} onChange={setCourse} options={courseNames} placeholder={t("reports.studentsLeft.filters.course")} />
        <SelectBox value={teacher} onChange={setTeacher} options={teacherNames} placeholder={t("reports.studentsLeft.filters.teachers")} />
        <SelectBox value={reason} onChange={setReason} options={reasonNames} placeholder={t("reports.studentsLeft.filters.reasons")} />
        <button onClick={handleFilter}
          className="bg-blue-700 hover:bg-blue-800 text-white rounded px-5 py-1.5 text-sm font-medium transition-colors">
          {t("reports.studentsLeft.filters.filterBtn")}
        </button>
        <button onClick={handleReset}
          className="border border-gray-300 bg-white hover:bg-gray-50 rounded p-1.5 text-gray-500 transition-colors">
          <FiRefreshCw size={15} />
        </button>
      </div>

      {busy ? (
        <div className="flex justify-center py-24"><CircularProgress size={30} /></div>
      ) : isError ? (
        <div className="py-24 text-center text-red-500 text-sm">{t("reports.common.loadError")}</div>
      ) : isEmpty ? (
        <div className="py-24 text-center text-gray-400 text-sm">{t("reports.common.noData")}</div>
      ) : (
        /* Charts grid */
        <div className="grid grid-cols-2 gap-4">
          {/* By teacher */}
          <ChartCard title={t("reports.studentsLeft.charts.byTeacher")}>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={byTeacher} margin={{ top: 20, right: 10, bottom: 90, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={<AngledTick />} interval={0} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" fill="#4caf7d" radius={[2, 2, 0, 0]}>
                  <LabelList dataKey="value" position="top" style={{ fontSize: 11, fill: "#4caf7d", fontWeight: 600 }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* By course */}
          <ChartCard title={t("reports.studentsLeft.charts.byCourse")}>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={byCourse} margin={{ top: 20, right: 10, bottom: 90, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={<AngledTick />} interval={0} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" fill="#ef6c5a" radius={[2, 2, 0, 0]}>
                  <LabelList dataKey="value" position="top" style={{ fontSize: 11, fill: "#ef6c5a", fontWeight: 600 }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* By month */}
          <ChartCard title={t("reports.studentsLeft.charts.byMonth")}>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={byMonth} margin={{ top: 20, right: 10, bottom: 30, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#6b7280" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" fill="#00bcd4" radius={[2, 2, 0, 0]} barSize={200}>
                  <LabelList dataKey="value" position="top" style={{ fontSize: 12, fill: "#00bcd4", fontWeight: 600 }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* By reason */}
          <ChartCard title={t("reports.studentsLeft.charts.byReason")}>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={byReason} margin={{ top: 20, right: 10, bottom: 30, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" fill="#7c3aed" radius={[2, 2, 0, 0]}>
                  <LabelList dataKey="value" position="top" style={{ fontSize: 11, fill: "#7c3aed", fontWeight: 600 }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      )}
    </div>
  );
};
