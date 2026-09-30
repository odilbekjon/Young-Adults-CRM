import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
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
import { MdDelete, MdEmail, MdRefresh } from "react-icons/md";
import { useAllArchivesQuery } from "../../../../../app/api/archivesApi/archivesApi";
import { DatePickerField } from "../../../../SingleGroup/DatePickerField";
import type { ArchiveRecord, ArchiveRole } from "../../../../../app/api/archivesApi/types";
import { useReasonsSelectQuery } from "../../../../../app/api/reasonsApi";
import { useToggleStudentStatusMutation, useDeleteStudentMutation } from "../../../../../app/api/studentsApi";
import { useToggleTeacherStatusMutation, useDeleteTeacherMutation } from "../../../../../app/api/teachersApi";
import { useToggleStaffUserStatusMutation, useDeleteStaffUserMutation } from "../../../../../app/api/usersApi";
import { useToast } from "../../../../../Context/ToastContext";
import { extractApiError } from "../../../../../utils";
import type { RootState } from "../../../../../app/store";

const SEARCH_DEBOUNCE_MS = 350;

const PAGE_SIZE = 10;

// The reason filter dropdown has no pagination, so the whole (small)
// reference list is requested at once — GET /reasons/select would otherwise
// fall back to its documented default of limit=10 and silently truncate.
const REASONS_LIMIT = 200;

// ─── Main Component ───────────────────────────────────────────────────────────
export const Archive = () => {
  const { t } = useTranslation();
  const toast = useToast();
  const navigate = useNavigate();
  // POST /reasons requires a concrete branchId query param — the real branch
  // UUID lives in the Redux branch slice (the same source baseApi uses for the
  // x-branch-id header); BranchContext only carries display labels.
  const selectedBranchId = useSelector((s: RootState) => s.branch.selectedBranchId);

  // Archive filters & selection
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState("");
  const [filterReason, setFilterReason] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [page, setPage] = useState(1);

  // Restore / permanent-delete for archived records (students, teachers,
  // staff). Distinct from the reasons CRUD above.
  const [restoreTarget, setRestoreTarget] = useState<ArchiveRecord | null>(null);
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const [permDeleteTarget, setPermDeleteTarget] = useState<ArchiveRecord | null>(null);
  const [permDeleteError, setPermDeleteError] = useState<string | null>(null);
  const [bulkActionError, setBulkActionError] = useState<string | null>(null);
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);
  const [bulkRestoreConfirmOpen, setBulkRestoreConfirmOpen] = useState(false);
  const [bulkPermDeleteConfirmOpen, setBulkPermDeleteConfirmOpen] = useState(false);

  // ── Server-side query ───────────────────────────────────────────────────────
  // Debounced the same way as Header's student search bar (350ms) so we don't
  // fire a request on every keystroke.
  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    const handle = setTimeout(() => setDebouncedSearch(search.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [search]);

  // Every local filter already resets `page` inline on change (see the
  // Select/DatePickerField onChange handlers below) — only the globally
  // selected branch was missing a reset.
  useEffect(() => {
    setPage(1);
  }, [selectedBranchId]);

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
  // Active-only shortlist for the archive "filter by reason" dropdown. The
  // reasons themselves are managed on /settings/reasons_archiving.
  const { data: reasonOptions } = useReasonsSelectQuery({ page: 1, limit: REASONS_LIMIT });

  // ── Restore / permanent delete for archived records ─────────────────────────
  // An archive row can be a student, a teacher, or staff (ADMIN/SUPERADMIN) —
  // each has its own toggle-status (restore) and DELETE (permanent) endpoint
  // (studentsApi/teachersApi/usersApi), so the right mutation is picked by role
  // rather than inventing a single generic "archive" endpoint the backend
  // doesn't expose.
  const [toggleStudentStatus, { isLoading: isRestoringStudent }] = useToggleStudentStatusMutation();
  const [deleteStudent, { isLoading: isDeletingStudent }] = useDeleteStudentMutation();
  const [toggleTeacherStatus, { isLoading: isRestoringTeacher }] = useToggleTeacherStatusMutation();
  const [deleteTeacher, { isLoading: isDeletingTeacher }] = useDeleteTeacherMutation();
  const [toggleStaffUserStatus, { isLoading: isRestoringStaff }] = useToggleStaffUserStatusMutation();
  const [deleteStaffUser, { isLoading: isDeletingStaffUser }] = useDeleteStaffUserMutation();

  const isRestoring = isRestoringStudent || isRestoringTeacher || isRestoringStaff || isBulkProcessing;
  const isPermDeleting = isDeletingStudent || isDeletingTeacher || isDeletingStaffUser || isBulkProcessing;

  const roleActionsFor = (role?: string | null) => {
    switch ((role ?? "").toUpperCase()) {
      case "STUDENT":
        return { restore: toggleStudentStatus, permanentDelete: deleteStudent };
      case "TEACHER":
        return { restore: toggleTeacherStatus, permanentDelete: deleteTeacher };
      case "ADMIN":
      case "SUPERADMIN":
        return { restore: toggleStaffUserStatus, permanentDelete: deleteStaffUser };
      default:
        return null;
    }
  };

  const handleRestore = async () => {
    if (!restoreTarget) return;
    const actions = roleActionsFor(restoreTarget.role);
    if (!actions) {
      setRestoreError(t("settings.office.archive.restoreConfirm.unsupportedRole"));
      return;
    }
    setRestoreError(null);
    try {
      await actions.restore(restoreTarget.id).unwrap();
      toast.success(t("settings.office.archive.toast.restored"));
      setRestoreTarget(null);
    } catch (err) {
      const detail = extractApiError(err);
      const generic = t("settings.office.archive.restoreConfirm.error");
      const message = detail ? `${generic}: ${detail}` : generic;
      setRestoreError(message);
      toast.error(message);
    }
  };

  const handlePermanentDelete = async () => {
    if (!permDeleteTarget) return;
    const actions = roleActionsFor(permDeleteTarget.role);
    if (!actions) {
      setPermDeleteError(t("settings.office.archive.permanentDeleteConfirm.unsupportedRole"));
      return;
    }
    setPermDeleteError(null);
    try {
      await actions.permanentDelete(permDeleteTarget.id).unwrap();
      toast.success(t("settings.office.archive.toast.permanentlyDeleted"));
      setPermDeleteTarget(null);
      setSelected((s) => s.filter((id) => id !== permDeleteTarget.id));
    } catch (err) {
      const detail = extractApiError(err);
      const generic = t("settings.office.archive.permanentDeleteConfirm.error");
      const message = detail ? `${generic}: ${detail}` : generic;
      setPermDeleteError(message);
      toast.error(message);
    }
  };

  const handleBulkRestore = async () => {
    if (selected.length === 0 || isBulkProcessing) return;
    setBulkActionError(null);
    setIsBulkProcessing(true);
    try {
      const targets = pageData.filter((r) => selected.includes(r.id));
      await Promise.all(
        targets.map((r) => {
          const actions = roleActionsFor(r.role);
          return actions ? actions.restore(r.id).unwrap() : Promise.resolve();
        })
      );
      toast.success(t("settings.office.archive.toast.restored"));
      setSelected([]);
      setBulkRestoreConfirmOpen(false);
    } catch (err) {
      const detail = extractApiError(err);
      const generic = t("settings.office.archive.bulkRestoreConfirm.error");
      const message = detail ? `${generic}: ${detail}` : generic;
      setBulkActionError(message);
      toast.error(message);
    } finally {
      setIsBulkProcessing(false);
    }
  };

  const handleBulkPermanentDelete = async () => {
    if (selected.length === 0 || isBulkProcessing) return;
    setBulkActionError(null);
    setIsBulkProcessing(true);
    try {
      const targets = pageData.filter((r) => selected.includes(r.id));
      await Promise.all(
        targets.map((r) => {
          const actions = roleActionsFor(r.role);
          return actions ? actions.permanentDelete(r.id).unwrap() : Promise.resolve();
        })
      );
      toast.success(t("settings.office.archive.toast.permanentlyDeleted"));
      setSelected([]);
      setBulkPermDeleteConfirmOpen(false);
    } catch (err) {
      const detail = extractApiError(err);
      const generic = t("settings.office.archive.bulkPermanentDeleteConfirm.error");
      const message = detail ? `${generic}: ${detail}` : generic;
      setBulkActionError(message);
      toast.error(message);
    } finally {
      setIsBulkProcessing(false);
    }
  };

  // ── Selection ───────────────────────────────────────────────────────────────
  const allSelected = pageData.length > 0 && pageData.every((r) => selected.includes(r.id));
  const toggleAll = () => {
    if (allSelected) setSelected((s) => s.filter((id) => !pageData.find((r) => r.id === id)));
    else setSelected((s) => [...new Set([...s, ...pageData.map((r) => r.id)])]);
  };
  const toggleOne = (id: string) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  // ── Helpers ─────────────────────────────────────────────────────────────────
  const balanceColor = (b: number | null | undefined) =>
    !b ? "text-gray-500" : b > 0 ? "text-green-600" : "text-red-500";

  // Each archived record already carries the real underlying student/teacher/
  // staff id (the restore/permanent-delete actions above forward this same
  // r.id straight into toggleStudentStatus(id)/deleteStudent(id) etc., which
  // only works because it already is that id) — reused here for navigation.
  const archiveRowPath = (r: ArchiveRecord): string | null => {
    switch ((r.role ?? "").toUpperCase()) {
      case "STUDENT":
        return `/students/${r.id}`;
      case "TEACHER":
        return `/teachers/${r.id}`;
      case "ADMIN":
      case "SUPERADMIN":
        return `/profile/${r.id}`;
      default:
        return null;
    }
  };

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
          onClick={() => navigate("/settings/reasons_archiving")}
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
          <MenuItem value="ADMIN">{t("settings.office.archive.filters.admin")}</MenuItem>
          <MenuItem value="SUPERADMIN">{t("settings.office.archive.filters.superadmin")}</MenuItem>
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

        <DatePickerField
          value={startDate}
          onChange={(iso) => { setStartDate(iso); setPage(1); }}
          placeholder={t("settings.office.archive.filters.startDate")}
        />

        <DatePickerField
          value={endDate}
          onChange={(iso) => { setEndDate(iso); setPage(1); }}
        />

        <div className="flex items-center gap-3 ml-2">
          <button
            type="button"
            onClick={() => { setBulkActionError(null); setBulkPermDeleteConfirmOpen(true); }}
            disabled={selected.length === 0 || isPermDeleting}
            className="flex items-center gap-1 text-red-500 hover:text-red-600 text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <MdDelete size={18} /> {t("settings.office.archive.actions.delete")}
          </button>
          <button
            type="button"
            onClick={() => { setBulkActionError(null); setBulkRestoreConfirmOpen(true); }}
            disabled={selected.length === 0 || isRestoring}
            className="flex items-center gap-1 text-green-600 hover:text-green-700 text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <MdRefresh size={18} /> {t("settings.office.archive.actions.reestablish")}
          </button>
          <button className="flex items-center gap-1 text-gray-500 hover:text-gray-700 transition-colors">
            <MdEmail size={18} />
          </button>
        </div>
      </div>

      {bulkActionError && (
        <div className="mb-3 text-sm text-red-500">{bulkActionError}</div>
      )}

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
                    <div
                      className="font-medium text-blue-500 cursor-pointer hover:underline text-sm"
                      onClick={() => {
                        const path = archiveRowPath(r);
                        if (path) navigate(path);
                      }}
                    >
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
                    <IconButton
                      size="small"
                      sx={{ color: "#4ade80" }}
                      onClick={() => { setRestoreError(null); setRestoreTarget(r); }}
                      aria-label={t("settings.office.archive.actions.reestablish")}
                    >
                      <MdRefresh size={18} />
                    </IconButton>
                    <IconButton
                      size="small"
                      sx={{ color: "#ef5350" }}
                      onClick={() => { setPermDeleteError(null); setPermDeleteTarget(r); }}
                      aria-label={t("settings.office.archive.actions.delete")}
                    >
                      <MdDelete size={18} />
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

      {/* Restore confirmation */}
      <Dialog
        open={!!restoreTarget}
        onClose={() => { setRestoreTarget(null); setRestoreError(null); }}
        PaperProps={{ sx: { borderRadius: "14px", width: 380 } }}
      >
        <DialogTitle sx={{ fontWeight: 600 }}>
          {t("settings.office.archive.restoreConfirm.title")}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            {t("settings.office.archive.restoreConfirm.message", { name: restoreTarget?.name ?? "" })}
          </DialogContentText>
          {restoreError && (
            <Typography sx={{ mt: 1.5, color: "#ef5350", fontSize: "0.8125rem" }}>
              {restoreError}
            </Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button
            onClick={() => { setRestoreTarget(null); setRestoreError(null); }}
            variant="outlined"
            disabled={isRestoring}
            sx={{ textTransform: "none", borderRadius: "10px", paddingX: "18px" }}
          >
            {t("settings.office.archive.reasons.deleteConfirm.cancel")}
          </Button>
          <Button
            onClick={handleRestore}
            variant="contained"
            color="success"
            disabled={isRestoring}
            startIcon={isRestoring ? <CircularProgress size={16} color="inherit" /> : undefined}
            sx={{ textTransform: "none", borderRadius: "10px", paddingX: "18px", fontWeight: 600, boxShadow: "none" }}
          >
            {t("settings.office.archive.actions.reestablish")}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Permanent delete confirmation */}
      <Dialog
        open={!!permDeleteTarget}
        onClose={() => { setPermDeleteTarget(null); setPermDeleteError(null); }}
        PaperProps={{ sx: { borderRadius: "14px", width: 380 } }}
      >
        <DialogTitle sx={{ fontWeight: 600 }}>
          {t("settings.office.archive.permanentDeleteConfirm.title")}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            {t("settings.office.archive.permanentDeleteConfirm.message", { name: permDeleteTarget?.name ?? "" })}
          </DialogContentText>
          {permDeleteError && (
            <Typography sx={{ mt: 1.5, color: "#ef5350", fontSize: "0.8125rem" }}>
              {permDeleteError}
            </Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button
            onClick={() => { setPermDeleteTarget(null); setPermDeleteError(null); }}
            variant="outlined"
            disabled={isPermDeleting}
            sx={{ textTransform: "none", borderRadius: "10px", paddingX: "18px" }}
          >
            {t("settings.office.archive.reasons.deleteConfirm.cancel")}
          </Button>
          <Button
            onClick={handlePermanentDelete}
            variant="contained"
            color="error"
            disabled={isPermDeleting}
            startIcon={isPermDeleting ? <CircularProgress size={16} color="inherit" /> : undefined}
            sx={{ textTransform: "none", borderRadius: "10px", paddingX: "18px", fontWeight: 600, boxShadow: "none" }}
          >
            {t("settings.office.archive.actions.delete")}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Bulk restore confirmation */}
      <Dialog
        open={bulkRestoreConfirmOpen}
        onClose={() => { setBulkRestoreConfirmOpen(false); setBulkActionError(null); }}
        PaperProps={{ sx: { borderRadius: "14px", width: 380 } }}
      >
        <DialogTitle sx={{ fontWeight: 600 }}>
          {t("settings.office.archive.bulkRestoreConfirm.title")}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            {t("settings.office.archive.bulkRestoreConfirm.message", { count: selected.length })}
          </DialogContentText>
          {bulkActionError && (
            <Typography sx={{ mt: 1.5, color: "#ef5350", fontSize: "0.8125rem" }}>
              {bulkActionError}
            </Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button
            onClick={() => { setBulkRestoreConfirmOpen(false); setBulkActionError(null); }}
            variant="outlined"
            disabled={isRestoring}
            sx={{ textTransform: "none", borderRadius: "10px", paddingX: "18px" }}
          >
            {t("settings.office.archive.reasons.deleteConfirm.cancel")}
          </Button>
          <Button
            onClick={handleBulkRestore}
            variant="contained"
            color="success"
            disabled={isRestoring}
            startIcon={isRestoring ? <CircularProgress size={16} color="inherit" /> : undefined}
            sx={{ textTransform: "none", borderRadius: "10px", paddingX: "18px", fontWeight: 600, boxShadow: "none" }}
          >
            {t("settings.office.archive.actions.reestablish")}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Bulk permanent delete confirmation */}
      <Dialog
        open={bulkPermDeleteConfirmOpen}
        onClose={() => { setBulkPermDeleteConfirmOpen(false); setBulkActionError(null); }}
        PaperProps={{ sx: { borderRadius: "14px", width: 380 } }}
      >
        <DialogTitle sx={{ fontWeight: 600 }}>
          {t("settings.office.archive.bulkPermanentDeleteConfirm.title")}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            {t("settings.office.archive.bulkPermanentDeleteConfirm.message", { count: selected.length })}
          </DialogContentText>
          {bulkActionError && (
            <Typography sx={{ mt: 1.5, color: "#ef5350", fontSize: "0.8125rem" }}>
              {bulkActionError}
            </Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button
            onClick={() => { setBulkPermDeleteConfirmOpen(false); setBulkActionError(null); }}
            variant="outlined"
            disabled={isPermDeleting}
            sx={{ textTransform: "none", borderRadius: "10px", paddingX: "18px" }}
          >
            {t("settings.office.archive.reasons.deleteConfirm.cancel")}
          </Button>
          <Button
            onClick={handleBulkPermanentDelete}
            variant="contained"
            color="error"
            disabled={isPermDeleting}
            startIcon={isPermDeleting ? <CircularProgress size={16} color="inherit" /> : undefined}
            sx={{ textTransform: "none", borderRadius: "10px", paddingX: "18px", fontWeight: 600, boxShadow: "none" }}
          >
            {t("settings.office.archive.actions.delete")}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};