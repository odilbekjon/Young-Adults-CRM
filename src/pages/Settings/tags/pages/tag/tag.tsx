import { useState } from "react";
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
  MenuItem,
  Pagination,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";

import { RiDeleteBinLine } from "react-icons/ri";
import { FiEdit } from "react-icons/fi";
import { IoClose } from "react-icons/io5";
import { MdRefresh } from "react-icons/md";

import {
  useAllTagsQuery,
  useCreateTagMutation,
  useUpdateTagMutation,
  useDeleteTagMutation,
} from "../../../../../app/api/tagsApi/tagsApi";
import type { Tag as TagEntity, TagType } from "../../../../../app/api/tagsApi/types";
import type { RootState } from "../../../../../app/store";
import { useToast } from "../../../../../Context/ToastContext";
import { extractApiError } from "../../../../../utils";

const PAGE_SIZE = 10;

interface FormState {
  name: string;
  type: TagType;
}

const defaultForm: FormState = { name: "", type: "STUDENT" };

export const Tag = () => {
  const { t } = useTranslation();
  const toast = useToast();
  const selectedBranchId = useSelector((s: RootState) => s.branch.selectedBranchId);

  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState<TagType | "">("");

  const { data, isLoading, isError, refetch, isFetching } = useAllTagsQuery({
    page,
    limit: PAGE_SIZE,
    branchId: selectedBranchId ?? "all",
    type: typeFilter || undefined,
  });

  const [createTag, { isLoading: isCreating }] = useCreateTagMutation();
  const [updateTag, { isLoading: isUpdating }] = useUpdateTagMutation();
  const [deleteTag, { isLoading: isDeleting }] = useDeleteTagMutation();

  const tags = data?.data ?? [];
  const total = data?.meta?.total ?? tags.length;
  const totalPages = data?.meta?.totalPages ?? Math.max(1, Math.ceil(total / PAGE_SIZE));

  const [open, setOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<TagEntity | null>(null);
  const [form, setForm] = useState<FormState>(defaultForm);
  const [errors, setErrors] = useState<{ name?: string; type?: string }>({});
  const [saveError, setSaveError] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<TagEntity | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const typeLabel = (type: TagType) =>
    type === "STUDENT" ? t("settings.tags.tag.typeOptions.student") : t("settings.tags.tag.typeOptions.group");

  const openAddDrawer = () => {
    setEditingTag(null);
    setForm(defaultForm);
    setErrors({});
    setSaveError(null);
    setOpen(true);
  };

  const openEditDrawer = (tag: TagEntity) => {
    setEditingTag(tag);
    setForm({ name: tag.name, type: tag.type });
    setErrors({});
    setSaveError(null);
    setOpen(true);
  };

  const closeDrawer = () => setOpen(false);

  const validate = () => {
    const newErrors: { name?: string; type?: string } = {};
    if (!form.name.trim()) newErrors.name = t("settings.tags.tag.form.errors.name");
    if (!form.type) newErrors.type = t("settings.tags.tag.form.errors.type");
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaveError(null);
    try {
      if (editingTag) {
        await updateTag({ id: editingTag.id, name: form.name.trim(), type: form.type }).unwrap();
        toast.success(t("settings.tags.tag.toast.updated"));
      } else {
        await createTag({ name: form.name.trim(), type: form.type }).unwrap();
        toast.success(t("settings.tags.tag.toast.created"));
      }
      setOpen(false);
    } catch (err) {
      const detail = extractApiError(err);
      const generic = t("settings.tags.tag.form.errors.save");
      const message = detail ? `${generic}: ${detail}` : generic;
      setSaveError(message);
      toast.error(message);
    }
  };

  const openDeleteConfirm = (tag: TagEntity) => {
    setDeleteError(null);
    setDeleteTarget(tag);
  };

  const closeDeleteConfirm = () => {
    setDeleteTarget(null);
    setDeleteError(null);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteTag(deleteTarget.id).unwrap();
      setDeleteTarget(null);
      toast.success(t("settings.tags.tag.toast.deleted"));
    } catch (err) {
      const detail = extractApiError(err);
      const generic = t("settings.tags.tag.deleteConfirm.error");
      const message = detail ? `${generic}: ${detail}` : generic;
      setDeleteError(message);
      toast.error(message);
    }
  };

  return (
    <Box sx={{ width: "100%", p: 3 }}>
      {/* Header */}
      <Box className="flex items-center justify-between mb-3">
        <Box className="flex items-center gap-2">
          <h1 className="text-3xl">{t("settings.tags.tag.title")}</h1>
          <IconButton
            size="small"
            onClick={() => refetch()}
            disabled={isFetching}
            aria-label={t("settings.tags.tag.refresh")}
          >
            <MdRefresh size={18} className={isFetching ? "animate-spin" : ""} />
          </IconButton>
        </Box>

        <Box className="flex items-center gap-2">
          <Select
            size="small"
            displayEmpty
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value as TagType | "");
              setPage(1);
            }}
            sx={{ minWidth: 160, fontSize: 14, bgcolor: "#fff" }}
          >
            <MenuItem value="">{t("settings.tags.tag.typeOptions.all")}</MenuItem>
            <MenuItem value="STUDENT">{t("settings.tags.tag.typeOptions.student")}</MenuItem>
            <MenuItem value="GROUP">{t("settings.tags.tag.typeOptions.group")}</MenuItem>
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
            {t("settings.tags.tag.addNew")}
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
          sx={{
            borderRadius: "10px",
            boxShadow: "none",
            border: "1px solid #e5e5e5",
          }}
        >
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>{t("settings.tags.tag.table.name")}</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>{t("settings.tags.tag.table.type")}</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>{t("settings.tags.tag.table.createdBy")}</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>{t("settings.tags.tag.table.actions")}</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} align="center" sx={{ py: 6 }}>
                    <CircularProgress size={26} />
                  </TableCell>
                </TableRow>
              ) : isError ? (
                <TableRow>
                  <TableCell colSpan={4} align="center" sx={{ py: 6, color: "error.main" }}>
                    {t("settings.tags.tag.loadError")}
                  </TableCell>
                </TableRow>
              ) : tags.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} align="center" sx={{ py: 6, color: "#9ca3af" }}>
                    {t("settings.tags.tag.emptyState")}
                  </TableCell>
                </TableRow>
              ) : (
                tags.map((tag) => (
                  <TableRow key={tag.id}>
                    <TableCell>{tag.name}</TableCell>

                    <TableCell>
                      <Chip
                        label={typeLabel(tag.type)}
                        sx={{
                          backgroundColor: tag.type === "STUDENT" ? "#0B5AA2" : "#7c3aed",
                          color: "#fff",
                          fontWeight: 600,
                          borderRadius: "20px",
                          px: 1,
                        }}
                      />
                    </TableCell>

                    <TableCell>{tag.createdBy?.name ?? "—"}</TableCell>

                    <TableCell>
                      <IconButton onClick={() => openEditDrawer(tag)} aria-label={t("settings.tags.tag.edit")}>
                        <FiEdit size={20} color="#f4b400" />
                      </IconButton>

                      <IconButton onClick={() => openDeleteConfirm(tag)} aria-label={t("settings.tags.tag.delete")}>
                        <RiDeleteBinLine size={20} color="red" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
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

      {/* Drawer Modal */}
      <Drawer anchor="right" open={open} onClose={closeDrawer}>
        <Box sx={{ width: 400, height: "100%", backgroundColor: "#fff" }}>
          {/* Top */}
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
              {editingTag ? t("settings.tags.tag.drawer.editTitle") : t("settings.tags.tag.drawer.addTitle")}
            </h2>

            <IconButton onClick={closeDrawer}>
              <IoClose size={28} color="#888" />
            </IconButton>
          </Box>

          {/* Form */}
          <Box sx={{ p: 4, display: "flex", flexDirection: "column", gap: 3 }}>
            {/* Name */}
            <Box>
              <p className="mb-3 text-[18px] text-gray-600">{t("settings.tags.tag.form.name")}</p>
              <TextField
                fullWidth
                variant="outlined"
                placeholder={t("settings.tags.tag.form.namePlaceholder")}
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                error={!!errors.name}
                helperText={errors.name}
              />
            </Box>

            {/* Type select */}
            <Box>
              <p className="mb-3 text-[18px] text-gray-600">{t("settings.tags.tag.form.type")}</p>
              <Select
                fullWidth
                value={form.type}
                onChange={(e) => setForm((p) => ({ ...p, type: e.target.value as TagType }))}
                error={!!errors.type}
              >
                <MenuItem value="STUDENT">{t("settings.tags.tag.typeOptions.student")}</MenuItem>
                <MenuItem value="GROUP">{t("settings.tags.tag.typeOptions.group")}</MenuItem>
              </Select>
              {errors.type && (
                <Typography fontSize={12} color="error" mt={0.5}>
                  {errors.type}
                </Typography>
              )}
            </Box>

            {saveError && (
              <Typography fontSize={13} color="error">
                {saveError}
              </Typography>
            )}

            {/* Button */}
            <Button
              variant="contained"
              onClick={handleSave}
              disabled={isCreating || isUpdating}
              startIcon={isCreating || isUpdating ? <CircularProgress size={16} color="inherit" /> : undefined}
              sx={{
                width: "140px",
                py: 1.5,
                textTransform: "none",
                borderRadius: "8px",
              }}
            >
              {t("settings.tags.tag.form.save")}
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
        <DialogTitle sx={{ fontWeight: 600 }}>{t("settings.tags.tag.deleteConfirm.title")}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {t("settings.tags.tag.deleteConfirm.message", { name: deleteTarget?.name ?? "" })}
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
            {t("settings.tags.tag.form.cancel")}
          </Button>
          <Button
            onClick={confirmDelete}
            variant="contained"
            color="error"
            disabled={isDeleting}
            startIcon={isDeleting ? <CircularProgress size={16} color="inherit" /> : undefined}
            sx={{ textTransform: "none", borderRadius: "10px", paddingX: "18px", fontWeight: 600, boxShadow: "none" }}
          >
            {t("settings.tags.tag.delete")}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
