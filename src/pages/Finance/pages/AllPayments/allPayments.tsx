import { useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import {
  Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Collapse, Pagination, CircularProgress,
  IconButton, Tooltip as MuiTooltip,
} from "@mui/material";
import { FiFilter, FiChevronDown, FiChevronUp, FiAlertCircle, FiDownload, FiRotateCcw } from "react-icons/fi";
import { BsCash, BsGraphUp } from "react-icons/bs";
import { useTranslation } from "react-i18next";
import { Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Button } from "@mui/material";

import {
  useFinanceChartQuery,
  usePaymentsListQuery,
  usePaymentsTotalQuery,
  useLazyPaymentsExcelQuery,
  useDeletePaymentMutation,
  usePaymentMethodsQuery,
  useFinanceStatsQuery,
} from "../../../../app/api/financeApi";
import { useToast } from "../../../../Context/ToastContext";
import type { RootState } from "../../../../app/store";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number) => n.toLocaleString("ru-RU");
const fmtDate = (d: string | null) => (d ? d.split("-").reverse().join(".") : "—");

// ─── Reusable UI ─────────────────────────────────────────────────────────────

const Label = ({ text }: { text: string }) => (
  <label className="mb-1 block text-[12px] font-semibold text-gray-600 dark:text-gray-400">{text}</label>
);

const Input = ({ value, onChange, placeholder, type = "text" }: {
  value: string; onChange: (v: string) => void; placeholder?: string; type?: string;
}) => (
  <input
    type={type}
    value={value}
    onChange={(e) => onChange(e.target.value)}
    placeholder={placeholder}
    className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2.5 text-[15px] text-gray-700 dark:text-gray-200 bg-white dark:bg-[var(--color-surface)] focus:outline-none focus:ring-2 focus:ring-[#003366] focus:border-[#003366]"
  />
);

// ─── Main Component ───────────────────────────────────────────────────────────

const PAGE_LIMIT = 20;

export const AllPayments = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const toast = useToast();
  const branchId = useSelector((s: RootState) => s.branch.selectedBranchId);

  // Dashboard's "Paid during the month" card links here with ?startDate=
  // &endDate= (the current month's range) so the list opens pre-filtered
  // instead of just landing on the unfiltered page.
  const [searchParams] = useSearchParams();
  const initialStartDate = searchParams.get("startDate") ?? "";
  const initialEndDate = searchParams.get("endDate") ?? "";

  // Draft inputs — only committed to the request on "Filter" click
  const [draftSearch, setDraftSearch] = useState("");
  const [draftStartDate, setDraftStartDate] = useState(initialStartDate);
  const [draftEndDate, setDraftEndDate] = useState(initialEndDate);
  const [draftPaymentMethodId, setDraftPaymentMethodId] = useState("");

  const [applied, setApplied] = useState({
    search: "", startDate: initialStartDate, endDate: initialEndDate, paymentMethodId: "", page: 1,
  });

  const [showFilters, setShowFilters] = useState(true);

  const { data: paymentMethodsData } = usePaymentMethodsQuery();
  const paymentMethods = paymentMethodsData ?? [];

  const queryArgs = useMemo(
    () => ({
      search: applied.search || undefined,
      startDate: applied.startDate || undefined,
      endDate: applied.endDate || undefined,
      paymentMethodId: applied.paymentMethodId || undefined,
      branchId: branchId ?? undefined,
      page: applied.page,
      limit: PAGE_LIMIT,
    }),
    [applied, branchId]
  );

  const {
    data: paymentsData, isLoading: paymentsLoading, isFetching: paymentsFetching,
    isError: paymentsError, refetch: refetchPayments,
  } = usePaymentsListQuery(queryArgs);
  // Aggregate sum matching the current filters (GET /finance/payments/total).
  const { data: filteredTotalData, isFetching: isFilteredTotalFetching } = usePaymentsTotalQuery(queryArgs);
  const [fetchPaymentsExcel, { isFetching: isExporting }] = useLazyPaymentsExcelQuery();
  // Current-month summary (GET /finance/stats).
  const { data: monthStats } = useFinanceStatsQuery();
  const [deletePayment, { isLoading: isRefunding }] = useDeletePaymentMutation();
  const [refundTarget, setRefundTarget] = useState<string | null>(null);
  const [refundError, setRefundError] = useState<string | null>(null);

  const rows = paymentsData?.rows ?? [];
  const meta = paymentsData?.meta;
  const total = meta?.total ?? 0;
  const totalPages = Math.max(1, meta?.totalPages ?? 1);

  const handleExportExcel = async () => {
    try {
      const blob = await fetchPaymentsExcel(queryArgs).unwrap();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `payments-${applied.page}.xlsx`;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error(t("finance.allPayments.exportError"));
    }
  };

  // DELETE /finance/payments/{id} — a refund/cancel, not a hard delete
  // (backend marks the payment REFUNDED and logs it).
  const confirmRefund = async () => {
    if (!refundTarget) return;
    setRefundError(null);
    try {
      await deletePayment(refundTarget).unwrap();
      toast.success(t("finance.allPayments.toast.refunded"));
      setRefundTarget(null);
    } catch {
      setRefundError(t("finance.allPayments.refundConfirm.error"));
    }
  };

  const applyFilters = () => {
    setApplied({
      search: draftSearch, startDate: draftStartDate, endDate: draftEndDate,
      paymentMethodId: draftPaymentMethodId, page: 1,
    });
  };

  const resetFilters = () => {
    setDraftSearch(""); setDraftStartDate(""); setDraftEndDate(""); setDraftPaymentMethodId("");
    setApplied({ search: "", startDate: "", endDate: "", paymentMethodId: "", page: 1 });
  };

  const goToPage = (page: number) => setApplied((prev) => ({ ...prev, page }));

  // ── Chart: real data from GET /finance/chart ──────────────────────────────
  const currentYear = new Date().getFullYear();
  const YEARS = useMemo(() => Array.from({ length: 5 }, (_, i) => currentYear - i), [currentYear]);
  const [year, setYear] = useState(currentYear);
  const {
    data: chartMonths, isLoading: chartLoading, isError: chartError, refetch: refetchChart,
  } = useFinanceChartQuery({ year, branchId: branchId ?? undefined });

  const totalPaymentsThisYear = (chartMonths ?? []).reduce((a, m) => a + m.totalPayments, 0);
  const totalNetProfitThisYear = (chartMonths ?? []).reduce((a, m) => a + m.netProfit, 0);

  const goToStudent = (studentId: string | null) => {
    if (studentId) navigate(`/students/${studentId}`);
  };

  return (
    <div className="p-6 bg-[var(--color-bg-page)] min-h-screen">

      {/* ── Title ── */}
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">{t("finance.allPayments.title")}</h1>
        <div className="flex items-center gap-2">
          <MuiTooltip title={t("finance.allPayments.exportExcel")} placement="top" arrow>
            <span>
              <IconButton size="small" onClick={handleExportExcel} disabled={isExporting}>
                {isExporting ? <CircularProgress size={16} /> : <FiDownload />}
              </IconButton>
            </span>
          </MuiTooltip>
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 text-sm bg-white dark:bg-[var(--color-surface)] text-gray-700 dark:text-gray-200"
          >
            {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {/* ── Current-month summary (real data: GET /finance/stats) ── */}
      {monthStats && (
        <>
        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">{t("finance.allPayments.stats.thisMonth.title")}</p>
        <div className="grid grid-cols-4 gap-3 mb-5">
          {[
            { label: t("finance.allPayments.stats.thisMonth.income"), value: monthStats.totalIncomeThisMonth },
            { label: t("finance.allPayments.stats.thisMonth.expenses"), value: monthStats.totalExpensesThisMonth },
            { label: t("finance.allPayments.stats.thisMonth.salaries"), value: monthStats.totalSalariesThisMonth },
            { label: t("finance.allPayments.stats.thisMonth.netProfit"), value: monthStats.netProfitThisMonth },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[var(--color-surface)] px-4 py-3 shadow-sm">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{s.label}</p>
              <p className="text-base font-semibold text-gray-900 dark:text-gray-100">{fmt(s.value)} <span className="text-xs font-normal text-gray-400">UZS</span></p>
            </div>
          ))}
        </div>
        </>
      )}

      {/* ── Stats + Chart (real data: GET /finance/chart) ── */}
      <div className="grid grid-cols-5 gap-4 mb-5">

        {/* Left: stat cards */}
        <div className="col-span-2 flex flex-col gap-4">

          {/* Total Revenue (year to date) */}
          <div className="flex items-center justify-between rounded-2xl border border-gray-200 dark:border-gray-700 border-l-[5px] border-l-[#003366] bg-white dark:bg-[var(--color-surface)] px-6 py-6 shadow-sm">
            <div>
              <p className="mb-2 text-[15px] font-semibold text-gray-500 dark:text-gray-400">{t("finance.allPayments.stats.totalRevenue")}</p>
              <p className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
                {chartLoading ? "…" : fmt(totalPaymentsThisYear)}
                <span className="text-lg font-semibold text-gray-500 dark:text-gray-400 ml-2">UZS</span>
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-2 flex items-center gap-1">
                📅 {year}
              </p>
            </div>
            <BsCash size={40} className="text-[#003366] dark:text-[var(--color-nav-active)] opacity-80 shrink-0 ml-4" />
          </div>

          {/* Total Net Profit (year to date) */}
          <div className="rounded-2xl border border-gray-200 dark:border-gray-700 border-l-[5px] border-l-[#003366] bg-white dark:bg-[var(--color-surface)] px-6 py-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="mb-2 text-[15px] font-semibold text-gray-500 dark:text-gray-400">{t("finance.allPayments.stats.totalNetProfit")}</p>
                <p className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
                  {chartLoading ? "…" : fmt(totalNetProfitThisYear)}
                  <span className="text-lg font-semibold text-gray-500 dark:text-gray-400 ml-2">UZS</span>
                </p>
                <p className="mt-2 flex items-center gap-1 text-[13px] text-gray-400 dark:text-gray-500">
                  📅 {year}
                </p>
              </div>
              <BsGraphUp size={38} className="text-[#003366] dark:text-[var(--color-nav-active)] opacity-80 shrink-0 ml-4" />
            </div>
          </div>
        </div>

        {/* Right: Chart */}
        <div className="col-span-3 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[var(--color-surface)] p-5 shadow-sm">
          {chartLoading ? (
            <div className="h-[220px] flex items-center justify-center"><CircularProgress size={22} /></div>
          ) : chartError ? (
            <div className="h-[220px] flex flex-col items-center justify-center gap-2 text-gray-500 dark:text-gray-400">
              <FiAlertCircle size={20} className="text-red-400" />
              <span className="text-sm">{t("finance.allPayments.chart.loadError")}</span>
              <button onClick={() => refetchChart()} className="px-4 py-1.5 text-xs font-medium border border-gray-200 dark:border-gray-700 rounded hover:bg-gray-50 dark:hover:bg-gray-800">
                {t("finance.allPayments.chart.retry")}
              </button>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={chartMonths ?? []} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 9, fill: "var(--color-text-muted)" }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fontSize: 9, fill: "var(--color-text-muted)" }}
                  tickFormatter={(v) => `${Math.round(v / 1000000)}M`}
                  tickLine={false}
                  axisLine={false}
                  width={44}
                />
                <Tooltip
                  formatter={(v, name) => v !== undefined ? [`${fmt(v as number)} UZS`, name] : null}
                  contentStyle={{ fontSize: 11, borderRadius: 6, border: "1px solid var(--color-border)", background: "var(--color-surface)" }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="totalPayments" name={t("finance.allPayments.chart.payments")} stroke="#22c55e" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                <Line type="monotone" dataKey="totalExpenses" name={t("finance.allPayments.chart.expenses")} stroke="#ef4444" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                <Line type="monotone" dataKey="netProfit" name={t("finance.allPayments.chart.netProfit")} stroke="#e07020" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ── Filter Panel — only fields GET /finance/payments actually accepts ── */}
      <div className="mb-4 overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[var(--color-surface)] shadow-sm">
        <button
          onClick={() => setShowFilters((v) => !v)}
          className="flex w-full items-center justify-between px-5 py-3.5 text-[15px] font-semibold text-gray-700 dark:text-gray-200 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800"
        >
          <span className="flex items-center gap-2">
            <FiFilter size={14} /> {t("finance.allPayments.filters.title")}
          </span>
          {showFilters ? <FiChevronUp size={16} /> : <FiChevronDown size={16} />}
        </button>

        <Collapse in={showFilters}>
          <div className="px-5 pb-4 border-t border-gray-100 dark:border-gray-800">
            <div className="grid grid-cols-5 gap-3 mt-4 items-end">
              <div><Label text={t("finance.allPayments.filters.dateFrom")} />
                <Input type="date" value={draftStartDate} onChange={setDraftStartDate} /></div>
              <div><Label text={t("finance.allPayments.filters.dateTo")} />
                <Input type="date" value={draftEndDate} onChange={setDraftEndDate} /></div>
              <div><Label text={t("finance.allPayments.filters.namePhone")} />
                <Input value={draftSearch} onChange={setDraftSearch} placeholder={t("finance.allPayments.filters.searchPlaceholder")} /></div>
              <div>
                <Label text={t("finance.allPayments.filters.methodPay")} />
                <select
                  value={draftPaymentMethodId}
                  onChange={(e) => setDraftPaymentMethodId(e.target.value)}
                  className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2.5 text-[15px] text-gray-700 dark:text-gray-200 bg-white dark:bg-[var(--color-surface)] focus:outline-none focus:ring-2 focus:ring-[#003366] focus:border-[#003366] cursor-pointer"
                >
                  <option value="">{t("finance.allPayments.filters.selectPlaceholder")}</option>
                  {paymentMethods.map((pm) => (
                    <option key={pm.id} value={pm.id}>{pm.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={resetFilters}
                  className="flex-1 rounded-lg border border-gray-200 dark:border-gray-700 py-2.5 text-[14px] text-gray-500 dark:text-gray-400 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  {t("finance.allPayments.filters.reset")}
                </button>
                <button
                  onClick={applyFilters}
                  className="flex-1 rounded-lg bg-[#003366] py-2.5 text-[14px] font-semibold text-white transition-colors hover:bg-[#002244]"
                >
                  {t("finance.allPayments.filters.filter")}
                </button>
              </div>
            </div>
          </div>
        </Collapse>
      </div>

      {/* Filtered total (GET /finance/payments/total) */}
      <div className="flex items-center justify-end px-1 mb-2">
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {t("finance.allPayments.stats.filteredTotal")}{" "}
          <strong className="text-gray-800 dark:text-gray-200">{isFilteredTotalFetching ? "…" : fmt(filteredTotalData?.total ?? 0)} UZS</strong>
        </span>
      </div>

      {/* ── Table (real data: GET /finance/payments) ── */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[var(--color-surface)] shadow-sm">
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ backgroundColor: "var(--color-surface-alt)" }}>
                {[
                  t("finance.allPayments.table.date"),
                  t("finance.allPayments.table.name"),
                  t("finance.allPayments.table.sum"),
                  t("finance.allPayments.table.methodPay"),
                  t("finance.allPayments.table.comment"),
                  t("finance.allPayments.table.creator"),
                  "",
                ].map((label, i) => (
                  <TableCell
                    key={label || `col-${i}`}
                    sx={{
                      fontWeight: 700,
                      fontSize: 13,
                      color: "var(--color-text-secondary)",
                      whiteSpace: "nowrap",
                      borderBottom: "2px solid var(--color-border)",
                      py: 1.6,
                    }}
                  >
                    {label}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>

            <TableBody>
              {paymentsLoading ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                    <CircularProgress size={22} />
                  </TableCell>
                </TableRow>
              ) : paymentsError ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                    <div className="flex flex-col items-center gap-2 text-gray-500 dark:text-gray-400">
                      <FiAlertCircle size={20} className="text-red-400" />
                      <span className="text-sm">{t("finance.allPayments.table.loadError")}</span>
                      <button onClick={() => refetchPayments()} className="px-4 py-1.5 text-xs font-medium border border-gray-200 dark:border-gray-700 rounded hover:bg-gray-50 dark:hover:bg-gray-800">
                        {t("finance.allPayments.table.retry")}
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4, color: "var(--color-text-muted)", fontSize: 14 }}>
                    {t("finance.allPayments.table.empty")}
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((p, i) => {
                  const rowNum = (applied.page - 1) * PAGE_LIMIT + i + 1;
                  return (
                    <TableRow
                      key={p.id}
                      hover
                      onClick={() => goToStudent(p.studentId)}
                      sx={{
                        cursor: p.studentId ? "pointer" : "default",
                        "&:hover": { backgroundColor: "var(--color-primary-surface) !important" },
                        backgroundColor: i % 2 === 0 ? "var(--color-surface)" : "var(--color-surface-alt)",
                        opacity: paymentsFetching ? 0.6 : 1,
                      }}
                    >
                      <TableCell sx={{ fontSize: 13, py: 1.3, whiteSpace: "nowrap", fontWeight: 600, color: "var(--color-text-secondary)" }}>
                        {rowNum}. {fmtDate(p.date)}
                      </TableCell>
                      <TableCell sx={{ fontSize: 12, py: 1.2, color: "var(--color-text-secondary)" }}>
                        {p.studentName || "—"}
                      </TableCell>
                      <TableCell sx={{ fontSize: 13, py: 1.3, whiteSpace: "nowrap" }}>
                        <span className="font-semibold text-gray-900 dark:text-gray-100">{fmt(p.amount)}</span>
                        <span className="ml-1 text-[12px] text-gray-400 dark:text-gray-500">UZS</span>
                      </TableCell>
                      <TableCell sx={{ fontSize: 12, py: 1.2, color: "var(--color-text-secondary)" }}>
                        {p.paymentMethodName || "—"}
                      </TableCell>
                      <TableCell sx={{ fontSize: 12, py: 1.2 }}>
                        {p.notes ? (
                          <span className="whitespace-nowrap rounded-full border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 px-2.5 py-1 text-[12px] text-gray-700 dark:text-gray-300">
                            {p.notes}
                          </span>
                        ) : "—"}
                      </TableCell>
                      <TableCell sx={{ fontSize: 12, py: 1.2 }}>
                        <span className="text-[13px] text-gray-700 dark:text-gray-300">{p.createdBy || "—"}</span>
                        {p.createdAt && (
                          <>
                            <br />
                            <span className="text-[12px] text-gray-400 dark:text-gray-500">{fmtDate(p.createdAt.slice(0, 10))}</span>
                          </>
                        )}
                      </TableCell>
                      <TableCell sx={{ py: 1.2 }} onClick={(e) => e.stopPropagation()}>
                        <MuiTooltip title={t("finance.allPayments.table.refund")} placement="top" arrow>
                          <IconButton size="small" onClick={() => { setRefundError(null); setRefundTarget(p.id); }}>
                            <FiRotateCcw size={13} />
                          </IconButton>
                        </MuiTooltip>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Footer: total + pagination */}
        {!paymentsLoading && !paymentsError && total > 0 && (
          <div className="flex justify-between items-center px-4 py-3 border-t border-gray-100 dark:border-gray-800">
            <span className="text-[13px] text-gray-500 dark:text-gray-400">
              {t("finance.allPayments.footer.showing")}{" "}
              <strong className="text-gray-700 dark:text-gray-300">
                {(applied.page - 1) * PAGE_LIMIT + 1}–{Math.min(applied.page * PAGE_LIMIT, total)}
              </strong>{" "}
              {t("finance.allPayments.footer.of")} <strong className="text-gray-700 dark:text-gray-300">{total}</strong> {t("finance.allPayments.footer.payments")}
            </span>

            {totalPages > 1 && (
              <Pagination
                count={totalPages}
                page={applied.page}
                onChange={(_, v) => goToPage(v)}
                size="small"
                shape="rounded"
                sx={{
                  "& .MuiPaginationItem-root": {
                    fontSize: 12,
                    color: "var(--color-text-secondary)",
                    borderColor: "var(--color-border)",
                  },
                  "& .Mui-selected": {
                    backgroundColor: "#003366 !important",
                    color: "#fff !important",
                  },
                }}
              />
            )}
          </div>
        )}
      </div>

      <Dialog open={!!refundTarget} onClose={() => setRefundTarget(null)} PaperProps={{ sx: { borderRadius: "14px", width: 380 } }}>
        <DialogTitle sx={{ fontWeight: 600 }}>{t("finance.allPayments.refundConfirm.title")}</DialogTitle>
        <DialogContent>
          <DialogContentText>{t("finance.allPayments.refundConfirm.message")}</DialogContentText>
          {refundError && <div className="mt-3 text-sm text-red-500">{refundError}</div>}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setRefundTarget(null)} disabled={isRefunding} sx={{ textTransform: "none" }}>
            {t("finance.allPayments.refundConfirm.cancel")}
          </Button>
          <Button onClick={confirmRefund} disabled={isRefunding} color="error" variant="contained" sx={{ textTransform: "none" }}>
            {isRefunding ? "…" : t("finance.allPayments.refundConfirm.confirm")}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};
