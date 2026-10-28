import { useState } from "react";
import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { Box, Typography, Button, Drawer, TextField, Select, MenuItem, IconButton, Divider, CircularProgress } from "@mui/material";
import { MdClose } from "react-icons/md";
import { useCreateCourseMutation, useUpdateCourseMutation } from "../../../../../app/api/coursesApi/coursesApi";
import type { Course } from "../../../../../app/api/coursesApi/types";
import { useAllBranchesQuery } from "../../../../../app/api/branchesApi/branchesApi";
import { useToast } from "../../../../../Context/ToastContext";
import type { RootState } from "../../../../../app/store";
import { decimalToNumber, extractApiError, submitOnEnter } from "../../../../../utils";

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

const formFromCourse = (course: Course): FormState => ({
  name: course.name,
  branchId: course.branchId,
  price: String(decimalToNumber(course.price) ?? ""),
  months: course.months !== undefined && course.months !== null ? String(course.months) : "",
  description: course.description ?? "",
  code: course.code ?? "",
  lessonDuration: course.lessonDuration !== undefined && course.lessonDuration !== null ? String(course.lessonDuration) : "",
  lessonsPerMonth: course.lessonsPerMonth !== undefined && course.lessonsPerMonth !== null ? String(course.lessonsPerMonth) : "",
});

interface CourseFormProps {
  // The course being edited; null creates a new one.
  course: Course | null;
  // Every known course, archived ones included (see hasArchivedTwin).
  courses: Course[];
  onClose: () => void;
}

// Lives inside the drawer, which unmounts its content once closed — so the form
// starts from the course (or a blank one) each time it opens, with no reset logic.
const CourseForm = ({ course, courses, onClose }: CourseFormProps) => {
  const { t } = useTranslation();
  const toast = useToast();
  const selectedBranchId = useSelector((s: RootState) => s.branch.selectedBranchId);

  const { data: branchesData } = useAllBranchesQuery();
  const [createCourse, { isLoading: isCreating }] = useCreateCourseMutation();
  const [updateCourse, { isLoading: isUpdating }] = useUpdateCourseMutation();
  const isSaving = isCreating || isUpdating;

  // A new course is pre-filled with whichever branch is active in the header,
  // same as every other create form — still editable, just not blank.
  const [form, setForm] = useState<FormState>(() =>
    course ? formFromCourse(course) : { ...defaultForm, branchId: selectedBranchId ?? "" },
  );
  const [errors, setErrors] = useState<{ [k: string]: string }>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const activeBranches = (branchesData?.data ?? []).filter((b) => b.status === "ACTIVE");

  // The same name in the same branch is refused by the backend even when the
  // earlier course is archived (and so not on the Active tab) — say that up
  // front instead of surfacing a bare "already exists".
  const hasArchivedTwin = () => {
    const name = form.name.trim().toLowerCase();
    return courses.some(
      (c) => c.status !== "ACTIVE" && c.id !== course?.id && c.branchId === form.branchId && c.name.trim().toLowerCase() === name,
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
      if (course) {
        await updateCourse({
          id: course.id, name: form.name, branchId: form.branchId, price,
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
      onClose();
    } catch (err) {
      const detail = extractApiError(err);
      const generic = t("settings.office.courses.form.errors.save");
      const message = detail ? `${generic}: ${detail}` : generic;
      setSaveError(message);
      toast.error(message);
    }
  };

  return (
    <Box onKeyDown={submitOnEnter(handleSave, isSaving)}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", px: 3, py: 2.5 }}>
        <Typography fontWeight={600} fontSize={17}>
          {course
            ? t("settings.office.courses.form.editItem")
            : t("settings.office.courses.form.addNewItem")}
        </Typography>
        <IconButton size="small" onClick={onClose}>
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
          disabled={isSaving}
          startIcon={(isSaving) ? <CircularProgress size={16} color="inherit" /> : undefined}
          sx={{ bgcolor: "#1a3f6f", borderRadius: 5, px: 3, textTransform: "none", fontWeight: 600, fontSize: 15, "&:hover": { bgcolor: "#15345c" } }}>
          {t("settings.office.courses.form.save")}
        </Button>
      </Box>
    </Box>
  );
};

interface CourseFormDrawerProps extends CourseFormProps {
  open: boolean;
}

// Create / edit form of a course, shared by the Courses list and a course's own page.
export const CourseFormDrawer = ({ open, course, courses, onClose }: CourseFormDrawerProps) => (
  <Drawer
    anchor="right"
    open={open}
    onClose={onClose}
    PaperProps={{ sx: { width: 400, maxWidth: "100vw", p: 0 } }}
  >
    <CourseForm key={course?.id ?? "new"} course={course} courses={courses} onClose={onClose} />
  </Drawer>
);
