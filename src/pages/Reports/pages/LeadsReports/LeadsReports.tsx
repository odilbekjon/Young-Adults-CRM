import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { BsCashStack } from "react-icons/bs";
import { FiDownload } from "react-icons/fi";
import { CircularProgress } from "@mui/material";
import {
  PieChart,
  Pie,
  Cell,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LabelList,
  ResponsiveContainer,
} from "recharts";

import {
  useReportLeadsQuery,
  useLazyReportLeadsExcelQuery,
} from "../../../../app/api/reportsApi";
import { useToast } from "../../../../Context/ToastContext";

// Known sources keep their established colours; anything else the backend
// returns falls back to a generated one instead of all sharing a single grey.
const SOURCE_COLORS: Record<string, string> = {
  Other: "#cc0000",
  Website: "#4e79a7",
  "Social Media": "#f28e2b",
  Referral: "#59a14f",
};
const FALLBACK_COLORS = ["#8b5cf6", "#0ea5e9", "#f59e0b", "#10b981", "#ec4899", "#6366f1"];

const colorFor = (name: string, index: number) =>
  SOURCE_COLORS[name] ?? FALLBACK_COLORS[index % FALLBACK_COLORS.length];

// The month breakdown arrives keyed as "YYYY-MM" — render it in the active
// locale rather than through a hardcoded year-specific label map.
const formatMonth = (name: string, locale: string) => {
  const match = /^(\d{4})-(\d{2})$/.exec(name);
  if (!match) return name;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, 1);
  if (Number.isNaN(date.getTime())) return name;
  return date.toLocaleDateString(locale, { year: "numeric", month: "long" });
};

export const LeadsReports = () => {
  const { t, i18n } = useTranslation();
  const toast = useToast();

  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [applied, setApplied] = useState({ startDate: "", endDate: "" });

  const queryArgs = useMemo(
    () => ({
      startDate: applied.startDate || undefined,
      endDate: applied.endDate || undefined,
    }),
    [applied]
  );

  const { data, isLoading, isFetching, isError } = useReportLeadsQuery(queryArgs);
  const [fetchExcel, { isFetching: isExporting }] = useLazyReportLeadsExcelQuery();

  const pieData = data?.bySource ?? [];
  const barData = useMemo(
    () => (data?.byMonth ?? []).map((item) => ({ ...item, name: formatMonth(item.name, i18n.language) })),
    [data, i18n.language]
  );
  const total = data?.total ?? 0;

  const handleCalculate = () => setApplied({ startDate: dateFrom, endDate: dateTo });

  const handleExportExcel = async () => {
    try {
      const blob = await fetchExcel(queryArgs).unwrap();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "leads-report.xlsx";
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error(t("reports.common.exportError"));
    }
  };

  const busy = isLoading || isFetching;
  const isEmpty = !busy && !isError && pieData.length === 0 && barData.length === 0;

  return (
    <div className="min-h-screen bg-gray-100 p-6 font-sans">
      {/* Title */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold text-gray-800">{t("reports.leads.title")}</h1>
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

      {/* Summary card */}
      <div className="bg-white border border-gray-200 rounded-lg px-6 py-4 flex items-center justify-between mb-4 shadow-sm max-w-3xl">
        <div className="flex items-center gap-2">
          <div className="w-1 h-8 bg-blue-500 rounded-full mr-1" />
          <span className="text-gray-700 font-medium">
            {t("reports.leads.totalLeads", {
              count: total,
              from: applied.startDate || "—",
              to: applied.endDate || "—",
            })}
          </span>
        </div>
        <BsCashStack className="text-blue-400 text-2xl" />
      </div>

      {/* Charts card */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-5">
        {/* Date + Calculate bar */}
        <div className="flex items-center gap-3 mb-5">
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="border border-gray-300 rounded px-3 py-1.5 text-sm bg-white focus:outline-none focus:border-blue-400 w-40 text-gray-700"
          />
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="border border-gray-300 rounded px-3 py-1.5 text-sm bg-white focus:outline-none focus:border-blue-400 w-40 text-gray-700"
          />
          <button
            onClick={handleCalculate}
            className="bg-blue-700 hover:bg-blue-800 text-white rounded-full px-6 py-1.5 text-sm font-medium transition-colors"
          >
            {t("reports.leads.calculate")}
          </button>
        </div>

        {busy ? (
          <div className="flex justify-center py-24"><CircularProgress size={30} /></div>
        ) : isError ? (
          <div className="py-24 text-center text-red-500 text-sm">{t("reports.common.loadError")}</div>
        ) : isEmpty ? (
          <div className="py-24 text-center text-gray-400 text-sm">{t("reports.common.noData")}</div>
        ) : (
          /* Charts row */
          <div className="grid grid-cols-2 gap-6">
            {/* Pie chart */}
            <div className="flex items-center justify-center">
              <ResponsiveContainer width="100%" height={340}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    outerRadius={150}
                    dataKey="value"
                    startAngle={90}
                    endAngle={-270}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={entry.name} fill={colorFor(entry.name, index)} />
                    ))}
                  </Pie>
                  <Legend
                    iconType="square"
                    iconSize={10}
                    wrapperStyle={{ fontSize: 12 }}
                  />
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Bar chart */}
            <div className="flex items-center justify-center">
              <ResponsiveContainer width="100%" height={340}>
                <BarChart
                  data={barData}
                  margin={{ top: 20, right: 20, bottom: 10, left: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip />
                  <Legend
                    formatter={() => t("reports.leads.chart.leadsCountSeries")}
                    iconType="square"
                    iconSize={10}
                    wrapperStyle={{ fontSize: 12 }}
                  />
                  <Bar dataKey="value" fill="#f28b82" radius={[2, 2, 0, 0]} name={t("reports.leads.chart.leadsCountSeries")}>
                    <LabelList
                      dataKey="value"
                      position="top"
                      style={{ fontSize: 11, fill: "#f28b82", fontWeight: 600 }}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
