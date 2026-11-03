import { useState, useMemo, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Collapse, Pagination, CircularProgress,
  IconButton, Tooltip as MuiTooltip,
} from "@mui/material";
import { FiFilter, FiChevronDown, FiChevronUp, FiAlertCircle, FiDownload, FiRotateCcw, FiX } from "react-icons/fi";
import { BsCash, BsGraphUp } from "react-icons/bs";
import { useTranslation } from "react-i18next";
import { Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Button } from "@mui/material";

import {
  useFinanceChartQuery,
  usePaymentsRangeQuery,
  useLazyPaymentsExcelQuery,
  useDeletePaymentMutation,
  usePaymentMethodsQuery,
  useFinanceStatsQuery,
  getTooManyPaymentsTotal,
  isCompletedPaymentStatus,
} from "../../../../app/api/financeApi";
import { useAllGroupsQuery } from "../../../../app/api/groupsApi";
import { useToast } from "../../../../Context/ToastContext";
import { DatePickerField } from "../../../SingleGroup/DatePickerField";
import type { RootState } from "../../../../app/store";
import { useBranch } from "../../../../Context/BranchContext";
import { downloadExcelBlob } from "../../../../utils/downloadExcel";
import { usePersistedState } from "../../../../hooks/usePersistedState";
import { todayLocalISO } from "../../../../utils/localDate";
import { PaymentsChart } from "./PaymentsChart";
import { fmt } from "./format";
import {
  EMPTY_FILTERS, buildGroupDirectory, countedPayments, createdLocalDate, filterPayments, hasClientFilters,
  hasPaymentFilters, sortPayments, sumAmounts, toOptions, totalsByMethod,
  type Option, type PaymentFilters,
} from "./clientFilters";
import {
  buildChartSeries, currentMonthRange, endOfMonthOf, formatIsoDate, rangeFromLink, spansMonths, startOfMonthOf,
  wholeMonthsOf, type DateRange,
} from "./period";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtDate = (d: string | null) => (d ? d.split("-").reverse().join(".") : "—");

const rangeFilters = (range: DateRange): PaymentFilters => ({ ...EMPTY_FILTERS, startDate: range.start, endDate: range.end });

// ─── Reusable UI ─────────────────────────────────────────────────────────────

const controlCls =
  "h-[40px] w-full min-w-0 border border-gray-200 dark:border-gray-700 rounded-lg px-3 text-[14px] text-gray-700 dark:text-gray-200 bg-white dark:bg-[var(--color-surface)] focus:outline-none focus:ring-2 focus:ring-[#003366] focus:border-[#003366]";

const Label = ({ text, onClear }: { text: string; onClear?: () => void }) => (
  <label className="mb-1 flex items-center justify-between gap-1 text-[12px] font-semibold text-gray-600 dark:text-gray-400">
    <span className="truncate">{text}</span>
    {onClear && (
      <button type="button" onClick={onClear} aria-label={text} className="shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
        <FiX size={13} />
      </button>
    )}
  </label>
);

const Input = ({ value, onChange, placeholder, type = "text", inputMode }: {
  value: string; onChange: (v: string) => void; placeholder?: string; type?: string;
  inputMode?: "numeric" | "text";
}) => (
  <input
    type={type}
    inputMode={inputMode}
    value={value}
    onChange={(e) => onChange(e.target.value)}
    placeholder={placeholder}
    className={controlCls}
  />
);

const Select = ({ value, onChange, options, placeholder }: {
  value: string; onChange: (v: string) => void; options: Option[]; placeholder: string;
}) => (
  <select value={value} onChange={(e) => onChange(e.target.value)} className={`${controlCls} cursor-pointer`}>
    <option value="">{placeholder}</option>
    {options.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
  </select>
);

// ─── Main Component ───────────────────────────────────────────────────────────

const PAGE_LIMIT = 20;

export const AllPayments = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const toast = useToast();
  const branchId = useSelector((s: RootState) => s.branch.selectedBranchId);
  const { branchLabel } = useBranch();

  // Dashboard's "Paid during the month" card links here with ?startDate=
  // &endDate= (the current month's range) so the list opens pre-filtered
  // instead of just landing on the unfiltered page.
  const [searchParams] = useSearchParams();
  const linkRange = useMemo(
    () => rangeFromLink(searchParams.get("startDate"), searchParams.get("endDate")),
    [searchParams],
  );
  // The page is a MONTHLY view: with nothing else asked for it opens on the
  // current month, first day to last day.
  const initialFilters = rangeFilters(linkRange ?? currentMonthRange());

  // The filters survive a refresh, but only within the day they were saved on:
  // a tab left open over a month change must not come back on last month.
  const today = todayLocalISO();
  const [savedDay, setSavedDay] = usePersistedState("allPayments:v2:day", today);
  useEffect(() => {
    if (savedDay !== today) setSavedDay(today);
  }, [savedDay, today, setSavedDay]);
  // A link carrying its own dates wins over the filters saved for a refresh.
  const ignoreSaved = linkRange !== null || savedDay !== today;

  // Draft inputs — only committed to the request on "Filter" click
  const [draft, setDraft] = usePersistedState<PaymentFilters>("allPayments:v2:draft", initialFilters, ignoreSaved);
  const [applied, setApplied] = usePersistedState<PaymentFilters>("allPayments:v2:applied", initialFilters, ignoreSaved);
  const [page, setPage] = usePersistedState("allPayments:v2:page", 1, ignoreSaved);

  const [showFilters, setShowFilters] = useState(true);

  const setField = <K extends keyof PaymentFilters>(key: K, value: PaymentFilters[K]) =>
    setDraft((prev) => ({ ...prev, [key]: value }));
  // Each date pair stays in order: moving "from" past "to" carries "to" along
  // (to the end of that month for the period, the same day for created dates),
  // and the other way round.
  const changeStartDate = (value: string) =>
    setDraft((prev) => ({ ...prev, startDate: value, endDate: prev.endDate && prev.endDate < value ? endOfMonthOf(value) ?? value : prev.endDate }));
  const changeEndDate = (value: string) =>
    setDraft((prev) => ({ ...prev, endDate: value, startDate: prev.startDate && prev.startDate > value ? startOfMonthOf(value) ?? value : prev.startDate }));
  const changeCreatedFrom = (value: string) =>
    setDraft((prev) => ({ ...prev, createdFrom: value, createdTo: prev.createdTo && prev.createdTo < value ? value : prev.createdTo }));
  const changeCreatedTo = (value: string) =>
    setDraft((prev) => ({ ...prev, createdTo: value, createdFrom: prev.createdFrom && prev.createdFrom > value ? value : prev.createdFrom }));

  const { data: paymentMethodsData } = usePaymentMethodsQuery();
  const paymentMethods = paymentMethodsData ?? [];
  // Group -> course/teachers, so a payment (which only knows its group) can be
  // filtered by course and teacher, and the dropdowns have their options.
  const { data: groupsData } = useAllGroupsQuery({ page: 1, limit: 100 });
  const groups = useMemo(() => groupsData?.data ?? [], [groupsData]);
  const directory = useMemo(() => buildGroupDirectory(groups), [groups]);

  // The period's payments, every page of them (the chart, cards and table below
  // all read this one list, so they can never describe different things). Only
  // what the backend can filter on goes into the request; the other filters are
  // applied to the complete list on this side.
  const rangeArgs = useMemo(
    () => ({
      search: applied.search.trim() || undefined,
      startDate: applied.startDate || undefined,
      endDate: applied.endDate || undefined,
      paymentMethodId: applied.paymentMethodId || undefined,
      branchId: branchId ?? undefined,
    }),
    [applied, branchId]
  );

  const {
    currentData: rangeData, isFetching: paymentsFetching, isError: paymentsError, error: paymentsErrorValue,
    refetch: refetchPayments,
  } = usePaymentsRangeQuery(rangeArgs);
  const paymentsLoading = !rangeData && !paymentsError;
  // The period holds more payments than are loaded into the browser at once.
  const tooManyPayments = paymentsError ? getTooManyPaymentsTotal(paymentsErrorValue) : null;
  const [fetchPaymentsExcel, { isFetching: isExporting }] = useLazyPaymentsExcelQuery();
  // Current-month summary (GET /finance/stats).
  const { data: monthStats } = useFinanceStatsQuery();
  const [deletePayment, { isLoading: isRefunding }] = useDeletePaymentMutation();
  const [refundTarget, setRefundTarget] = useState<string | null>(null);
  const [refundError, setRefundError] = useState<string | null>(null);

  const allRows = useMemo(() => sortPayments(rangeData?.rows ?? []), [rangeData]);
  const rows = useMemo(() => filterPayments(allRows, applied, directory), [allRows, applied, directory]);
  // Refunded/cancelled payments stay in the table (flagged) but are not money received.
  const counted = useMemo(() => countedPayments(rows), [rows]);
  const revenue = useMemo(() => sumAmounts(counted), [counted]);
  const methodTotals = useMemo(() => totalsByMethod(counted), [counted]);

  const total = rows.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_LIMIT));
  const currentPage = Math.min(page, totalPages);
  const pageRows = rows.slice((currentPage - 1) * PAGE_LIMIT, currentPage * PAGE_LIMIT);

  // ── Chart: the same period and filters as the cards ───────────────────────
  const period = useMemo<DateRange>(() => ({ start: applied.startDate, end: applied.endDate }), [applied.startDate, applied.endDate]);
  const series = useMemo(
    () => buildChartSeries(counted.map((p) => ({ date: p.date ?? createdLocalDate(p.createdAt), amount: p.amount })), period),
    [counted, period],
  );
  const periodLabel = `${formatIsoDate(period.start)} — ${formatIsoDate(period.end)}`;

  // Net profit (payments - expenses - salaries - withdrawals) is the backend's own
  // monthly figure from GET /finance/chart, so it only describes whole calendar
  // months and only when no payment filter narrows the picture: expenses and
  // salaries have no group, method or student to filter by.
  const wholeMonths = useMemo(() => wholeMonthsOf(period), [period]);
  const netProfitApplies = wholeMonths !== null && !hasPaymentFilters(applied);
  const {
    data: chartMonths, isError: netProfitError,
  } = useFinanceChartQuery({ year: wholeMonths?.year ?? 0, branchId: branchId ?? undefined }, { skip: !netProfitApplies });
  const netProfit = netProfitApplies && chartMonths && wholeMonths
    ? chartMonths.filter((m) => wholeMonths.months.includes(m.monthNumber)).reduce((sum, m) => sum + m.netProfit, 0)
    : null;
  const netProfitLoading = netProfitApplies && !chartMonths && !netProfitError;

  // ── Dropdown options ─────────────────────────────────────────────────────
  const groupOptions = useMemo(
    () => toOptions([...groups, ...allRows.map((p) => ({ id: p.groupId, name: p.groupName }))]),
    [groups, allRows],
  );
  const courseOptions = useMemo(() => toOptions(groups.map((g) => ({ id: g.course?.id ?? g.courseId, name: g.course?.name }))), [groups]);
  const teacherOptions = useMemo(() => toOptions(groups.flatMap((g) => g.teachers ?? [])), [groups]);
  // Staff are matched by the name a payment was recorded under: those who recorded
  // payments in the period on screen (plus whoever is picked in the draft).
  const staffOptions = useMemo(
    () => toOptions([...allRows.map((p) => p.createdBy), draft.staff].filter(Boolean).map((name) => ({ id: name!, name }))),
    [allRows, draft.staff],
  );

  // Excel is generated by the backend from the filters it knows; the ones
  // applied on this side can't be passed on, so a filtered export is refused
  // rather than silently containing rows that are not on screen.
  const exportBlocked = hasClientFilters(applied);

  const handleExportExcel = async () => {
    try {
      // The export always covers every matching row, not just the page on screen
      // (rangeArgs carries no paging, the export asks for them all).
      const blob = await fetchPaymentsExcel({ ...rangeArgs, page: 1, limit: 3000 }).unwrap();
      downloadExcelBlob(blob, "payments", branchLabel);
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
    setApplied(draft);
    setPage(1);
  };

  // Back to the current month with nothing else filtered.
  const resetFilters = () => {
    const defaults = rangeFilters(currentMonthRange());
    setDraft(defaults);
    setApplied(defaults);
    setPage(1);
  };

  const goToStudent = (studentId: string | null) => {
    if (studentId) navigate(`/students/${studentId}`);
  };

  const dash = "—";

  return (
    <div className="p-4 sm:p-6 bg-[var(--color-bg-page)] min-h-screen">

      {/* ── Title ── */}
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">{t("finance.allPayments.title")}</h1>
        <MuiTooltip
          title={exportBlocked ? t("finance.allPayments.exportFilteredHint") : t("finance.allPayments.exportExcel")}
          placement="top"
          arrow
        >
          <span>
            <IconButton size="small" onClick={handleExportExcel} disabled={isExporting || exportBlocked}>
              {isExporting ? <CircularProgress size={16} /> : <FiDownload />}
            </IconButton>
          </span>
        </MuiTooltip>
      </div>

      {/* ── Filter Panel — first thing on the page; every field narrows the table,
            the cards and the chart together ── */}
      <div className="mb-5 overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[var(--color-surface)] shadow-sm">
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
          <form
            onSubmit={(e) => { e.preventDefault(); applyFilters(); }}
            className="px-5 pb-4 border-t border-gray-100 dark:border-gray-800"
          >
            {/* As many columns as fit: the fields wrap onto new rows on narrow screens. */}
            <div className="grid gap-3 mt-4 items-end" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))" }}>
              <div className="min-w-0"><Label text={t("finance.allPayments.filters.dateFrom")} />
                <DatePickerField value={draft.startDate} onChange={changeStartDate} /></div>
              <div className="min-w-0"><Label text={t("finance.allPayments.filters.dateTo")} />
                <DatePickerField value={draft.endDate} onChange={changeEndDate} /></div>
              <div className="min-w-0"><Label text={t("finance.allPayments.filters.namePhone")} />
                <Input value={draft.search} onChange={(v) => setField("search", v)} placeholder={t("finance.allPayments.filters.searchPlaceholder")} /></div>
              <div className="min-w-0"><Label text={t("finance.allPayments.filters.group")} />
                <Select value={draft.groupId} onChange={(v) => setField("groupId", v)} options={groupOptions} placeholder={t("finance.allPayments.filters.selectPlaceholder")} /></div>
              <div className="min-w-0"><Label text={t("finance.allPayments.filters.course")} />
                <Select value={draft.courseId} onChange={(v) => setField("courseId", v)} options={courseOptions} placeholder={t("finance.allPayments.filters.selectPlaceholder")} /></div>
              <div className="min-w-0"><Label text={t("finance.allPayments.filters.teacher")} />
                <Select value={draft.teacherId} onChange={(v) => setField("teacherId", v)} options={teacherOptions} placeholder={t("finance.allPayments.filters.selectPlaceholder")} /></div>
              <div className="min-w-0"><Label text={t("finance.allPayments.filters.methodPay")} />
                <Select value={draft.paymentMethodId} onChange={(v) => setField("paymentMethodId", v)} options={paymentMethods} placeholder={t("finance.allPayments.filters.selectPlaceholder")} /></div>
              <div className="min-w-0"><Label text={t("finance.allPayments.filters.sum")} />
                {/* Digits only, shown grouped ("400 000"). */}
                <Input
                  value={draft.amount ? fmt(Number(draft.amount)) : ""}
                  onChange={(v) => setField("amount", v.replace(/\D/g, "").slice(0, 15))}
                  placeholder={t("finance.allPayments.filters.amountPlaceholder")}
                  inputMode="numeric"
                /></div>
              <div className="min-w-0"><Label text={t("finance.allPayments.filters.staffName")} />
                <Select value={draft.staff} onChange={(v) => setField("staff", v)} options={staffOptions} placeholder={t("finance.allPayments.filters.selectPlaceholder")} /></div>
              <div className="min-w-0">
                <Label text={t("finance.allPayments.filters.fromCreatedDate")} onClear={draft.createdFrom ? () => setField("createdFrom", "") : undefined} />
                <DatePickerField value={draft.createdFrom} onChange={changeCreatedFrom} placeholder={t("finance.allPayments.filters.noDateSelected")} /></div>
              <div className="min-w-0">
                <Label text={t("finance.allPayments.filters.toCreatedDate")} onClear={draft.createdTo ? () => setField("createdTo", "") : undefined} />
                <DatePickerField value={draft.createdTo} onChange={changeCreatedTo} placeholder={t("finance.allPayments.filters.noDateSelected")} /></div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={resetFilters}
                  className="h-[40px] flex-1 rounded-lg border border-gray-200 dark:border-gray-700 text-[14px] text-gray-500 dark:text-gray-400 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  {t("finance.allPayments.filters.reset")}
                </button>
                <button
                  type="submit"
                  className="h-[40px] flex-1 rounded-lg bg-[#003366] text-[14px] font-semibold text-white transition-colors hover:bg-[#002244]"
                >
                  {t("finance.allPayments.filters.filter")}
                </button>
              </div>
            </div>
          </form>
        </Collapse>
      </div>

      {/* ── Stats + Chart: one period, the same filters as the table ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mb-5">

        {/* Left: stat cards */}
        <div className="lg:col-span-2 flex flex-col gap-4">

          {/* Total Revenue (the filtered payments of the period) */}
          <div className="flex items-center justify-between rounded-2xl border border-gray-200 dark:border-gray-700 border-l-[5px] border-l-[#003366] bg-white dark:bg-[var(--color-surface)] px-6 py-6 shadow-sm">
            <div className="min-w-0">
              <p className="mb-2 text-[15px] font-semibold text-gray-500 dark:text-gray-400">{t("finance.allPayments.stats.totalRevenue")}</p>
              <p className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
                {paymentsLoading ? "…" : paymentsError ? dash : fmt(revenue)}
                {!paymentsLoading && !paymentsError && <span className="text-lg font-semibold text-gray-500 dark:text-gray-400 ml-2">UZS</span>}
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-2 flex flex-wrap items-center gap-x-1">
                <span>📅 {periodLabel}</span>
                {!paymentsLoading && !paymentsError && <span>· {counted.length} {t("finance.allPayments.footer.payments")}</span>}
              </p>
            </div>
            <BsCash size={40} className="text-[#003366] dark:text-[var(--color-nav-active)] opacity-80 shrink-0 ml-4" />
          </div>

          {/* Total Net Profit (the backend's figure for the same whole month(s)) */}
          <div className="rounded-2xl border border-gray-200 dark:border-gray-700 border-l-[5px] border-l-[#003366] bg-white dark:bg-[var(--color-surface)] px-6 py-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="mb-2 text-[15px] font-semibold text-gray-500 dark:text-gray-400">{t("finance.allPayments.stats.totalNetProfit")}</p>
                <p className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
                  {netProfitLoading ? "…" : netProfit === null ? dash : fmt(netProfit)}
                  {netProfit !== null && <span className="text-lg font-semibold text-gray-500 dark:text-gray-400 ml-2">UZS</span>}
                </p>
                <p className="mt-2 flex items-center gap-1 text-[13px] text-gray-400 dark:text-gray-500">
                  📅 {periodLabel}
                </p>
                {netProfit === null && !netProfitLoading && (
                  <p className="mt-1 text-[12px] text-gray-400 dark:text-gray-500">{t("finance.allPayments.stats.netProfitHint")}</p>
                )}
              </div>
              <BsGraphUp size={38} className="text-[#003366] dark:text-[var(--color-nav-active)] opacity-80 shrink-0 ml-4" />
            </div>
          </div>
        </div>

        {/* Right: Chart — payments per day across the period */}
        <div className="lg:col-span-3 min-w-0 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[var(--color-surface)] p-5 shadow-sm">
          {paymentsLoading ? (
            <div className="h-[260px] flex items-center justify-center"><CircularProgress size={22} /></div>
          ) : paymentsError ? (
            <div className="h-[260px] flex flex-col items-center justify-center gap-2 px-4 text-center text-gray-500 dark:text-gray-400">
              <FiAlertCircle size={20} className="text-red-400" />
              <span className="text-sm">
                {tooManyPayments !== null
                  ? t("finance.allPayments.tooMany", { count: tooManyPayments })
                  : t("finance.allPayments.chart.loadError")}
              </span>
              {tooManyPayments === null && (
                <button onClick={() => refetchPayments()} className="px-4 py-1.5 text-xs font-medium border border-gray-200 dark:border-gray-700 rounded hover:bg-gray-50 dark:hover:bg-gray-800">
                  {t("finance.allPayments.chart.retry")}
                </button>
              )}
            </div>
          ) : (
            <>
              <p className="mb-2 text-xs font-semibold text-gray-500 dark:text-gray-400">
                {t(`finance.allPayments.chart.caption.${series.granularity}`)}
              </p>
              <PaymentsChart series={series} spansMonths={spansMonths(period)} />
            </>
          )}
        </div>
      </div>

      {/* ── Current-month summary (real data: GET /finance/stats) ── */}
      {monthStats && (
        <>
        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">{t("finance.allPayments.stats.thisMonth.title")}</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-5">
          {[
            { label: t("finance.allPayments.stats.thisMonth.income"), value: monthStats.totalIncomeThisMonth },
            { label: t("finance.allPayments.stats.thisMonth.expenses"), value: monthStats.totalExpensesThisMonth },
            { label: t("finance.allPayments.stats.thisMonth.salaries"), value: monthStats.totalSalariesThisMonth },
            { label: t("finance.allPayments.stats.thisMonth.withdrawals"), value: monthStats.totalWithdrawalsThisMonth },
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

      {/* One card per payment method: its share of the filtered result above. */}
      {!paymentsLoading && !paymentsError && methodTotals.length > 0 && (
        <div className="mb-4">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">
            {t("finance.allPayments.stats.byMethod", "By payment method")}
          </p>
          <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))" }}>
            {methodTotals.map((m) => {
              const share = revenue > 0 ? Math.min(100, Math.round((m.amount / revenue) * 100)) : 0;
              return (
                <div key={m.id} className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[var(--color-surface)] px-4 py-3 shadow-sm">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 truncate">{m.name}</p>
                    <span className="text-[11px] font-semibold text-[#003366] dark:text-[var(--color-nav-active)]">{share}%</span>
                  </div>
                  <p className="text-base font-semibold text-gray-900 dark:text-gray-100">
                    {fmt(m.amount)} <span className="text-xs font-normal text-gray-400">UZS</span>
                  </p>
                  <div className="mt-2 h-1.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                    <div className="h-full rounded-full bg-[#003366] transition-all" style={{ width: `${share}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Table (real data: GET /finance/payments, paged on this side) ── */}
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
                      <span className="text-sm">
                        {tooManyPayments !== null
                          ? t("finance.allPayments.tooMany", { count: tooManyPayments })
                          : t("finance.allPayments.table.loadError")}
                      </span>
                      {tooManyPayments === null && (
                        <button onClick={() => refetchPayments()} className="px-4 py-1.5 text-xs font-medium border border-gray-200 dark:border-gray-700 rounded hover:bg-gray-50 dark:hover:bg-gray-800">
                          {t("finance.allPayments.table.retry")}
                        </button>
                      )}
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
                pageRows.map((p, i) => {
                  const rowNum = (currentPage - 1) * PAGE_LIMIT + i + 1;
                  // A refunded/cancelled payment is shown (with its status) but not counted.
                  const voided = !isCompletedPaymentStatus(p.status);
                  const createdDay = createdLocalDate(p.createdAt);
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
                        <span className={voided ? "font-semibold text-gray-400 dark:text-gray-500 line-through" : "font-semibold text-gray-900 dark:text-gray-100"}>{fmt(p.amount)}</span>
                        <span className="ml-1 text-[12px] text-gray-400 dark:text-gray-500">UZS</span>
                        {voided && p.status && (
                          <span className="ml-2 rounded px-2 py-0.5 text-[12px] font-medium" style={{ background: "#fee2e2", color: "#b91c1c" }}>
                            {p.status.toLowerCase()}
                          </span>
                        )}
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
                        {createdDay && (
                          <>
                            <br />
                            <span className="text-[12px] text-gray-400 dark:text-gray-500">{fmtDate(createdDay)}</span>
                          </>
                        )}
                      </TableCell>
                      <TableCell sx={{ py: 1.2 }} onClick={(e) => e.stopPropagation()}>
                        {!voided && (
                          <MuiTooltip title={t("finance.allPayments.table.refund")} placement="top" arrow>
                            <IconButton size="small" onClick={() => { setRefundError(null); setRefundTarget(p.id); }}>
                              <FiRotateCcw size={13} />
                            </IconButton>
                          </MuiTooltip>
                        )}
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
          <div className="flex flex-wrap justify-between items-center gap-2 px-4 py-3 border-t border-gray-100 dark:border-gray-800">
            <span className="text-[13px] text-gray-500 dark:text-gray-400">
              {t("finance.allPayments.footer.showing")}{" "}
              <strong className="text-gray-700 dark:text-gray-300">
                {(currentPage - 1) * PAGE_LIMIT + 1}–{Math.min(currentPage * PAGE_LIMIT, total)}
              </strong>{" "}
              {t("finance.allPayments.footer.of")} <strong className="text-gray-700 dark:text-gray-300">{total}</strong> {t("finance.allPayments.footer.payments")}
            </span>

            {totalPages > 1 && (
              <Pagination
                count={totalPages}
                page={currentPage}
                onChange={(_, v) => setPage(v)}
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
