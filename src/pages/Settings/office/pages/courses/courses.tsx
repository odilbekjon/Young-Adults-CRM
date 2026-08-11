import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Box,
  Typography,
  Button,
  Drawer,
  TextField,
  Select,
  MenuItem,
  IconButton,
  Divider,
  Paper,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from "@mui/material";
import { MdClose, MdOutlineEdit, MdDeleteOutline, MdRefresh } from "react-icons/md";
import { useNavigate } from "react-router-dom";
import {
  useAllCoursesQuery,
  useCreateCourseMutation,
  useUpdateCourseMutation,
  useDeleteCourseMutation,
} from "../../../../../app/api/coursesApi/coursesApi";
import type { Course } from "../../../../../app/api/coursesApi/types";
import { useAllBranchesQuery } from "../../../../../app/api/branchesApi/branchesApi";
import { useBranch } from "../../../../../Context/BranchContext";
import { CARD_COLORS } from "../../../../../constants/CardColors";

export const BookIllustration = () => (
  <svg viewBox="0 0 160 100" width="100%" height="100%" style={{ position: "absolute", bottom: 0, left: 0 }}>
    <rect x="28" y="55" width="52" height="10" rx="2" fill="#fff" opacity="0.9" />
    <rect x="30" y="46" width="48" height="10" rx="2" fill="#e91e63" opacity="0.85" />
    <rect x="26" y="38" width="54" height="10" rx="2" fill="#fff" opacity="0.9" />
    <rect x="32" y="30" width="44" height="9" rx="2" fill="#1565c0" opacity="0.85" />
    <rect x="70" y="20" width="7" height="50" rx="2" fill="#ffb300" opacity="0.9" transform="rotate(-10 74 45)" />
    <polygon points="70,68 77,68 73.5,78" fill="#ff7043" opacity="0.9" transform="rotate(-10 74 45)" />
    <ellipse cx="105" cy="55" rx="18" ry="28" fill="#fff" opacity="0.15" transform="rotate(-15 105 55)" />
    <ellipse cx="118" cy="48" rx="14" ry="22" fill="#fff" opacity="0.12" transform="rotate(10 118 48)" />
    <rect x="18" y="60" width="38" height="28" rx="3" fill="#ffb300" opacity="0.85" />
    <rect x="18" y="55" width="20" height="8" rx="2" fill="#ffa000" opacity="0.85" />
  </svg>
);

interface FormState {
  name: string;
  branchId: string;
  price: string;
}

const defaultForm: FormState = { name: "", branchId: "", price: "" };

export const Courses = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { branch: selectedBranch } = useBranch();

  const { data, isLoading, isError, refetch, isFetching } = useAllCoursesQuery();
  const { data: branchesData } = useAllBranchesQuery();
  const [createCourse, { isLoading: isCreating }] = useCreateCourseMutation();
  const [updateCourse, { isLoading: isUpdating }] = useUpdateCourseMutation();
  const [deleteCourse, { isLoading: isDeleting }] = useDeleteCourseMutation();

  const courses = (data?.data ?? [])
    .filter((c) => c.status === "ACTIVE")
    .filter((c) => selectedBranch === "all" || c.branch?.name === selectedBranch);
  const activeBranches = (branchesData?.data ?? []).filter((b) => b.status === "ACTIVE");

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [form, setForm] = useState<FormState>(defaultForm);
  const [errors, setErrors] = useState<{ [k: string]: string }>({});
  const [saveError, setSaveError] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<Course | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const openAddDrawer = () => {
    setEditingCourse(null);
    setForm(defaultForm);
    setErrors({});
    setSaveError(null);
    setDrawerOpen(true);
  };

  const openEditDrawer = (course: Course) => {
    setEditingCourse(course);
    setForm({
      name: course.name,
      branchId: course.branchId,
      price: String(course.price?.d?.[0] ?? ""),
    });
    setErrors({});
    setSaveError(null);
    setDrawerOpen(true);
  };

  const closeDrawer = () => setDrawerOpen(false);

  const openDeleteConfirm = (course: Course) => {
    setDeleteError(null);
    setDeleteTarget(course);
  };

  const closeDeleteConfirm = () => {
    setDeleteTarget(null);
    setDeleteError(null);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteCourse(deleteTarget.id).unwrap();
      setDeleteTarget(null);
    } catch {
      setDeleteError(t("settings.office.courses.deleteConfirm.error"));
    }
  };

  const validate = () => {
    const newErrors: { [k: string]: string } = {};
    if (!form.name.trim()) newErrors.name = t("settings.office.courses.form.errors.name");
    if (!form.branchId) newErrors.branchId = t("settings.office.courses.form.errors.branch");
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaveError(null);
    const price = form.price.trim() ? parseInt(form.price, 10) : undefined;

    try {
      if (editingCourse) {
        await updateCourse({ id: editingCourse.id, name: form.name, branchId: form.branchId, price }).unwrap();
      } else {
        await createCourse({ name: form.name, branchId: form.branchId, price }).unwrap();
      }
      setDrawerOpen(false);
    } catch {
      setSaveError(t("settings.office.courses.form.errors.save"));
    }
  };

  const fmt = (n: number) =>
    n.toLocaleString("ru-RU").replace(/,/g, " ") + " " + t("settings.office.courses.currency");

  return (
    <Box sx={{ p: 3, bgcolor: "#f5f5f5", minHeight: "100vh" }}>
      {/* Header */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Typography variant="h5" fontWeight={400}>
            {t("settings.office.courses.title")}
          </Typography>
          <IconButton
            size="small"
            onClick={() => refetch()}
            disabled={isFetching}
            aria-label={t("settings.office.courses.refresh")}
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
          {t("settings.office.courses.addNew")}
        </Button>
      </Box>

      <Divider sx={{ mb: 3 }} />

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
            {t("settings.office.courses.loadError")}
          </Typography>
        </Box>
      )}

      {/* Course grid */}
      {!isLoading && !isError && (
        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 2 }}>
          {courses.map((course, i) => (
            <Paper
              key={course.id}
              elevation={1}
              onClick={() => navigate(`/courses/${course.id}`)}
              sx={{
                borderRadius: 2,
                overflow: "hidden",
                cursor: "pointer",
                transition: "transform 0.15s, box-shadow 0.15s",
                "&:hover": { transform: "translateY(-3px)", boxShadow: 4 },
              }}
            >
              <Box
                sx={{
                  bgcolor: CARD_COLORS[i % CARD_COLORS.length],
                  height: 180,
                  position: "relative",
                  overflow: "hidden",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Box sx={{ position: "absolute", top: 8, right: 8, display: "flex", gap: 0.5, zIndex: 2 }}>
                  <IconButton
                    size="small"
                    onClick={(e) => { e.stopPropagation(); openEditDrawer(course); }}
                    aria-label={t("settings.office.courses.edit")}
                    sx={{ bgcolor: "rgba(255,255,255,0.85)", "&:hover": { bgcolor: "#fff" }, width: 28, height: 28 }}
                  >
                    <MdOutlineEdit size={14} />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={(e) => { e.stopPropagation(); openDeleteConfirm(course); }}
                    aria-label={t("settings.office.courses.delete")}
                    sx={{ bgcolor: "rgba(255,255,255,0.85)", color: "#e53935", "&:hover": { bgcolor: "#fff" }, width: 28, height: 28 }}
                  >
                    <MdDeleteOutline size={14} />
                  </IconButton>
                </Box>
                <Typography
                  fontWeight={700}
                  fontSize={16}
                  color="#fff"
                  textAlign="center"
                  sx={{ position: "relative", zIndex: 1, px: 2, textShadow: "0 1px 3px rgba(0,0,0,0.2)" }}
                >
                  {course.name}
                </Typography>
                <BookIllustration />
              </Box>
              <Box sx={{ p: 2 }}>
                <Typography fontWeight={500} fontSize={15} mb={1}>{course.name}</Typography>
                <Typography fontSize={13} color="#888">{fmt(course.price?.d?.[0] ?? 0)}</Typography>
                {course.branch?.name && (
                  <Typography fontSize={12} color="#aaa" mt={0.5}>{course.branch.name}</Typography>
                )}
              </Box>
            </Paper>
          ))}

          {courses.length === 0 && (
            <Box sx={{ gridColumn: "1 / -1", textAlign: "center", color: "#9ca3af", fontSize: 13, py: 6 }}>
              {t("settings.office.courses.emptyState")}
            </Box>
          )}
        </Box>
      )}

      {/* Add/Edit Drawer */}
      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={closeDrawer}
        PaperProps={{ sx: { width: 400, p: 0 } }}
      >
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", px: 3, py: 2.5 }}>
          <Typography fontWeight={600} fontSize={17}>
            {editingCourse
              ? t("settings.office.courses.form.editItem")
              : t("settings.office.courses.form.addNewItem")}
          </Typography>
          <IconButton size="small" onClick={closeDrawer}>
            <MdClose size={20} />
          </IconButton>
        </Box>
        <Divider />

        <Box sx={{ px: 3, py: 2.5, overflowY: "auto" }}>
          <Box mb={2}>
            <Typography fontSize={13} mb={0.5}>{t("settings.office.courses.form.name")}</Typography>
            <TextField
              fullWidth
              size="small"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              error={!!errors.name}
              helperText={errors.name}
            />
          </Box>

          <Box mb={2}>
            <Typography fontSize={13} mb={0.5}>{t("settings.office.courses.form.branch")}</Typography>
            <Select
              fullWidth
              size="small"
              displayEmpty
              value={form.branchId}
              onChange={(e) => setForm((p) => ({ ...p, branchId: e.target.value }))}
              error={!!errors.branchId}
            >
              <MenuItem value="" disabled>
                {t("settings.office.courses.form.branchPlaceholder")}
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
            <Typography fontSize={13} mb={0.5}>{t("settings.office.courses.form.price")}</Typography>
            <TextField fullWidth size="small" type="number" value={form.price}
              onChange={(e) => setForm((p) => ({ ...p, price: e.target.value }))}
              inputProps={{ min: 0 }} />
          </Box>

          {saveError && (
            <Typography fontSize={13} color="error" mb={2}>{saveError}</Typography>
          )}

          <Button
            variant="contained"
            onClick={handleSave}
            disabled={isCreating || isUpdating}
            startIcon={(isCreating || isUpdating) ? <CircularProgress size={16} color="inherit" /> : undefined}
            sx={{ bgcolor: "#1a3f6f", borderRadius: 5, px: 3, textTransform: "none", fontWeight: 600, fontSize: 15, "&:hover": { bgcolor: "#15345c" } }}>
            {t("settings.office.courses.form.save")}
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
          {t("settings.office.courses.deleteConfirm.title")}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            {t("settings.office.courses.deleteConfirm.message", { name: deleteTarget?.name ?? "" })}
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
            {t("settings.office.courses.form.cancel")}
          </Button>
          <Button
            onClick={confirmDelete}
            variant="contained"
            color="error"
            disabled={isDeleting}
            startIcon={isDeleting ? <CircularProgress size={16} color="inherit" /> : undefined}
            sx={{ textTransform: "none", borderRadius: "10px", paddingX: "18px", fontWeight: 600, boxShadow: "none" }}
          >
            {t("settings.office.courses.delete")}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
