import { useState, useRef, useEffect } from "react";
import { FiCalendar, FiChevronDown, FiSettings } from "react-icons/fi";
import { useTranslation } from "react-i18next";

type FunnelStage = "Incoming" | "Waiting" | "Set" | "Attended" | "Paid";

interface Lead {
  id: number;
  fullName: string;
  phone: string;
  status: FunnelStage;
  staffName: string;
}

const MOCK_LEADS: Lead[] = [
  { id: 1, fullName: "Aliyev Jasur", phone: "90 123 45 67", status: "Incoming", staffName: "Odilbek Safarov" },
  { id: 2, fullName: "Karimova Nilufar", phone: "91 234 56 78", status: "Waiting", staffName: "Sherzod Tursunov" },
  { id: 3, fullName: "Toshmatov Sardor", phone: "93 345 67 89", status: "Set", staffName: "Odilbek Safarov" },
  { id: 4, fullName: "Rahimova Dilnoza", phone: "94 456 78 90", status: "Attended", staffName: "Aziz Rahimov" },
  { id: 5, fullName: "Yusupov Bobur", phone: "95 567 89 01", status: "Paid", staffName: "Sherzod Tursunov" },
  { id: 6, fullName: "Ergasheva Mohira", phone: "97 678 90 12", status: "Incoming", staffName: "Odilbek Safarov" },
  { id: 7, fullName: "Nazarov Ulugbek", phone: "88 789 01 23", status: "Waiting", staffName: "Aziz Rahimov" },
];

const STAGES: FunnelStage[] = ["Incoming", "Waiting", "Set", "Attended", "Paid"];

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
      <button type="button" onClick={() => setOpen((o) => !o)}
        className="flex min-w-[160px] items-center justify-between gap-2 rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-[15px] text-slate-600 transition-colors hover:border-slate-400">
        <span className={value ? "text-slate-700" : "text-slate-400"}>{value || placeholder}</span>
        <FiChevronDown size={14} className="flex-shrink-0 text-slate-400" />
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 z-50 min-w-full rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
          {options.map((opt) => (
            <button key={opt} type="button"
              className="w-full whitespace-nowrap px-3 py-2 text-left text-[15px] text-slate-700 transition-colors hover:bg-slate-50"
              onClick={() => { onChange(opt); setOpen(false); }}>
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const FunnelChart = ({ counts }: { counts: number[] }) => {
  const { t } = useTranslation();
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
      <svg viewBox="0 0 300 100" className="w-full" style={{ maxHeight: 102 }}>
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
        <line x1="150" y1="0" x2="150" y2="100" stroke="#D946EF" strokeWidth="1.5" opacity="0.6" />
      </svg>

      <div className="mt-1 flex flex-col divide-y divide-slate-100">
        {STAGES.map((stage, i) => {
          const pct = i === 0 ? 100 : counts[0] > 0 ? Math.round((counts[i] / counts[0]) * 100) : 0;
          return (
            <div key={stage} className="flex items-center justify-between py-2.5">
              <div>
                <div className="text-xl font-bold text-orange-500">{counts[i]}</div>
                <div className="text-[13px] text-slate-500">{t(`reports.conversion.stages.${stage.toLowerCase()}`)}</div>
              </div>
              <div className="text-[13px] text-slate-400">{i === 0 ? "" : `${pct}%`}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const ConversionReports = () => {
  const { t } = useTranslation();
  const [dateFrom, setDateFrom] = useState("01.05.2026");
  const [dateTo, setDateTo] = useState("13.05.2026");
  const [leadSource, setLeadSource] = useState("");
  const [byStaff, setByStaff] = useState("");
  const [leadType, setLeadType] = useState(t("reports.conversion.filters.allLeadsOption"));
  const [activeStage, setActiveStage] = useState<FunnelStage | null>("Incoming");

  const counts = STAGES.map((s) => MOCK_LEADS.filter((l) => {
    const idx = STAGES.indexOf(l.status);
    const sIdx = STAGES.indexOf(s);
    return idx >= sIdx;
  }).length);

  const tableData = activeStage
    ? MOCK_LEADS.filter((l) => l.status === activeStage)
    : [];

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-8 font-sans">
      <div className="mb-5">
        <h1 className="text-3xl font-semibold text-slate-900">{t("reports.conversion.title")}</h1>
        <p className="mt-2 text-[15px] text-slate-600">{t("reports.conversion.subtitle")}</p>
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="relative">
          <FiCalendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
          <input type="text" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
            className="w-40 rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-3 text-[15px] text-slate-700 outline-none focus:border-blue-400" />
        </div>
        <div className="relative">
          <FiCalendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
          <input type="text" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
            className="w-40 rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-3 text-[15px] text-slate-700 outline-none focus:border-blue-400" />
        </div>
        <SelectBox value={leadSource} onChange={setLeadSource}
          options={["Website", "Social Media", "Referral", "Direct"]} placeholder={t("reports.conversion.filters.leadsSources")} />
        <SelectBox value={byStaff} onChange={setByStaff}
          options={["Odilbek Safarov", "Sherzod Tursunov", "Aziz Rahimov"]} placeholder={t("reports.conversion.filters.byStaff")} />
        <SelectBox value={leadType} onChange={setLeadType}
          options={[t("reports.conversion.filters.allLeadsOption"), t("reports.conversion.filters.newLeadsOption"), t("reports.conversion.filters.returningLeadsOption")]} placeholder={t("reports.conversion.filters.allLeadsOption")} />
        <button className="rounded-xl border border-slate-300 bg-white p-2.5 text-slate-500 transition-colors hover:bg-slate-50">
          <FiSettings size={16} />
        </button>
      </div>

      <div className="flex flex-col gap-4 xl:flex-row xl:items-start">
        <div className="flex-1 flex flex-col gap-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-slate-800">{t("reports.conversion.conversionTitle")}</h2>

            <div className="mb-3 grid grid-cols-2 gap-2 md:grid-cols-5">
              {STAGES.map((stage) => (
                <button key={stage}
                  onClick={() => setActiveStage(activeStage === stage ? null : stage)}
                  className={`rounded-xl border py-2.5 text-[15px] font-medium transition-colors ${activeStage === stage
                    ? "border-blue-700 bg-blue-700 text-white"
                    : "border-slate-300 text-slate-600 hover:bg-slate-50"}`}>
                  {t(`reports.conversion.stages.${stage.toLowerCase()}`)}
                </button>
              ))}
            </div>

            <div className="border-t border-slate-100 pt-3">
              <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
                <div className="flex items-center text-[15px] font-semibold text-slate-700">{t("reports.conversion.total")}</div>
                {STAGES.map((stage, i) => (
                  <div key={stage} className="flex items-center text-[15px] text-slate-700">
                    {counts[i]}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <table className="min-w-full text-[15px]">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-5 py-3 text-left font-semibold text-slate-700">{t("reports.conversion.table.fullName")}</th>
                  <th className="px-5 py-3 text-left font-semibold text-slate-700">{t("reports.conversion.table.phone")}</th>
                  <th className="px-5 py-3 text-left font-semibold text-slate-700">{t("reports.conversion.table.status")}</th>
                  <th className="px-5 py-3 text-left font-semibold text-slate-700">{t("reports.conversion.table.staffName")}</th>
                </tr>
              </thead>
              <tbody>
                {tableData.length === 0 ? (
                  <tr>
                    <td colSpan={4}>
                      <div className="mx-4 my-3 rounded-xl bg-slate-50 px-4 py-5 text-center text-[15px] text-slate-500">
                        {activeStage
                          ? t("reports.conversion.table.noDataForStage")
                          : t("reports.conversion.table.selectStagePrompt")}
                      </div>
                    </td>
                  </tr>
                ) : (
                  tableData.map((lead) => (
                    <tr key={lead.id} className="border-b border-slate-100 transition-colors hover:bg-slate-50">
                      <td className="px-5 py-3 text-slate-800">{lead.fullName}</td>
                      <td className="px-5 py-3 text-slate-600">{lead.phone}</td>
                      <td className="px-5 py-3">
                        <span className="rounded-full bg-blue-100 px-2.5 py-1 text-[13px] font-medium text-blue-700">
                          {lead.status}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-slate-600">{lead.staffName}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="w-full flex-shrink-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:w-80">
          <h2 className="mb-4 text-lg font-semibold text-slate-800">{t("reports.conversion.salesPipeline")}</h2>
          <FunnelChart counts={counts} />
        </div>
      </div>
    </div>
  );
};