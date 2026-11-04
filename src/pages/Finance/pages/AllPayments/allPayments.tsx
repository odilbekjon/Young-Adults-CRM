import { useState, useMemo, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Collapse, Pagination, CircularProgress,
  IconButton, Tooltip as MuiTooltip,
} from "@mui/material";
import { FiAlertCircle, FiCalendar, FiDownload, FiRotateCcw, FiSliders, FiX } from "react-icons/fi";
import { FaCoins } from "react-icons/fa";
import { TiArrowSortedDown, TiArrowSortedUp, TiArrowUnsorted } from "react-icons/ti";
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
import { useAllGroups } from "../../../../hooks/useAllGroups";
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
  DEFAULT_SORT, EMPTY_FILTERS, buildGroupDirectory, countedPayments, createdLocalDate, createdLocalDateTime,
  filterPayments, hasClientFilters, hasPaymentFilters, sortPayments, staffKeyOf, sumAmounts, teacherNamesOf,
  toOptions, totalsByMethod,
  type Option, type PaymentFilters, type PaymentSort, type SortKey,
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
  <label className="mb-1 flex items-center justify-between gap-1 text-[13px] font-medium text-gray-700 dark:text-gray-300">
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

// The look of a statistics card: white, with a coloured edge on the left.
const statCardCls =
  "flex items-start justify-between gap-3 rounded-xl border border-gray-200 dark:border-gray-700 border-l-[5px] bg-white dark:bg-[var(--color-surface)] px-6 py-5 shadow-sm";
const statCardStyle = { borderLeftColor: "var(--color-primary)" };
const statTitleCls = "text-[22px] leading-tight text-gray-800 dark:text-gray-100";
const statDateCls = "mt-2 flex flex-wrap items-center gap-x-1.5 text-[13px] text-gray-400 dark:text-gray-500";

// ─── Main Component ───────────────────────────────────────────────────────────

const PAGE_LIMIT = 20;

// Columns are laid out by percentage (the table keeps a minimum width and scrolls
// sideways below it), so they sit close to their content on any screen. The
// refund column takes what is left.
const COLUMN_WIDTHS = ["13%", "18%", "14%", "11%", "14%", "12%", "13%"];
const TABLE_MIN_WIDTH = 1040;

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
  // (v3: the staff filter holds the creator's id/key now, not their name — a copy
  // saved by an older version would filter by something that no longer exists.)
  const today = todayLocalISO();
  const [savedDay, setSavedDay] = usePersistedState("allPayments:v3:day", today);
  useEffect(() => {
    if (savedDay !== today) setSavedDay(today);
  }, [savedDay, today, setSavedDay]);
  // A link carrying its own dates wins over the filters saved for a refresh.
  const ignoreSaved = linkRange !== null || savedDay !== today;

  // Draft inputs — only committed to the request on "Filter" click
  const [draft, setDraft] = usePersistedState<PaymentFilters>("allPayments:v3:draft", initialFilters, ignoreSaved);
  const [applied, setApplied] = usePersistedState<PaymentFilters>("allPayments:v3:applied", initialFilters, ignoreSaved);
  const [page, setPage] = usePersistedState("allPayments:v3:page", 1, ignoreSaved);
  // Newest payment first until a column header is clicked.
  const [sort, setSort] = usePersistedState<PaymentSort>("allPayments:v3:sort", DEFAULT_SORT, ignoreSaved);

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
  // filtered by course and teacher, shows its teacher, and the dropdowns have
  // their options. EVERY group, whatever its status and however many pages the
  // backend splits them into: a payment of a group that is missing here has no
  // teacher and no course.
  const { groups, isLoading: groupsLoading } = useAllGroups();
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
  // A course/teacher filter reads the groups, so until they are all here the list
  // would claim that nothing matches.
  const waitingForGroups = groupsLoading && Boolean(applied.courseId || applied.teacherId);
  const paymentsLoading = (!rangeData && !paymentsError) || waitingForGroups;
  // The period holds more payments than are loaded into the browser at once.
  const tooManyPayments = paymentsError ? getTooManyPaymentsTotal(paymentsErrorValue) : null;
  const [fetchPaymentsExcel, { isFetching: isExporting }] = useLazyPaymentsExcelQuery();
  // Current-month summary (GET /finance/stats).
  const { data: monthStats } = useFinanceStatsQuery();
  const [deletePayment, { isLoading: isRefunding }] = useDeletePaymentMutation();
  const [refundTarget, setRefundTarget] = useState<string | null>(null);
  const [refundError, setRefundError] = useState<string | null>(null);

  const allRows = useMemo(() => rangeData?.rows ?? [], [rangeData]);
  const filteredRows = useMemo(() => filterPayments(allRows, applied, directory), [allRows, applied, directory]);
  const rows = useMemo(() => sortPayments(filteredRows, sort, directory), [filteredRows, sort, directory]);
  // Refunded/cancelled payments stay in the table (flagged) but are not money received.
  const counted = useMemo(() => countedPayments(filteredRows), [filteredRows]);
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
  // Built from every group and from the payments on screen (a payment can carry
  // its own group, course and teachers), so whatever a payment shows can be
  // picked.
  const groupOptions = useMemo(
    () => toOptions([...groups, ...allRows.map((p) => ({ id: p.groupId, name: p.groupName }))]),
    [groups, allRows],
  );
  const courseOptions = useMemo(
    () => toOptions([
      ...groups.map((g) => ({ id: g.course?.id ?? g.courseId, name: g.course?.name })),
      ...allRows.map((p) => ({ id: p.courseId, name: p.courseName })),
    ]),
    [groups, allRows],
  );
  const teacherOptions = useMemo(
    () => toOptions([...groups.flatMap((g) => g.teachers ?? []), ...allRows.flatMap((p) => p.teachers ?? [])]),
    [groups, allRows],
  );
  // Staff are those who recorded payments in the period on screen, told apart by
  // id (two people with the same name are two entries). A person picked earlier
  // stays in the list when the period changes to one where they recorded nothing.
  const [knownStaff, setKnownStaff] = useState<Record<string, string>>({});
  useEffect(() => {
    setKnownStaff((prev) => {
      let next = prev;
      allRows.forEach((p) => {
        const key = staffKeyOf(p);
        if (!key || !p.createdBy || prev[key] === p.createdBy) return;
        if (next === prev) next = { ...prev };
        next[key] = p.createdBy;
      });
      return next;
    });
  }, [allRows]);
  const staffOptions = useMemo(() => {
    const options = allRows.map((p) => ({ id: staffKeyOf(p), name: p.createdBy }));
    if (draft.staff && knownStaff[draft.staff]) options.push({ id: draft.staff, name: knownStaff[draft.staff] });
    return toOptions(options);
  }, [allRows, draft.staff, knownStaff]);

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

  // A header click sorts by that column; a second click on it flips the direction.
  const changeSort = (key: SortKey) => {
    setSort((prev) => (prev.key === key ? { key, dir: prev.dir === "asc" ? "desc" : "asc" } : { key, dir: key === "date" ? "desc" : "asc" }));
    setPage(1);
  };

  const goToStudent = (studentId: string | null) => {
    if (studentId) navigate(`/students/${studentId}`);
  };

  const dash = "—";

  const headCellSx = {
    fontWeight: 700,
    fontSize: 13,
    color: "var(--color-text-primary)",
    whiteSpace: "nowrap",
    borderBottom: "1px solid var(--color-border)",
    py: 1.75,
  } as const;
  const sortableHead = (key: SortKey, label: string) => {
    const active = sort.key === key;
    return (
      <TableCell
        key={key}
        sortDirection={active ? sort.dir : false}
        sx={{ ...headCellSx, boxShadow: active ? "inset 0 -2px 0 var(--color-nav-active)" : "none" }}
      >
        <button
          type="button"
          onClick={() => changeSort(key)}
          className="flex w-full cursor-pointer items-center justify-between gap-1 text-left font-bold"
        >
          <span className="truncate">{label}</span>
          {active
            ? (sort.dir === "asc" ? <TiArrowSortedUp size={14} className="shrink-0" /> : <TiArrowSortedDown size={14} className="shrink-0" />)
            : <TiArrowUnsorted size={14} className="shrink-0 text-gray-400" />}
        </button>
      </TableCell>
    );
  };

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

      {/* ── Statistics: payments total, net profit and the chart — one period, the
            same filters as the table below ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mb-5">

        {/* Left: stat cards */}
        <div className="lg:col-span-2 flex flex-col gap-4">

          {/* Total Revenue (the filtered payments of the period) */}
          <div data-testid="revenue-card" className={statCardCls} style={statCardStyle}>
            <div className="min-w-0">
              <p className={statTitleCls}>
                <span>{t("finance.allPayments.stats.totalRevenue")}</span>{" "}
                <span className="font-bold">{paymentsLoading ? "…" : paymentsError ? dash : fmt(revenue)}</span>
                {!paymentsLoading && !paymentsError && <span className="ml-1.5 text-[17px] font-semibold text-gray-500 dark:text-gray-400">UZS</span>}
              </p>
              <p className={statDateCls}>
                <FiCalendar size={13} className="shrink-0" />
                <span>{periodLabel}</span>
                {!paymentsLoading && !paymentsError && <span>· {counted.length} {t("finance.allPayments.footer.payments")}</span>}
              </p>
            </div>
            <FaCoins size={34} className="mt-1 shrink-0 text-[var(--color-primary)] opacity-80" />
          </div>

          {/* Total Net Profit (the backend's figure for the same whole month(s)) */}
          <div data-testid="net-profit-card" className={statCardCls} style={statCardStyle}>
            <div className="min-w-0">
              <p className={statTitleCls}>
                <span>{t("finance.allPayments.stats.totalNetProfit")}</span>{" "}
                <span className="font-bold">{netProfitLoading ? "…" : netProfit === null ? dash : fmt(netProfit)}</span>
                {netProfit !== null && <span className="ml-1.5 text-[17px] font-semibold text-gray-500 dark:text-gray-400">UZS</span>}
              </p>
              <p className={statDateCls}>
                <FiCalendar size={13} className="shrink-0" />
                <span>{periodLabel}</span>
              </p>
              {netProfit === null && !netProfitLoading && (
                <p className="mt-1 text-[12px] text-gray-400 dark:text-gray-500">{t("finance.allPayments.stats.netProfitHint")}</p>
              )}
            </div>
            <FaCoins size={34} className="mt-1 shrink-0 text-[var(--color-primary)] opacity-80" />
          </div>
        </div>

        {/* Right: Chart — payments per day across the period */}
        <div className="lg:col-span-3 min-w-0 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[var(--color-surface)] p-5 shadow-sm">
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
        <div className="mb-5">
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

      {/* ── Filters, laid out flat under the statistics (a label above every
            control); every field narrows the table, the cards and the chart together ── */}
      <Collapse in={showFilters} unmountOnExit>
        <form onSubmit={(e) => { e.preventDefault(); applyFilters(); }} className="mt-2 mb-3">
          {/* Eight columns at most (the second row holds the rest); fewer on narrow screens. */}
          <div
            className="grid items-end gap-4"
            style={{ gridTemplateColumns: "repeat(auto-fill, minmax(max(165px, calc((100% - 7rem) / 8)), 1fr))" }}
          >
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
            <div className="flex items-center gap-3">
              <button
                type="submit"
                className="h-[40px] rounded-full bg-[#003366] px-7 text-[14px] font-semibold text-white transition-colors hover:bg-[#002244]"
              >
                {t("finance.allPayments.filters.filter")}
              </button>
              <button
                type="button"
                onClick={resetFilters}
                className="h-[40px] rounded-lg px-2 text-[14px] text-gray-500 dark:text-gray-400 transition-colors hover:text-gray-800 dark:hover:text-gray-100"
              >
                {t("finance.allPayments.filters.reset")}
              </button>
            </div>
          </div>
        </form>
      </Collapse>

      {/* Shows / hides the filters above (shown by default). */}
      <div className="mb-3 flex justify-end">
        <button
          type="button"
          onClick={() => setShowFilters((v) => !v)}
          aria-expanded={showFilters}
          className="inline-flex h-9 items-center gap-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[var(--color-surface)] px-4 text-[13px] text-gray-700 dark:text-gray-200 shadow-sm transition-colors hover:bg-gray-50 dark:hover:bg-gray-800"
        >
          <FiSliders size={14} /> {t("finance.allPayments.filters.title")}
        </button>
      </div>

      {/* ── Table (real data: GET /finance/payments, paged on this side) ── */}
      <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[var(--color-surface)] shadow-sm">
        <TableContainer>
          <Table
            size="small"
            sx={{
              tableLayout: "fixed",
              minWidth: TABLE_MIN_WIDTH,
              "& th, & td": { px: 1.5, verticalAlign: "middle" },
              "& th:first-of-type, & td:first-of-type": { pl: 2.5 },
            }}
          >
            <colgroup>
              {COLUMN_WIDTHS.map((width, i) => <col key={i} style={{ width }} />)}
              <col />
            </colgroup>
            <TableHead>
              <TableRow>
                {sortableHead("date", t("finance.allPayments.table.date"))}
                {sortableHead("name", t("finance.allPayments.table.name"))}
                {sortableHead("sum", t("finance.allPayments.table.sum"))}
                {sortableHead("method", t("finance.allPayments.table.methodPay"))}
                {sortableHead("teacher", t("finance.allPayments.table.teacher"))}
                <TableCell sx={headCellSx}>{t("finance.allPayments.table.comment")}</TableCell>
                {sortableHead("staff", t("finance.allPayments.table.staff"))}
                <TableCell sx={headCellSx} />
              </TableRow>
            </TableHead>

            <TableBody>
              {paymentsLoading ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 6 }}>
                    <CircularProgress size={22} />
                  </TableCell>
                </TableRow>
              ) : paymentsError ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 6 }}>
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
                  <TableCell colSpan={8} align="center" sx={{ py: 4, color: "var(--color-text-muted)", fontSize: 14 }}>
                    {t("finance.allPayments.table.empty")}
                  </TableCell>
                </TableRow>
              ) : (
                pageRows.map((p, i) => {
                  const rowNum = (currentPage - 1) * PAGE_LIMIT + i + 1;
                  // A refunded/cancelled payment is shown (with its status) but not counted.
                  const voided = !isCompletedPaymentStatus(p.status);
                  const createdAt = createdLocalDateTime(p.createdAt);
                  const teachers = teacherNamesOf(p, directory);
                  return (
                    <TableRow
                      key={p.id}
                      hover
                      onClick={() => goToStudent(p.studentId)}
                      sx={{
                        cursor: p.studentId ? "pointer" : "default",
                        "&:hover": { backgroundColor: "var(--color-primary-surface) !important" },
                        "&:last-child td": { borderBottom: "none" },
                        opacity: paymentsFetching ? 0.6 : 1,
                      }}
                    >
                      <TableCell sx={{ py: 1.1, whiteSpace: "nowrap", borderBottom: "1px solid var(--color-border-subtle)" }}>
                        <span className="mr-2 align-top text-[11px] text-gray-400 dark:text-gray-500">{rowNum}.</span>
                        <span className="text-[13px] font-medium text-gray-700 dark:text-gray-200">{fmtDate(p.date)}</span>
                      </TableCell>
                      <TableCell sx={{ py: 1.1, borderBottom: "1px solid var(--color-border-subtle)" }}>
                        <span className="break-words text-[15px] text-gray-900 dark:text-gray-100">{p.studentName || "—"}</span>
                      </TableCell>
                      <TableCell sx={{ py: 1.1, borderBottom: "1px solid var(--color-border-subtle)" }}>
                        <span className="whitespace-nowrap">
                          <span className={voided ? "text-[15px] text-gray-400 dark:text-gray-500 line-through" : "text-[15px] text-gray-900 dark:text-gray-100"}>{fmt(p.amount)}</span>
                          <span className="ml-1 text-[12px] text-gray-500 dark:text-gray-400">UZS</span>
                        </span>
                        {voided && p.status && (
                          <span className="ml-2 inline-block rounded px-2 py-0.5 text-[12px] font-medium" style={{ background: "#fee2e2", color: "#b91c1c" }}>
                            {p.status.toLowerCase()}
                          </span>
                        )}
                      </TableCell>
                      <TableCell sx={{ py: 1.1, fontSize: 13, color: "var(--color-text-secondary)", borderBottom: "1px solid var(--color-border-subtle)" }}>
                        {p.paymentMethodName || "—"}
                      </TableCell>
                      <TableCell sx={{ py: 1.1, fontSize: 13, color: "var(--color-text-secondary)", borderBottom: "1px solid var(--color-border-subtle)" }}>
                        {teachers || (groupsLoading ? "…" : "—")}
                      </TableCell>
                      <TableCell sx={{ py: 1.1, borderBottom: "1px solid var(--color-border-subtle)" }}>
                        {p.notes ? (
                          <span className="inline-block max-w-full break-words rounded-md bg-gray-100 dark:bg-gray-800 px-2 py-0.5 text-[11px] font-medium text-gray-700 dark:text-gray-300">
                            {p.notes}
                          </span>
                        ) : "—"}
                      </TableCell>
                      <TableCell sx={{ py: 1.1, borderBottom: "1px solid var(--color-border-subtle)" }}>
                        <span className="block break-words text-[13px] text-gray-800 dark:text-gray-200">{p.createdBy || "—"}</span>
                        {createdAt && (
                          <span className="block whitespace-nowrap text-[12px] text-gray-400 dark:text-gray-500">{createdAt}</span>
                        )}
                      </TableCell>
                      <TableCell sx={{ py: 1.1, borderBottom: "1px solid var(--color-border-subtle)" }} onClick={(e) => e.stopPropagation()}>
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
