import { useMemo, useState, useRef, useEffect } from "react";
import { useSelector } from "react-redux";
import { FiSettings, FiChevronUp, FiChevronDown, FiCalendar, FiDownload } from "react-icons/fi";
import { useTranslation } from "react-i18next";
import { CircularProgress } from "@mui/material";

import {
  useSalarySettingsQuery,
  useDeleteSalarySettingMutation,
  useSalaryPayrollsQuery,
  useSalaryPayrollByIdQuery,
  useLazySalaryPayrollsExcelQuery,
  useCalculateSalariesMutation,
  usePublishSalaryPayrollMutation,
  usePaySalaryPayrollMutation,
} from "../../../../app/api/salariesApi";
import type { PayrollRow, PayrollStatus } from "../../../../app/api/salariesApi/types";
import { usePaymentMethodsQuery } from "../../../../app/api/financeApi";
import { useToast } from "../../../../Context/ToastContext";
import { extractApiError } from "../../../../utils";
import type { RootState } from "../../../../app/store";

const PAGE_SIZE = 10;
const STATUSES: PayrollStatus[] = ["DRAFT", "PUBLISHED", "PAID"];

// "2026-05" → { year: 2026, month: 5 }; empty input yields nothing so the
// filter/period simply isn't sent.
const splitPeriod = (value: string): { year?: number; month?: number } => {
  const match = /^(\d{4})-(\d{2})$/.exec(value);
  if (!match) return {};
  return { year: Number(match[1]), month: Number(match[2]) };
};

const formatPeriod = (year: number | null, month: number | null) =>
  year && month ? `${String(month).padStart(2, "0")}.${year}` : "—";

const formatMoney = (value: number) => value.toLocaleString("ru-RU");

// ---------- Select component ----------
const Select = ({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
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

  const selectedLabel = options.find((o) => o.value === value)?.label ?? "";

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between border border-gray-300 rounded px-3 py-2 text-sm bg-white text-left text-gray-600 hover:border-gray-400 transition-colors"
      >
        <span className={selectedLabel ? "text-gray-800" : "text-gray-400"}>
          {selectedLabel || placeholder}
        </span>
        <FiChevronDown size={14} className="text-gray-400" />
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 w-full py-1 max-h-60 overflow-y-auto">
          <button
            type="button"
            className="w-full text-left px-3 py-2 text-sm text-gray-400 hover:bg-gray-50 transition-colors"
            onClick={() => { onChange(""); setOpen(false); }}
          >
            {placeholder}
          </button>
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              onClick={() => { onChange(opt.value); setOpen(false); }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// ---------- Payroll detail modal (GET /salaries/payrolls/{id}) ----------
const PayrollDetailModal = ({ id, onClose }: { id: string; onClose: () => void }) => {
  const { t } = useTranslation();
  const { data, isLoading, isError } = useSalaryPayrollByIdQuery(id);

  const cols = [
    t("finance.salaries.payrolls.detail.group"),
    t("finance.salaries.payrolls.detail.student"),
    t("finance.salaries.payrolls.detail.lessons"),
    t("finance.salaries.payrolls.detail.attended"),
    t("finance.salaries.payrolls.detail.missed"),
    t("finance.salaries.payrolls.detail.rate"),
    t("finance.salaries.payrolls.detail.amount"),
    t("finance.salaries.payrolls.detail.calcSetting"),
    t("finance.salaries.payrolls.detail.salaryType"),
  ];

  return (
    <div className="fixed inset-0 z-[1300] flex items-start justify-center bg-black/30 p-6 overflow-y-auto" onClick={onClose}>
      <div className="mt-10 w-full max-w-5xl rounded-lg bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
          <h2 className="text-base font-semibold text-gray-800">{t("finance.salaries.payrolls.detail.title")}</h2>
          <button onClick={onClose} className="rounded border border-gray-300 px-3 py-1 text-sm text-gray-600 hover:bg-gray-50">
            {t("finance.salaries.payrolls.detail.close")}
          </button>
        </div>
        <div className="p-5">
          {isLoading ? (
            <div className="flex justify-center py-10"><CircularProgress size={26} /></div>
          ) : isError ? (
            <div className="py-10 text-center text-sm text-red-500">{t("finance.salaries.payrolls.loadError")}</div>
          ) : (
            <>
              <div className="mb-4 flex flex-wrap gap-6 text-sm">
                <div><span className="text-gray-500">{t("finance.salaries.payrolls.table.teacher")}: </span><span className="font-medium text-gray-800">{data?.teacherName || "—"}</span></div>
                <div><span className="text-gray-500">{t("finance.salaries.payrolls.table.period")}: </span><span className="font-medium text-gray-800">{formatPeriod(data?.periodYear ?? null, data?.periodMonth ?? null)}</span></div>
                <div><span className="text-gray-500">{t("finance.salaries.payrolls.table.total")}: </span><span className="font-medium text-gray-800">{formatMoney(data?.totalAmount ?? 0)}</span></div>
                <div><span className="text-gray-500">{t("finance.salaries.payrolls.table.paid")}: </span><span className="font-medium text-gray-800">{formatMoney(data?.paidAmount ?? 0)}</span></div>
              </div>
              <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      {cols.map((c) => (
                        <th key={c} className="whitespace-nowrap px-4 py-3 text-left font-medium text-gray-500">{c}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(data?.items ?? []).length === 0 ? (
                      <tr><td colSpan={cols.length} className="py-8 text-center text-gray-400">{t("finance.salaries.payrolls.detail.noItems")}</td></tr>
                    ) : (
                      data!.items.map((item) => (
                        <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50" title={item.formula}>
                          <td className="px-4 py-3">{item.groupName || "—"}</td>
                          <td className="px-4 py-3">{item.studentName || "—"}</td>
                          <td className="px-4 py-3">{item.lessons ?? "—"}</td>
                          <td className="px-4 py-3">{item.attended ?? "—"}</td>
                          <td className="px-4 py-3">{item.missed ?? "—"}</td>
                          <td className="px-4 py-3">{item.rate === null ? "—" : formatMoney(item.rate)}</td>
                          <td className="px-4 py-3">{formatMoney(item.amount)}</td>
                          <td className="px-4 py-3">{item.calcSetting || "—"}</td>
                          <td className="px-4 py-3">{item.salaryType || "—"}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// ---------- Main Component ----------
export const Salaries = () => {
  const { t } = useTranslation();
  const toast = useToast();
  // POST /salaries/calculate takes an optional branchId; the real branch UUID
  // comes from the Redux branch slice (the same source baseApi uses for the
  // x-branch-id header) rather than being hardcoded.
  const selectedBranchId = useSelector((s: RootState) => s.branch.selectedBranchId);

  const [settingsOpen, setSettingsOpen] = useState(true);

  // ── Salary settings (GET /salaries/settings) ────────────────────────────────
  const { data: settings, isLoading: settingsLoading, isError: settingsError } = useSalarySettingsQuery();
  const [deleteSetting, { isLoading: isDeletingSetting }] = useDeleteSalarySettingMutation();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const rows = settings ?? [];

  const handleDeleteSetting = async (id: string) => {
    if (!window.confirm(t("finance.salaries.deleteConfirm"))) return;
    setDeletingId(id);
    try {
      await deleteSetting(id).unwrap();
      toast.success(t("finance.salaries.toast.deleted"));
    } catch (err) {
      const detail = extractApiError(err);
      const generic = t("finance.salaries.toast.deleteError");
      toast.error(detail ? `${generic}: ${detail}` : generic);
    } finally {
      setDeletingId(null);
    }
  };

  // ── Calculate (POST /salaries/calculate) ────────────────────────────────────
  const [monthDate, setMonthDate] = useState("");
  const [calculateSalaries, { isLoading: isCalculating }] = useCalculateSalariesMutation();

  const handleCalculate = async () => {
    const { year, month } = splitPeriod(monthDate);
    if (!year || !month) return;
    try {
      await calculateSalaries({ year, month, branchId: selectedBranchId ?? undefined }).unwrap();
      toast.success(t("finance.salaries.toast.calculated"));
    } catch (err) {
      const detail = extractApiError(err);
      const generic = t("finance.salaries.toast.calculateError");
      toast.error(detail ? `${generic}: ${detail}` : generic);
    }
  };

  // ── Payrolls (GET /salaries/payrolls) ───────────────────────────────────────
  const [payrollPeriod, setPayrollPeriod] = useState("");
  const [payrollStatus, setPayrollStatus] = useState("");
  const [page, setPage] = useState(1);

  const payrollArgs = useMemo(() => {
    const { year, month } = splitPeriod(payrollPeriod);
    return {
      page,
      limit: PAGE_SIZE,
      year,
      month,
      status: (payrollStatus as PayrollStatus) || undefined,
    };
  }, [page, payrollPeriod, payrollStatus]);

  const { data: payrollsData, isLoading: payrollsLoading, isFetching: payrollsFetching, isError: payrollsError } =
    useSalaryPayrollsQuery(payrollArgs);
  const [fetchPayrollsExcel, { isFetching: isExporting }] = useLazySalaryPayrollsExcelQuery();
  const [publishPayroll, { isLoading: isPublishing }] = usePublishSalaryPayrollMutation();
  const [payPayroll, { isLoading: isPaying }] = usePaySalaryPayrollMutation();
  const { data: paymentMethods } = usePaymentMethodsQuery();

  const payrolls = payrollsData?.rows ?? [];
  const totalPages = payrollsData?.meta.totalPages ?? 1;

  const [detailId, setDetailId] = useState<string | null>(null);
  const [payTarget, setPayTarget] = useState<PayrollRow | null>(null);
  const [payMethodId, setPayMethodId] = useState("");
  const [payAmount, setPayAmount] = useState("");

  const handleExportPayrolls = async () => {
    try {
      const blob = await fetchPayrollsExcel(payrollArgs).unwrap();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "payrolls.xlsx";
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error(t("finance.salaries.payrolls.exportError"));
    }
  };

  const handlePublish = async (id: string) => {
    try {
      await publishPayroll(id).unwrap();
      toast.success(t("finance.salaries.toast.published"));
    } catch (err) {
      const detail = extractApiError(err);
      const generic = t("finance.salaries.toast.publishError");
      toast.error(detail ? `${generic}: ${detail}` : generic);
    }
  };

  const openPayDialog = (payroll: PayrollRow) => {
    setPayTarget(payroll);
    setPayMethodId("");
    setPayAmount("");
  };

  const handlePay = async () => {
    if (!payTarget || !payMethodId) return;
    const parsed = payAmount.trim() === "" ? undefined : Number(payAmount);
    try {
      await payPayroll({
        id: payTarget.id,
        paymentMethodId: payMethodId,
        paidAmount: parsed !== undefined && Number.isFinite(parsed) ? parsed : undefined,
      }).unwrap();
      toast.success(t("finance.salaries.toast.paid"));
      setPayTarget(null);
    } catch (err) {
      const detail = extractApiError(err);
      const generic = t("finance.salaries.toast.payError");
      toast.error(detail ? `${generic}: ${detail}` : generic);
    }
  };

  const statusLabel = (status: string) => {
    const key = status.toLowerCase();
    return ["draft", "published", "paid"].includes(key)
      ? t(`finance.salaries.payrolls.status.${key}`)
      : status || "—";
  };

  const statusCls = (status: string) =>
    status === "PAID" ? "bg-green-100 text-green-700"
      : status === "PUBLISHED" ? "bg-blue-100 text-blue-700"
      : "bg-gray-100 text-gray-600";

  const inputCls =
    "flex-1 border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-400 bg-white disabled:bg-gray-50";

  const settingsCols = [
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
  ];

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
                <input type="text" className={inputCls} disabled />
                <button
                  disabled
                  title={t("finance.salaries.createNotSupported")}
                  className="border border-gray-300 text-gray-400 rounded-full px-5 py-1.5 text-sm font-medium cursor-not-allowed"
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
                  <input type="text" className="w-full border border-gray-300 rounded px-3 py-2 text-sm bg-gray-50" disabled />
                </div>
                <input type="text" className={inputCls} disabled />
                <button
                  disabled
                  title={t("finance.salaries.createNotSupported")}
                  className="border border-gray-300 text-gray-400 rounded-full px-5 py-1.5 text-sm font-medium cursor-not-allowed"
                >
                  {t("finance.salaries.addButton")}
                </button>
              </div>
              <p className="mt-2 text-xs text-gray-400">{t("finance.salaries.createNotSupported")}</p>
            </div>

            {/* ---- Settings table (GET /salaries/settings) ---- */}
            <div className="overflow-x-auto border border-gray-200 rounded-lg">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    {settingsCols.map((col) => (
                      <th key={col} className="text-left px-4 py-3 text-gray-500 font-medium whitespace-nowrap">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {settingsLoading ? (
                    <tr><td colSpan={10} className="text-center py-8"><CircularProgress size={24} /></td></tr>
                  ) : settingsError ? (
                    <tr><td colSpan={10} className="text-center py-8 text-red-500">{t("finance.salaries.loadError")}</td></tr>
                  ) : rows.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="text-center py-8 text-gray-400">
                        {t("finance.salaries.table.noData")}
                      </td>
                    </tr>
                  ) : (
                    rows.map((row) => (
                      <tr key={row.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="px-4 py-3 whitespace-nowrap">{row.calcSetting || "—"}</td>
                        <td className="px-4 py-3 whitespace-nowrap">{row.salaryType || "—"}</td>
                        <td className="px-4 py-3">{row.amount === "" || row.amount === null ? "—" : String(row.amount)}</td>
                        <td className="px-4 py-3">{row.courseName || "—"}</td>
                        <td className="px-4 py-3">{row.groupName || "—"}</td>
                        <td className="px-4 py-3">{row.teacherName || "—"}</td>
                        <td className="px-4 py-3">{row.studentName || "—"}</td>
                        <td className="px-4 py-3">{row.createdBy || "—"}</td>
                        <td className="px-4 py-3 whitespace-nowrap">{row.updatedAt || "—"}</td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => handleDeleteSetting(row.id)}
                            disabled={isDeletingSetting && deletingId === row.id}
                            className="text-red-400 hover:text-red-600 text-xs border border-red-200 rounded px-2 py-1 hover:bg-red-50 transition-colors disabled:opacity-50"
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

      {/* ---- Calculate bar (POST /salaries/calculate) ---- */}
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
        <button
          onClick={handleCalculate}
          disabled={!monthDate || isCalculating}
          className="flex items-center gap-2 bg-blue-700 hover:bg-blue-800 disabled:opacity-60 text-white rounded-full px-6 py-2 text-sm font-medium transition-colors"
        >
          {isCalculating && <CircularProgress size={14} sx={{ color: "#fff" }} />}
          {t("finance.salaries.calculate")}
        </button>
      </div>

      {/* ---- Payrolls card (GET /salaries/payrolls) ---- */}
      <div className="mt-5 bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-800">{t("finance.salaries.payrolls.title")}</h2>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="month"
              value={payrollPeriod}
              onChange={(e) => { setPayrollPeriod(e.target.value); setPage(1); }}
              className="border border-gray-300 rounded px-3 py-2 text-sm bg-white focus:outline-none focus:border-blue-400 text-gray-700"
            />
            <div className="w-40">
              <Select
                value={payrollStatus}
                onChange={(v) => { setPayrollStatus(v); setPage(1); }}
                options={STATUSES.map((s) => ({ value: s, label: statusLabel(s) }))}
                placeholder={t("finance.salaries.payrolls.filters.allStatuses")}
              />
            </div>
            <button
              onClick={handleExportPayrolls}
              disabled={isExporting}
              title={t("finance.salaries.payrolls.exportExcel")}
              className="flex items-center gap-2 rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-60"
            >
              {isExporting ? <CircularProgress size={14} /> : <FiDownload size={15} />}
              {t("finance.salaries.payrolls.exportExcel")}
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                {[
                  t("finance.salaries.payrolls.table.teacher"),
                  t("finance.salaries.payrolls.table.period"),
                  t("finance.salaries.payrolls.table.status"),
                  t("finance.salaries.payrolls.table.total"),
                  t("finance.salaries.payrolls.table.paid"),
                  t("finance.salaries.payrolls.table.actions"),
                ].map((col) => (
                  <th key={col} className="text-left px-4 py-3 text-gray-500 font-medium whitespace-nowrap">{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {payrollsLoading || payrollsFetching ? (
                <tr><td colSpan={6} className="text-center py-10"><CircularProgress size={24} /></td></tr>
              ) : payrollsError ? (
                <tr><td colSpan={6} className="text-center py-10 text-red-500">{t("finance.salaries.payrolls.loadError")}</td></tr>
              ) : payrolls.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-10 text-gray-400">{t("finance.salaries.payrolls.noData")}</td></tr>
              ) : (
                payrolls.map((p) => (
                  <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap">{p.teacherName || "—"}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{formatPeriod(p.periodYear, p.periodMonth)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${statusCls(p.status)}`}>
                        {statusLabel(p.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">{formatMoney(p.totalAmount)}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{formatMoney(p.paidAmount)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setDetailId(p.id)}
                          className="rounded border border-gray-300 px-2 py-1 text-xs text-gray-600 transition-colors hover:bg-gray-50"
                        >
                          {t("finance.salaries.payrolls.actions.details")}
                        </button>
                        {p.status === "DRAFT" && (
                          <button
                            onClick={() => handlePublish(p.id)}
                            disabled={isPublishing}
                            className="rounded border border-blue-300 px-2 py-1 text-xs text-blue-600 transition-colors hover:bg-blue-50 disabled:opacity-50"
                          >
                            {t("finance.salaries.payrolls.actions.publish")}
                          </button>
                        )}
                        {p.status === "PUBLISHED" && (
                          <button
                            onClick={() => openPayDialog(p)}
                            className="rounded border border-green-300 px-2 py-1 text-xs text-green-600 transition-colors hover:bg-green-50"
                          >
                            {t("finance.salaries.payrolls.actions.pay")}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 border-t border-gray-100 py-3">
            <button
              onClick={() => setPage((n) => Math.max(1, n - 1))}
              disabled={page <= 1}
              className="rounded border border-gray-300 px-3 py-1 text-sm text-gray-600 disabled:opacity-40"
            >
              ‹
            </button>
            <span className="text-sm text-gray-600">{page} / {totalPages}</span>
            <button
              onClick={() => setPage((n) => Math.min(totalPages, n + 1))}
              disabled={page >= totalPages}
              className="rounded border border-gray-300 px-3 py-1 text-sm text-gray-600 disabled:opacity-40"
            >
              ›
            </button>
          </div>
        )}
      </div>

      {/* ---- Detail modal ---- */}
      {detailId && <PayrollDetailModal id={detailId} onClose={() => setDetailId(null)} />}

      {/* ---- Pay modal (POST /salaries/payrolls/{id}/pay) ---- */}
      {payTarget && (
        <div className="fixed inset-0 z-[1300] flex items-center justify-center bg-black/30 p-6" onClick={() => setPayTarget(null)}>
          <div className="w-full max-w-sm rounded-lg bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="mb-4 text-base font-semibold text-gray-800">{t("finance.salaries.payrolls.pay.title")}</h2>

            <label className="mb-1.5 block text-sm text-gray-600">{t("finance.salaries.payrolls.pay.paymentMethod")}</label>
            <Select
              value={payMethodId}
              onChange={setPayMethodId}
              options={(paymentMethods ?? []).map((m) => ({ value: m.id, label: m.name }))}
              placeholder={t("finance.salaries.payrolls.pay.selectMethod")}
            />

            <label className="mb-1.5 mt-4 block text-sm text-gray-600">{t("finance.salaries.payrolls.pay.amount")}</label>
            <input
              type="number"
              min={0}
              value={payAmount}
              onChange={(e) => setPayAmount(e.target.value)}
              placeholder={String(payTarget.totalAmount)}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
            />
            <p className="mt-1 text-xs text-gray-400">{t("finance.salaries.payrolls.pay.amountHint")}</p>

            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setPayTarget(null)}
                disabled={isPaying}
                className="rounded border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
              >
                {t("finance.salaries.payrolls.pay.cancel")}
              </button>
              <button
                onClick={handlePay}
                disabled={!payMethodId || isPaying}
                className="flex items-center gap-2 rounded bg-green-500 px-4 py-2 text-sm font-medium text-white hover:bg-green-600 disabled:opacity-60"
              >
                {isPaying && <CircularProgress size={14} sx={{ color: "#fff" }} />}
                {t("finance.salaries.payrolls.pay.confirm")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
