import { useState, useMemo } from "react";
import { useSelector } from "react-redux";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import {
  Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Pagination, CircularProgress,
} from "@mui/material";
import { FiAlertCircle, FiPlus, FiX, FiDownload, FiEdit2, FiTrash2, FiCheck } from "react-icons/fi";
import { BsCashStack } from "react-icons/bs";
import { useTranslation } from "react-i18next";
import {
  IconButton, Tooltip as MuiTooltip,
  Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Button,
} from "@mui/material";

import {
  useFinanceChartQuery,
  useExpensesQuery,
  useExpensesTotalQuery,
  useLazyExpensesExcelQuery,
  useDeleteExpenseMutation,
  useExpenseCategoriesQuery,
  useCreateExpenseCategoryMutation,
  useUpdateExpenseCategoryMutation,
  useDeleteExpenseCategoryMutation,
  useCreateExpenseMutation,
} from "../../../../app/api/financeApi";
import type { ExpenseCategory } from "../../../../app/api/financeApi/types";
import { useAllBranchesQuery } from "../../../../app/api/branchesApi/branchesApi";
import { PaymentMethodPicker } from "../../../../components/PaymentMethodPicker";
import { useToast } from "../../../../Context/ToastContext";
import type { RootState } from "../../../../app/store";

// ---------- Helpers ----------
const formatUZS = (n: number) => n.toLocaleString("uz-UZ") + " UZS";
const fmtDate = (d: string | null) => (d ? d.split("-").reverse().join(".") : "—");
const todayISO = () => new Date().toISOString().split("T")[0];

const PAGE_LIMIT = 20;

const inputCls =
  "w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-blue-400 bg-white";
const labelCls = "block text-sm font-medium text-gray-700 mb-1";

export const TotalExpenses = () => {
  const { t } = useTranslation();
  const toast = useToast();
  const headerBranchId = useSelector((s: RootState) => s.branch.selectedBranchId);

  // ── Summary + chart: real data from GET /finance/chart ──────────────────
  const currentYear = new Date().getFullYear();
  const YEARS = useMemo(() => Array.from({ length: 5 }, (_, i) => currentYear - i), [currentYear]);
  const [year, setYear] = useState(currentYear);
  const {
    data: chartMonths, isLoading: chartLoading, isError: chartError, refetch: refetchChart,
  } = useFinanceChartQuery({ year, branchId: headerBranchId ?? undefined });

  const totalExpensesThisYear = (chartMonths ?? []).reduce((a, m) => a + m.totalExpenses, 0);
  const barData = (chartMonths ?? []).map((m) => ({ month: m.month, totalExpenses: m.totalExpenses }));

  // ── Real dropdown sources — no hardcoded lists ───────────────────────────
  const { data: categoriesData } = useExpenseCategoriesQuery();
  const categories = categoriesData ?? [];
  const { data: branchesData } = useAllBranchesQuery();
  const branches = (branchesData?.data ?? []).filter((b) => b.status === "ACTIVE");

  // ── List filters (draft vs applied, same pattern as Debtors/AllPayments) ─
  const [draftSearch, setDraftSearch] = useState("");
  const [draftStartDate, setDraftStartDate] = useState("");
  const [draftEndDate, setDraftEndDate] = useState("");
  const [draftCategoryId, setDraftCategoryId] = useState("");

  const [applied, setApplied] = useState({
    search: "", startDate: "", endDate: "", categoryId: "", page: 1,
  });

  const queryArgs = useMemo(
    () => ({
      search: applied.search || undefined,
      startDate: applied.startDate || undefined,
      endDate: applied.endDate || undefined,
      categoryId: applied.categoryId || undefined,
      branchId: headerBranchId ?? undefined,
      page: applied.page,
      limit: PAGE_LIMIT,
    }),
    [applied, headerBranchId]
  );

  const {
    data: expensesData, isLoading: expensesLoading, isFetching: expensesFetching,
    isError: expensesError, refetch: refetchExpenses,
  } = useExpensesQuery(queryArgs);
  // Aggregate sum matching the current filters (GET /finance/expenses/total)
  // — distinct from the summary card above, which is a whole-year figure
  // from the chart and ignores these filters.
  const { data: filteredTotalData, isFetching: isFilteredTotalFetching } = useExpensesTotalQuery(queryArgs);
  const [fetchExpensesExcel, { isFetching: isExportingExpenses }] = useLazyExpensesExcelQuery();
  const [deleteExpense, { isLoading: isDeletingExpense }] = useDeleteExpenseMutation();
  const [expenseDeleteTarget, setExpenseDeleteTarget] = useState<string | null>(null);
  const [expenseDeleteError, setExpenseDeleteError] = useState<string | null>(null);

  const rows = expensesData?.rows ?? [];
  const meta = expensesData?.meta;
  const total = meta?.total ?? 0;
  const totalPages = Math.max(1, meta?.totalPages ?? 1);

  const confirmDeleteExpense = async () => {
    if (!expenseDeleteTarget) return;
    setExpenseDeleteError(null);
    try {
      await deleteExpense(expenseDeleteTarget).unwrap();
      toast.success(t("finance.totalExpenses.form.toast.deleted"));
      setExpenseDeleteTarget(null);
    } catch {
      setExpenseDeleteError(t("finance.totalExpenses.deleteConfirm.error"));
    }
  };

  const handleExportExpensesExcel = async () => {
    try {
      const blob = await fetchExpensesExcel(queryArgs).unwrap();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `expenses-${applied.page}.xlsx`;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error(t("finance.totalExpenses.exportError"));
    }
  };

  const applyFilters = () => {
    setApplied({ search: draftSearch, startDate: draftStartDate, endDate: draftEndDate, categoryId: draftCategoryId, page: 1 });
  };

  const resetFilters = () => {
    setDraftSearch(""); setDraftStartDate(""); setDraftEndDate(""); setDraftCategoryId("");
    setApplied({ search: "", startDate: "", endDate: "", categoryId: "", page: 1 });
  };

  const goToPage = (page: number) => setApplied((prev) => ({ ...prev, page }));

  // ── New expense form (real: POST /finance/expenses) ─────────────────────
  // branchId defaults to whichever branch is active in the header — still
  // editable, just no longer defaulting to blank.
  const [form, setForm] = useState({
    title: "", date: todayISO(), categoryId: "", branchId: headerBranchId ?? "", amount: "", paymentMethodId: "",
  });
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [createExpense, { isLoading: isSavingExpense }] = useCreateExpenseMutation();

  const handleSubmitExpense = async () => {
    setFormError(null);
    if (!form.title.trim()) { setFormError(t("finance.totalExpenses.form.errors.title")); return; }
    if (!form.categoryId) { setFormError(t("finance.totalExpenses.form.errors.category")); return; }
    if (!form.branchId) { setFormError(t("finance.totalExpenses.form.errors.branch")); return; }
    if (!form.amount || Number(form.amount) <= 0) { setFormError(t("finance.totalExpenses.form.errors.amount")); return; }
    if (!form.paymentMethodId) { setFormError(t("finance.totalExpenses.form.errors.methodPay")); return; }

    try {
      await createExpense({
        title: form.title.trim(),
        amount: Number(form.amount),
        categoryId: form.categoryId,
        paymentMethodId: form.paymentMethodId,
        branchId: form.branchId,
        date: form.date || undefined,
        receiptUrl: receiptFile || undefined,
      }).unwrap();
      toast.success(t("finance.totalExpenses.form.toast.created"));
      setForm({ title: "", date: todayISO(), categoryId: "", branchId: headerBranchId ?? "", amount: "", paymentMethodId: "" });
      setReceiptFile(null);
    } catch {
      setFormError(t("finance.totalExpenses.form.errors.save"));
      toast.error(t("finance.totalExpenses.form.errors.save"));
    }
  };

  // ── Manage categories (real: POST/PATCH/DELETE /finance/expense-categories) ──
  const [addCategoryOpen, setAddCategoryOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryBranchId, setNewCategoryBranchId] = useState(headerBranchId ?? "");
  const [createExpenseCategory, { isLoading: isSavingCategory }] = useCreateExpenseCategoryMutation();
  const [updateExpenseCategory, { isLoading: isUpdatingCategory }] = useUpdateExpenseCategoryMutation();
  const [deleteExpenseCategory, { isLoading: isDeletingCategory }] = useDeleteExpenseCategoryMutation();
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState("");
  const [categoryDeleteTarget, setCategoryDeleteTarget] = useState<ExpenseCategory | null>(null);
  const [categoryDeleteError, setCategoryDeleteError] = useState<string | null>(null);

  const openAddCategory = () => {
    // Branch is optional per Swagger — left blank the category applies to
    // every branch — but still defaults to whichever branch is active in
    // the header for convenience.
    setNewCategoryBranchId(headerBranchId ?? "");
    setEditingCategoryId(null);
    setAddCategoryOpen(true);
  };

  const closeAddCategory = () => {
    setAddCategoryOpen(false); setNewCategoryName(""); setNewCategoryBranchId(headerBranchId ?? "");
    setCategoryError(null); setEditingCategoryId(null); setEditingCategoryName("");
  };

  const handleCreateCategory = async () => {
    setCategoryError(null);
    if (!newCategoryName.trim()) { setCategoryError(t("finance.totalExpenses.categoryModal.errors.name")); return; }
    try {
      await createExpenseCategory({ name: newCategoryName.trim(), branchId: newCategoryBranchId || undefined }).unwrap();
      toast.success(t("finance.totalExpenses.categoryModal.toast.created"));
      setNewCategoryName("");
      setNewCategoryBranchId(headerBranchId ?? "");
    } catch {
      setCategoryError(t("finance.totalExpenses.categoryModal.errors.save"));
    }
  };

  const startEditCategory = (c: ExpenseCategory) => {
    setEditingCategoryId(c.id);
    setEditingCategoryName(c.name);
    setCategoryError(null);
  };

  const cancelEditCategory = () => {
    setEditingCategoryId(null);
    setEditingCategoryName("");
  };

  const saveEditCategory = async () => {
    if (!editingCategoryId || !editingCategoryName.trim()) return;
    setCategoryError(null);
    try {
      await updateExpenseCategory({ id: editingCategoryId, name: editingCategoryName.trim() }).unwrap();
      toast.success(t("finance.totalExpenses.categoryModal.toast.updated"));
      cancelEditCategory();
    } catch {
      setCategoryError(t("finance.totalExpenses.categoryModal.errors.update"));
    }
  };

  const toggleCategoryStatus = async (c: ExpenseCategory) => {
    const nextStatus = c.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    try {
      await updateExpenseCategory({ id: c.id, status: nextStatus }).unwrap();
    } catch {
      toast.error(t("finance.totalExpenses.categoryModal.errors.update"));
    }
  };

  const confirmDeleteCategory = async () => {
    if (!categoryDeleteTarget) return;
    setCategoryDeleteError(null);
    try {
      await deleteExpenseCategory(categoryDeleteTarget.id).unwrap();
      toast.success(t("finance.totalExpenses.categoryModal.toast.deleted"));
      setCategoryDeleteTarget(null);
    } catch {
      setCategoryDeleteError(t("finance.totalExpenses.categoryModal.errors.delete"));
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6 font-sans">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold text-gray-800">{t("finance.totalExpenses.title")}</h1>
        <select
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm bg-white text-gray-700"
        >
          {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      <div className="flex gap-4">
        {/* ===== Left: summary + chart + filters + table ===== */}
        <div className="flex-1 flex flex-col gap-4 min-w-0">

          {/* Summary card (real data: GET /finance/chart) */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-1 h-8 bg-blue-500 rounded-full mr-1" />
              <span className="text-gray-700 font-medium">
                {t("finance.totalExpenses.summary.totalExpenses")} {chartLoading ? "…" : formatUZS(totalExpensesThisYear)}
              </span>
            </div>
            <BsCashStack className="text-blue-400 text-2xl" />
          </div>

          {/* Bar chart (real data: GET /finance/chart) */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            {chartLoading ? (
              <div className="h-[260px] flex items-center justify-center"><CircularProgress size={22} /></div>
            ) : chartError ? (
              <div className="h-[260px] flex flex-col items-center justify-center gap-2 text-gray-500">
                <FiAlertCircle size={20} className="text-red-400" />
                <span className="text-sm">{t("finance.allPayments.chart.loadError")}</span>
                <button onClick={() => refetchChart()} className="px-4 py-1.5 text-xs font-medium border border-gray-200 rounded hover:bg-gray-50">
                  {t("finance.allPayments.chart.retry")}
                </button>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={barData} margin={{ top: 10, right: 10, bottom: 0, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis
                    tickFormatter={(v) => `${Math.round(v / 1000000)}M`}
                    tick={{ fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip formatter={(v) => formatUZS(Number(v))} />
                  <Bar dataKey="totalExpenses" fill="#f28b82" radius={[2, 2, 0, 0]} name={t("finance.totalExpenses.chart.totalExpensesLabel")} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Filter panel — only fields GET /finance/expenses actually accepts */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 px-6 py-4">
            <div className="grid grid-cols-5 gap-3 items-end">
              <div>
                <label className={labelCls}>{t("finance.totalExpenses.filters.dateFrom")}</label>
                <input type="date" className={inputCls} value={draftStartDate} onChange={(e) => setDraftStartDate(e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>{t("finance.totalExpenses.filters.dateTo")}</label>
                <input type="date" className={inputCls} value={draftEndDate} onChange={(e) => setDraftEndDate(e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>{t("finance.totalExpenses.filters.description")}</label>
                <input type="text" className={inputCls} value={draftSearch} onChange={(e) => setDraftSearch(e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>{t("finance.totalExpenses.filters.selectCategory")}</label>
                <select className={inputCls} value={draftCategoryId} onChange={(e) => setDraftCategoryId(e.target.value)}>
                  <option value="">{t("finance.totalExpenses.selectPlaceholder")}</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2">
                <button
                  className="flex-1 border border-gray-200 text-gray-500 text-sm font-medium px-4 py-1.5 rounded hover:bg-gray-50 transition-colors"
                  onClick={resetFilters}
                >
                  {t("finance.allPayments.filters.reset")}
                </button>
                <button
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-1.5 rounded transition-colors"
                  onClick={applyFilters}
                >
                  {t("finance.totalExpenses.filters.filter")}
                </button>
              </div>
            </div>
          </div>

          {/* Filtered total (GET /finance/expenses/total) + export (GET /finance/expenses/excel) */}
          <div className="flex items-center justify-between px-1">
            <span className="text-sm text-gray-600">
              {t("finance.totalExpenses.summary.filteredTotal")}{" "}
              <strong className="text-gray-800">{isFilteredTotalFetching ? "…" : formatUZS(filteredTotalData?.total ?? 0)}</strong>
            </span>
            <MuiTooltip title={t("finance.totalExpenses.exportExcel")} placement="top" arrow>
              <span>
                <IconButton size="small" onClick={handleExportExpensesExcel} disabled={isExportingExpenses}>
                  {isExportingExpenses ? <CircularProgress size={16} /> : <FiDownload />}
                </IconButton>
              </span>
            </MuiTooltip>
          </div>

          {/* Table (real data: GET /finance/expenses) */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ backgroundColor: "#f9fafb" }}>
                    {[
                      t("finance.totalExpenses.filters.dateFrom"),
                      t("finance.totalExpenses.filters.selectCategory"),
                      t("finance.totalExpenses.filters.description"),
                      t("finance.totalExpenses.filters.methodPay"),
                      t("finance.allPayments.table.sum"),
                      t("finance.allPayments.table.creator"),
                      "",
                    ].map((label, i) => (
                      <TableCell
                        key={label || `col-${i}`}
                        sx={{ fontWeight: 700, fontSize: 12, color: "#374151", whiteSpace: "nowrap", borderBottom: "2px solid #e5e9f0", py: 1.5 }}
                      >
                        {label}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>

                <TableBody>
                  {expensesLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                        <CircularProgress size={22} />
                      </TableCell>
                    </TableRow>
                  ) : expensesError ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                        <div className="flex flex-col items-center gap-2 text-gray-500">
                          <FiAlertCircle size={20} className="text-red-400" />
                          <span className="text-sm">{t("finance.totalExpenses.table.loadError")}</span>
                          <button onClick={() => refetchExpenses()} className="px-4 py-1.5 text-xs font-medium border border-gray-200 rounded hover:bg-gray-50">
                            {t("finance.totalExpenses.table.retry")}
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : rows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center" sx={{ py: 4, color: "#9ca3af", fontSize: 13 }}>
                        {t("finance.totalExpenses.table.empty")}
                      </TableCell>
                    </TableRow>
                  ) : (
                    rows.map((e, i) => (
                      <TableRow
                        key={e.id}
                        sx={{ backgroundColor: i % 2 === 0 ? "#fff" : "#fafbfc", opacity: expensesFetching ? 0.6 : 1 }}
                      >
                        <TableCell sx={{ fontSize: 12, py: 1.4, whiteSpace: "nowrap", color: "#374151" }}>
                          {fmtDate(e.date)}
                        </TableCell>
                        <TableCell sx={{ fontSize: 12, py: 1.4, color: "#374151" }}>
                          {e.categoryName || "—"}
                        </TableCell>
                        <TableCell sx={{ fontSize: 12, py: 1.4, color: "#374151" }}>
                          {e.description || "—"}
                        </TableCell>
                        <TableCell sx={{ fontSize: 12, py: 1.4, color: "#374151" }}>
                          {e.paymentMethodName || "—"}
                        </TableCell>
                        <TableCell sx={{ fontSize: 12, py: 1.4, whiteSpace: "nowrap" }}>
                          <span className="font-bold text-gray-900 text-sm">{e.amount.toLocaleString("ru-RU")}</span>
                          <span className="text-[11px] text-gray-400 ml-1">UZS</span>
                        </TableCell>
                        <TableCell sx={{ fontSize: 12, py: 1.4, color: "#374151" }}>
                          {e.createdBy || "—"}
                        </TableCell>
                        <TableCell sx={{ py: 1.4 }}>
                          <MuiTooltip title={t("finance.totalExpenses.table.delete")} placement="top" arrow>
                            <IconButton size="small" onClick={() => setExpenseDeleteTarget(e.id)}>
                              <FiTrash2 size={13} />
                            </IconButton>
                          </MuiTooltip>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            <div className="flex justify-between items-center px-4 py-3 border-t border-gray-100">
              <span className="text-xs text-gray-500">
                {!expensesLoading && !expensesError && total > 0 && (
                  <>
                    {t("finance.allPayments.footer.showing")}{" "}
                    <strong className="text-gray-700">
                      {(applied.page - 1) * PAGE_LIMIT + 1}–{Math.min(applied.page * PAGE_LIMIT, total)}
                    </strong>{" "}
                    {t("finance.allPayments.footer.of")} <strong className="text-gray-700">{total}</strong>
                  </>
                )}
              </span>

              <div className="flex items-center gap-3">
                {!expensesLoading && !expensesError && totalPages > 1 && (
                  <Pagination
                    count={totalPages}
                    page={applied.page}
                    onChange={(_, v) => goToPage(v)}
                    size="small"
                    shape="rounded"
                    sx={{
                      "& .MuiPaginationItem-root": { fontSize: 12, color: "#374151" },
                      "& .Mui-selected": { backgroundColor: "#003366 !important", color: "#fff !important" },
                    }}
                  />
                )}
                <button
                  onClick={openAddCategory}
                  className="flex items-center gap-1 text-xs font-medium text-blue-700 border border-blue-200 rounded-full px-3 py-1.5 hover:bg-blue-50 transition-colors whitespace-nowrap"
                >
                  <FiPlus size={13} /> {t("finance.totalExpenses.categoryModal.addCategory")}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ===== Right: New expense form (real: POST /finance/expenses) ===== */}
        <div className="w-72 bg-white rounded-lg shadow-sm border border-gray-200 px-5 py-5 flex flex-col gap-4 self-start shrink-0">
          <h2 className="text-base font-semibold text-gray-800">{t("finance.totalExpenses.form.title")}</h2>

          <div>
            <label className={labelCls}>
              {t("finance.totalExpenses.form.description")} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              className={inputCls}
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            />
          </div>

          <div>
            <label className={labelCls}>
              {t("finance.totalExpenses.form.date")} <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              className={inputCls}
              value={form.date}
              onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
            />
          </div>

          <div>
            <label className={labelCls}>
              {t("finance.totalExpenses.form.category")} <span className="text-red-500">*</span>
            </label>
            <select
              className={inputCls}
              value={form.categoryId}
              onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}
            >
              <option value="">{t("finance.totalExpenses.selectPlaceholder")}</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelCls}>
              {t("finance.totalExpenses.form.branch")} <span className="text-red-500">*</span>
            </label>
            <select
              className={inputCls}
              value={form.branchId}
              onChange={(e) => setForm((f) => ({ ...f, branchId: e.target.value }))}
            >
              <option value="">{t("finance.totalExpenses.selectPlaceholder")}</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelCls}>
              {t("finance.totalExpenses.form.sum")} <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              className={inputCls}
              value={form.amount}
              onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
            />
          </div>

          <div>
            <label className={labelCls}>
              {t("finance.totalExpenses.form.methodPay")} <span className="text-red-500">*</span>
            </label>
            <PaymentMethodPicker
              value={form.paymentMethodId}
              onChange={(id) => setForm((f) => ({ ...f, paymentMethodId: id }))}
            />
          </div>

          <div>
            <label className={labelCls}>{t("finance.totalExpenses.form.receipt")}</label>
            <label className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm bg-white flex items-center gap-2 cursor-pointer text-gray-500">
              {receiptFile ? receiptFile.name : t("finance.totalExpenses.form.receiptPlaceholder")}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => setReceiptFile(e.target.files?.[0] ?? null)}
              />
            </label>
          </div>

          {formError && <div className="text-xs text-red-500">{formError}</div>}

          <button
            className="mt-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-medium px-5 py-2 rounded transition-colors self-start"
            onClick={handleSubmitExpense}
            disabled={isSavingExpense}
          >
            {isSavingExpense ? t("finance.totalExpenses.form.saving") : t("finance.totalExpenses.form.submit")}
          </button>
        </div>
      </div>

      {/* ===== Manage categories modal (real: GET/POST/PATCH/DELETE /finance/expense-categories) ===== */}
      {addCategoryOpen && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={closeAddCategory}>
          <div className="bg-white rounded-lg shadow-lg w-96 p-5 max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-gray-800">{t("finance.totalExpenses.categoryModal.manageTitle")}</h3>
              <button onClick={closeAddCategory} className="text-gray-400 hover:text-gray-600">
                <FiX size={18} />
              </button>
            </div>

            {/* Existing categories: rename, toggle status, delete */}
            <div className="mb-5">
              <p className="text-xs font-semibold text-gray-500 mb-2">{t("finance.totalExpenses.categoryModal.existingTitle")}</p>
              {categories.length === 0 ? (
                <p className="text-xs text-gray-400">{t("finance.totalExpenses.categoryModal.noCategories")}</p>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {categories.map((c) => (
                    <div key={c.id} className="flex items-center gap-2 border border-gray-100 rounded px-2 py-1.5">
                      {editingCategoryId === c.id ? (
                        <>
                          <input
                            autoFocus
                            className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:border-blue-400"
                            value={editingCategoryName}
                            onChange={(e) => setEditingCategoryName(e.target.value)}
                          />
                          <button type="button" onClick={saveEditCategory} disabled={isUpdatingCategory} className="text-teal-600 hover:text-teal-700">
                            <FiCheck size={14} />
                          </button>
                          <button type="button" onClick={cancelEditCategory} className="text-gray-400 hover:text-gray-600">
                            <FiX size={14} />
                          </button>
                        </>
                      ) : (
                        <>
                          <span className="flex-1 text-sm text-gray-800 truncate">{c.name}</span>
                          <button
                            type="button"
                            onClick={() => toggleCategoryStatus(c)}
                            disabled={isUpdatingCategory}
                            className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                              c.status === "ACTIVE" ? "bg-green-50 text-green-600" : "bg-gray-100 text-gray-500"
                            }`}
                          >
                            {c.status === "ACTIVE" ? t("finance.totalExpenses.categoryModal.statusActive") : t("finance.totalExpenses.categoryModal.statusInactive")}
                          </button>
                          <button type="button" onClick={() => startEditCategory(c)} className="text-gray-400 hover:text-gray-600">
                            <FiEdit2 size={13} />
                          </button>
                          <button type="button" onClick={() => { setCategoryDeleteError(null); setCategoryDeleteTarget(c); }} className="text-gray-400 hover:text-red-500">
                            <FiTrash2 size={13} />
                          </button>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Add a new category */}
            <div className="border-t border-gray-100 pt-4">
              <p className="text-xs font-semibold text-gray-500 mb-2">{t("finance.totalExpenses.categoryModal.title")}</p>
              <div className="flex flex-col gap-3">
                <div>
                  <label className={labelCls}>{t("finance.totalExpenses.categoryModal.name")}</label>
                  <input
                    type="text"
                    className={inputCls}
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                  />
                </div>
                <div>
                  <label className={labelCls}>{t("finance.totalExpenses.categoryModal.branch")}</label>
                  <select
                    className={inputCls}
                    value={newCategoryBranchId}
                    onChange={(e) => setNewCategoryBranchId(e.target.value)}
                  >
                    <option value="">{t("finance.totalExpenses.selectPlaceholder")}</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>

                {categoryError && <div className="text-xs text-red-500">{categoryError}</div>}

                <button
                  className="bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-medium px-4 py-1.5 rounded transition-colors self-start"
                  onClick={handleCreateCategory}
                  disabled={isSavingCategory}
                >
                  {isSavingCategory ? t("finance.totalExpenses.form.saving") : t("finance.totalExpenses.categoryModal.save")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete category confirmation */}
      <Dialog open={!!categoryDeleteTarget} onClose={() => setCategoryDeleteTarget(null)} PaperProps={{ sx: { borderRadius: "14px", width: 380 } }}>
        <DialogTitle sx={{ fontWeight: 600 }}>{t("finance.totalExpenses.categoryModal.deleteConfirm.title")}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {t("finance.totalExpenses.categoryModal.deleteConfirm.message", { name: categoryDeleteTarget?.name ?? "" })}
          </DialogContentText>
          {categoryDeleteError && <div className="mt-3 text-sm text-red-500">{categoryDeleteError}</div>}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setCategoryDeleteTarget(null)} disabled={isDeletingCategory} sx={{ textTransform: "none" }}>
            {t("finance.totalExpenses.categoryModal.cancel")}
          </Button>
          <Button onClick={confirmDeleteCategory} disabled={isDeletingCategory} color="error" variant="contained" sx={{ textTransform: "none" }}>
            {isDeletingCategory ? "…" : t("finance.totalExpenses.categoryModal.delete")}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete expense confirmation */}
      <Dialog open={!!expenseDeleteTarget} onClose={() => setExpenseDeleteTarget(null)} PaperProps={{ sx: { borderRadius: "14px", width: 380 } }}>
        <DialogTitle sx={{ fontWeight: 600 }}>{t("finance.totalExpenses.deleteConfirm.title")}</DialogTitle>
        <DialogContent>
          <DialogContentText>{t("finance.totalExpenses.deleteConfirm.message")}</DialogContentText>
          {expenseDeleteError && <div className="mt-3 text-sm text-red-500">{expenseDeleteError}</div>}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setExpenseDeleteTarget(null)} disabled={isDeletingExpense} sx={{ textTransform: "none" }}>
            {t("finance.totalExpenses.deleteConfirm.cancel")}
          </Button>
          <Button onClick={confirmDeleteExpense} disabled={isDeletingExpense} color="error" variant="contained" sx={{ textTransform: "none" }}>
            {isDeletingExpense ? "…" : t("finance.totalExpenses.deleteConfirm.confirm")}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};
