import { useState, useRef, useEffect } from "react";
import { FiCalendar, FiChevronDown, FiSettings } from "react-icons/fi";

// ---------- Types ----------
type FunnelStage = "Incoming" | "Waiting" | "Set" | "Attended" | "Paid";

interface Lead {
  id: number;
  fullName: string;
  phone: string;
  status: FunnelStage;
  staffName: string;
}

// ---------- Mock data ----------
const MOCK_LEADS: Lead[] = [
  { id: 1, fullName: "Aliyev Jasur", phone: "90 123 45 67", status: "Incoming", staffName: "Odilbek Safarov" },
  { id: 2, fullName: "Karimova Nilufar", phone: "91 234 56 78", status: "Waiting", staffName: "Sherzod Tursunov" },
  { id: 3, fullName: "Toshmatov Sardor", phone: "93 345 67 89", status: "Set", staffName: "Odilbek Safarov" },
  { id: 4, fullName: "Rahimova Dilnoza", phone: "94 456 78 90", status: "Attended", staffName: "Aziz Rахimov" },
  { id: 5, fullName: "Yusupov Bobur", phone: "95 567 89 01", status: "Paid", staffName: "Sherzod Tursunov" },
  { id: 6, fullName: "Ergasheva Mohira", phone: "97 678 90 12", status: "Incoming", staffName: "Odilbek Safarov" },
  { id: 7, fullName: "Nazarov Ulugbek", phone: "88 789 01 23", status: "Waiting", staffName: "Aziz Rahimov" },
];

const STAGES: FunnelStage[] = ["Incoming", "Waiting", "Set", "Attended", "Paid"];

// ---------- Helpers ----------
const SelectBox = ({
  value, onChange, options, placeholder,
}: { value: string; onChange: (v: string) => void; options: string[]; placeholder?: string }) => {
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
        className="flex items-center justify-between gap-2 border border-gray-300 rounded px-3 py-1.5 text-sm bg-white text-gray-600 hover:border-gray-400 transition-colors min-w-[140px]">
        <span className={value ? "text-gray-700" : "text-gray-400"}>{value || placeholder}</span>
        <FiChevronDown size={13} className="text-gray-400 flex-shrink-0" />
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-full py-1">
          {options.map(opt => (
            <button key={opt} type="button"
              className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 whitespace-nowrap"
              onClick={() => { onChange(opt); setOpen(false); }}>
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// ---------- Funnel SVG ----------
const FunnelChart = ({ counts }: { counts: number[] }) => {
  // const max = Math.max(...counts, 1);
  // widths from 95% down to 20%
  const widths = [95, 70, 50, 35, 20];
  const colors = [
    { top: "#F9A86A", bot: "#F07C5A" },
    { top: "#F5C08A", bot: "#F09060" },
    { top: "#C084FC", bot: "#A855F7" },
    { top: "#C084FC", bot: "#A855F7" },
    { top: "#A78BFA", bot: "#7C3AED" },
  ];

  return (
    <div className="flex flex-col gap-0 select-none">
      {/* Funnel SVG */}
      <svg viewBox="0 0 300 100" className="w-full" style={{ maxHeight: 100 }}>
        {/* trapezoid layers */}
        {STAGES.map((_, i) => {
          const tw = widths[i];
          const bw = widths[i + 1] ?? 5;
          const y = i * 20;
          const h = 20;
          const cx = 150;
          const x1 = cx - (tw / 2) * 1.5;
          const x2 = cx + (tw / 2) * 1.5;
          const x3 = cx + (bw / 2) * 1.5;
          const x4 = cx - (bw / 2) * 1.5;
          const alpha = counts[i] > 0 ? 1 : 0.25;
          return (
            <polygon key={i}
              points={`${x1},${y} ${x2},${y} ${x3},${y + h} ${x4},${y + h}`}
              fill={`url(#grad${i})`} opacity={alpha} />
          );
        })}
        <defs>
          {STAGES.map((_, i) => (
            <linearGradient key={i} id={`grad${i}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={colors[i].top} />
              <stop offset="100%" stopColor={colors[i].bot} />
            </linearGradient>
          ))}
        </defs>
        {/* center line */}
        <line x1="150" y1="0" x2="150" y2="100" stroke="#D946EF" strokeWidth="1.5" opacity="0.6" />
      </svg>

      {/* Stage rows */}
      <div className="flex flex-col divide-y divide-gray-100 mt-1">
        {STAGES.map((stage, i) => {
          const pct = i === 0 ? 100 : counts[0] > 0 ? Math.round((counts[i] / counts[0]) * 100) : 0;
          return (
            <div key={stage} className="flex items-center justify-between py-2">
              <div>
                <div className="text-xl font-bold text-orange-400">{counts[i]}</div>
                <div className="text-xs text-gray-500">{stage}</div>
              </div>
              <div className="text-xs text-gray-400">{i === 0 ? "" : `${pct}%`}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ---------- Main Component ----------
export const ConversionReports = () => {
  const [dateFrom, setDateFrom] = useState("01.05.2026");
  const [dateTo, setDateTo] = useState("13.05.2026");
  const [leadSource, setLeadSource] = useState("");
  const [byStaff, setByStaff] = useState("");
  const [leadType, setLeadType] = useState("All leads");
  const [activeStage, setActiveStage] = useState<FunnelStage | null>("Incoming");

  const counts = STAGES.map(s => MOCK_LEADS.filter(l => {
    const idx = STAGES.indexOf(l.status);
    const sIdx = STAGES.indexOf(s);
    return idx >= sIdx;
  }).length);

  const tableData = activeStage
    ? MOCK_LEADS.filter(l => l.status === activeStage)
    : [];

  return (
    <div className="min-h-screen bg-gray-100 p-6 font-sans">
      {/* Title */}
      <h1 className="text-2xl font-semibold text-gray-800 mb-4">Conversion reports</h1>

      {/* Top filter bar */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="relative">
          <FiCalendar className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" size={13} />
          <input type="text" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
            className="border border-gray-300 rounded px-3 py-1.5 pl-7 text-sm bg-white focus:outline-none focus:border-blue-400 w-36" />
        </div>
        <div className="relative">
          <FiCalendar className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" size={13} />
          <input type="text" value={dateTo} onChange={e => setDateTo(e.target.value)}
            className="border border-gray-300 rounded px-3 py-1.5 pl-7 text-sm bg-white focus:outline-none focus:border-blue-400 w-36" />
        </div>
        <SelectBox value={leadSource} onChange={setLeadSource}
          options={["Website", "Social Media", "Referral", "Direct"]} placeholder="Leads Sources" />
        <SelectBox value={byStaff} onChange={setByStaff}
          options={["Odilbek Safarov", "Sherzod Tursunov", "Aziz Rahimov"]} placeholder="By staff" />
        <SelectBox value={leadType} onChange={setLeadType}
          options={["All leads", "New leads", "Returning leads"]} placeholder="All leads" />
        <button className="border border-gray-300 rounded p-1.5 text-gray-500 bg-white hover:bg-gray-50 transition-colors">
          <FiSettings size={15} />
        </button>
      </div>

      {/* Main content */}
      <div className="flex gap-4 items-start">
        {/* Left column */}
        <div className="flex-1 flex flex-col gap-4">
          {/* Conversion card */}
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-5">
            <h2 className="text-base font-semibold text-gray-700 mb-4">Conversion</h2>

            {/* Stage buttons row */}
            <div className="grid grid-cols-5 gap-2 mb-3">
              {STAGES.map(stage => (
                <button key={stage}
                  onClick={() => setActiveStage(activeStage === stage ? null : stage)}
                  className={`py-1.5 text-sm rounded border transition-colors font-medium
                    ${activeStage === stage
                      ? "bg-blue-700 border-blue-700 text-white"
                      : "border-gray-300 text-gray-600 hover:bg-gray-50"}`}>
                  {stage}
                </button>
              ))}
            </div>

            {/* Total row */}
            <div className="border-t border-gray-100 pt-3">
              <div className="grid grid-cols-5 gap-2">
                <div className="text-sm font-semibold text-gray-700 flex items-center">Total</div>
                {STAGES.map((stage, i) => (
                  <div key={stage} className="text-sm text-gray-700 flex items-center">
                    {counts[i]}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Table card */}
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left px-5 py-3 text-gray-600 font-medium">Full name</th>
                  <th className="text-left px-5 py-3 text-gray-600 font-medium">Phone</th>
                  <th className="text-left px-5 py-3 text-gray-600 font-medium">Status</th>
                  <th className="text-left px-5 py-3 text-gray-600 font-medium">Staff Name</th>
                </tr>
              </thead>
              <tbody>
                {tableData.length === 0 ? (
                  <tr>
                    <td colSpan={4}>
                      <div className="bg-gray-50 mx-4 my-3 rounded px-4 py-5 text-center text-sm text-gray-500">
                        {activeStage
                          ? "No data for this stage."
                          : "Select a funnel stage above to view the report."}
                      </div>
                    </td>
                  </tr>
                ) : (
                  tableData.map(lead => (
                    <tr key={lead.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3 text-gray-800">{lead.fullName}</td>
                      <td className="px-5 py-3 text-gray-600">{lead.phone}</td>
                      <td className="px-5 py-3">
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-medium">
                          {lead.status}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-gray-600">{lead.staffName}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right column — Sales Pipeline */}
        <div className="w-80 bg-white border border-gray-200 rounded-lg shadow-sm p-5 flex-shrink-0">
          <h2 className="text-base font-semibold text-gray-700 mb-4">Sales Pipeline</h2>
          <FunnelChart counts={counts} />
        </div>
      </div>
    </div>
  );
};