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
  Checkbox,
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
  useBulkToggleCourseStatusMutation,
  useBulkDeleteCoursesMutation,
} from "../../../../../app/api/coursesApi/coursesApi";
import type { Course } from "../../../../../app/api/coursesApi/types";
import { useAllBranchesQuery } from "../../../../../app/api/branchesApi/branchesApi";
import { useToast } from "../../../../../Context/ToastContext";
import type { RootState } from "../../../../../app/store";
import { CARD_COLORS } from "../../../../../constants/CardColors";
import { decimalToNumber, extractApiError, submitOnEnter } from "../../../../../utils";

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
  months: string;
  description: string;
  code: string;
  lessonDuration: string;
  lessonsPerMonth: string;
}

const defaultForm: FormState = {
  name: "", branchId: "", price: "", months: "", description: "",
  code: "", lessonDuration: "", lessonsPerMonth: "",
};

const LESSON_DURATION_OPTIONS = [45, 60, 90, 120, 150];

type BulkAction = "archive" | "restore" | "delete";

export const Courses = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const toast = useToast();
  const selectedBranchId = useSelector((s: RootState) => s.branch.selectedBranchId);

  const { data, isLoading, isError, refetch, isFetching } = useAllCoursesQuery();
  const { data: branchesData } = useAllBranchesQuery();
  const [createCourse, { isLoading: isCreating }] = useCreateCourseMutation();
  const [updateCourse, { isLoading: isUpdating }] = useUpdateCourseMutation();
  const [toggleCourseStatus, { isLoading: isToggling }] = useToggleCourseStatusMutation();
  const [deleteCourse, { isLoading: isDeleting }] = useDeleteCourseMutation();
  const [bulkToggleStatus, { isLoading: isBulkToggling }] = useBulkToggleCourseStatusMutation();
  const [bulkDelete, { isLoading: isBulkDeleting }] = useBulkDeleteCoursesMutation();

  const [tab, setTab] = useState<"faol" | "arxiv">("faol");

  // An archived course keeps its name taken in its branch (the backend still
  // answers "already exists" when it is re-created), so the archive has to stay
  // reachable from here to restore or delete it.
  // Courses are shared by every branch — the header's branch never narrows them.
  const allCourses = data?.data ?? [];
  const courses = allCourses.filter((c) => (tab === "faol" ? c.status === "ACTIVE" : c.status !== "ACTIVE"));
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

  // Checkbox selection for the bulk actions: the ids stay selected only while
  // their course is still in the current tab's list.
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkAction, setBulkAction] = useState<BulkAction>("archive");
  const [bulkReason, setBulkReason] = useState("");
  const [bulkError, setBulkError] = useState<string | null>(null);
  const selected = selectedIds.filter((id) => courses.some((c) => c.id === id));
  const allSelected = courses.length > 0 && selected.length === courses.length;
  const isBulkBusy = isBulkToggling || isBulkDeleting;

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
      price: String(decimalToNumber(course.price) ?? ""),
      months: course.months !== undefined && course.months !== null ? String(course.months) : "",
      description: course.description ?? "",
      code: course.code ?? "",
      lessonDuration: course.lessonDuration !== undefined && course.lessonDuration !== null ? String(course.lessonDuration) : "",
      lessonsPerMonth: course.lessonsPerMonth !== undefined && course.lessonsPerMonth !== null ? String(course.lessonsPerMonth) : "",
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
    } catch (err) {
      const detail = extractApiError(err);
      const generic = t("settings.office.courses.deleteConfirm.error");
      const message = detail ? `${generic}: ${detail}` : generic;
      setDeleteError(message);
      toast.error(message);
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
    } catch (err) {
      const detail = extractApiError(err);
      const generic = t("settings.office.courses.archiveConfirm.error");
      const message = detail ? `${generic}: ${detail}` : generic;
      setArchiveError(message);
      toast.error(message);
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
    } catch (err) {
      const detail = extractApiError(err);
      const generic = t("settings.office.courses.restoreConfirm.error");
      const message = detail ? `${generic}: ${detail}` : generic;
      setRestoreError(message);
      toast.error(message);
    }
  };

  const toggleSelected = (id: string) =>
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const toggleSelectAll = () => setSelectedIds(allSelected ? [] : courses.map((c) => c.id));

  const switchTab = (next: "faol" | "arxiv") => {
    setTab(next);
    setSelectedIds([]);
  };

  const openBulkConfirm = (action: BulkAction) => {
    setBulkError(null);
    setBulkReason("");
    setBulkAction(action);
    setBulkOpen(true);
  };

  const closeBulkConfirm = () => {
    if (isBulkBusy) return;
    setBulkOpen(false);
  };

  // One request for the whole selection (bulk-toggle-status archives/restores,
  // bulk-delete removes for good). A failure keeps the selection for a retry.
  const confirmBulk = async () => {
    if (selected.length === 0) return;
    try {
      if (bulkAction === "delete") {
        await bulkDelete({ ids: selected }).unwrap();
      } else {
        await bulkToggleStatus({
          ids: selected,
          status: bulkAction === "archive" ? "INACTIVE" : "ACTIVE",
          reason: bulkAction === "archive" ? bulkReason.trim() || undefined : undefined,
        }).unwrap();
      }
      toast.success(t(`settings.office.courses.bulk.${bulkAction}.toast`));
      setSelectedIds([]);
      setBulkOpen(false);
    } catch (err) {
      const detail = extractApiError(err);
      const generic = t(`settings.office.courses.bulk.${bulkAction}.error`);
      const message = detail ? `${generic}: ${detail}` : generic;
      setBulkError(message);
      toast.error(message);
    }
  };

  // The same name in the same branch is refused by the backend even when the
  // earlier course is archived (and so not on the Active tab) — say that up
  // front instead of surfacing a bare "already exists".
  const hasArchivedTwin = () => {
    const name = form.name.trim().toLowerCase();
    return allCourses.some(
      (c) => c.status !== "ACTIVE" && c.id !== editingCourse?.id && c.branchId === form.branchId && c.name.trim().toLowerCase() === name,
    );
  };

  const validate = () => {
    const newErrors: { [k: string]: string } = {};
    if (!form.name.trim()) newErrors.name = t("settings.office.courses.form.errors.name");
    else if (hasArchivedTwin()) newErrors.name = t("settings.office.courses.form.errors.archivedDuplicate");
    if (!form.branchId) newErrors.branchId = t("settings.office.courses.form.errors.branch");
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaveError(null);
    const price = form.price.trim() ? parseInt(form.price, 10) : undefined;
    const months = form.months.trim() ? parseInt(form.months, 10) : undefined;
    const description = form.description.trim() || undefined;
    const code = form.code.trim() || undefined;
    const lessonDuration = form.lessonDuration.trim() ? parseInt(form.lessonDuration, 10) : undefined;
    const lessonsPerMonth = form.lessonsPerMonth.trim() ? parseInt(form.lessonsPerMonth, 10) : undefined;

    try {
      if (editingCourse) {
        await updateCourse({
          id: editingCourse.id, name: form.name, branchId: form.branchId, price,
          months, description, code, lessonDuration, lessonsPerMonth,
        }).unwrap();
        toast.success(t("settings.office.courses.toast.updated"));
      } else {
        await createCourse({
          name: form.name, branchId: form.branchId, price,
          months, description, code, lessonDuration, lessonsPerMonth,
        }).unwrap();
        toast.success(t("settings.office.courses.toast.created"));
      }
      setDrawerOpen(false);
    } catch (err) {
      const detail = extractApiError(err);
      const generic = t("settings.office.courses.form.errors.save");
      const message = detail ? `${generic}: ${detail}` : generic;
      setSaveError(message);
      toast.error(message);
    }
  };

  const fmt = (n: number) =>
    n.toLocaleString("ru-RU").replace(/,/g, " ") + " " + t("settings.office.courses.currency");

  return (
    <Box sx={{ p: 3, bgcolor: "var(--color-surface-alt)", minHeight: "100vh" }}>
      {/* Header */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 1, mb: 1 }}>
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
      <Box sx={{ display: "inline-flex", borderRadius: "10px", bgcolor: "var(--color-surface-alt)", p: 0.5, mb: 2 }}>
        {(["faol", "arxiv"] as const).map((key) => (
          <Box
            key={key}
            component="button"
            type="button"
            onClick={() => switchTab(key)}
            sx={{
              border: "none", cursor: "pointer", borderRadius: "8px", px: 2, py: 0.7, fontSize: 13, fontWeight: 600,
              bgcolor: tab === key ? "var(--color-surface)" : "transparent",
              color: tab === key ? "#1a3f6f" : "var(--color-text-secondary)",
              boxShadow: tab === key ? "0 1px 2px rgba(0,0,0,0.08)" : "none",
            }}
          >
            {t(key === "faol" ? "settings.office.courses.tabs.active" : "settings.office.courses.tabs.archived")}
          </Box>
        ))}
      </Box>

      {/* Bulk actions */}
      {!isLoading && !isError && courses.length > 0 && (
        <Box sx={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 1.5, mb: 2 }}>
          <Box component="label" sx={{ display: "flex", alignItems: "center", gap: 0.5, cursor: "pointer", fontSize: 13 }}>
            <Checkbox
              size="small"
              checked={allSelected}
              indeterminate={selected.length > 0 && !allSelected}
              onChange={toggleSelectAll}
              sx={{ p: 0.5 }}
            />
            {t("settings.office.courses.bulk.selectAll")}
          </Box>
          {selected.length > 0 && (
            <>
              <Typography fontSize={13} color="var(--color-text-muted)">
                {t("settings.office.courses.bulk.selected", { count: selected.length })}
              </Typography>
              {tab === "faol" ? (
                <Button
                  size="small" variant="outlined" startIcon={<MdArchive size={16} />}
                  onClick={() => openBulkConfirm("archive")}
                  sx={{ textTransform: "none", borderRadius: "10px", color: "#b98900", borderColor: "#b98900" }}
                >
                  {t("settings.office.courses.bulk.archive.action")}
                </Button>
              ) : (
                <>
                  <Button
                    size="small" variant="outlined" startIcon={<MdUnarchive size={16} />}
                    onClick={() => openBulkConfirm("restore")}
                    sx={{ textTransform: "none", borderRadius: "10px", color: "#2e7d32", borderColor: "#2e7d32" }}
                  >
                    {t("settings.office.courses.bulk.restore.action")}
                  </Button>
                  <Button
                    size="small" variant="outlined" color="error" startIcon={<MdDeleteOutline size={16} />}
                    onClick={() => openBulkConfirm("delete")}
                    sx={{ textTransform: "none", borderRadius: "10px" }}
                  >
                    {t("settings.office.courses.bulk.delete.action")}
                  </Button>
                </>
              )}
            </>
          )}
        </Box>
      )}

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
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", md: "repeat(3, 1fr)", xl: "repeat(4, 1fr)" }, gap: 2 }}>
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
                <Checkbox
                  size="small"
                  checked={selected.includes(course.id)}
                  onClick={(e) => e.stopPropagation()}
                  onChange={() => toggleSelected(course.id)}
                  sx={{
                    position: "absolute", top: 8, left: 8, zIndex: 2, p: 0.25, borderRadius: "6px",
                    bgcolor: "rgba(255,255,255,0.85)", "&:hover": { bgcolor: "var(--color-surface)" },
                  }}
                />
                <Box sx={{ position: "absolute", top: 8, right: 8, display: "flex", gap: 0.5, zIndex: 2 }}>
                  <IconButton
                    size="small"
                    onClick={(e) => { e.stopPropagation(); openEditDrawer(course); }}
                    aria-label={t("settings.office.courses.edit")}
                    sx={{ bgcolor: "rgba(255,255,255,0.85)", "&:hover": { bgcolor: "var(--color-surface)" }, width: 28, height: 28 }}
                  >
                    <MdOutlineEdit size={14} />
                  </IconButton>
                  {tab === "faol" ? (
                    <IconButton
                      size="small"
                      onClick={(e) => { e.stopPropagation(); openArchiveConfirm(course); }}
                      aria-label={t("settings.office.courses.archive")}
                      title={t("settings.office.courses.archive")}
                      sx={{ bgcolor: "rgba(255,255,255,0.85)", color: "#b98900", "&:hover": { bgcolor: "var(--color-surface)" }, width: 28, height: 28 }}
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
                        sx={{ bgcolor: "rgba(255,255,255,0.85)", color: "#2e7d32", "&:hover": { bgcolor: "var(--color-surface)" }, width: 28, height: 28 }}
                      >
                        <MdUnarchive size={14} />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={(e) => { e.stopPropagation(); openDeleteConfirm(course); }}
                        aria-label={t("settings.office.courses.delete")}
                        title={t("settings.office.courses.delete")}
                        sx={{ bgcolor: "rgba(255,255,255,0.85)", color: "#e53935", "&:hover": { bgcolor: "var(--color-surface)" }, width: 28, height: 28 }}
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
                  sx={{
                    position: "relative", zIndex: 1, px: 2, textShadow: "0 1px 3px rgba(0,0,0,0.2)",
                    overflow: "hidden", textOverflow: "ellipsis",
                    display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical",
                  }}
                  title={course.name}
                >
                  {course.name}
                </Typography>
                <BookIllustration />
              </Box>
              <Box sx={{ p: 2 }}>
                <Typography
                  fontWeight={500} fontSize={15} mb={1}
                  sx={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                  title={course.name}
                >
                  {course.name}
                </Typography>
                <Typography fontSize={13} color="var(--color-text-muted)">{fmt(decimalToNumber(course.price) ?? 0)}</Typography>
                {course.branch?.name && (
                  <Typography fontSize={12} color="var(--color-text-muted)" mt={0.5}>{course.branch.name}</Typography>
                )}
              </Box>
            </Paper>
          ))}

          {courses.length === 0 && (
            <Box sx={{ gridColumn: "1 / -1", textAlign: "center", color: "var(--color-text-muted)", fontSize: 13, py: 6 }}>
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
        onKeyDown={submitOnEnter(handleSave, isCreating || isUpdating)}
        PaperProps={{ sx: { width: 400, maxWidth: "100vw", p: 0 } }}
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

          <Box mb={2}>
            <Typography fontSize={13} mb={0.5}>{t("settings.office.courses.form.price")}</Typography>
            <TextField fullWidth size="small" type="number" value={form.price}
              onChange={(e) => setForm((p) => ({ ...p, price: e.target.value }))}
              inputProps={{ min: 0 }} />
          </Box>

          <Box mb={2}>
            <Typography fontSize={13} mb={0.5}>{t("settings.office.courses.form.courseDuration")}</Typography>
            <TextField fullWidth size="small" type="number" value={form.months}
              onChange={(e) => setForm((p) => ({ ...p, months: e.target.value }))}
              inputProps={{ min: 0 }} />
          </Box>

          <Box mb={2}>
            <Typography fontSize={13} mb={0.5}>{t("settings.office.courses.form.codeCourse")}</Typography>
            <TextField fullWidth size="small" value={form.code}
              onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))} />
          </Box>

          <Box mb={2}>
            <Typography fontSize={13} mb={0.5}>{t("settings.office.courses.form.lessonDuration")}</Typography>
            <Select
              fullWidth
              size="small"
              displayEmpty
              value={form.lessonDuration}
              onChange={(e) => setForm((p) => ({ ...p, lessonDuration: e.target.value }))}
            >
              <MenuItem value="">—</MenuItem>
              {LESSON_DURATION_OPTIONS.map((min) => (
                <MenuItem key={min} value={String(min)}>
                  {t(`settings.office.courses.durationOptions.min${min}`)}
                </MenuItem>
              ))}
            </Select>
          </Box>

          <Box mb={2}>
            <Typography fontSize={13} mb={0.5}>{t("settings.office.courses.form.lessonsPerMonth")}</Typography>
            <TextField fullWidth size="small" type="number" value={form.lessonsPerMonth}
              onChange={(e) => setForm((p) => ({ ...p, lessonsPerMonth: e.target.value }))}
              inputProps={{ min: 0 }} />
          </Box>

          <Box mb={3}>
            <Typography fontSize={13} mb={0.5}>{t("settings.office.courses.form.description")}</Typography>
            <TextField fullWidth size="small" multiline minRows={3} value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
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
            disabled={isToggling}
            startIcon={isToggling ? <CircularProgress size={16} color="inherit" /> : undefined}
            sx={{ textTransform: "none", borderRadius: "10px", paddingX: "18px", fontWeight: 600, boxShadow: "none", bgcolor: "#5c7fa3", "&:hover": { bgcolor: "#4a6a8a" } }}
          >
            {t("settings.office.courses.restore")}
          </Button>
        </DialogActions>
      </Dialog>

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

      {/* Bulk action confirmation */}
      <Dialog
        open={bulkOpen}
        onClose={closeBulkConfirm}
        PaperProps={{ sx: { borderRadius: "14px", width: 400 } }}
      >
        <DialogTitle sx={{ fontWeight: 600 }}>
          {t(`settings.office.courses.bulk.${bulkAction}.title`)}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            {t(`settings.office.courses.bulk.${bulkAction}.message`, { count: selected.length })}
          </DialogContentText>
          {bulkAction === "archive" && (
            <TextField
              fullWidth
              size="small"
              sx={{ mt: 2 }}
              label={t("settings.office.courses.bulk.archive.reason")}
              value={bulkReason}
              onChange={(e) => setBulkReason(e.target.value)}
            />
          )}
          {bulkError && (
            <Typography fontSize={13} color="error" mt={1.5}>{bulkError}</Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button
            onClick={closeBulkConfirm}
            variant="outlined"
            disabled={isBulkBusy}
            sx={{ textTransform: "none", borderRadius: "10px", paddingX: "18px" }}
          >
            {t("settings.office.courses.form.cancel")}
          </Button>
          <Button
            onClick={confirmBulk}
            variant="contained"
            color={bulkAction === "delete" ? "error" : "primary"}
            disabled={isBulkBusy}
            startIcon={isBulkBusy ? <CircularProgress size={16} color="inherit" /> : undefined}
            sx={{
              textTransform: "none", borderRadius: "10px", paddingX: "18px", fontWeight: 600, boxShadow: "none",
              ...(bulkAction !== "delete" && { bgcolor: "#5c7fa3", "&:hover": { bgcolor: "#4a6a8a" } }),
            }}
          >
            {t(`settings.office.courses.bulk.${bulkAction}.action`)}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
