import { useState } from "react";
import { useSelector } from "react-redux";
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
import { MdClose, MdOutlineEdit, MdDeleteOutline, MdRefresh, MdArchive, MdUnarchive } from "react-icons/md";
import { useNavigate } from "react-router-dom";
import {
  useAllCoursesQuery,
  useCreateCourseMutation,
  useUpdateCourseMutation,
  useToggleCourseStatusMutation,
  useDeleteCourseMutation,
} from "../../../../../app/api/coursesApi/coursesApi";
import type { Course } from "../../../../../app/api/coursesApi/types";
import { useAllBranchesQuery } from "../../../../../app/api/branchesApi/branchesApi";
import { useBranch } from "../../../../../Context/BranchContext";
import { useToast } from "../../../../../Context/ToastContext";
import type { RootState } from "../../../../../app/store";
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
  const toast = useToast();
  const { branch: selectedBranch } = useBranch();
  const selectedBranchId = useSelector((s: RootState) => s.branch.selectedBranchId);

  const { data, isLoading, isError, refetch, isFetching } = useAllCoursesQuery();
  const { data: branchesData } = useAllBranchesQuery();
  const [createCourse, { isLoading: isCreating }] = useCreateCourseMutation();
  const [updateCourse, { isLoading: isUpdating }] = useUpdateCourseMutation();
  const [toggleCourseStatus, { isLoading: isToggling }] = useToggleCourseStatusMutation();
  const [deleteCourse, { isLoading: isDeleting }] = useDeleteCourseMutation();

  const [tab, setTab] = useState<"faol" | "arxiv">("faol");

  const courses = (data?.data ?? [])
    .filter((c) => (tab === "faol" ? c.status === "ACTIVE" : c.status !== "ACTIVE"))
    .filter((c) => selectedBranch === "all" || c.branch?.name === selectedBranch);
  const activeBranches = (branchesData?.data ?? []).filter((b) => b.status === "ACTIVE");

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [form, setForm] = useState<FormState>(defaultForm);
  const [errors, setErrors] = useState<{ [k: string]: string }>({});
  const [saveError, setSaveError] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<Course | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<Course | null>(null);
  const [archiveError, setArchiveError] = useState<string | null>(null);
  const [restoreTarget, setRestoreTarget] = useState<Course | null>(null);
  const [restoreError, setRestoreError] = useState<string | null>(null);

  const openAddDrawer = () => {
    setEditingCourse(null);
    // Pre-fill with whichever branch is active in the header, same as every
    // other create form — still editable, just no longer defaulting to blank.
    setForm({ ...defaultForm, branchId: selectedBranchId ?? "" });
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

  // Permanent delete — reserved for an already-archived (INACTIVE) course;
  // the backend itself rejects it (409) while the course still has groups.
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteCourse(deleteTarget.id).unwrap();
      setDeleteTarget(null);
      toast.success(t("settings.office.courses.toast.deleted"));
    } catch {
      setDeleteError(t("settings.office.courses.deleteConfirm.error"));
      toast.error(t("settings.office.courses.deleteConfirm.error"));
    }
  };

  const openArchiveConfirm = (course: Course) => {
    setArchiveError(null);
    setArchiveTarget(course);
  };

  const closeArchiveConfirm = () => {
    setArchiveTarget(null);
    setArchiveError(null);
  };

  const confirmArchive = async () => {
    if (!archiveTarget) return;
    try {
      await toggleCourseStatus(archiveTarget.id).unwrap();
      setArchiveTarget(null);
      toast.success(t("settings.office.courses.toast.archived"));
    } catch {
      setArchiveError(t("settings.office.courses.archiveConfirm.error"));
      toast.error(t("settings.office.courses.archiveConfirm.error"));
    }
  };

  const openRestoreConfirm = (course: Course) => {
    setRestoreError(null);
    setRestoreTarget(course);
  };

  const closeRestoreConfirm = () => {
    setRestoreTarget(null);
    setRestoreError(null);
  };

  const confirmRestore = async () => {
    if (!restoreTarget) return;
    try {
      await toggleCourseStatus(restoreTarget.id).unwrap();
      setRestoreTarget(null);
      toast.success(t("settings.office.courses.toast.restored"));
    } catch {
      setRestoreError(t("settings.office.courses.restoreConfirm.error"));
      toast.error(t("settings.office.courses.restoreConfirm.error"));
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
        toast.success(t("settings.office.courses.toast.updated"));
      } else {
        await createCourse({ name: form.name, branchId: form.branchId, price }).unwrap();
        toast.success(t("settings.office.courses.toast.created"));
      }
      setDrawerOpen(false);
    } catch {
      setSaveError(t("settings.office.courses.form.errors.save"));
      toast.error(t("settings.office.courses.form.errors.save"));
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

      <Divider sx={{ mb: 2 }} />

      {/* Tabs */}
      <Box sx={{ display: "inline-flex", borderRadius: "10px", bgcolor: "#eef2f6", p: 0.5, mb: 2 }}>
        <Box
          component="button"
          type="button"
          onClick={() => setTab("faol")}
          sx={{
            border: "none", cursor: "pointer", borderRadius: "8px", px: 2, py: 0.7, fontSize: 13, fontWeight: 600,
            bgcolor: tab === "faol" ? "#fff" : "transparent",
            color: tab === "faol" ? "#1a3f6f" : "#667085",
            boxShadow: tab === "faol" ? "0 1px 2px rgba(0,0,0,0.08)" : "none",
          }}
        >
          {t("settings.office.courses.tabs.active")}
        </Box>
        <Box
          component="button"
          type="button"
          onClick={() => setTab("arxiv")}
          sx={{
            border: "none", cursor: "pointer", borderRadius: "8px", px: 2, py: 0.7, fontSize: 13, fontWeight: 600,
            bgcolor: tab === "arxiv" ? "#fff" : "transparent",
            color: tab === "arxiv" ? "#1a3f6f" : "#667085",
            boxShadow: tab === "arxiv" ? "0 1px 2px rgba(0,0,0,0.08)" : "none",
          }}
        >
          {t("settings.office.courses.tabs.archived")}
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
                  {tab === "faol" ? (
                    <IconButton
                      size="small"
                      onClick={(e) => { e.stopPropagation(); openArchiveConfirm(course); }}
                      aria-label={t("settings.office.courses.archive")}
                      title={t("settings.office.courses.archive")}
                      sx={{ bgcolor: "rgba(255,255,255,0.85)", color: "#b98900", "&:hover": { bgcolor: "#fff" }, width: 28, height: 28 }}
                    >
                      <MdArchive size={14} />
                    </IconButton>
                  ) : (
                    <>
                      <IconButton
                        size="small"
                        onClick={(e) => { e.stopPropagation(); openRestoreConfirm(course); }}
                        aria-label={t("settings.office.courses.restore")}
                        title={t("settings.office.courses.restore")}
                        sx={{ bgcolor: "rgba(255,255,255,0.85)", color: "#2e7d32", "&:hover": { bgcolor: "#fff" }, width: 28, height: 28 }}
                      >
                        <MdUnarchive size={14} />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={(e) => { e.stopPropagation(); openDeleteConfirm(course); }}
                        aria-label={t("settings.office.courses.delete")}
                        title={t("settings.office.courses.delete")}
                        sx={{ bgcolor: "rgba(255,255,255,0.85)", color: "#e53935", "&:hover": { bgcolor: "#fff" }, width: 28, height: 28 }}
                      >
                        <MdDeleteOutline size={14} />
                      </IconButton>
                    </>
                  )}
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
              {tab === "faol" ? t("settings.office.courses.emptyState") : t("settings.office.courses.emptyArchived")}
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

      {/* Archive confirmation */}
      <Dialog
        open={!!archiveTarget}
        onClose={closeArchiveConfirm}
        PaperProps={{ sx: { borderRadius: "14px", width: 380 } }}
      >
        <DialogTitle sx={{ fontWeight: 600 }}>
          {t("settings.office.courses.archiveConfirm.title")}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            {t("settings.office.courses.archiveConfirm.message", { name: archiveTarget?.name ?? "" })}
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
            {t("settings.office.courses.form.cancel")}
          </Button>
          <Button
            onClick={confirmArchive}
            variant="contained"
            disabled={isToggling}
            startIcon={isToggling ? <CircularProgress size={16} color="inherit" /> : undefined}
            sx={{ textTransform: "none", borderRadius: "10px", paddingX: "18px", fontWeight: 600, boxShadow: "none", bgcolor: "#5c7fa3", "&:hover": { bgcolor: "#4a6a8a" } }}
          >
            {t("settings.office.courses.archive")}
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
          {t("settings.office.courses.restoreConfirm.title")}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            {t("settings.office.courses.restoreConfirm.message", { name: restoreTarget?.name ?? "" })}
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
            {t("settings.office.courses.form.cancel")}
          </Button>
          <Button
            onClick={confirmRestore}
            variant="contained"
            color="success"
            disabled={isToggling}
            startIcon={isToggling ? <CircularProgress size={16} color="inherit" /> : undefined}
            sx={{ textTransform: "none", borderRadius: "10px", paddingX: "18px", fontWeight: 600, boxShadow: "none" }}
          >
            {t("settings.office.courses.restore")}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
