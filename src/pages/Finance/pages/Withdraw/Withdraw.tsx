import { useState, useMemo } from "react";
import { useSelector } from "react-redux";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Dot,
} from "recharts";
import {
  Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Pagination, CircularProgress,
  IconButton, Tooltip as MuiTooltip,
} from "@mui/material";
import { FiAlertCircle, FiPlus, FiDownload, FiTrash2 } from "react-icons/fi";
import { BsCash } from "react-icons/bs";
import { useTranslation } from "react-i18next";
import { Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Button } from "@mui/material";

import { useFinanceChartQuery, useWithdrawalsQuery, useWithdrawalsTotalQuery, useLazyWithdrawalsExcelQuery, useDeleteWithdrawalMutation } from "../../../../app/api/financeApi";
import { AddWithdrawal } from "../../../../components/AddWithdrawal";
import { useToast } from "../../../../Context/ToastContext";
import { DatePickerField } from "../../../SingleGroup/DatePickerField";
import type { RootState } from "../../../../app/store";
import { useBranch } from "../../../../Context/BranchContext";
import { downloadExcelBlob } from "../../../../utils/downloadExcel";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number) => n.toLocaleString("ru-RU");
const fmtDate = (d: string | null) => (d ? d.split("-").reverse().join(".") : "—");

const PAGE_LIMIT = 20;

// ─── Small UI pieces ──────────────────────────────────────────────────────────

const Label = ({ text }: { text: string }) => (
  <label className="block text-[10px] text-gray-500 dark:text-[var(--color-text-secondary)] font-medium mb-1">{text}</label>
);

const Input = ({ value, onChange, placeholder, type = "text" }: {
  value: string; onChange: (v: string) => void; placeholder?: string; type?: string;
}) => (
  <input
    type={type}
    value={value}
    onChange={(e) => onChange(e.target.value)}
    placeholder={placeholder}
    className="w-full border border-gray-200 dark:border-[var(--color-border)] rounded-md px-2 py-[7px] text-xs text-gray-700 dark:text-[var(--color-text-primary)] bg-white dark:bg-[var(--color-surface)] focus:outline-none focus:ring-1 focus:ring-[#003366]"
  />
);

// ─── Main ─────────────────────────────────────────────────────────────────────

export const Withdraw = () => {
  const { t } = useTranslation();
  const toast = useToast();
  const branchId = useSelector((s: RootState) => s.branch.selectedBranchId);
  const { branchLabel } = useBranch();
  const [addWithdrawalOpen, setAddWithdrawalOpen] = useState(false);

  const [draftSearch, setDraftSearch] = useState("");
  const [draftStartDate, setDraftStartDate] = useState("");
  const [draftEndDate, setDraftEndDate] = useState("");

  const [applied, setApplied] = useState({ search: "", startDate: "", endDate: "", page: 1 });

  const queryArgs = useMemo(
    () => ({
      search: applied.search || undefined,
      startDate: applied.startDate || undefined,
      endDate: applied.endDate || undefined,
      branchId: branchId ?? undefined,
      page: applied.page,
      limit: PAGE_LIMIT,
    }),
    [applied, branchId]
  );

  const {
    data: withdrawalsData, isLoading: withdrawalsLoading, isFetching: withdrawalsFetching,
    isError: withdrawalsError, refetch: refetchWithdrawals,
  } = useWithdrawalsQuery(queryArgs);
  // Aggregate sum matching the current filters (GET /finance/withdrawals/total).
  const { data: filteredTotalData, isFetching: isFilteredTotalFetching } = useWithdrawalsTotalQuery(queryArgs);
  const [fetchWithdrawalsExcel, { isFetching: isExporting }] = useLazyWithdrawalsExcelQuery();
  const [deleteWithdrawal, { isLoading: isDeleting }] = useDeleteWithdrawalMutation();
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const rows = withdrawalsData?.rows ?? [];
  const meta = withdrawalsData?.meta;
  const total = meta?.total ?? 0;
  const totalPages = Math.max(1, meta?.totalPages ?? 1);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleteError(null);
    try {
      await deleteWithdrawal(deleteTarget).unwrap();
      toast.success(t("finance.withdraw.toast.deleted"));
      setDeleteTarget(null);
    } catch {
      setDeleteError(t("finance.withdraw.deleteConfirm.error"));
    }
  };

  const handleExportExcel = async () => {
    try {
      // The export always covers every matching row, not just the page on screen
      // (queryArgs carries the current page/limit for the on-screen table).
      const blob = await fetchWithdrawalsExcel({ ...queryArgs, page: 1, limit: 3000 }).unwrap();
      downloadExcelBlob(blob, "withdrawals", branchLabel);
    } catch {
      toast.error(t("finance.withdraw.exportError"));
    }
  };

  const applyFilters = () => {
    setApplied({ search: draftSearch, startDate: draftStartDate, endDate: draftEndDate, page: 1 });
  };

  const goToPage = (page: number) => setApplied((prev) => ({ ...prev, page }));

  // ── Chart + stat card: real data from GET /finance/chart ──────────────────
  const currentYear = new Date().getFullYear();
  const [year] = useState(currentYear);
  const {
    data: chartMonths, isLoading: chartLoading, isError: chartError, refetch: refetchChart,
  } = useFinanceChartQuery({ year, branchId: branchId ?? undefined });

  const totalWithdrawalsThisYear = (chartMonths ?? []).reduce((a, m) => a + m.totalWithdrawals, 0);

  return (
    <div className="p-6 bg-gray-50 dark:bg-[var(--color-surface-alt)] min-h-screen">

      {/* Title */}
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-[var(--color-text-primary)]">{t("finance.withdraw.title")}</h1>
        <div className="flex items-center gap-2">
          <MuiTooltip title={t("finance.withdraw.exportExcel")} placement="top" arrow>
            <span>
              <IconButton size="small" onClick={handleExportExcel} disabled={isExporting}>
                {isExporting ? <CircularProgress size={16} /> : <FiDownload />}
              </IconButton>
            </span>
          </MuiTooltip>
          <button
            onClick={() => setAddWithdrawalOpen(true)}
            className="flex items-center gap-1.5 bg-[#003366] hover:bg-[#002244] text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            <FiPlus size={15} /> {t("addWithdrawal.title")}
          </button>
        </div>
      </div>

      {/* Top: stat card + chart */}
      <div className="grid grid-cols-5 gap-4 mb-5">

        {/* Stat card */}
        <div className="col-span-2">
          <div className="bg-white dark:bg-[var(--color-surface)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] border-l-[5px] border-l-[#003366] px-6 py-5 flex items-center justify-between shadow-sm h-full">
            <div>
              <p className="text-sm text-gray-500 dark:text-[var(--color-text-secondary)] font-medium mb-2">{t("finance.withdraw.stats.totalWithdrawals")}</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-[var(--color-text-primary)] tracking-tight">
                {chartLoading ? "…" : fmt(totalWithdrawalsThisYear)}{" "}
                <span className="text-base font-semibold text-gray-500 dark:text-[var(--color-text-secondary)]">UZS</span>
              </p>
              <p className="text-xs text-gray-400 dark:text-[var(--color-text-muted)] mt-2">📅 {year}</p>
            </div>
            <BsCash size={40} className="text-[#003366] opacity-80 shrink-0 ml-4" />
          </div>
        </div>

        {/* Chart */}
        <div className="col-span-3 bg-white dark:bg-[var(--color-surface)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-4 shadow-sm">
          {chartLoading ? (
            <div className="h-[200px] flex items-center justify-center"><CircularProgress size={22} /></div>
          ) : chartError ? (
            <div className="h-[200px] flex flex-col items-center justify-center gap-2 text-gray-500 dark:text-[var(--color-text-secondary)]">
              <FiAlertCircle size={20} className="text-red-400" />
              <span className="text-sm">{t("finance.allPayments.chart.loadError")}</span>
              <button onClick={() => refetchChart()} className="px-4 py-1.5 text-xs font-medium border border-gray-200 dark:border-[var(--color-border)] rounded hover:bg-gray-50 dark:hover:bg-[var(--color-surface-hover)]">
                {t("finance.allPayments.chart.retry")}
              </button>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartMonths ?? []} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-subtle)" />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 8, fill: "#9ca3af" }}
                  interval={1}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fontSize: 8, fill: "#9ca3af" }}
                  tickFormatter={(v) => `${Math.round(v / 1000000)}M`}
                  tickLine={false}
                  axisLine={false}
                  width={52}
                />
                <Tooltip
                  formatter={(v) => v !== undefined ? [`${fmt(v as number)} UZS`, t("finance.withdraw.stats.totalWithdrawals")] : null}
                  contentStyle={{ fontSize: 11, borderRadius: 6, border: "1px solid var(--color-border)" }}
                />
                <Line
                  type="monotone"
                  dataKey="totalWithdrawals"
                  stroke="#e07020"
                  strokeWidth={2}
                  dot={<Dot r={3} fill="#e07020" stroke="#fff" strokeWidth={1.5} />}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Filters — only fields GET /finance/withdrawals actually accepts */}
      <div className="bg-white dark:bg-[var(--color-surface)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] shadow-sm mb-4 px-5 py-4">
        <div className="grid grid-cols-4 gap-3 items-end">
          <div>
            <Label text={t("finance.withdraw.filters.dateFrom")} />
            <DatePickerField value={draftStartDate} onChange={setDraftStartDate} />
          </div>
          <div>
            <Label text={t("finance.withdraw.filters.dateTo")} />
            <DatePickerField value={draftEndDate} onChange={setDraftEndDate} />
          </div>
          <div>
            <Label text={t("finance.withdraw.filters.namePhone")} />
            <Input value={draftSearch} onChange={setDraftSearch} />
          </div>
          <div>
            <button
              className="w-full bg-[#003366] text-white rounded-md py-[7px] text-xs font-medium hover:bg-[#002244] transition-colors"
              onClick={applyFilters}
            >
              {t("finance.withdraw.filters.filter")}
            </button>
          </div>
        </div>
      </div>

      {/* Filtered total (GET /finance/withdrawals/total) */}
      <div className="flex items-center justify-end px-1 mb-2">
        <span className="text-sm text-gray-600 dark:text-[var(--color-text-secondary)]">
          {t("finance.withdraw.stats.filteredTotal")}{" "}
          <strong className="text-gray-800 dark:text-[var(--color-text-primary)]">{isFilteredTotalFetching ? "…" : fmt(filteredTotalData?.total ?? 0)} UZS</strong>
        </span>
      </div>

      {/* Table (real data: GET /finance/withdrawals) */}
      <div className="bg-white dark:bg-[var(--color-surface)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] overflow-hidden shadow-sm">
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ backgroundColor: "var(--color-surface-alt)" }}>
                {[
                  t("finance.withdraw.table.date"),
                  t("finance.withdraw.table.name"),
                  t("finance.withdraw.table.sum"),
                  t("finance.withdraw.table.comment"),
                  t("finance.withdraw.table.creator"),
                  "",
                ].map((label, i) => (
                  <TableCell
                    key={label || `col-${i}`}
                    sx={{
                      fontWeight: 700,
                      fontSize: 12,
                      color: "var(--color-text-primary)",
                      whiteSpace: "nowrap",
                      borderBottom: "2px solid var(--color-border)",
                      py: 1.5,
                    }}
                  >
                    {label}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>

            <TableBody>
              {withdrawalsLoading ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                    <CircularProgress size={22} />
                  </TableCell>
                </TableRow>
              ) : withdrawalsError ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                    <div className="flex flex-col items-center gap-2 text-gray-500 dark:text-[var(--color-text-secondary)]">
                      <FiAlertCircle size={20} className="text-red-400" />
                      <span className="text-sm">{t("finance.withdraw.table.loadError")}</span>
                      <button onClick={() => refetchWithdrawals()} className="px-4 py-1.5 text-xs font-medium border border-gray-200 dark:border-[var(--color-border)] rounded hover:bg-gray-50 dark:hover:bg-[var(--color-surface-hover)]">
                        {t("finance.withdraw.table.retry")}
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4, color: "var(--color-text-muted)", fontSize: 13 }}>
                    {t("finance.withdraw.table.empty")}
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((w, i) => {
                  const rowNum = (applied.page - 1) * PAGE_LIMIT + i + 1;
                  return (
                    <TableRow
                      key={w.id}
                      sx={{
                        backgroundColor: i % 2 === 0 ? "var(--color-surface)" : "var(--color-surface-alt)",
                        opacity: withdrawalsFetching ? 0.6 : 1,
                      }}
                    >
                      <TableCell sx={{ fontSize: 12, py: 1.5, whiteSpace: "nowrap", fontWeight: 500, color: "var(--color-text-primary)", minWidth: 110 }}>
                        {rowNum}. {fmtDate(w.date)}
                      </TableCell>
                      <TableCell sx={{ fontSize: 12, py: 1.5, whiteSpace: "nowrap", minWidth: 160 }}>
                        {w.recipientName || <span className="text-gray-400 dark:text-[var(--color-text-muted)] italic text-xs">—</span>}
                      </TableCell>
                      <TableCell sx={{ fontSize: 12, py: 1.5, whiteSpace: "nowrap", minWidth: 130 }}>
                        <span className="font-bold text-gray-900 dark:text-[var(--color-text-primary)] text-sm">{fmt(w.amount)}</span>
                        <span className="text-[11px] text-gray-400 dark:text-[var(--color-text-muted)] ml-1">UZS</span>
                      </TableCell>
                      <TableCell sx={{ fontSize: 12, py: 1.5, minWidth: 200 }}>
                        {w.reason || <span className="text-gray-400 dark:text-[var(--color-text-muted)] italic text-xs">—</span>}
                      </TableCell>
                      <TableCell sx={{ fontSize: 12, py: 1.5, minWidth: 160 }}>
                        <span className="text-gray-700 dark:text-[var(--color-text-primary)] text-xs">{w.createdBy || "—"}</span>
                        {w.createdAt && (
                          <>
                            <br />
                            <span className="text-[11px] text-gray-400 dark:text-[var(--color-text-muted)]">{fmtDate(w.createdAt.slice(0, 10))}</span>
                          </>
                        )}
                      </TableCell>
                      <TableCell sx={{ py: 1.5 }}>
                        <MuiTooltip title={t("finance.withdraw.table.deleteTitle")} placement="top" arrow>
                          <IconButton size="small" onClick={() => { setDeleteError(null); setDeleteTarget(w.id); }}>
                            <FiTrash2 size={13} />
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

        {/* Footer */}
        {!withdrawalsLoading && !withdrawalsError && total > 0 && (
          <div className="flex justify-between items-center px-4 py-3 border-t border-gray-100 dark:border-[var(--color-border)]">
            <span className="text-xs text-gray-500 dark:text-[var(--color-text-secondary)]">
              {t("finance.withdraw.footer.showing")}{" "}
              <strong className="text-gray-700 dark:text-[var(--color-text-primary)]">
                {(applied.page - 1) * PAGE_LIMIT + 1}–{Math.min(applied.page * PAGE_LIMIT, total)}
              </strong>{" "}
              {t("finance.withdraw.footer.of")} <strong className="text-gray-700 dark:text-[var(--color-text-primary)]">{total}</strong> {t("finance.withdraw.footer.withdrawals")}
            </span>

            {totalPages > 1 && (
              <Pagination
                count={totalPages}
                page={applied.page}
                onChange={(_, v) => goToPage(v)}
                size="small"
                shape="rounded"
                sx={{
                  "& .MuiPaginationItem-root": { fontSize: 12, color: "var(--color-text-primary)" },
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

      <AddWithdrawal open={addWithdrawalOpen} onClose={() => setAddWithdrawalOpen(false)} />

      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} PaperProps={{ sx: { borderRadius: "14px", width: 380 } }}>
        <DialogTitle sx={{ fontWeight: 600 }}>{t("finance.withdraw.deleteConfirm.title")}</DialogTitle>
        <DialogContent>
          <DialogContentText>{t("finance.withdraw.deleteConfirm.message")}</DialogContentText>
          {deleteError && <div className="mt-3 text-sm text-red-500">{deleteError}</div>}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setDeleteTarget(null)} disabled={isDeleting} sx={{ textTransform: "none" }}>
            {t("finance.withdraw.deleteConfirm.cancel")}
          </Button>
          <Button onClick={confirmDelete} disabled={isDeleting} color="error" variant="contained" sx={{ textTransform: "none" }}>
            {isDeleting ? "…" : t("finance.withdraw.deleteConfirm.confirm")}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};
