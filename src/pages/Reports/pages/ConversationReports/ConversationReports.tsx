import { useMemo, useState, useRef, useEffect } from "react";
import { FiChevronDown, FiDownload } from "react-icons/fi";
import { useTranslation } from "react-i18next";
import { CircularProgress } from "@mui/material";

import {
  useReportConversionQuery,
  useLazyReportConversionExcelQuery,
} from "../../../../app/api/reportsApi";
import { useAllLeadSourcesQuery } from "../../../../app/api/leadSourcesApi";
import { useToast } from "../../../../Context/ToastContext";

type FunnelStage = "Incoming" | "Waiting" | "Set" | "Attended" | "Paid";

const STAGES: FunnelStage[] = ["Incoming", "Waiting", "Set", "Attended", "Paid"];

interface Option {
  value: string;
  label: string;
}

const SelectBox = ({
  value, onChange, options, placeholder,
}: { value: string; onChange: (v: string) => void; options: Option[]; placeholder?: string }) => {
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
      <button type="button" onClick={() => setOpen((o) => !o)}
        className="flex min-w-[160px] items-center justify-between gap-2 rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-[15px] text-slate-600 transition-colors hover:border-slate-400">
        <span className={selectedLabel ? "text-slate-700" : "text-slate-400"}>{selectedLabel || placeholder}</span>
        <FiChevronDown size={14} className="flex-shrink-0 text-slate-400" />
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 z-50 min-w-full rounded-xl border border-slate-200 bg-white py-1 shadow-lg max-h-64 overflow-y-auto">
          <button type="button"
            className="w-full whitespace-nowrap px-3 py-2 text-left text-[15px] text-slate-400 transition-colors hover:bg-slate-50"
            onClick={() => { onChange(""); setOpen(false); }}>
            {placeholder}
          </button>
          {options.map((opt) => (
            <button key={opt.value} type="button"
              className="w-full whitespace-nowrap px-3 py-2 text-left text-[15px] text-slate-700 transition-colors hover:bg-slate-50"
              onClick={() => { onChange(opt.value); setOpen(false); }}>
              {opt.label}
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
  const toast = useToast();

  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [leadSource, setLeadSource] = useState("");
  // Swagger's /reports/conversion takes a `userId`, but this project has no
  // users/employees endpoint to populate a picker from, so staff filtering is
  // applied to the returned rows by name instead of as a query parameter.
  const [byStaff, setByStaff] = useState("");
  const [activeStage, setActiveStage] = useState<FunnelStage | null>("Incoming");

  const queryArgs = useMemo(
    () => ({
      startDate: dateFrom || undefined,
      endDate: dateTo || undefined,
      sourceId: leadSource || undefined,
    }),
    [dateFrom, dateTo, leadSource]
  );

  const { data, isLoading, isFetching, isError } = useReportConversionQuery(queryArgs);
  const [fetchExcel, { isFetching: isExporting }] = useLazyReportConversionExcelQuery();
  const { data: leadSourcesData } = useAllLeadSourcesQuery();

  const sourceOptions: Option[] = useMemo(
    () => (leadSourcesData?.data ?? []).map((s) => ({ value: s.id, label: s.name })),
    [leadSourcesData]
  );

  const leads = useMemo(() => data?.leads ?? [], [data]);

  // Staff options come from the rows the report actually returned.
  const staffOptions: Option[] = useMemo(() => {
    const names = [...new Set(leads.map((l) => l.staffName).filter(Boolean))];
    return names.map((n) => ({ value: n, label: n }));
  }, [leads]);

  const visibleLeads = useMemo(
    () => (byStaff ? leads.filter((l) => l.staffName === byStaff) : leads),
    [leads, byStaff]
  );

  // Prefer the backend's own funnel totals; fall back to counting the returned
  // rows per stage rather than inventing numbers.
  const counts = useMemo(
    () =>
      STAGES.map((stage) => {
        const fromBackend = data?.stageCounts?.[stage.toLowerCase()];
        if (typeof fromBackend === "number") return fromBackend;
        return visibleLeads.filter((l) => l.status.trim().toLowerCase() === stage.toLowerCase()).length;
      }),
    [data, visibleLeads]
  );

  const tableData = useMemo(
    () =>
      activeStage
        ? visibleLeads.filter((l) => l.status.trim().toLowerCase() === activeStage.toLowerCase())
        : [],
    [visibleLeads, activeStage]
  );

  const handleExportExcel = async () => {
    try {
      const blob = await fetchExcel(queryArgs).unwrap();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "conversion-report.xlsx";
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error(t("reports.common.exportError"));
    }
  };

  const busy = isLoading || isFetching;

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-8 font-sans">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900">{t("reports.conversion.title")}</h1>
          <p className="mt-2 text-[15px] text-slate-600">{t("reports.conversion.subtitle")}</p>
        </div>
        <button
          onClick={handleExportExcel}
          disabled={isExporting}
          title={t("reports.common.exportExcel")}
          className="flex flex-shrink-0 items-center gap-2 rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-[15px] text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-60"
        >
          {isExporting ? <CircularProgress size={15} /> : <FiDownload size={16} />}
          {t("reports.common.exportExcel")}
        </button>
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
          className="w-40 rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-[15px] text-slate-700 outline-none focus:border-blue-400" />
        <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
          className="w-40 rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-[15px] text-slate-700 outline-none focus:border-blue-400" />
        <SelectBox value={leadSource} onChange={setLeadSource}
          options={sourceOptions} placeholder={t("reports.conversion.filters.leadsSources")} />
        <SelectBox value={byStaff} onChange={setByStaff}
          options={staffOptions} placeholder={t("reports.conversion.filters.byStaff")} />
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
                {busy ? (
                  <tr><td colSpan={4} className="py-10 text-center"><CircularProgress size={26} /></td></tr>
                ) : isError ? (
                  <tr><td colSpan={4} className="py-10 text-center text-[15px] text-red-500">{t("reports.common.loadError")}</td></tr>
                ) : tableData.length === 0 ? (
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
