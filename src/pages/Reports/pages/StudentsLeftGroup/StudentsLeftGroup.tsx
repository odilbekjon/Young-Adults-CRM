/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { FiCalendar, FiChevronDown, FiRefreshCw } from "react-icons/fi";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, LabelList, ResponsiveContainer,
} from "recharts";

// ---------- Mock data ----------
const TEACHER_DATA = [
  { name: "Maftuna Po'latova", value: 25 },
  { name: "Maksuda Abraykulova", value: 14 },
  { name: "Shahzoda Safarova", value: 6 },
  { name: "Toshmirza Jumaev", value: 6 },
  { name: "Ugibeka Abdullaeva", value: 5 },
  { name: "Odilbek Safarov", value: 5 },
  { name: "Pardayev Jahongir", value: 4 },
  { name: "G'ulomjon Egamberdiyev", value: 3 },
  { name: "Iskandar Tojiyev", value: 3 },
  { name: "-", value: 2 },
  { name: "Sarvar O'ralov", value: 2 },
  { name: "Tojmurodov Elchin", value: 1 },
  { name: "Javohir Xasanov", value: 1 },
];

const COURSE_DATA = [
  { name: "Frontend", value: 2 },
  { name: "Kampyuter Savodxonligi", value: 3 },
  { name: "MULTILEVEL", value: 13 },
  { name: "Math for kids", value: 1 },
  { name: "KIDS English", value: 4 },
  { name: "Ona tili Milliy sertifikat", value: 25 },
  { name: "Speaking Course", value: 6 },
  { name: "Matematika", value: 2 },
  { name: "Grammar", value: 6 },
  { name: "IELTS", value: 15 },
];

const MONTHLY_DATA = [
  { name: "May 2026", value: 77 },
];

const REASON_DATA = [
  { name: "Can't Afford", value: 1 },
  { name: "Moving Away", value: 1 },
  { name: "Can't handle", value: 9 },
  { name: "Sababsiz", value: 60 },
  { name: "Not Satisfied", value: 1 },
  { name: "Finished", value: 5 },
];

const COURSES = ["Frontend", "Kampyuter Savodxonligi", "MULTILEVEL", "Math for kids", "KIDS English", "Ona tili Milliy sertifikat", "Speaking Course", "Matematika", "Grammar", "IELTS"];
const TEACHERS = ["Maftuna Po'latova", "Maksuda Abraykulova", "Shahzoda Safarova", "Odilbek Safarov", "Pardayev Jahongir"];
const REASONS = ["Can't Afford", "Moving Away", "Can't handle", "Sababsiz", "Not Satisfied", "Finished"];
const STATUSES = ["Active", "Archived", "Frozen"];

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
        <div className="absolute left-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-full py-1">
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
const AngledTick = (props: any) => {
  const { x, y, payload } = props;
  return (
    <g transform={`translate(${x},${y})`}>
      <text x={0} y={0} dy={8} textAnchor="end"
        transform="rotate(-40)"
        style={{ fontSize: 11, fill: "#6b7280" }}>
        {payload.value}
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
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [course, setCourse] = useState("");
  const [teacher, setTeacher] = useState("");
  const [reason, setReason] = useState("");
  const [status, setStatus] = useState("");

  const total = TEACHER_DATA.reduce((a, d) => a + d.value, 0);

  return (
    <div className="min-h-screen bg-gray-100 p-6 font-sans">
      {/* Title */}
      <div className="flex items-center gap-3 mb-5">
        <h1 className="text-2xl font-semibold text-gray-800">{t("reports.studentsLeft.title")}</h1>
        <span className="text-sm text-gray-500">{t("reports.studentsLeft.quantity", { count: total })}</span>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-2 flex-wrap mb-5">
        <div className="relative">
          <FiCalendar className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" size={13} />
          <input type="text" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
            placeholder={t("reports.studentsLeft.filters.dateFrom")}
            className="border border-gray-300 rounded px-3 py-1.5 pl-7 text-sm bg-white focus:outline-none focus:border-blue-400 w-36 text-gray-600 placeholder-gray-400" />
        </div>
        <div className="relative">
          <FiCalendar className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" size={13} />
          <input type="text" value={dateTo} onChange={e => setDateTo(e.target.value)}
            placeholder={t("reports.studentsLeft.filters.dateTo")}
            className="border border-gray-300 rounded px-3 py-1.5 pl-7 text-sm bg-white focus:outline-none focus:border-blue-400 w-36 text-gray-600 placeholder-gray-400" />
        </div>
        <SelectBox value={course} onChange={setCourse} options={COURSES} placeholder={t("reports.studentsLeft.filters.course")} />
        <SelectBox value={teacher} onChange={setTeacher} options={TEACHERS} placeholder={t("reports.studentsLeft.filters.teachers")} />
        <SelectBox value={reason} onChange={setReason} options={REASONS} placeholder={t("reports.studentsLeft.filters.reasons")} />
        <SelectBox value={status} onChange={setStatus} options={STATUSES} placeholder={t("reports.studentsLeft.filters.status")} />
        <button className="bg-blue-700 hover:bg-blue-800 text-white rounded px-5 py-1.5 text-sm font-medium transition-colors">
          {t("reports.studentsLeft.filters.filterBtn")}
        </button>
        <button className="border border-gray-300 bg-white hover:bg-gray-50 rounded p-1.5 text-gray-500 transition-colors">
          <FiRefreshCw size={15} />
        </button>
      </div>

      {/* Charts grid */}
      <div className="grid grid-cols-2 gap-4">
        {/* Ustoz kesimida */}
        <ChartCard title={t("reports.studentsLeft.charts.byTeacher")}>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={TEACHER_DATA} margin={{ top: 20, right: 10, bottom: 90, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={<AngledTick />} interval={0} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip />
              <Bar dataKey="value" fill="#4caf7d" radius={[2, 2, 0, 0]}>
                <LabelList dataKey="value" position="top" style={{ fontSize: 11, fill: "#4caf7d", fontWeight: 600 }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Kurs kesimida */}
        <ChartCard title={t("reports.studentsLeft.charts.byCourse")}>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={COURSE_DATA} margin={{ top: 20, right: 10, bottom: 90, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={<AngledTick />} interval={0} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip />
              <Bar dataKey="value" fill="#ef6c5a" radius={[2, 2, 0, 0]}>
                <LabelList dataKey="value" position="top" style={{ fontSize: 11, fill: "#ef6c5a", fontWeight: 600 }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Oylik kesimida */}
        <ChartCard title={t("reports.studentsLeft.charts.byMonth")}>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={MONTHLY_DATA} margin={{ top: 20, right: 10, bottom: 30, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#6b7280" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip />
              <Bar dataKey="value" fill="#00bcd4" radius={[2, 2, 0, 0]} barSize={200}>
                <LabelList dataKey="value" position="top" style={{ fontSize: 12, fill: "#00bcd4", fontWeight: 600 }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Sabab kesimida */}
        <ChartCard title={t("reports.studentsLeft.charts.byReason")}>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={REASON_DATA} margin={{ top: 20, right: 10, bottom: 30, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip />
              <Bar dataKey="value" fill="#7c3aed" radius={[2, 2, 0, 0]}>
                <LabelList dataKey="value" position="top" style={{ fontSize: 11, fill: "#7c3aed", fontWeight: 600 }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
};