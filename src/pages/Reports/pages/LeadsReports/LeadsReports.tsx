import { useState } from "react";
import { useTranslation } from "react-i18next";
import { BsCashStack } from "react-icons/bs";
import { FiCalendar } from "react-icons/fi";
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

// ---------- Mock data ----------
interface Lead {
  id: number;
  source: string;
  date: string; // YYYY-MM-DD
}

const generateLeads = (): Lead[] => [
  { id: 1, source: "Other", date: "2026-03-15" },
  { id: 2, source: "Other", date: "2026-04-02" },
  { id: 3, source: "Other", date: "2026-04-08" },
  { id: 4, source: "Other", date: "2026-04-12" },
  { id: 5, source: "Website", date: "2026-04-18" },
  { id: 6, source: "Website", date: "2026-04-22" },
  { id: 7, source: "Social Media", date: "2026-04-28" },
  { id: 8, source: "Other", date: "2026-05-10" },
];

const SOURCE_COLORS: Record<string, string> = {
  Other: "#cc0000",
  Website: "#4e79a7",
  "Social Media": "#f28e2b",
  Referral: "#59a14f",
};

const MONTH_LABELS: Record<string, string> = {
  "2026-01": "2026 January",
  "2026-02": "2026 February",
  "2026-03": "2026 March",
  "2026-04": "2026 April",
  "2026-05": "2026 May",
  "2026-06": "2026 June",
};

const parseDate = (str: string) => {
  const [d, m, y] = str.split(".");
  return new Date(`${y}-${m}-${d}`);
};

// const formatDateDisplay = (d: Date) =>
//   `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()}`;

// ---------- Main Component ----------
export const LeadsReports = () => {
  const { t } = useTranslation();
  const [dateFrom, setDateFrom] = useState("01.01.2026");
  const [dateTo, setDateTo] = useState("31.05.2026");
  const [activeDateFrom, setActiveDateFrom] = useState("01.01.2026");
  const [activeDateTo, setActiveDateTo] = useState("31.05.2026");

  const ALL_LEADS = generateLeads();

  const filtered = ALL_LEADS.filter((l) => {
    const d = new Date(l.date);
    const from = parseDate(activeDateFrom);
    const to = parseDate(activeDateTo);
    return d >= from && d <= to;
  });

  // Pie data — group by source
  const sourceMap: Record<string, number> = {};
  filtered.forEach((l) => {
    sourceMap[l.source] = (sourceMap[l.source] || 0) + 1;
  });
  const pieData = Object.entries(sourceMap).map(([name, value]) => ({ name, value }));

  // Bar data — group by month
  const monthMap: Record<string, number> = {};
  filtered.forEach((l) => {
    const key = l.date.slice(0, 7); // YYYY-MM
    monthMap[key] = (monthMap[key] || 0) + 1;
  });
  const barData = Object.entries(monthMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => ({
      name: MONTH_LABELS[key] || key,
      value,
    }));

  const handleCalculate = () => {
    setActiveDateFrom(dateFrom);
    setActiveDateTo(dateTo);
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6 font-sans">
      {/* Title */}
      <h1 className="text-2xl font-semibold text-gray-800 mb-4">{t("reports.leads.title")}</h1>

      {/* Summary card */}
      <div className="bg-white border border-gray-200 rounded-lg px-6 py-4 flex items-center justify-between mb-4 shadow-sm max-w-3xl">
        <div className="flex items-center gap-2">
          <div className="w-1 h-8 bg-blue-500 rounded-full mr-1" />
          <span className="text-gray-700 font-medium">
            {t("reports.leads.totalLeads", { count: filtered.length, from: activeDateFrom, to: activeDateTo })}
          </span>
        </div>
        <BsCashStack className="text-blue-400 text-2xl" />
      </div>

      {/* Charts card */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-5">
        {/* Date + Calculate bar */}
        <div className="flex items-center gap-3 mb-5">
          <div className="relative">
            <FiCalendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={13} />
            <input
              type="text"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              placeholder={t("reports.leads.datePlaceholder")}
              className="border border-gray-300 rounded px-3 py-1.5 pl-8 text-sm bg-white focus:outline-none focus:border-blue-400 w-40 text-gray-700"
            />
          </div>
          <div className="relative">
            <FiCalendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={13} />
            <input
              type="text"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              placeholder={t("reports.leads.datePlaceholder")}
              className="border border-gray-300 rounded px-3 py-1.5 pl-8 text-sm bg-white focus:outline-none focus:border-blue-400 w-40 text-gray-700"
            />
          </div>
          <button
            onClick={handleCalculate}
            className="bg-blue-700 hover:bg-blue-800 text-white rounded-full px-6 py-1.5 text-sm font-medium transition-colors"
          >
            {t("reports.leads.calculate")}
          </button>
        </div>

        {/* Charts row */}
        <div className="grid grid-cols-2 gap-6">
          {/* Pie chart */}
          <div className="flex items-center justify-center">
            <ResponsiveContainer width="100%" height={340}>
              <PieChart>
                <Pie
                  data={pieData.length ? pieData : [{ name: "Other", value: 1 }]}
                  cx="50%"
                  cy="50%"
                  outerRadius={150}
                  dataKey="value"
                  startAngle={90}
                  endAngle={-270}
                >
                  {(pieData.length ? pieData : [{ name: "Other", value: 1 }]).map(
                    (entry, index) => (
                      <Cell
                        key={index}
                        fill={SOURCE_COLORS[entry.name] || "#888"}
                      />
                    )
                  )}
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
      </div>
    </div>
  );
};