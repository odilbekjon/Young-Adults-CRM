import { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { BsCashStack } from "react-icons/bs";
import { useTranslation } from "react-i18next";

// ---------- Types ----------
interface Expense {
  id: number;
  description: string;
  date: string;
  category: string;
  payee: string;
  sum: number;
  methodPay: string;
  type: "expense" | "refund";
}

const CATEGORIES = ["Food", "Transport", "Utilities", "Salary", "Other"];
const METHODS = ["Cash", "Plastic card", "Click", "Bank account", "Payme", "Uzum", "Humo"];

// ---------- Helpers ----------
const formatUZS = (n: number) =>
  n.toLocaleString("uz-UZ") + " UZS";

const toInputDate = (d: Date) =>
  d.toLocaleDateString("ru-RU").replace(/\./g, "."); // DD.MM.YYYY

const today = new Date();
const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

export const TotalExpenses = () => {
  const { t } = useTranslation();
  // ---- State ----
  const [expenses, setExpenses] = useState<Expense[]>([
    {
      id: 1,
      description: "Office supplies",
      date: "2026-04-10",
      category: "Other",
      payee: "Kamoliddin",
      sum: 420000,
      methodPay: "Cash",
      type: "expense",
    },
    {
      id: 2,
      description: "Travel refund",
      date: "2026-04-15",
      category: "Transport",
      payee: "Aziz",
      sum: 80000,
      methodPay: "Click",
      type: "refund",
    },
  ]);

  // ---- New expense form ----
  const [form, setForm] = useState({
    description: "",
    date: toInputDate(today),
    category: "",
    payee: "",
    sum: "",
    methodPay: "",
  });

  // ---- Filters ----
  const [filters, setFilters] = useState({
    dateFrom: toInputDate(firstOfMonth),
    dateTo: toInputDate(today),
    description: "",
    category: "",
    payee: "",
    methodPay: "",
    staffName: "",
  });

  const [activeFilters, setActiveFilters] = useState({ ...filters });

  // ---- Derived data ----
  const filtered = expenses.filter((e) => {
    const d = new Date(e.date);
    const [fd, fm, fy] = activeFilters.dateFrom.split(".").map(Number);
    const [td, tm, ty] = activeFilters.dateTo.split(".").map(Number);
    const from = new Date(fy, fm - 1, fd);
    const to = new Date(ty, tm - 1, td);
    if (d < from || d > to) return false;
    if (
      activeFilters.description &&
      !e.description.toLowerCase().includes(activeFilters.description.toLowerCase())
    )
      return false;
    if (activeFilters.category && e.category !== activeFilters.category) return false;
    if (
      activeFilters.payee &&
      !e.payee.toLowerCase().includes(activeFilters.payee.toLowerCase())
    )
      return false;
    if (activeFilters.methodPay && e.methodPay !== activeFilters.methodPay) return false;
    return true;
  });

  const totalExpenses = filtered
    .filter((e) => e.type === "expense")
    .reduce((a, e) => a + e.sum, 0);

  const totalRefunds = filtered
    .filter((e) => e.type === "refund")
    .reduce((a, e) => a + e.sum, 0);

  // Bar chart — group by month
  const barData = (() => {
    const map: Record<string, number> = {};
    filtered.forEach((e) => {
      const d = new Date(e.date);
      const key = d.toLocaleString("en-US", { year: "numeric", month: "short" });
      map[key] = (map[key] || 0) + (e.type === "expense" ? e.sum : 0);
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  })();

  // Pie chart — refund vs expense
  const pieData = [
    { name: "expense", value: totalExpenses },
    { name: "refund", value: totalRefunds },
  ].filter((d) => d.value > 0);

  // ---- Submit expense ----
  const handleSubmit = () => {
    if (!form.description || !form.category || !form.sum || !form.methodPay) return;
    const [d, m, y] = form.date.split(".").map(Number);
    setExpenses((prev) => [
      ...prev,
      {
        id: Date.now(),
        description: form.description,
        date: `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
        category: form.category,
        payee: form.payee,
        sum: Number(form.sum),
        methodPay: form.methodPay,
        type: "expense",
      },
    ]);
    setForm({ description: "", date: toInputDate(today), category: "", payee: "", sum: "", methodPay: "" });
  };

  // ---- Styles (inline-ish via Tailwind) ----
  const inputCls =
    "w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-blue-400 bg-white";
  const labelCls = "block text-sm font-medium text-gray-700 mb-1";

  return (
    <div className="min-h-screen bg-gray-100 p-6 font-sans">
      {/* Page title */}
      <h1 className="text-2xl font-semibold text-gray-800 mb-4">{t("finance.totalExpenses.title")}</h1>

      <div className="flex gap-4">
        {/* ===== Left: charts + filters ===== */}
        <div className="flex-1 flex flex-col gap-4">
          {/* Summary card */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-1 h-8 bg-blue-500 rounded-full mr-1" />
              <span className="text-gray-700 font-medium">
                {t("finance.totalExpenses.summary.totalExpenses")} {formatUZS(totalExpenses)}
              </span>
            </div>
            <BsCashStack className="text-blue-400 text-2xl" />
          </div>

          {/* Charts row */}
          <div className="grid grid-cols-2 gap-4">
            {/* Bar Chart */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={barData} margin={{ top: 10, right: 10, bottom: 0, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis
                    tickFormatter={(v) => v.toLocaleString()}
                    tick={{ fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip formatter={(v) => formatUZS(Number(v))} />
                  <Legend
                    formatter={() => t("finance.totalExpenses.chart.totalExpensesLabel")}
                    iconType="square"
                    iconSize={10}
                    wrapperStyle={{ fontSize: 12 }}
                  />
                  <Bar dataKey="value" fill="#f28b82" radius={[2, 2, 0, 0]} name={t("finance.totalExpenses.chart.totalExpensesLabel")} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Pie Chart */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 flex items-center justify-center">
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={pieData.length ? pieData : [{ name: "refund", value: 1 }]}
                    cx="50%"
                    cy="50%"
                    innerRadius={0}
                    outerRadius={120}
                    dataKey="value"
                    startAngle={90}
                    endAngle={-270}
                  >
                    {(pieData.length ? pieData : [{ name: "refund", value: 1 }]).map(
                      (entry, index) => (
                        <Cell
                          key={index}
                          fill={entry.name === "expense" ? "#f28b82" : "#FFA500"}
                        />
                      )
                    )}
                  </Pie>
                  <Legend
                    formatter={(value) => value}
                    iconType="square"
                    iconSize={10}
                    wrapperStyle={{ fontSize: 12 }}
                  />
                  <Tooltip formatter={(v) => formatUZS(Number(v))} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* ===== Filter panel ===== */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 px-6 py-4">
            <div className="grid grid-cols-6 gap-3 items-end">
              <div>
                <label className={labelCls}>
                  {t("finance.totalExpenses.filters.dateFrom")} <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-sm">📅</span>
                  <input
                    type="text"
                    className={inputCls + " pl-7"}
                    value={filters.dateFrom}
                    onChange={(e) => setFilters((f) => ({ ...f, dateFrom: e.target.value }))}
                    placeholder={t("finance.totalExpenses.filters.dateFormatPlaceholder")}
                  />
                </div>
              </div>
              <div>
                <label className={labelCls}>
                  {t("finance.totalExpenses.filters.dateTo")} <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-sm">📅</span>
                  <input
                    type="text"
                    className={inputCls + " pl-7"}
                    value={filters.dateTo}
                    onChange={(e) => setFilters((f) => ({ ...f, dateTo: e.target.value }))}
                    placeholder={t("finance.totalExpenses.filters.dateFormatPlaceholder")}
                  />
                </div>
              </div>
              <div>
                <label className={labelCls}>{t("finance.totalExpenses.filters.description")}</label>
                <input
                  type="text"
                  className={inputCls}
                  value={filters.description}
                  onChange={(e) => setFilters((f) => ({ ...f, description: e.target.value }))}
                />
              </div>
              <div>
                <label className={labelCls}>{t("finance.totalExpenses.filters.selectCategory")}</label>
                <select
                  className={inputCls}
                  value={filters.category}
                  onChange={(e) => setFilters((f) => ({ ...f, category: e.target.value }))}
                >
                  <option value="">{t("finance.totalExpenses.selectPlaceholder")}</option>
                  {CATEGORIES.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>{t("finance.totalExpenses.filters.payee")}</label>
                <input
                  type="text"
                  className={inputCls}
                  value={filters.payee}
                  onChange={(e) => setFilters((f) => ({ ...f, payee: e.target.value }))}
                />
              </div>
              <div>
                <label className={labelCls}>{t("finance.totalExpenses.filters.methodPay")}</label>
                <select
                  className={inputCls}
                  value={filters.methodPay}
                  onChange={(e) => setFilters((f) => ({ ...f, methodPay: e.target.value }))}
                >
                  <option value="">{t("finance.totalExpenses.selectPlaceholder")}</option>
                  {METHODS.map((m) => (
                    <option key={m}>{m}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Second row */}
            <div className="grid grid-cols-6 gap-3 items-end mt-3">
              <div>
                <label className={labelCls}>{t("finance.totalExpenses.filters.staffName")}</label>
                <select
                  className={inputCls}
                  value={filters.staffName}
                  onChange={(e) => setFilters((f) => ({ ...f, staffName: e.target.value }))}
                >
                  <option value="">{t("finance.totalExpenses.selectPlaceholder")}</option>
                  <option>Kamoliddin</option>
                  <option>Aziz</option>
                </select>
              </div>
              <div className="flex items-end">
                <button
                  className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-5 py-1.5 rounded transition-colors"
                  onClick={() => setActiveFilters({ ...filters })}
                >
                  {t("finance.totalExpenses.filters.filter")}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ===== Right: New expense form ===== */}
        <div className="w-72 bg-white rounded-lg shadow-sm border border-gray-200 px-5 py-5 flex flex-col gap-4 self-start">
          <h2 className="text-base font-semibold text-gray-800">{t("finance.totalExpenses.form.title")}</h2>

          <div>
            <label className={labelCls}>
              {t("finance.totalExpenses.form.description")} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              className={inputCls}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>

          <div>
            <label className={labelCls}>
              {t("finance.totalExpenses.form.date")} <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-sm">📅</span>
              <input
                type="text"
                className={inputCls + " pl-7"}
                value={form.date}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                placeholder={t("finance.totalExpenses.filters.dateFormatPlaceholder")}
              />
            </div>
          </div>

          <div>
            <label className={labelCls}>
              {t("finance.totalExpenses.form.category")} <span className="text-red-500">*</span>
            </label>
            <select
              className={inputCls}
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
            >
              <option value="">{t("finance.totalExpenses.selectPlaceholder")}</option>
              {CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelCls}>{t("finance.totalExpenses.form.payee")}</label>
            <input
              type="text"
              className={inputCls}
              value={form.payee}
              onChange={(e) => setForm((f) => ({ ...f, payee: e.target.value }))}
            />
          </div>

          <div>
            <label className={labelCls}>
              {t("finance.totalExpenses.form.sum")} <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              className={inputCls}
              value={form.sum}
              onChange={(e) => setForm((f) => ({ ...f, sum: e.target.value }))}
            />
          </div>

          <div>
            <label className={labelCls}>
              {t("finance.totalExpenses.form.methodPay")} <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-1">
              {METHODS.map((m) => (
                <label key={m} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input
                    type="radio"
                    name="methodPay"
                    value={m}
                    checked={form.methodPay === m}
                    onChange={() => setForm((f) => ({ ...f, methodPay: m }))}
                    className="accent-blue-600"
                  />
                  {m}
                </label>
              ))}
            </div>
          </div>

          <button
            className="mt-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-5 py-2 rounded transition-colors self-start"
            onClick={handleSubmit}
          >
            {t("finance.totalExpenses.form.submit")}
          </button>
        </div>
      </div>
    </div>
  );
};