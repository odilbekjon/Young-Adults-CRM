import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import {
  Button,
  Checkbox,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  MenuItem,
  Pagination,
  Select,
  TextField,
  Typography,
} from "@mui/material";
import {
  MdDelete,
  MdEdit,
  MdEmail,
  MdRefresh,
  MdClose,
  MdCalendarToday,
  MdArrowBack,
} from "react-icons/md";
import { useAllArchivesQuery } from "../../../../../app/api/archivesApi/archivesApi";
import type { ArchiveRole } from "../../../../../app/api/archivesApi/types";
import {
  useAllReasonsQuery,
  useReasonsSelectQuery,
  useLazyReasonForEditQuery,
  useCreateReasonMutation,
  useUpdateReasonMutation,
  useToggleReasonStatusMutation,
  useDeleteReasonMutation,
} from "../../../../../app/api/reasonsApi";
import type { Reason } from "../../../../../app/api/reasonsApi/types";
import { useToast } from "../../../../../Context/ToastContext";
import { extractApiError } from "../../../../../utils";
import type { RootState } from "../../../../../app/store";

const SEARCH_DEBOUNCE_MS = 350;

const PAGE_SIZE = 10;

// The reasons view has no pagination control in the design, so the whole
// (small) reference list is requested at once — GET /reasons would otherwise
// fall back to its documented default of limit=10 and silently truncate.
const REASONS_LIMIT = 200;

// ─── Main Component ───────────────────────────────────────────────────────────
export const Archive = () => {
  const { t } = useTranslation();
  const toast = useToast();
  // POST /reasons requires a concrete branchId query param — the real branch
  // UUID lives in the Redux branch slice (the same source baseApi uses for the
  // x-branch-id header); BranchContext only carries display labels.
  const selectedBranchId = useSelector((s: RootState) => s.branch.selectedBranchId);
  const [view, setView] = useState<"archive" | "reasons">("archive");

  // Archive filters & selection
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState("");
  const [filterReason, setFilterReason] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [page, setPage] = useState(1);

  // Reasons modal
  const [addOpen, setAddOpen] = useState(false);
  const [newReason, setNewReason] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [reasonError, setReasonError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Reason | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // ── Server-side query ───────────────────────────────────────────────────────
  // Debounced the same way as Header's student search bar (350ms) so we don't
  // fire a request on every keystroke.
  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    const handle = setTimeout(() => setDebouncedSearch(search.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [search]);

  const { data, isLoading, isError } = useAllArchivesQuery({
    page,
    limit: PAGE_SIZE,
    search: debouncedSearch || undefined,
    role: (filterRole as ArchiveRole) || undefined,
    reasonId: filterReason || undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  });

  const pageData = data?.data ?? [];
  const total = data?.meta?.total ?? pageData.length;
  const totalPages = data?.meta?.totalPages ?? Math.max(1, Math.ceil(total / PAGE_SIZE));

  // ── Reasons ─────────────────────────────────────────────────────────────────
  // Full list (ACTIVE + INACTIVE) for the management table…
  const {
    data: reasonsData,
    isLoading: reasonsLoading,
    isError: reasonsError,
  } = useAllReasonsQuery({ page: 1, limit: REASONS_LIMIT });
  // …and the active-only shortlist for the archive "filter by reason" dropdown.
  const { data: reasonOptions } = useReasonsSelectQuery({ page: 1, limit: REASONS_LIMIT });

  const [fetchReasonForEdit, { isFetching: isLoadingReasonForEdit }] = useLazyReasonForEditQuery();
  const [createReason, { isLoading: isCreatingReason }] = useCreateReasonMutation();
  const [updateReason, { isLoading: isUpdatingReason }] = useUpdateReasonMutation();
  const [toggleReasonStatus, { isLoading: isTogglingReason }] = useToggleReasonStatusMutation();
  const [deleteReason, { isLoading: isDeletingReason }] = useDeleteReasonMutation();

  const reasons = reasonsData?.data ?? [];

  // ── Selection ───────────────────────────────────────────────────────────────
  const allSelected = pageData.length > 0 && pageData.every((r) => selected.includes(r.id));
  const toggleAll = () => {
    if (allSelected) setSelected((s) => s.filter((id) => !pageData.find((r) => r.id === id)));
    else setSelected((s) => [...new Set([...s, ...pageData.map((r) => r.id)])]);
  };
  const toggleOne = (id: string) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  // ── Reason CRUD ─────────────────────────────────────────────────────────────
  const reportReasonError = (err: unknown, genericKey: string) => {
    const detail = extractApiError(err);
    const generic = t(genericKey);
    const message = detail ? `${generic}: ${detail}` : generic;
    toast.error(message);
    return message;
  };

  const handleAddReason = async () => {
    if (!newReason.trim() || isCreatingReason) return;
    // Swagger marks branchId as a required query param on POST /reasons, and
    // "all branches" has no single id to send — ask for a concrete branch
    // instead of inventing one.
    if (!selectedBranchId) {
      setReasonError(t("settings.office.archive.reasons.errors.branchRequired"));
      return;
    }
    setReasonError(null);
    try {
      await createReason({ branchId: selectedBranchId, name: newReason.trim() }).unwrap();
      toast.success(t("settings.office.archive.reasons.toast.created"));
      setNewReason("");
      setAddOpen(false);
    } catch (err) {
      setReasonError(reportReasonError(err, "settings.office.archive.reasons.errors.save"));
    }
  };

  // GET /reasons/{id}/for-edit — the row's values fill the form immediately,
  // then the dedicated edit endpoint refreshes them.
  const handleOpenEditReason = async (reason: Reason) => {
    setEditId(reason.id);
    setEditName(reason.name);
    setReasonError(null);
    setEditOpen(true);
    try {
      const detail = await fetchReasonForEdit(reason.id).unwrap();
      if (detail?.data) setEditName(detail.data.name ?? "");
    } catch {
      // The row already provided a usable value — keep the form open.
    }
  };

  const handleEditReason = async () => {
    if (!editId || !editName.trim() || isUpdatingReason) return;
    setReasonError(null);
    try {
      await updateReason({ id: editId, name: editName.trim() }).unwrap();
      toast.success(t("settings.office.archive.reasons.toast.updated"));
      setEditOpen(false);
    } catch (err) {
      setReasonError(reportReasonError(err, "settings.office.archive.reasons.errors.save"));
    }
  };

  const handleToggleReasonStatus = async (id: string) => {
    if (isTogglingReason) return;
    try {
      await toggleReasonStatus(id).unwrap();
      toast.success(t("settings.office.archive.reasons.toast.statusToggled"));
    } catch (err) {
      reportReasonError(err, "settings.office.archive.reasons.errors.toggle");
    }
  };

  const handleDeleteReason = async () => {
    if (!deleteTarget) return;
    setDeleteError(null);
    try {
      await deleteReason(deleteTarget.id).unwrap();
      toast.success(t("settings.office.archive.reasons.toast.deleted"));
      setDeleteTarget(null);
    } catch (err) {
      setDeleteError(reportReasonError(err, "settings.office.archive.reasons.deleteConfirm.error"));
    }
  };

  // ── Helpers ─────────────────────────────────────────────────────────────────
  const balanceColor = (b: number | null | undefined) =>
    !b ? "text-gray-500" : b > 0 ? "text-green-600" : "text-red-500";

  const inputSx = {
    "& .MuiOutlinedInput-root": {
      borderRadius: "6px",
      fontSize: "0.82rem",
      height: "38px",
      backgroundColor: "#fff",
      "& fieldset": { borderColor: "#e5e7eb" },
      "&:hover fieldset": { borderColor: "#9ca3af" },
      "&.Mui-focused fieldset": { borderColor: "#29b6f6" },
    },
  };

  // ════════════════════════════════════════════════════════════════════════════
  // VIEW: REASONS FOR ARCHIVING
  // ════════════════════════════════════════════════════════════════════════════
  if (view === "reasons") {
    return (
      <div className="min-h-screen bg-gray-100 p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <IconButton
              onClick={() => setView("archive")}
              size="small"
              sx={{ color: "#374151" }}
            >
              <MdArrowBack size={20} />
            </IconButton>
            <Typography variant="h5" sx={{ fontWeight: 600, color: "#1f2937" }}>
              {t("settings.office.archive.reasonsForArchiving")}
            </Typography>
          </div>
          <Button
            variant="contained"
            onClick={() => { setNewReason(""); setReasonError(null); setAddOpen(true); }}
            sx={{
              backgroundColor: "#1e3a5f",
              "&:hover": { backgroundColor: "#162c47" },
              borderRadius: "20px",
              textTransform: "none",
              fontWeight: 600,
              px: 3,
              boxShadow: "none",
            }}
          >
            {t("settings.office.archive.reasons.addTemplate")}
          </Button>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow-sm max-w-2xl">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-6 py-4 text-gray-700 font-semibold w-24">{t("settings.office.archive.reasons.table.id")}</th>
                <th className="text-left px-6 py-4 text-gray-700 font-semibold">{t("settings.office.archive.reasons.table.name")}</th>
                <th className="text-left px-6 py-4 text-gray-700 font-semibold">{t("settings.office.archive.reasons.table.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {reasonsLoading ? (
                <tr>
                  <td colSpan={3} className="text-center py-12">
                    <CircularProgress size={26} />
                  </td>
                </tr>
              ) : reasonsError ? (
                <tr>
                  <td colSpan={3} className="text-center py-12 text-red-500 text-sm">
                    {t("settings.office.archive.reasons.loadError")}
                  </td>
                </tr>
              ) : reasons.length === 0 ? (
                <tr>
                  <td colSpan={3} className="text-center py-12 text-gray-400">
                    {t("settings.office.archive.reasons.noData")}
                  </td>
                </tr>
              ) : (
                reasons.map((r) => {
                  const isActive = r.status !== "INACTIVE";
                  return (
                    <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 text-gray-600">{r.id.slice(0, 8)}</td>
                      <td className="px-6 py-4 text-gray-800">{r.name}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleToggleReasonStatus(r.id)}
                            disabled={isTogglingReason}
                            title={t("settings.office.archive.reasons.status.toggle")}
                            className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors disabled:opacity-60 ${
                              isActive
                                ? "bg-green-100 text-green-700 hover:bg-green-200"
                                : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                            }`}
                          >
                            {isActive
                              ? t("settings.office.archive.reasons.status.active")
                              : t("settings.office.archive.reasons.status.inactive")}
                          </button>
                          <IconButton
                            size="small"
                            sx={{ color: "#6b7280" }}
                            onClick={() => handleOpenEditReason(r)}
                            aria-label={t("settings.office.archive.reasons.edit")}
                          >
                            <MdEdit size={16} />
                          </IconButton>
                          <IconButton
                            size="small"
                            sx={{ color: "#ef5350" }}
                            onClick={() => { setDeleteError(null); setDeleteTarget(r); }}
                            aria-label={t("settings.office.archive.reasons.delete")}
                          >
                            <MdDelete size={16} />
                          </IconButton>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Add Modal — right side */}
        <Dialog
          open={addOpen}
          onClose={() => setAddOpen(false)}
          PaperProps={{
            sx: {
              borderRadius: "12px",
              minWidth: "320px",
              boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
            },
          }}
          sx={{
            "& .MuiDialog-container": {
              justifyContent: "flex-end",
              alignItems: "flex-start",
              paddingTop: "80px",
              paddingRight: "40px",
            },
          }}
        >
          <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", pb: 1 }}>
            <Typography sx={{ fontWeight: 600, fontSize: "1rem", color: "#1f2937" }}>
              {t("settings.office.archive.reasons.addTemplate")}
            </Typography>
            <IconButton onClick={() => setAddOpen(false)} size="small" sx={{ color: "#9ca3af" }}>
              <MdClose size={18} />
            </IconButton>
          </DialogTitle>
          <DialogContent sx={{ pt: 1, pb: 2 }}>
            <Typography variant="body2" sx={{ mb: 1, color: "#374151", fontWeight: 500 }}>
              {t("settings.office.archive.reasons.form.name")}
            </Typography>
            <TextField
              fullWidth
              size="small"
              value={newReason}
              onChange={(e) => setNewReason(e.target.value)}
              sx={{ ...inputSx, mb: reasonError ? 1 : 2 }}
              onKeyDown={(e) => e.key === "Enter" && handleAddReason()}
            />
            {reasonError && (
              <Typography sx={{ mb: 2, color: "#ef5350", fontSize: "0.8125rem" }}>
                {reasonError}
              </Typography>
            )}
            <Button
              variant="contained"
              onClick={handleAddReason}
              disabled={!newReason.trim() || isCreatingReason}
              startIcon={isCreatingReason ? <CircularProgress size={16} color="inherit" /> : undefined}
              sx={{
                backgroundColor: "#29b6f6",
                "&:hover": { backgroundColor: "#0288d1" },
                "&.Mui-disabled": { backgroundColor: "#bae6fd", color: "#fff" },
                textTransform: "none",
                fontWeight: 600,
                borderRadius: "6px",
                boxShadow: "none",
                px: 3,
              }}
            >
              {t("settings.office.archive.reasons.submit")}
            </Button>
          </DialogContent>
        </Dialog>

        {/* Edit Modal */}
        <Dialog
          open={editOpen}
          onClose={() => setEditOpen(false)}
          PaperProps={{
            sx: { borderRadius: "12px", minWidth: "320px", boxShadow: "0 20px 60px rgba(0,0,0,0.15)" },
          }}
          sx={{
            "& .MuiDialog-container": {
              justifyContent: "flex-end",
              alignItems: "flex-start",
              paddingTop: "80px",
              paddingRight: "40px",
            },
          }}
        >
          <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", pb: 1 }}>
            <Typography sx={{ fontWeight: 600, fontSize: "1rem", color: "#1f2937" }}>
              {t("settings.office.archive.reasons.editTemplate")}
            </Typography>
            <IconButton onClick={() => setEditOpen(false)} size="small" sx={{ color: "#9ca3af" }}>
              <MdClose size={18} />
            </IconButton>
          </DialogTitle>
          <DialogContent sx={{ pt: 1, pb: 2 }}>
            <Typography variant="body2" sx={{ mb: 1, color: "#374151", fontWeight: 500 }}>
              {t("settings.office.archive.reasons.form.name")}
            </Typography>
            <TextField
              fullWidth
              size="small"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              disabled={isLoadingReasonForEdit}
              sx={{ ...inputSx, mb: reasonError ? 1 : 2 }}
              onKeyDown={(e) => e.key === "Enter" && handleEditReason()}
            />
            {reasonError && (
              <Typography sx={{ mb: 2, color: "#ef5350", fontSize: "0.8125rem" }}>
                {reasonError}
              </Typography>
            )}
            <Button
              variant="contained"
              onClick={handleEditReason}
              disabled={!editName.trim() || isUpdatingReason || isLoadingReasonForEdit}
              startIcon={isUpdatingReason ? <CircularProgress size={16} color="inherit" /> : undefined}
              sx={{
                backgroundColor: "#29b6f6",
                "&:hover": { backgroundColor: "#0288d1" },
                "&.Mui-disabled": { backgroundColor: "#bae6fd", color: "#fff" },
                textTransform: "none",
                fontWeight: 600,
                borderRadius: "6px",
                boxShadow: "none",
                px: 3,
              }}
            >
              {t("settings.office.archive.reasons.save")}
            </Button>
          </DialogContent>
        </Dialog>

        {/* Delete confirmation */}
        <Dialog
          open={!!deleteTarget}
          onClose={() => { setDeleteTarget(null); setDeleteError(null); }}
          PaperProps={{ sx: { borderRadius: "14px", width: 380 } }}
        >
          <DialogTitle sx={{ fontWeight: 600 }}>
            {t("settings.office.archive.reasons.deleteConfirm.title")}
          </DialogTitle>
          <DialogContent>
            <DialogContentText>
              {t("settings.office.archive.reasons.deleteConfirm.message", { name: deleteTarget?.name ?? "" })}
            </DialogContentText>
            {deleteError && (
              <Typography sx={{ mt: 1.5, color: "#ef5350", fontSize: "0.8125rem" }}>
                {deleteError}
              </Typography>
            )}
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 3 }}>
            <Button
              onClick={() => { setDeleteTarget(null); setDeleteError(null); }}
              variant="outlined"
              disabled={isDeletingReason}
              sx={{ textTransform: "none", borderRadius: "10px", paddingX: "18px" }}
            >
              {t("settings.office.archive.reasons.deleteConfirm.cancel")}
            </Button>
            <Button
              onClick={handleDeleteReason}
              variant="contained"
              color="error"
              disabled={isDeletingReason}
              startIcon={isDeletingReason ? <CircularProgress size={16} color="inherit" /> : undefined}
              sx={{ textTransform: "none", borderRadius: "10px", paddingX: "18px", fontWeight: 600, boxShadow: "none" }}
            >
              {t("settings.office.archive.reasons.delete")}
            </Button>
          </DialogActions>
        </Dialog>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  // VIEW: ARCHIVE
  // ════════════════════════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen bg-gray-100 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <Typography variant="h5" sx={{ fontWeight: 700, color: "#1f2937" }}>
            {t("settings.office.archive.title")}
          </Typography>
          <Typography variant="body2" sx={{ color: "#6b7280" }}>
            {t("settings.office.archive.quantity", { count: total })}
          </Typography>
        </div>
        <Button
          variant="outlined"
          onClick={() => setView("reasons")}
          sx={{
            borderColor: "#e5e7eb",
            color: "#374151",
            textTransform: "none",
            borderRadius: "6px",
            fontWeight: 500,
            fontSize: "0.85rem",
            "&:hover": { borderColor: "#9ca3af", backgroundColor: "#f9fafb" },
          }}
        >
          {t("settings.office.archive.reasonsForArchiving")}
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <TextField
          placeholder={t("settings.office.archive.filters.namePhone")}
          size="small"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          sx={{ ...inputSx, width: 160 }}
        />

        <Select
          displayEmpty
          size="small"
          value={filterRole}
          onChange={(e) => { setFilterRole(e.target.value); setPage(1); }}
          sx={{ ...inputSx["& .MuiOutlinedInput-root"], width: 160, height: 38, fontSize: "0.82rem", borderRadius: "6px", backgroundColor: "#fff", "& fieldset": { borderColor: "#e5e7eb" } }}
        >
          <MenuItem value=""><em style={{ color: "#9ca3af", fontStyle: "normal" }}>{t("settings.office.archive.filters.filterByRole")}</em></MenuItem>
          <MenuItem value="STUDENT">{t("settings.office.archive.filters.student")}</MenuItem>
          <MenuItem value="TEACHER">{t("settings.office.archive.filters.teacher")}</MenuItem>
        </Select>

        <Select
          displayEmpty
          size="small"
          value={filterReason}
          onChange={(e) => { setFilterReason(e.target.value); setPage(1); }}
          sx={{ width: 180, height: 38, fontSize: "0.82rem", borderRadius: "6px", backgroundColor: "#fff", "& fieldset": { borderColor: "#e5e7eb" } }}
        >
          <MenuItem value=""><em style={{ color: "#9ca3af", fontStyle: "normal" }}>{t("settings.office.archive.filters.filterByReason")}</em></MenuItem>
          {(reasonOptions ?? []).map((r) => (
            <MenuItem key={r.id} value={r.id}>{r.name}</MenuItem>
          ))}
        </Select>

        <TextField
          size="small"
          type="date"
          value={startDate}
          onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
          InputProps={{ startAdornment: <MdCalendarToday size={14} className="mr-1 text-gray-400" /> }}
          inputProps={{ placeholder: t("settings.office.archive.filters.startDate") }}
          sx={{ ...inputSx, width: 160 }}
        />

        <TextField
          size="small"
          type="date"
          value={endDate}
          onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
          InputProps={{ startAdornment: <MdCalendarToday size={14} className="mr-1 text-gray-400" /> }}
          sx={{ ...inputSx, width: 160 }}
        />

        <div className="flex items-center gap-3 ml-2">
          <button className="flex items-center gap-1 text-red-500 hover:text-red-600 text-sm font-medium transition-colors">
            <MdDelete size={18} /> {t("settings.office.archive.actions.delete")}
          </button>
          <button className="flex items-center gap-1 text-green-600 hover:text-green-700 text-sm font-medium transition-colors">
            <MdRefresh size={18} /> {t("settings.office.archive.actions.reestablish")}
          </button>
          <button className="flex items-center gap-1 text-gray-500 hover:text-gray-700 transition-colors">
            <MdEmail size={18} />
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="px-4 py-4 w-10">
                <Checkbox
                  size="small"
                  checked={allSelected}
                  onChange={toggleAll}
                  sx={{ color: "#d1d5db", "&.Mui-checked": { color: "#29b6f6" } }}
                />
              </th>
              {[
                t("settings.office.archive.table.name"),
                t("settings.office.archive.table.phone"),
                t("settings.office.archive.table.roles"),
                t("settings.office.archive.table.reasonsForRemoval"),
                t("settings.office.archive.table.comment"),
                t("settings.office.archive.table.archived"),
                t("settings.office.archive.table.actions"),
              ].map((h) => (
                <th key={h} className="text-left px-4 py-4 text-gray-600 font-semibold text-sm">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={8} className="text-center py-12">
                  <CircularProgress size={26} />
                </td>
              </tr>
            ) : isError ? (
              <tr>
                <td colSpan={8} className="text-center py-12 text-red-500 text-sm">
                  {t("settings.office.archive.loadError")}
                </td>
              </tr>
            ) : pageData.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-12 text-gray-400">
                  {t("settings.office.archive.noData")}
                </td>
              </tr>
            ) : (
              pageData.map((r) => (
                <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <Checkbox
                      size="small"
                      checked={selected.includes(r.id)}
                      onChange={() => toggleOne(r.id)}
                      sx={{ color: "#d1d5db", "&.Mui-checked": { color: "#29b6f6" } }}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-blue-500 cursor-pointer hover:underline text-sm">
                      {r.name}
                    </div>
                    {r.branch?.name && (
                      <div className="text-xs text-gray-400 mt-0.5">{r.branch.name}</div>
                    )}
                    <div className={`text-xs mt-0.5 font-medium ${balanceColor(r.balance)}`}>
                      {t("settings.office.archive.balance")}: {(r.balance ?? 0).toLocaleString()}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{r.phone}</td>
                  <td className="px-4 py-3 text-gray-600">{r.role}</td>
                  <td className="px-4 py-3 text-gray-500 text-sm">{r.reason?.name}</td>
                  <td className="px-4 py-3 text-gray-500 text-sm max-w-[180px]">{r.comment}</td>
                  <td className="px-4 py-3">
                    <div className="text-gray-600 text-sm">{r.archivedBy?.name}</div>
                    <div className="text-gray-400 text-xs">{r.archivedAt}</div>
                  </td>
                  <td className="px-4 py-3">
                    <IconButton size="small" sx={{ color: "#4ade80" }}>
                      <MdRefresh size={18} />
                    </IconButton>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center py-4 border-t border-gray-100">
            <Pagination
              count={totalPages}
              page={page}
              onChange={(_, v) => setPage(v)}
              size="small"
              sx={{
                "& .MuiPaginationItem-root": {
                  color: "#6b7280",
                  borderRadius: "6px",
                },
                "& .Mui-selected": {
                  backgroundColor: "#29b6f6 !important",
                  color: "#fff !important",
                },
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
};