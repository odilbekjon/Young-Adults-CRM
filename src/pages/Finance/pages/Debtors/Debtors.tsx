import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { BsCashStack } from "react-icons/bs";
import { FiMail, FiAlertCircle, FiDownload, FiFileText } from "react-icons/fi";
import { useTranslation } from "react-i18next";
import { CircularProgress, IconButton, Tooltip } from "@mui/material";

// Reuse the SAME SMS drawer/modal used on the Students page
import { SendSmsModal } from "../../../../components/SendSmsModal";
import { DebtorReceiptModal } from "../../../../components/DebtorReceiptModal";
import { useDebtorsQuery, useDebtorsTotalQuery, useLazyDebtorsExcelQuery } from "../../../../app/api/financeApi";
import { useToast } from "../../../../Context/ToastContext";
import { DatePickerField } from "../../../SingleGroup/DatePickerField";
import { formatUZS } from "../../../../utils";
import type { RootState } from "../../../../app/store";

const PAGE_SIZE_OPTIONS = [20, 25, 50];

interface AppliedFilters {
  search: string;
  startDate: string;
  endDate: string;
  page: number;
  limit: number;
}

export const Debtors = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const toast = useToast();
  const branchId = useSelector((s: RootState) => s.branch.selectedBranchId);

  // Draft inputs — only committed to the request on "Filter" click
  const [draftSearch, setDraftSearch] = useState("");
  const [draftStartDate, setDraftStartDate] = useState("");
  const [draftEndDate, setDraftEndDate] = useState("");

  const [applied, setApplied] = useState<AppliedFilters>({
    search: "", startDate: "", endDate: "", page: 1, limit: 20,
  });

  const [selected, setSelected] = useState<string[]>([]); // uid based
  const [sendSmsOpen, setSendSmsOpen] = useState(false);
  const [receiptStudentId, setReceiptStudentId] = useState<string | null>(null);

  const queryArgs = useMemo(
    () => ({
      search: applied.search || undefined,
      startDate: applied.startDate || undefined,
      endDate: applied.endDate || undefined,
      branchId: branchId ?? undefined,
      page: applied.page,
      limit: applied.limit,
    }),
    [applied, branchId]
  );

  const { data, isLoading, isFetching, isError, refetch } = useDebtorsQuery(queryArgs);
  // Full-dataset total for the current filters (GET /finance/debtors/total) —
  // distinct from the page-visible sum, which only covers the current page
  // under server-side pagination.
  const { data: totalData, isFetching: isTotalFetching } = useDebtorsTotalQuery(queryArgs);
  const [fetchDebtorsExcel, { isFetching: isExporting }] = useLazyDebtorsExcelQuery();

  const rows = data?.rows ?? [];
  const meta = data?.meta;
  const total = meta?.total ?? 0;
  const totalPages = Math.max(1, meta?.totalPages ?? 1);
  const filteredTotalDebt = totalData?.total ?? 0;

  const handleExportExcel = async () => {
    try {
      const blob = await fetchDebtorsExcel(queryArgs).unwrap();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `debtors-${applied.page}.xlsx`;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error(t("finance.debtors.exportError"));
    }
  };

  const applyFilters = () => {
    setApplied((prev) => ({ ...prev, search: draftSearch, startDate: draftStartDate, endDate: draftEndDate, page: 1 }));
  };

  const changePageSize = (limit: number) => setApplied((prev) => ({ ...prev, limit, page: 1 }));
  const goToPage = (page: number) => setApplied((prev) => ({ ...prev, page }));

  const allChecked = rows.length > 0 && rows.every((d) => selected.includes(d.id));
  const toggleAll = () => {
    if (allChecked) setSelected((s) => s.filter((id) => !rows.find((d) => d.id === id)));
    else setSelected((s) => [...new Set([...s, ...rows.map((d) => d.id)])]);
  };
  const toggleOne = (id: string) =>
    setSelected((s) => s.includes(id) ? s.filter((x) => x !== id) : [...s, id]);

  const goToStudent = (studentId: string | null) => {
    if (studentId) navigate(`/students/${studentId}`);
  };

  const inputCls =
    "border border-gray-300 dark:border-gray-700 rounded px-3 py-1.5 text-sm bg-white dark:bg-[var(--color-surface)] text-gray-800 dark:text-gray-200 focus:outline-none focus:border-blue-400 w-full";

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-[var(--color-bg-page)] p-6 font-sans">
      {/* Title */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold text-gray-800 dark:text-gray-100">{t("finance.debtors.title")}</h1>
          <span className="text-sm text-gray-500 dark:text-gray-400">{isLoading ? "…" : t("finance.debtors.quantity", { count: total })}</span>
        </div>
        <Tooltip title={t("finance.debtors.exportExcel")} placement="top" arrow>
          <span>
            <IconButton size="small" onClick={handleExportExcel} disabled={isExporting}>
              {isExporting ? <CircularProgress size={16} /> : <FiDownload />}
            </IconButton>
          </span>
        </Tooltip>
      </div>

      {/* Summary card — real full-dataset total for the current filters
          (GET /finance/debtors/total), not just the current page's sum */}
      <div className="bg-white dark:bg-[var(--color-surface)] border border-gray-200 dark:border-gray-700 rounded-lg px-6 py-4 flex items-center justify-between mb-5 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-1 h-7 bg-blue-500 rounded-full mr-1" />
          <span className="text-gray-700 dark:text-gray-200 font-medium">
            {t("finance.debtors.summary.total")} {isTotalFetching ? "…" : formatUZS(filteredTotalDebt)}
          </span>
        </div>
        <BsCashStack className="text-blue-400 text-2xl" />
      </div>

      {/* Filter panel — only fields GET /finance/debtors actually accepts */}
      <div className="bg-white dark:bg-[var(--color-surface)] border border-gray-200 dark:border-gray-700 rounded-lg px-5 py-4 mb-4 shadow-sm">
        <div className="flex items-end gap-3 flex-wrap">
          <div className="flex-1 min-w-[180px]">
            <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">{t("finance.debtors.filters.search")}</label>
            <input
              type="text"
              className={inputCls}
              value={draftSearch}
              onChange={(e) => setDraftSearch(e.target.value)}
              placeholder={t("finance.debtors.filters.searchPlaceholder")}
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">{t("finance.debtors.filters.dateFrom")}</label>
            <DatePickerField value={draftStartDate} onChange={setDraftStartDate} />
          </div>
          <div>
            <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">{t("finance.debtors.filters.dateTo")}</label>
            <DatePickerField value={draftEndDate} onChange={setDraftEndDate} />
          </div>
          <button
            onClick={applyFilters}
            className="bg-blue-700 hover:bg-blue-800 text-white rounded-full px-6 py-1.5 text-sm font-medium transition-colors"
          >
            {t("finance.debtors.filters.filter")}
          </button>
        </div>
      </div>

      {/* Table toolbar */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500 dark:text-gray-400">{t("finance.debtors.table.rowsPerPage")}</span>
          <select
            className="border border-gray-300 dark:border-gray-700 rounded px-2 py-1 text-sm bg-white dark:bg-[var(--color-surface)] text-gray-800 dark:text-gray-200 focus:outline-none"
            value={applied.limit}
            onChange={(e) => changePageSize(Number(e.target.value))}
          >
            {PAGE_SIZE_OPTIONS.map((n) => <option key={n}>{n}</option>)}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-[var(--color-surface)] border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[var(--color-surface-alt)]">
              <th className="px-4 py-3 w-8">
                <input type="checkbox" checked={allChecked} onChange={toggleAll} className="rounded accent-blue-600" />
              </th>
              <th className="px-3 py-3 text-left text-gray-500 dark:text-gray-400 font-medium w-8">#</th>
              <th className="px-3 py-3 text-left text-gray-500 dark:text-gray-400 font-medium">{t("finance.debtors.table.name")}</th>
              <th className="px-3 py-3 text-left text-gray-500 dark:text-gray-400 font-medium">{t("finance.debtors.table.phone")}</th>
              <th className="px-3 py-3 text-left text-gray-500 dark:text-gray-400 font-medium">{t("finance.debtors.table.balance")}</th>
              <th className="px-3 py-3 text-left text-gray-500 dark:text-gray-400 font-medium">{t("finance.debtors.table.group")}</th>
              <th className="px-3 py-3 text-left text-gray-500 dark:text-gray-400 font-medium">{t("finance.debtors.table.status")}</th>
              <th className="px-3 py-3 w-8" />
              <th className="px-3 py-3 w-8">
                <button
                  type="button"
                  title={selected.length > 0 ? t("finance.debtors.table.sendSmsSelected") : t("finance.debtors.table.selectToSendSms")}
                  onClick={() => { if (selected.length > 0) setSendSmsOpen(true); }}
                  className="inline-flex items-center justify-center disabled:opacity-40"
                  disabled={selected.length === 0}
                >
                  <FiMail size={15} className={selected.length > 0 ? "text-yellow-500" : "text-gray-300 dark:text-gray-600"} />
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={9} className="text-center py-10">
                  <CircularProgress size={22} />
                </td>
              </tr>
            ) : isError ? (
              <tr>
                <td colSpan={9} className="text-center py-10">
                  <div className="flex flex-col items-center gap-2 text-gray-500 dark:text-gray-400">
                    <FiAlertCircle size={20} className="text-red-400" />
                    <span className="text-sm">{t("finance.debtors.table.loadError")}</span>
                    <button onClick={() => refetch()} className="px-4 py-1.5 text-xs font-medium border border-gray-200 dark:border-gray-700 rounded hover:bg-gray-50 dark:hover:bg-gray-800">
                      {t("finance.debtors.table.retry")}
                    </button>
                  </div>
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={9} className="text-center py-10 text-gray-400 dark:text-gray-500">{t("finance.debtors.table.noData")}</td>
              </tr>
            ) : (
              rows.map((d, i) => (
                <tr
                  key={d.id}
                  onClick={() => goToStudent(d.studentId)}
                  className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                  style={{ opacity: isFetching ? 0.6 : 1 }}
                >
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selected.includes(d.id)}
                      onChange={() => toggleOne(d.id)}
                      className="rounded accent-blue-600"
                    />
                  </td>
                  <td className="px-3 py-3 text-gray-500 dark:text-gray-400 text-xs">{(applied.page - 1) * applied.limit + i + 1}.</td>
                  <td className="px-3 py-3 font-medium text-gray-800 dark:text-gray-100 whitespace-nowrap">{d.name || "—"}</td>
                  <td className="px-3 py-3 text-gray-600 dark:text-gray-300 whitespace-nowrap">{d.phone || "—"}</td>
                  <td className="px-3 py-3 text-gray-700 dark:text-gray-200 whitespace-nowrap">{formatUZS(d.balance)}</td>
                  <td className="px-3 py-3 text-gray-600 dark:text-gray-300 whitespace-nowrap">{d.groupName || "—"}</td>
                  <td className="px-3 py-3 text-gray-600 dark:text-gray-300 whitespace-nowrap">{d.status || "—"}</td>
                  <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                    {d.studentId && (
                      <Tooltip title={t("finance.debtors.table.receipt")} placement="top" arrow>
                        <IconButton size="small" onClick={() => setReceiptStudentId(d.studentId)}>
                          <FiFileText size={14} />
                        </IconButton>
                      </Tooltip>
                    )}
                  </td>
                  <td className="px-3 py-3" />
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {!isLoading && !isError && total > 0 && (
        <div className="flex items-center justify-between mt-4">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {(applied.page - 1) * applied.limit + 1}–{Math.min(applied.page * applied.limit, total)} {t("finance.debtors.pagination.of")} {total}
          </span>
          <div className="flex items-center gap-1">
            <button onClick={() => goToPage(1)} disabled={applied.page === 1}
              className="px-2 py-1 rounded text-sm border border-gray-300 dark:border-gray-700 bg-white dark:bg-[var(--color-surface)] text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">«</button>
            <button onClick={() => goToPage(Math.max(1, applied.page - 1))} disabled={applied.page === 1}
              className="px-3 py-1 rounded text-sm border border-gray-300 dark:border-gray-700 bg-white dark:bg-[var(--color-surface)] text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">‹</button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, idx) => {
              let p: number;
              if (totalPages <= 5) p = idx + 1;
              else if (applied.page <= 3) p = idx + 1;
              else if (applied.page >= totalPages - 2) p = totalPages - 4 + idx;
              else p = applied.page - 2 + idx;
              return (
                <button key={p} onClick={() => goToPage(p)}
                  className={`px-3 py-1 rounded text-sm border transition-colors ${
                    applied.page === p
                      ? "bg-blue-700 border-blue-700 text-white"
                      : "border-gray-300 dark:border-gray-700 bg-white dark:bg-[var(--color-surface)] text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                  }`}>
                  {p}
                </button>
              );
            })}
            <button onClick={() => goToPage(Math.min(totalPages, applied.page + 1))} disabled={applied.page === totalPages}
              className="px-3 py-1 rounded text-sm border border-gray-300 dark:border-gray-700 bg-white dark:bg-[var(--color-surface)] text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">›</button>
            <button onClick={() => goToPage(totalPages)} disabled={applied.page === totalPages}
              className="px-2 py-1 rounded text-sm border border-gray-300 dark:border-gray-700 bg-white dark:bg-[var(--color-surface)] text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">»</button>
          </div>
        </div>
      )}

      {/* SMS drawer/modal — reused from the Students page */}
      <SendSmsModal
        open={sendSmsOpen}
        onClose={() => setSendSmsOpen(false)}
        selectedCount={selected.length}
      />

      <DebtorReceiptModal
        open={!!receiptStudentId}
        onClose={() => setReceiptStudentId(null)}
        studentId={receiptStudentId}
      />
    </div>
  );
};
