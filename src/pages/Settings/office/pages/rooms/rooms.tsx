import { useState } from "react";
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
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from "@mui/material";
import { MdClose, MdOutlineEdit, MdDeleteOutline, MdRefresh } from "react-icons/md";
import {
  useAllRoomsQuery,
  useCreateRoomMutation,
  useUpdateRoomMutation,
  useDeleteRoomMutation,
} from "../../../../../app/api/roomsApi/roomsApi";
import type { Room } from "../../../../../app/api/roomsApi/types";
import { useAllBranchesQuery } from "../../../../../app/api/branchesApi/branchesApi";
import { useBranch } from "../../../../../Context/BranchContext";
import { useToast } from "../../../../../Context/ToastContext";

interface FormState {
  name: string;
  capacity: string;
  branchId: string;
}

const defaultForm: FormState = { name: "", capacity: "", branchId: "" };

export const Rooms = () => {
  const { t } = useTranslation();
  const toast = useToast();

  const { branch: selectedBranch } = useBranch();

  const { data, isLoading, isError, refetch, isFetching } = useAllRoomsQuery();
  const { data: branchesData } = useAllBranchesQuery();
  const [createRoom, { isLoading: isCreating }] = useCreateRoomMutation();
  const [updateRoom, { isLoading: isUpdating }] = useUpdateRoomMutation();
  const [deleteRoom, { isLoading: isDeleting }] = useDeleteRoomMutation();

  const rooms = (data?.data ?? [])
    .filter((r) => r.status === "ACTIVE")
    .filter((r) => selectedBranch === "all" || r.branch?.name === selectedBranch);
  const activeBranches = (branchesData?.data ?? []).filter((b) => b.status === "ACTIVE");

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [form, setForm] = useState<FormState>(defaultForm);
  const [errors, setErrors] = useState<{ [k: string]: string }>({});
  const [saveError, setSaveError] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<Room | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const openAddDrawer = () => {
    setEditingRoom(null);
    setForm(defaultForm);
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
    <Box sx={{ p: 3, bgcolor: "#f5f5f5", minHeight: "100vh" }}>
      {/* Header */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
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
              <TableRow sx={{ bgcolor: "#fafafa" }}>
                <TableCell sx={{ fontWeight: 600, fontSize: 13, color: "#333", width: "15%" }}>{t("settings.office.rooms.table.id")}</TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: 13, color: "#333", width: "25%" }}>{t("settings.office.rooms.table.name")}</TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: 13, color: "#333", width: "25%" }}>{t("settings.office.rooms.table.branch")}</TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: 13, color: "#333", width: "20%" }}>{t("settings.office.rooms.table.capacity")}</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600, fontSize: 13, color: "#333", width: "15%" }}>{t("settings.office.rooms.table.actions")}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rooms.map((room) => (
                <TableRow key={room.id} sx={{ "&:hover": { bgcolor: "#fafafa" } }}>
                  <TableCell sx={{ fontSize: 12, color: "#555" }}>{room.id.slice(0, 8)}</TableCell>
                  <TableCell sx={{ fontSize: 14 }}>{room.name}</TableCell>
                  <TableCell sx={{ fontSize: 13, color: "#555" }}>{room.branch?.name ?? ""}</TableCell>
                  <TableCell sx={{ fontSize: 13, color: "#555" }}>{room.capacity}</TableCell>
                  <TableCell align="right">
                    <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 0.5 }}>
                      <IconButton
                        size="small"
                        onClick={() => openEditDrawer(room)}
                        sx={{ color: "#555" }}
                        aria-label={t("settings.office.rooms.edit")}
                      >
                        <MdOutlineEdit size={18} />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => openDeleteConfirm(room)}
                        sx={{ color: "#e53935" }}
                        aria-label={t("settings.office.rooms.delete")}
                      >
                        <MdDeleteOutline size={18} />
                      </IconButton>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}

              {rooms.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} sx={{ textAlign: "center", color: "#9ca3af", fontSize: 13, py: 4 }}>
                    {t("settings.office.rooms.emptyState")}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Drawer */}
      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={closeDrawer}
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
              sx={{ "& .MuiOutlinedInput-root": { bgcolor: "#fff" } }}
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
              sx={{ bgcolor: "#fff" }}
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
              sx={{ "& .MuiOutlinedInput-root": { bgcolor: "#fff" } }}
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
    </Box>
  );
};
