import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import {
  Box,
  Typography,
  Button,
  Drawer,
  TextField,
  IconButton,
  Divider,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Select,
  MenuItem,
  Pagination,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from "@mui/material";
import { MdClose, MdOutlineEdit, MdDeleteOutline, MdRefresh, MdArchive, MdUnarchive } from "react-icons/md";
import {
  useAllRoomsQuery,
  useCreateRoomMutation,
  useUpdateRoomMutation,
  useToggleRoomStatusMutation,
  useDeleteRoomMutation,
} from "../../../../../app/api/roomsApi/roomsApi";
import type { Room } from "../../../../../app/api/roomsApi/types";
import { useAllBranchesQuery } from "../../../../../app/api/branchesApi/branchesApi";
import { useBranch } from "../../../../../Context/BranchContext";
import { useToast } from "../../../../../Context/ToastContext";
import type { RootState } from "../../../../../app/store";
import { submitOnEnter } from "../../../../../utils/submitOnEnter";

interface FormState {
  name: string;
  capacity: string;
  branchId: string;
}

const defaultForm: FormState = { name: "", capacity: "", branchId: "" };

const PAGE_SIZE = 10;

export const Rooms = () => {
  const { t } = useTranslation();
  const toast = useToast();

  const { branch: selectedBranch } = useBranch();
  const selectedBranchId = useSelector((s: RootState) => s.branch.selectedBranchId);

  const { data, isLoading, isError, refetch, isFetching } = useAllRoomsQuery();
  const { data: branchesData } = useAllBranchesQuery();
  const [createRoom, { isLoading: isCreating }] = useCreateRoomMutation();
  const [updateRoom, { isLoading: isUpdating }] = useUpdateRoomMutation();
  const [toggleRoomStatus, { isLoading: isToggling }] = useToggleRoomStatusMutation();
  const [deleteRoom, { isLoading: isDeleting }] = useDeleteRoomMutation();

  const [tab, setTab] = useState<"faol" | "arxiv">("faol");
  const [page, setPage] = useState(1);

  const filteredRooms = (data?.data ?? [])
    .filter((r) => (tab === "faol" ? r.status === "ACTIVE" : r.status !== "ACTIVE"))
    .filter((r) => selectedBranch === "all" || r.branch?.name === selectedBranch);
  // Every room is loaded; the table shows PAGE_SIZE of them at a time.
  const totalRooms = filteredRooms.length;
  const totalPages = Math.max(1, Math.ceil(totalRooms / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const rooms = filteredRooms.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  // A different tab or branch is a different list — start from its first page.
  useEffect(() => { setPage(1); }, [tab, selectedBranch]);
  const activeBranches = (branchesData?.data ?? []).filter((b) => b.status === "ACTIVE");

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [form, setForm] = useState<FormState>(defaultForm);
  const [errors, setErrors] = useState<{ [k: string]: string }>({});
  const [saveError, setSaveError] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<Room | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<Room | null>(null);
  const [archiveError, setArchiveError] = useState<string | null>(null);
  const [restoreTarget, setRestoreTarget] = useState<Room | null>(null);
  const [restoreError, setRestoreError] = useState<string | null>(null);

  const openAddDrawer = () => {
    setEditingRoom(null);
    // Pre-fill with whichever branch is active in the header, same as every
    // other create form — still editable, just no longer defaulting to blank.
    setForm({ ...defaultForm, branchId: selectedBranchId ?? "" });
    setErrors({});
    setSaveError(null);
    setDrawerOpen(true);
  };

  const openEditDrawer = (room: Room) => {
    setEditingRoom(room);
    setForm({ name: room.name, capacity: String(room.capacity), branchId: room.branchId });
    setErrors({});
    setSaveError(null);
    setDrawerOpen(true);
  };

  const closeDrawer = () => setDrawerOpen(false);

  const openDeleteConfirm = (room: Room) => {
    setDeleteError(null);
    setDeleteTarget(room);
  };

  const closeDeleteConfirm = () => {
    setDeleteTarget(null);
    setDeleteError(null);
  };

  // Permanent delete — reserved for an already-archived (INACTIVE) room; the
  // backend itself rejects it (409) while the room still has groups assigned.
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteRoom(deleteTarget.id).unwrap();
      setDeleteTarget(null);
      toast.success(t("settings.office.rooms.toast.deleted"));
    } catch {
      setDeleteError(t("settings.office.rooms.deleteConfirm.error"));
      toast.error(t("settings.office.rooms.deleteConfirm.error"));
    }
  };

  const openArchiveConfirm = (room: Room) => {
    setArchiveError(null);
    setArchiveTarget(room);
  };

  const closeArchiveConfirm = () => {
    setArchiveTarget(null);
    setArchiveError(null);
  };

  const confirmArchive = async () => {
    if (!archiveTarget) return;
    try {
      await toggleRoomStatus(archiveTarget.id).unwrap();
      setArchiveTarget(null);
      toast.success(t("settings.office.rooms.toast.archived"));
    } catch {
      setArchiveError(t("settings.office.rooms.archiveConfirm.error"));
      toast.error(t("settings.office.rooms.archiveConfirm.error"));
    }
  };

  const openRestoreConfirm = (room: Room) => {
    setRestoreError(null);
    setRestoreTarget(room);
  };

  const closeRestoreConfirm = () => {
    setRestoreTarget(null);
    setRestoreError(null);
  };

  const confirmRestore = async () => {
    if (!restoreTarget) return;
    try {
      await toggleRoomStatus(restoreTarget.id).unwrap();
      setRestoreTarget(null);
      toast.success(t("settings.office.rooms.toast.restored"));
    } catch {
      setRestoreError(t("settings.office.rooms.restoreConfirm.error"));
      toast.error(t("settings.office.rooms.restoreConfirm.error"));
    }
  };

  const validate = () => {
    const newErrors: { [k: string]: string } = {};
    if (!form.name.trim()) newErrors.name = t("settings.office.rooms.form.errors.name");
    const capacityNum = parseInt(form.capacity, 10);
    if (!form.capacity.trim() || Number.isNaN(capacityNum) || capacityNum <= 0) {
      newErrors.capacity = t("settings.office.rooms.form.errors.capacity");
    }
    if (!form.branchId) newErrors.branchId = t("settings.office.rooms.form.errors.branch");
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSaveError(null);
    const capacity = parseInt(form.capacity, 10);

    try {
      if (editingRoom) {
        await updateRoom({ id: editingRoom.id, name: form.name, capacity, branchId: form.branchId }).unwrap();
        toast.success(t("settings.office.rooms.toast.updated"));
      } else {
        await createRoom({ name: form.name, capacity, branchId: form.branchId }).unwrap();
        toast.success(t("settings.office.rooms.toast.created"));
      }
      setDrawerOpen(false);
    } catch {
      setSaveError(t("settings.office.rooms.form.errors.save"));
      toast.error(t("settings.office.rooms.form.errors.save"));
    }
  };

  const isSaving = isCreating || isUpdating;

  return (
    <Box sx={{ p: 3, bgcolor: "var(--color-surface-alt)", minHeight: "100vh" }}>
      {/* Header */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 1, mb: 3 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Typography variant="h5" fontWeight={400}>
            {t("settings.office.rooms.title")}
          </Typography>
          <IconButton
            size="small"
            onClick={() => refetch()}
            disabled={isFetching}
            aria-label={t("settings.office.rooms.refresh")}
          >
            <MdRefresh size={18} className={isFetching ? "animate-spin" : ""} />
          </IconButton>
        </Box>
        <Button
          variant="contained"
          onClick={openAddDrawer}
          sx={{
            bgcolor: "#1a3f6f",
            borderRadius: 5,
            px: 3,
            fontWeight: 700,
            fontSize: 13,
            letterSpacing: 1,
            "&:hover": { bgcolor: "#15345c" },
          }}
        >
          {t("settings.office.rooms.addNew")}
        </Button>
      </Box>

      {/* Tabs */}
      <Box sx={{ display: "inline-flex", borderRadius: "10px", bgcolor: "var(--color-surface-alt)", p: 0.5, mb: 2 }}>
        <Box
          component="button"
          type="button"
          onClick={() => setTab("faol")}
          sx={{
            border: "none", cursor: "pointer", borderRadius: "8px", px: 2, py: 0.7, fontSize: 13, fontWeight: 600,
            bgcolor: tab === "faol" ? "var(--color-surface)" : "transparent",
            color: tab === "faol" ? "#1a3f6f" : "var(--color-text-secondary)",
            boxShadow: tab === "faol" ? "0 1px 2px rgba(0,0,0,0.08)" : "none",
          }}
        >
          {t("settings.office.rooms.tabs.active")}
        </Box>
        <Box
          component="button"
          type="button"
          onClick={() => setTab("arxiv")}
          sx={{
            border: "none", cursor: "pointer", borderRadius: "8px", px: 2, py: 0.7, fontSize: 13, fontWeight: 600,
            bgcolor: tab === "arxiv" ? "var(--color-surface)" : "transparent",
            color: tab === "arxiv" ? "#1a3f6f" : "var(--color-text-secondary)",
            boxShadow: tab === "arxiv" ? "0 1px 2px rgba(0,0,0,0.08)" : "none",
          }}
        >
          {t("settings.office.rooms.tabs.archived")}
        </Box>
      </Box>

      {/* Loading state */}
      {isLoading && (
        <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
          <CircularProgress size={28} />
        </Box>
      )}

      {/* Error state */}
      {!isLoading && isError && (
        <Box sx={{ py: 6, textAlign: "center" }}>
          <Typography color="error" fontSize={14}>
            {t("settings.office.rooms.loadError")}
          </Typography>
        </Box>
      )}

      {/* Table */}
      {!isLoading && !isError && (
        <TableContainer component={Paper} elevation={0} variant="outlined" sx={{ borderRadius: 2 }}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: "var(--color-surface-alt)" }}>
                <TableCell sx={{ fontWeight: 600, fontSize: 13, color: "var(--color-text-primary)", width: "15%" }}>{t("settings.office.rooms.table.id")}</TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: 13, color: "var(--color-text-primary)", width: "25%" }}>{t("settings.office.rooms.table.name")}</TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: 13, color: "var(--color-text-primary)", width: "25%" }}>{t("settings.office.rooms.table.branch")}</TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: 13, color: "var(--color-text-primary)", width: "20%" }}>{t("settings.office.rooms.table.capacity")}</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600, fontSize: 13, color: "var(--color-text-primary)", width: "15%" }}>{t("settings.office.rooms.table.actions")}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rooms.map((room) => (
                <TableRow key={room.id} sx={{ "&:hover": { bgcolor: "var(--color-surface-alt)" } }}>
                  <TableCell sx={{ fontSize: 12, color: "var(--color-text-secondary)" }}>{room.id.slice(0, 8)}</TableCell>
                  <TableCell sx={{ fontSize: 14 }}>{room.name}</TableCell>
                  <TableCell sx={{ fontSize: 13, color: "var(--color-text-secondary)" }}>{room.branch?.name ?? ""}</TableCell>
                  <TableCell sx={{ fontSize: 13, color: "var(--color-text-secondary)" }}>{room.capacity}</TableCell>
                  <TableCell align="right">
                    <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 0.5 }}>
                      <IconButton
                        size="small"
                        onClick={() => openEditDrawer(room)}
                        sx={{ color: "var(--color-text-secondary)" }}
                        aria-label={t("settings.office.rooms.edit")}
                      >
                        <MdOutlineEdit size={18} />
                      </IconButton>
                      {tab === "faol" ? (
                        <IconButton
                          size="small"
                          onClick={() => openArchiveConfirm(room)}
                          sx={{ color: "#b98900" }}
                          aria-label={t("settings.office.rooms.archive")}
                          title={t("settings.office.rooms.archive")}
                        >
                          <MdArchive size={18} />
                        </IconButton>
                      ) : (
                        <>
                          <IconButton
                            size="small"
                            onClick={() => openRestoreConfirm(room)}
                            sx={{ color: "#2e7d32" }}
                            aria-label={t("settings.office.rooms.restore")}
                            title={t("settings.office.rooms.restore")}
                          >
                            <MdUnarchive size={18} />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => openDeleteConfirm(room)}
                            sx={{ color: "#e53935" }}
                            aria-label={t("settings.office.rooms.delete")}
                            title={t("settings.office.rooms.delete")}
                          >
                            <MdDeleteOutline size={18} />
                          </IconButton>
                        </>
                      )}
                    </Box>
                  </TableCell>
                </TableRow>
              ))}

              {rooms.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} sx={{ textAlign: "center", color: "var(--color-text-muted)", fontSize: 13, py: 4 }}>
                    {tab === "faol" ? t("settings.office.rooms.emptyState") : t("settings.office.rooms.emptyArchived")}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          {totalRooms > 0 && (
            <Box
              sx={{
                display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 1.5,
                px: 2, py: 1.5, borderTop: "1px solid var(--color-border)",
              }}
            >
              <Typography fontSize={13} color="var(--color-text-secondary)">
                {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, totalRooms)} / {totalRooms}
              </Typography>
              {totalPages > 1 && (
                <Pagination
                  count={totalPages}
                  page={currentPage}
                  onChange={(_, value) => setPage(value)}
                  shape="rounded"
                  showFirstButton
                  showLastButton
                  sx={{
                    "& .MuiPaginationItem-root": { color: "var(--color-text-secondary)", fontWeight: 600, borderRadius: "8px" },
                    "& .MuiPaginationItem-root.Mui-selected": { bgcolor: "#1a3f6f", color: "#fff" },
                    "& .MuiPaginationItem-root.Mui-selected:hover": { bgcolor: "#15345c" },
                  }}
                />
              )}
            </Box>
          )}
        </TableContainer>
      )}

      {/* Drawer */}
      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={closeDrawer}
        onKeyDown={submitOnEnter(handleSubmit, isSaving)}
        PaperProps={{ sx: { width: 380, p: 0 } }}
      >
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", px: 3, py: 2.5 }}>
          <Typography fontWeight={600} fontSize={17}>
            {editingRoom
              ? t("settings.office.rooms.form.editRoom")
              : t("settings.office.rooms.form.addNewRoom")}
          </Typography>
          <IconButton size="small" onClick={closeDrawer}>
            <MdClose size={20} />
          </IconButton>
        </Box>
        <Divider />

        <Box sx={{ px: 3, py: 3 }}>
          <Box mb={2.5}>
            <Typography fontSize={13} mb={0.8}>{t("settings.office.rooms.form.name")}</Typography>
            <TextField
              fullWidth
              size="small"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              error={!!errors.name}
              helperText={errors.name}
              sx={{ "& .MuiOutlinedInput-root": { bgcolor: "var(--color-surface)" } }}
            />
          </Box>

          <Box mb={2.5}>
            <Typography fontSize={13} mb={0.8}>{t("settings.office.rooms.form.branch")}</Typography>
            <Select
              fullWidth
              size="small"
              displayEmpty
              value={form.branchId}
              onChange={(e) => setForm((p) => ({ ...p, branchId: e.target.value }))}
              error={!!errors.branchId}
              sx={{ bgcolor: "var(--color-surface)" }}
            >
              <MenuItem value="" disabled>
                {t("settings.office.rooms.form.branchPlaceholder")}
              </MenuItem>
              {activeBranches.map((branch) => (
                <MenuItem key={branch.id} value={branch.id}>
                  {branch.name}
                </MenuItem>
              ))}
            </Select>
            {errors.branchId && (
              <Typography fontSize={12} color="error" mt={0.5}>{errors.branchId}</Typography>
            )}
          </Box>

          <Box mb={3}>
            <Typography fontSize={13} mb={0.8}>{t("settings.office.rooms.form.capacity")}</Typography>
            <TextField
              fullWidth
              size="small"
              type="number"
              value={form.capacity}
              onChange={(e) => setForm((p) => ({ ...p, capacity: e.target.value }))}
              error={!!errors.capacity}
              helperText={errors.capacity}
              inputProps={{ min: 0 }}
              sx={{ "& .MuiOutlinedInput-root": { bgcolor: "var(--color-surface)" } }}
            />
          </Box>

          {saveError && (
            <Typography fontSize={13} color="error" mb={2}>{saveError}</Typography>
          )}

          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={isSaving}
            startIcon={isSaving ? <CircularProgress size={16} color="inherit" /> : undefined}
            sx={{
              bgcolor: "#5b7fa6",
              borderRadius: 5,
              px: 3,
              textTransform: "none",
              fontWeight: 600,
              fontSize: 15,
              "&:hover": { bgcolor: "#4a6d92" },
            }}
          >
            {t("settings.office.rooms.form.submit")}
          </Button>
        </Box>
      </Drawer>

      {/* Delete confirmation */}
      <Dialog
        open={!!deleteTarget}
        onClose={closeDeleteConfirm}
        PaperProps={{ sx: { borderRadius: "14px", width: 380 } }}
      >
        <DialogTitle sx={{ fontWeight: 600 }}>
          {t("settings.office.rooms.deleteConfirm.title")}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            {t("settings.office.rooms.deleteConfirm.message", { name: deleteTarget?.name ?? "" })}
          </DialogContentText>
          {deleteError && (
            <Typography fontSize={13} color="error" mt={1.5}>{deleteError}</Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button
            onClick={closeDeleteConfirm}
            variant="outlined"
            disabled={isDeleting}
            sx={{ textTransform: "none", borderRadius: "10px", paddingX: "18px" }}
          >
            {t("settings.office.rooms.form.cancel")}
          </Button>
          <Button
            onClick={confirmDelete}
            variant="contained"
            color="error"
            disabled={isDeleting}
            startIcon={isDeleting ? <CircularProgress size={16} color="inherit" /> : undefined}
            sx={{ textTransform: "none", borderRadius: "10px", paddingX: "18px", fontWeight: 600, boxShadow: "none" }}
          >
            {t("settings.office.rooms.delete")}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Archive confirmation */}
      <Dialog
        open={!!archiveTarget}
        onClose={closeArchiveConfirm}
        PaperProps={{ sx: { borderRadius: "14px", width: 380 } }}
      >
        <DialogTitle sx={{ fontWeight: 600 }}>
          {t("settings.office.rooms.archiveConfirm.title")}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            {t("settings.office.rooms.archiveConfirm.message", { name: archiveTarget?.name ?? "" })}
          </DialogContentText>
          {archiveError && (
            <Typography fontSize={13} color="error" mt={1.5}>{archiveError}</Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button
            onClick={closeArchiveConfirm}
            variant="outlined"
            disabled={isToggling}
            sx={{ textTransform: "none", borderRadius: "10px", paddingX: "18px" }}
          >
            {t("settings.office.rooms.form.cancel")}
          </Button>
          <Button
            onClick={confirmArchive}
            variant="contained"
            disabled={isToggling}
            startIcon={isToggling ? <CircularProgress size={16} color="inherit" /> : undefined}
            sx={{ textTransform: "none", borderRadius: "10px", paddingX: "18px", fontWeight: 600, boxShadow: "none", bgcolor: "#5c7fa3", "&:hover": { bgcolor: "#4a6a8a" } }}
          >
            {t("settings.office.rooms.archive")}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Restore confirmation */}
      <Dialog
        open={!!restoreTarget}
        onClose={closeRestoreConfirm}
        PaperProps={{ sx: { borderRadius: "14px", width: 380 } }}
      >
        <DialogTitle sx={{ fontWeight: 600 }}>
          {t("settings.office.rooms.restoreConfirm.title")}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            {t("settings.office.rooms.restoreConfirm.message", { name: restoreTarget?.name ?? "" })}
          </DialogContentText>
          {restoreError && (
            <Typography fontSize={13} color="error" mt={1.5}>{restoreError}</Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button
            onClick={closeRestoreConfirm}
            variant="outlined"
            disabled={isToggling}
            sx={{ textTransform: "none", borderRadius: "10px", paddingX: "18px" }}
          >
            {t("settings.office.rooms.form.cancel")}
          </Button>
          <Button
            onClick={confirmRestore}
            variant="contained"
            color="success"
            disabled={isToggling}
            startIcon={isToggling ? <CircularProgress size={16} color="inherit" /> : undefined}
            sx={{ textTransform: "none", borderRadius: "10px", paddingX: "18px", fontWeight: 600, boxShadow: "none" }}
          >
            {t("settings.office.rooms.restore")}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
