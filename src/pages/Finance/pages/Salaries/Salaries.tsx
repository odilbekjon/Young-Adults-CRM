import { useState, useRef, useEffect } from "react";
import { FiSettings, FiChevronUp, FiChevronDown, FiCalendar } from "react-icons/fi";
import { useTranslation } from "react-i18next";

// ---------- Types ----------
type SalaryType =
  | "Fixed"
  | "Fixed amount per student (per month)"
  | "Percentage from Course (Discount) price per student (per month)"
  | "Percentage from student payment";

interface SalaryRow {
  id: number;
  calcSetting: string;
  salaryType: SalaryType;
  amount: string;
  course: string;
  group: string;
  teacher: string;
  student: string;
  createdBy: string;
  updatedAt: string;
}

const SALARY_TYPES: SalaryType[] = [
  "Fixed",
  "Fixed amount per student (per month)",
  "Percentage from Course (Discount) price per student (per month)",
  "Percentage from student payment",
];

const CALC_SETTING_OPTIONS = [
  "All teachers",
  "Specific teacher",
  "Specific course",
  "Specific group",
  "Specific student",
];

// ---------- Dropdown component ----------
const Dropdown = ({
  value,
  onChange,
  options,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  label?: string;
}) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-full px-3 py-1.5 text-sm text-gray-700 transition-colors"
      >
        {value || label}
        <FiChevronDown size={13} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[320px] py-1">
          {options.map((opt) => (
            <button
              key={opt}
              type="button"
              className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              onClick={() => {
                onChange(opt);
                setOpen(false);
              }}
            >
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// ---------- Select component ----------
const Select = ({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder?: string;
}) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between border border-gray-300 rounded px-3 py-2 text-sm bg-white text-left text-gray-600 hover:border-gray-400 transition-colors"
      >
        <span className={value ? "text-gray-800" : "text-gray-400"}>
          {value || placeholder}
        </span>
        <FiChevronDown size={14} className="text-gray-400" />
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 w-full py-1">
          {options.map((opt) => (
            <button
              key={opt}
              type="button"
              className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              onClick={() => {
                onChange(opt);
                setOpen(false);
              }}
            >
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// ---------- Main Component ----------
export const Salaries = () => {
  const { t } = useTranslation();
  const [settingsOpen, setSettingsOpen] = useState(true);

  // Section 1
  const [defaultCalcValue, setDefaultCalcValue] = useState("");
  const [defaultSalaryType, setDefaultSalaryType] = useState<SalaryType>("Fixed");

  // Section 2
  const [calcSetting, setCalcSetting] = useState("");
  const [calcValue2, setCalcValue2] = useState("");
  const [salaryType2, setSalaryType2] = useState<SalaryType>("Fixed");

  // Table rows
  const [rows, setRows] = useState<SalaryRow[]>([]);

  // Bottom
  const [monthDate, setMonthDate] = useState("2026-05");

  const handleAddDefault = () => {
    if (!defaultCalcValue) return;
    setRows((prev) => [
      ...prev,
      {
        id: Date.now(),
        calcSetting: "Default",
        salaryType: defaultSalaryType,
        amount: defaultCalcValue,
        course: "",
        group: "",
        teacher: "",
        student: "",
        createdBy: "Admin",
        updatedAt: new Date().toLocaleDateString(),
      },
    ]);
    setDefaultCalcValue("");
  };

  const handleAddIndividual = () => {
    if (!calcSetting || !calcValue2) return;
    setRows((prev) => [
      ...prev,
      {
        id: Date.now(),
        calcSetting,
        salaryType: salaryType2,
        amount: calcValue2,
        course: "",
        group: "",
        teacher: "",
        student: "",
        createdBy: "Admin",
        updatedAt: new Date().toLocaleDateString(),
      },
    ]);
    setCalcSetting("");
    setCalcValue2("");
  };

  const handleDelete = (id: number) => {
    setRows((prev) => prev.filter((r) => r.id !== id));
  };

  const inputCls =
    "flex-1 border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-400 bg-white";

  return (
    <div className="min-h-screen bg-gray-100 p-6 font-sans">
      {/* Page title */}
      <h1 className="text-2xl font-semibold text-gray-800 mb-5">{t("finance.salaries.title")}</h1>

      {/* Settings card */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {/* Card header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
          <button
            className="flex items-center gap-2 text-gray-600 font-medium text-sm hover:text-gray-800 transition-colors"
            onClick={() => setSettingsOpen((o) => !o)}
          >
            <FiSettings size={15} />
            <span>{t("finance.salaries.settingsToggle")}</span>
            {settingsOpen ? <FiChevronUp size={15} /> : <FiChevronDown size={15} />}
          </button>
          <button className="border border-gray-300 rounded p-1.5 text-gray-500 hover:bg-gray-50 transition-colors">
            <FiSettings size={14} />
          </button>
        </div>

        {settingsOpen && (
          <div className="px-6 py-5 flex flex-col gap-6">
            {/* ---- Step 1 ---- */}
            <div>
              <div className="flex items-center gap-4 mb-4">
                <div className="w-10 h-10 rounded-lg bg-blue-500 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                  1
                </div>
                <p className="text-gray-700 text-base">
                  {t("finance.salaries.step1.description")}
                </p>
              </div>

              <div className="mb-1.5">
                <label className="text-sm text-gray-600">{t("finance.salaries.calcValueLabel")}</label>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  className={inputCls}
                  value={defaultCalcValue}
                  onChange={(e) => setDefaultCalcValue(e.target.value)}
                />
                <Dropdown
                  value={defaultSalaryType}
                  onChange={(v) => setDefaultSalaryType(v as SalaryType)}
                  options={SALARY_TYPES}
                />
                <button
                  onClick={handleAddDefault}
                  className="border border-teal-400 text-teal-500 rounded-full px-5 py-1.5 text-sm hover:bg-teal-50 transition-colors font-medium"
                >
                  {t("finance.salaries.addButton")}
                </button>
              </div>
            </div>

            <div className="border-t border-gray-100" />

            {/* ---- Step 2 ---- */}
            <div>
              <div className="flex items-center gap-4 mb-4">
                <div className="w-10 h-10 rounded-lg bg-blue-500 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                  2
                </div>
                <p className="text-gray-700 text-base">
                  {t("finance.salaries.step2.description")}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-1.5">
                <label className="text-sm text-gray-600">{t("finance.salaries.calcSettingLabel")}</label>
                <label className="text-sm text-gray-600">{t("finance.salaries.calcValueLabel")}</label>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-48 flex-shrink-0">
                  <Select
                    value={calcSetting}
                    onChange={setCalcSetting}
                    options={CALC_SETTING_OPTIONS}
                    placeholder={t("finance.salaries.selectOptionPlaceholder")}
                  />
                </div>
                <input
                  type="text"
                  className={inputCls}
                  value={calcValue2}
                  onChange={(e) => setCalcValue2(e.target.value)}
                />
                <Dropdown
                  value={salaryType2}
                  onChange={(v) => setSalaryType2(v as SalaryType)}
                  options={SALARY_TYPES}
                />
                <button
                  onClick={handleAddIndividual}
                  className="border border-teal-400 text-teal-500 rounded-full px-5 py-1.5 text-sm hover:bg-teal-50 transition-colors font-medium"
                >
                  {t("finance.salaries.addButton")}
                </button>
              </div>
            </div>

            {/* ---- Table ---- */}
            <div className="overflow-x-auto border border-gray-200 rounded-lg">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    {[
                      t("finance.salaries.table.calcSetting"),
                      t("finance.salaries.table.salaryType"),
                      t("finance.salaries.table.amount"),
                      t("finance.salaries.table.course"),
                      t("finance.salaries.table.group"),
                      t("finance.salaries.table.teacher"),
                      t("finance.salaries.table.student"),
                      t("finance.salaries.table.createdBy"),
                      t("finance.salaries.table.updatedAt"),
                      t("finance.salaries.table.actions"),
                    ].map((col) => (
                      <th
                        key={col}
                        className="text-left px-4 py-3 text-gray-500 font-medium whitespace-nowrap"
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="text-center py-8 text-gray-400">
                        {t("finance.salaries.table.noData")}
                      </td>
                    </tr>
                  ) : (
                    rows.map((row) => (
                      <tr key={row.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="px-4 py-3 whitespace-nowrap">{row.calcSetting}</td>
                        <td className="px-4 py-3 whitespace-nowrap">{row.salaryType}</td>
                        <td className="px-4 py-3">{row.amount}</td>
                        <td className="px-4 py-3">{row.course || "—"}</td>
                        <td className="px-4 py-3">{row.group || "—"}</td>
                        <td className="px-4 py-3">{row.teacher || "—"}</td>
                        <td className="px-4 py-3">{row.student || "—"}</td>
                        <td className="px-4 py-3">{row.createdBy}</td>
                        <td className="px-4 py-3 whitespace-nowrap">{row.updatedAt}</td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => handleDelete(row.id)}
                            className="text-red-400 hover:text-red-600 text-xs border border-red-200 rounded px-2 py-1 hover:bg-red-50 transition-colors"
                          >
                            {t("finance.salaries.table.delete")}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ---- Bottom bar ---- */}
      <div className="mt-5 flex items-center gap-3">
        <div className="relative">
          <FiCalendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
          <input
            type="month"
            className="border border-gray-300 rounded px-3 py-2 pl-8 text-sm bg-white focus:outline-none focus:border-blue-400 text-gray-700"
            value={monthDate}
            onChange={(e) => setMonthDate(e.target.value)}
          />
        </div>
        <button className="bg-blue-700 hover:bg-blue-800 text-white rounded-full px-6 py-2 text-sm font-medium transition-colors">
          {t("finance.salaries.calculate")}
        </button>
        <button className="bg-green-500 hover:bg-green-600 text-white rounded-full px-6 py-2 text-sm font-medium transition-colors">
          {t("finance.salaries.showInTeacherProfile")}
        </button>
      </div>
    </div>
  );
};