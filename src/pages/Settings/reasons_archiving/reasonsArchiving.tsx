import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Drawer,
  IconButton,
  InputAdornment,
  MenuItem,
  Pagination,
  Paper,
  Select,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";

import { RiDeleteBinLine } from "react-icons/ri";
import { FiEdit } from "react-icons/fi";
import { IoClose } from "react-icons/io5";
import { MdArrowBack, MdRefresh, MdSearch } from "react-icons/md";

import {
  useAllReasonsQuery,
  useLazyReasonForEditQuery,
  useCreateReasonMutation,
  useUpdateReasonMutation,
  useToggleReasonStatusMutation,
  useDeleteReasonMutation,
} from "../../../app/api/reasonsApi";
import type { Reason, ReasonStatus } from "../../../app/api/reasonsApi/types";
import type { RootState } from "../../../app/store";
import { useToast } from "../../../Context/ToastContext";
import { extractApiError } from "../../../utils";

const PAGE_SIZE = 10;
const SEARCH_DEBOUNCE_MS = 350;

interface FormState {
  name: string;
  type: string;
}

const defaultForm: FormState = { name: "", type: "" };

// dd.MM.yyyy, independent of the UI language (Intl has no reliable "uz"
// locale everywhere).
const formatDate = (iso?: string | null) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
};

export const ReasonsArchiving = () => {
  const { t } = useTranslation();
  const toast = useToast();
  const navigate = useNavigate();
  // POST /reasons needs a concrete branchId query param; the real branch UUID
  // lives in the Redux branch slice (the same source baseApi uses for the
  // x-branch-id header on every request). null means "all branches".
  const selectedBranchId = useSelector((s: RootState) => s.branch.selectedBranchId);

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ReasonStatus | "">("");

  useEffect(() => {
    const handle = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [search]);

  // A different branch is a different list — start from page 1 again.
  useEffect(() => {
    setPage(1);
  }, [selectedBranchId]);

  const { data, isLoading, isError, isFetching, refetch } = useAllReasonsQuery({
    page,
    limit: PAGE_SIZE,
    search: debouncedSearch || undefined,
    status: statusFilter || undefined,
    branchId: selectedBranchId ?? "all",
  });

  const [fetchReasonForEdit, { isFetching: isLoadingForEdit }] = useLazyReasonForEditQuery();
  const [createReason, { isLoading: isCreating }] = useCreateReasonMutation();
  const [updateReason, { isLoading: isUpdating }] = useUpdateReasonMutation();
  const [toggleReasonStatus] = useToggleReasonStatusMutation();
  const [deleteReason, { isLoading: isDeleting }] = useDeleteReasonMutation();

  const reasons = data?.data ?? [];
  const total = data?.meta?.total ?? reasons.length;
  const totalPages = data?.meta?.totalPages ?? Math.max(1, Math.ceil(total / PAGE_SIZE));

  const [open, setOpen] = useState(false);
  const [editingReason, setEditingReason] = useState<Reason | null>(null);
  const [form, setForm] = useState<FormState>(defaultForm);
  const [errors, setErrors] = useState<{ name?: string }>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  // Guards against a slow GET /reasons/{id}/for-edit answer landing in a
  // drawer that was closed (or reopened for another reason) in the meantime.
  const editRequestRef = useRef<string | null>(null);

  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Reason | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const withDetail = (err: unknown, genericKey: string) => {
    const detail = extractApiError(err);
    const generic = t(genericKey);
    return detail ? `${generic}: ${detail}` : generic;
  };

  const openAddDrawer = () => {
    editRequestRef.current = null;
    setEditingReason(null);
    setForm(defaultForm);
    setErrors({});
    setSaveError(null);
    setOpen(true);
  };

  // The row's own values fill the form immediately; GET /reasons/{id}/for-edit
  // then replaces them with the authoritative copy.
  const openEditDrawer = async (reason: Reason) => {
    editRequestRef.current = reason.id;
    setEditingReason(reason);
    setForm({ name: reason.name ?? "", type: reason.type ?? "" });
    setErrors({});
    setSaveError(null);
    setOpen(true);
    try {
      const res = await fetchReasonForEdit(reason.id).unwrap();
      if (editRequestRef.current === reason.id && res?.data) {
        setForm({ name: res.data.name ?? "", type: res.data.type ?? "" });
      }
    } catch {
      // The row already provided usable values — keep the drawer open.
    }
  };

  const closeDrawer = () => {
    editRequestRef.current = null;
    setOpen(false);
  };

  const handleSave = async () => {
    const name = form.name.trim();
    const type = form.type.trim();
    if (!name) {
      setErrors({ name: t("reasonsArchiving.form.errors.name") });
      return;
    }
    setErrors({});
    setSaveError(null);
    try {
      if (editingReason) {
        await updateReason({
          id: editingReason.id,
          name,
          ...(type ? { type } : {}),
        }).unwrap();
        toast.success(t("reasonsArchiving.toast.updated"));
      } else {
        // Swagger: branchId is a REQUIRED query param and "all" has no single
        // id to send, so a concrete branch has to be selected.
        if (!selectedBranchId) {
          setSaveError(t("reasonsArchiving.form.errors.branchRequired"));
          return;
        }
        await createReason({
          branchId: selectedBranchId,
          name,
          ...(type ? { type } : {}),
        }).unwrap();
        toast.success(t("reasonsArchiving.toast.created"));
      }
      closeDrawer();
    } catch (err) {
      const message = withDetail(err, "reasonsArchiving.form.errors.save");
      setSaveError(message);
      toast.error(message);
    }
  };

  const handleToggle = async (reason: Reason) => {
    if (togglingId) return;
    setTogglingId(reason.id);
    try {
      await toggleReasonStatus(reason.id).unwrap();
      toast.success(t("reasonsArchiving.toast.statusToggled"));
    } catch (err) {
      toast.error(withDetail(err, "reasonsArchiving.errors.toggle"));
    } finally {
      setTogglingId(null);
    }
  };

  const openDeleteConfirm = (reason: Reason) => {
    setDeleteError(null);
    setDeleteTarget(reason);
  };

  const closeDeleteConfirm = () => {
    setDeleteTarget(null);
    setDeleteError(null);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteReason(deleteTarget.id).unwrap();
      toast.success(t("reasonsArchiving.toast.deleted"));
      // Deleting the last row of a page must not leave us on an empty page.
      if (reasons.length === 1 && page > 1) setPage(page - 1);
      setDeleteTarget(null);
    } catch (err) {
      const message = withDetail(err, "reasonsArchiving.deleteConfirm.error");
      setDeleteError(message);
      toast.error(message);
    }
  };

  const COLS = 6;
  const isSaving = isCreating || isUpdating;

  return (
    <Box sx={{ width: "100%", p: 3 }}>
      {/* Header */}
      <Box className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <Box className="flex items-center gap-2">
          <IconButton
            size="small"
            onClick={() => navigate("/settings/office/archive")}
            aria-label={t("reasonsArchiving.back")}
          >
            <MdArrowBack size={22} />
          </IconButton>
          <h1 className="text-3xl">{t("reasonsArchiving.title")}</h1>
          <IconButton
            size="small"
            onClick={() => refetch()}
            disabled={isFetching}
            aria-label={t("reasonsArchiving.refresh")}
          >
            <MdRefresh size={18} className={isFetching ? "animate-spin" : ""} />
          </IconButton>
        </Box>

        <Box className="flex items-center gap-2 flex-wrap">
          <TextField
            size="small"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("reasonsArchiving.searchPlaceholder")}
            sx={{ minWidth: 220, bgcolor: "#fff", "& .MuiInputBase-root": { fontSize: 14 } }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <MdSearch size={18} color="#9ca3af" />
                </InputAdornment>
              ),
            }}
          />

          <Select
            size="small"
            displayEmpty
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as ReasonStatus | "");
              setPage(1);
            }}
            sx={{ minWidth: 150, fontSize: 14, bgcolor: "#fff" }}
          >
            <MenuItem value="">{t("reasonsArchiving.statusOptions.all")}</MenuItem>
            <MenuItem value="ACTIVE">{t("reasonsArchiving.statusOptions.active")}</MenuItem>
            <MenuItem value="INACTIVE">{t("reasonsArchiving.statusOptions.inactive")}</MenuItem>
          </Select>

          <Button
            onClick={openAddDrawer}
            sx={{
              backgroundColor: "rgb(23 37 84 / var(--tw-bg-opacity, 1))",
              color: "white",
              padding: "10px 26px",
              borderRadius: "50px",
              textTransform: "none",
              "&:hover": { backgroundColor: "rgb(30 41 110 / var(--tw-bg-opacity, 1))" },
            }}
          >
            {t("reasonsArchiving.addNew")}
          </Button>
        </Box>
      </Box>

      {/* Table */}
      <Box
        sx={{
          width: "100%",
          backgroundColor: "#fff",
          borderRadius: 2,
          border: "1px solid #e8eaed",
          p: 3,
        }}
      >
        <TableContainer
          component={Paper}
          sx={{ borderRadius: "10px", boxShadow: "none", border: "1px solid #e5e5e5" }}
        >
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>{t("reasonsArchiving.table.name")}</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>{t("reasonsArchiving.table.type")}</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>{t("reasonsArchiving.table.status")}</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>{t("reasonsArchiving.table.createdBy")}</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>{t("reasonsArchiving.table.createdAt")}</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>{t("reasonsArchiving.table.actions")}</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={COLS} align="center" sx={{ py: 6 }}>
                    <CircularProgress size={26} />
                  </TableCell>
                </TableRow>
              ) : isError ? (
                <TableRow>
                  <TableCell colSpan={COLS} align="center" sx={{ py: 6, color: "error.main" }}>
                    {t("reasonsArchiving.loadError")}
                  </TableCell>
                </TableRow>
              ) : reasons.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={COLS} align="center" sx={{ py: 6, color: "#9ca3af" }}>
                    {t("reasonsArchiving.emptyState")}
                  </TableCell>
                </TableRow>
              ) : (
                reasons.map((reason) => {
                  const isActive = reason.status !== "INACTIVE";
                  return (
                    <TableRow key={reason.id} hover>
                      <TableCell>{reason.name}</TableCell>

                      <TableCell>{reason.type?.trim() ? reason.type : "—"}</TableCell>

                      <TableCell>
                        <Box className="flex items-center gap-1">
                          <Tooltip title={t("reasonsArchiving.toggleStatus")}>
                            <span>
                              <Switch
                                size="small"
                                checked={isActive}
                                onChange={() => handleToggle(reason)}
                                disabled={togglingId !== null}
                                inputProps={{ "aria-label": t("reasonsArchiving.toggleStatus") }}
                              />
                            </span>
                          </Tooltip>
                          <Chip
                            size="small"
                            label={
                              isActive
                                ? t("reasonsArchiving.statusOptions.active")
                                : t("reasonsArchiving.statusOptions.inactive")
                            }
                            sx={{
                              backgroundColor: isActive ? "#dcfce7" : "#f3f4f6",
                              color: isActive ? "#15803d" : "#6b7280",
                              fontWeight: 600,
                              borderRadius: "20px",
                            }}
                          />
                        </Box>
                      </TableCell>

                      <TableCell>{reason.createdBy?.name ?? "—"}</TableCell>

                      <TableCell>{formatDate(reason.createdAt)}</TableCell>

                      <TableCell>
                        <IconButton
                          onClick={() => openEditDrawer(reason)}
                          aria-label={t("reasonsArchiving.edit")}
                        >
                          <FiEdit size={20} color="#f4b400" />
                        </IconButton>

                        <IconButton
                          onClick={() => openDeleteConfirm(reason)}
                          aria-label={t("reasonsArchiving.delete")}
                        >
                          <RiDeleteBinLine size={20} color="red" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {totalPages > 1 && (
          <Box sx={{ display: "flex", justifyContent: "center", pt: 2 }}>
            <Pagination count={totalPages} page={page} onChange={(_, v) => setPage(v)} size="small" />
          </Box>
        )}
      </Box>

      {/* Add / edit drawer */}
      <Drawer anchor="right" open={open} onClose={closeDrawer}>
        <Box sx={{ width: 400, maxWidth: "100vw", height: "100%", backgroundColor: "#fff" }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              p: 2,
              borderBottom: "1px solid #e5e5e5",
            }}
          >
            <h2 className="text-2xl font-medium">
              {editingReason ? t("reasonsArchiving.drawer.editTitle") : t("reasonsArchiving.drawer.addTitle")}
            </h2>
            <IconButton onClick={closeDrawer}>
              <IoClose size={28} color="#888" />
            </IconButton>
          </Box>

          <Box sx={{ p: 4, display: "flex", flexDirection: "column", gap: 3 }}>
            <Box>
              <p className="mb-3 text-[18px] text-gray-600">{t("reasonsArchiving.form.name")}</p>
              <TextField
                fullWidth
                variant="outlined"
                placeholder={t("reasonsArchiving.form.namePlaceholder")}
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                error={!!errors.name}
                helperText={errors.name}
                disabled={isLoadingForEdit}
                onKeyDown={(e) => e.key === "Enter" && handleSave()}
              />
            </Box>

            <Box>
              <p className="mb-3 text-[18px] text-gray-600">{t("reasonsArchiving.form.type")}</p>
              <TextField
                fullWidth
                variant="outlined"
                placeholder={t("reasonsArchiving.form.typePlaceholder")}
                value={form.type}
                onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))}
                disabled={isLoadingForEdit}
                onKeyDown={(e) => e.key === "Enter" && handleSave()}
              />
            </Box>

            {saveError && (
              <Typography fontSize={13} color="error">
                {saveError}
              </Typography>
            )}

            <Button
              variant="contained"
              onClick={handleSave}
              disabled={isSaving || isLoadingForEdit}
              startIcon={isSaving ? <CircularProgress size={16} color="inherit" /> : undefined}
              sx={{ width: "140px", py: 1.5, textTransform: "none", borderRadius: "8px" }}
            >
              {t("reasonsArchiving.form.save")}
            </Button>
          </Box>
        </Box>
      </Drawer>

      {/* Delete confirmation */}
      <Dialog
        open={!!deleteTarget}
        onClose={closeDeleteConfirm}
        PaperProps={{ sx: { borderRadius: "14px", width: 380 } }}
      >
        <DialogTitle sx={{ fontWeight: 600 }}>{t("reasonsArchiving.deleteConfirm.title")}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {t("reasonsArchiving.deleteConfirm.message", { name: deleteTarget?.name ?? "" })}
          </DialogContentText>
          {deleteError && (
            <Typography fontSize={13} color="error" mt={1.5}>
              {deleteError}
            </Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button
            onClick={closeDeleteConfirm}
            variant="outlined"
            disabled={isDeleting}
            sx={{ textTransform: "none", borderRadius: "10px", paddingX: "18px" }}
          >
            {t("reasonsArchiving.form.cancel")}
          </Button>
          <Button
            onClick={confirmDelete}
            variant="contained"
            color="error"
            disabled={isDeleting}
            startIcon={isDeleting ? <CircularProgress size={16} color="inherit" /> : undefined}
            sx={{ textTransform: "none", borderRadius: "10px", paddingX: "18px", fontWeight: 600, boxShadow: "none" }}
          >
            {t("reasonsArchiving.delete")}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
