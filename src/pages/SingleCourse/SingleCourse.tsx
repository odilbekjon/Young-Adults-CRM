import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Box,
  Typography,
  IconButton,
  Tabs,
  Tab,
  Paper,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
} from "@mui/material";
import { MdEdit, MdArchive, MdUnarchive, MdDeleteOutline, MdArrowBack } from "react-icons/md";
import {
  useAllCoursesQuery,
  useToggleCourseStatusMutation,
  useDeleteCourseMutation,
} from "../../app/api/coursesApi/coursesApi";
import { CourseFormDrawer } from "../Settings/office/pages/courses/CourseFormDrawer";
import { useGroupsByCourseQuery } from "../../app/api/groupsApi/groupsApi";
import type { CourseGroup } from "../../app/api/groupsApi/types";
import { useToast } from "../../Context/ToastContext";
import { CARD_COLORS } from "../../constants/CardColors";
import { classifyDayList, classifyDays, decimalToNumber, extractApiError, formatTrainingDate } from "../../utils";

const fmt = (n: number) =>
  n.toLocaleString("ru-RU").replace(/,/g, " ") + " UZS";

type CourseAction = "archive" | "restore" | "delete";
const COURSE_ACTION_TOAST: Record<CourseAction, string> = { archive: "archived", restore: "restored", delete: "deleted" };

const colorForId = (id: string) => {
  const hash = [...id].reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return CARD_COLORS[hash % CARD_COLORS.length];
};

// "Odd days"/"Even days" label for a group's schedule — falls back to the
// concrete day list when the backend sends no daysType.
const DAYS_KEY: Record<string, string> = {
  "Odd days": "groups.options.days.odd",
  "Even days": "groups.options.days.even",
  "Weekend days": "groups.options.days.weekend",
  "Every day": "groups.options.days.every",
  "Other": "groups.options.days.other",
};

const GroupCard = ({ group, onClick }: { group: CourseGroup; onClick: () => void }) => {
  const { t } = useTranslation();
  const bucket = group.daysType ? classifyDays(group.daysType, group.days) : classifyDayList(group.days);
  const daysLabel = DAYS_KEY[bucket] ? t(DAYS_KEY[bucket]) : "";
  const range = `${formatTrainingDate(group.trainingStart)} — ${formatTrainingDate(group.trainingEnd)}`;
  return (
    <Paper
      elevation={0}
      onClick={onClick}
      sx={{
        p: 2.5,
        borderRadius: 1,
        cursor: "pointer",
        display: "grid",
        gridTemplateColumns: { xs: "minmax(0, 1fr) auto", sm: "minmax(0, 1.4fr) minmax(0, 1fr) auto" },
        alignItems: "center",
        columnGap: 2,
        transition: "box-shadow 0.15s",
        "&:hover": { boxShadow: 3 },
      }}
    >
      <Box sx={{ minWidth: 0 }}>
        <Box
          component="span"
          sx={{
            display: "inline-block", maxWidth: "100%", px: 1, py: 0.25, mb: 0.5, borderRadius: 0.5,
            bgcolor: "var(--color-surface-hover)", fontSize: 12, fontWeight: 600,
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}
          title={group.name}
        >
          {group.name}
        </Box>
        <Typography fontSize={14} sx={{ wordBreak: "break-word" }}>
          {group.teacherNames.join(", ") || "—"}
        </Typography>
      </Box>
      <Typography fontSize={13} color="var(--color-text-muted)" sx={{ display: { xs: "none", sm: "block" } }}>{range}</Typography>
      <Box sx={{ textAlign: "right", color: "var(--color-text-muted)", fontSize: 13 }}>
        <Box sx={{ display: { xs: "block", sm: "none" } }}>{range}</Box>
        <div>{daysLabel}</div>
        <div>{group.time ?? ""}</div>
      </Box>
    </Paper>
  );
};

export const SingleCourse = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const toast = useToast();
  const [tab, setTab] = useState(0);
  const [editOpen, setEditOpen] = useState(false);
  // The confirm dialog serves all three status actions; the action stays set
  // while the dialog fades out so its text doesn't flip.
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<CourseAction>("archive");
  const [confirmError, setConfirmError] = useState<string | null>(null);

  const { data, isLoading } = useAllCoursesQuery();
  const [toggleCourseStatus, { isLoading: isToggling }] = useToggleCourseStatusMutation();
  const [deleteCourse, { isLoading: isDeleting }] = useDeleteCourseMutation();
  const isActing = isToggling || isDeleting;

  const course = data?.data.find((c) => c.id === id);
  const {
    data: groups = [],
    isLoading: groupsLoading,
    isError: groupsError,
  } = useGroupsByCourseQuery(id ?? "", { skip: !id });

  const openConfirm = (action: CourseAction) => {
    setConfirmError(null);
    setConfirmAction(action);
    setConfirmOpen(true);
  };

  // Same actions as the Courses list: an active course is archived (PATCH
  // toggle-status -> INACTIVE); an archived one is restored (the same toggle) or
  // deleted for good (DELETE, which the backend refuses while it has groups).
  // Archiving or deleting leaves this page, since the course is gone from its
  // catalog; restoring keeps it open.
  const handleConfirm = async () => {
    if (!course) return;
    try {
      if (confirmAction === "delete") await deleteCourse(course.id).unwrap();
      else await toggleCourseStatus(course.id).unwrap();
      toast.success(t(`settings.office.courses.toast.${COURSE_ACTION_TOAST[confirmAction]}`));
      setConfirmOpen(false);
      if (confirmAction !== "restore") navigate("/settings/office/courses");
    } catch (err) {
      const detail = extractApiError(err);
      const generic = t(`settings.office.courses.${confirmAction}Confirm.error`);
      const message = detail ? `${generic}: ${detail}` : generic;
      setConfirmError(message);
      toast.error(message);
    }
  };

  if (isLoading) {
    return (
      <Box sx={{ p: 4, display: "flex", justifyContent: "center" }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!course) {
    return (
      <Box sx={{ p: 4 }}>
        <Typography>Course not found.</Typography>
        <Typography
          sx={{ color: "#1976d2", cursor: "pointer", mt: 1 }}
          onClick={() => navigate("/settings/office/courses")}
        >
          ← Back to Courses
        </Typography>
      </Box>
    );
  }

  const color = colorForId(course.id);

  return (
    <Box sx={{ p: 3, bgcolor: "var(--color-surface-alt)", minHeight: "100vh" }}>
      {/* Back + Title */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
        <IconButton size="small" onClick={() => navigate("/settings/office/courses")}>
          <MdArrowBack size={20} />
        </IconButton>
        <Typography variant="h5" fontWeight={400}>
          {course.name}
        </Typography>
      </Box>

      <Box sx={{ display: "flex", flexDirection: { xs: "column", md: "row" }, gap: 3, alignItems: { xs: "stretch", md: "flex-start" } }}>
        {/* Left: Course card info */}
        <Box sx={{ width: { xs: "100%", md: 280 }, flexShrink: 0 }}>
          <Paper elevation={1} sx={{ borderRadius: 2, overflow: "hidden" }}>
            {/* Banner */}
            <Box
              sx={{
                bgcolor: color,
                height: 220,
                position: "relative",
                overflow: "hidden",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {/* Edit / Delete icons */}
              <Box
                sx={{
                  position: "absolute",
                  top: 12,
                  right: 12,
                  display: "flex",
                  gap: 1,
                  zIndex: 2,
                }}
              >
                <BannerAction title={t("settings.office.courses.edit")} onClick={() => setEditOpen(true)}>
                  <MdEdit size={16} color="#fff" />
                </BannerAction>
                {course.status === "ACTIVE" ? (
                  <BannerAction title={t("settings.office.courses.archive")} onClick={() => openConfirm("archive")}>
                    <MdArchive size={16} color="#fff" />
                  </BannerAction>
                ) : (
                  <>
                    <BannerAction title={t("settings.office.courses.restore")} onClick={() => openConfirm("restore")}>
                      <MdUnarchive size={16} color="#fff" />
                    </BannerAction>
                    <BannerAction title={t("settings.office.courses.delete")} onClick={() => openConfirm("delete")}>
                      <MdDeleteOutline size={16} color="#fff" />
                    </BannerAction>
                  </>
                )}
              </Box>

              <Typography
                fontWeight={700}
                fontSize={20}
                color="#fff"
                textAlign="center"
                sx={{ position: "relative", zIndex: 1, px: 2, textShadow: "0 1px 4px rgba(0,0,0,0.2)" }}
              >
                {course.name}
              </Typography>
            </Box>

            {/* Info fields */}
            <Box sx={{ p: 2.5 }}>
              <InfoRow label="Price" value={fmt(decimalToNumber(course.price) ?? 0)} />
              {!!course.months && (
                <InfoRow
                  label={t("settings.office.courses.form.courseDuration")}
                  value={String(course.months)}
                />
              )}
              {!!course.lessonDuration && (
                <InfoRow
                  label={t("settings.office.courses.form.lessonDuration")}
                  value={`${course.lessonDuration} min`}
                />
              )}
              {!!course.lessonsPerMonth && (
                <InfoRow
                  label={t("settings.office.courses.form.lessonsPerMonth")}
                  value={String(course.lessonsPerMonth)}
                />
              )}
              {course.code && (
                <InfoRow label={t("settings.office.courses.form.codeCourse")} value={course.code} />
              )}
              <InfoRow label="Branch" value={course.branch?.name || "—"} />
              <InfoRow label="Status" value={course.status} />
              {course.description && (
                <Box sx={{ mb: 1.5 }}>
                  <Typography fontSize={12} color="var(--color-text-muted)" mb={0.2}>
                    {t("settings.office.courses.form.description")}
                  </Typography>
                  <Typography fontSize={13.5} sx={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                    {course.description}
                  </Typography>
                </Box>
              )}
            </Box>
          </Paper>
        </Box>

        {/* Right: Tabs + Groups */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Box sx={{ borderBottom: "1px solid var(--color-border)", mb: 2 }}>
            <Tabs
              value={tab}
              onChange={(_, v) => setTab(v)}
              sx={{
                "& .MuiTab-root": { textTransform: "none", fontSize: 14, fontWeight: 400, color: "var(--color-text-secondary)", minWidth: "auto", mr: 3, px: 0 },
                "& .Mui-selected": { color: "var(--color-nav-active)", fontWeight: 600 },
                "& .MuiTabs-indicator": { bgcolor: "var(--color-nav-active)" },
              }}
            >
              <Tab label="Groups" />
              <Tab label="Subcourses" />
              <Tab label="Online lessons and materials" />
              <Tab label="Materials" />
            </Tabs>
          </Box>

          {tab === 0 && (
            groupsLoading ? (
              <CircularProgress size={22} />
            ) : groupsError ? (
              <Typography fontSize={13} color="error">{t("settings.office.courses.groups.loadError")}</Typography>
            ) : groups.length === 0 ? (
              <Typography fontSize={13} color="var(--color-text-muted)">{t("settings.office.courses.groups.empty")}</Typography>
            ) : (
              <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 420px), 1fr))", gap: 2 }}>
                {groups.map((g) => (
                  <GroupCard key={g.id} group={g} onClick={() => navigate(`/groups/${g.id}`)} />
                ))}
              </Box>
            )
          )}
          {tab === 1 && (
            <Typography fontSize={13} color="var(--color-text-muted)">No subcourses available.</Typography>
          )}
          {tab === 2 && (
            <Typography fontSize={13} color="var(--color-text-muted)">No online lessons and materials available.</Typography>
          )}
          {tab === 3 && (
            <Typography fontSize={13} color="var(--color-text-muted)">No materials available.</Typography>
          )}
        </Box>
      </Box>

      {/* Archive confirmation */}
      <CourseFormDrawer open={editOpen} course={course} courses={data?.data ?? []} onClose={() => setEditOpen(false)} />

      <Dialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        PaperProps={{ sx: { borderRadius: "14px", width: 380 } }}
      >
        <DialogTitle sx={{ fontWeight: 600 }}>
          {t(`settings.office.courses.${confirmAction}Confirm.title`)}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            {t(`settings.office.courses.${confirmAction}Confirm.message`, { name: course.name })}
          </DialogContentText>
          {confirmError && (
            <Typography fontSize={13} color="error" mt={1.5}>{confirmError}</Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button
            onClick={() => setConfirmOpen(false)}
            variant="outlined"
            disabled={isActing}
            sx={{ textTransform: "none", borderRadius: "10px", paddingX: "18px" }}
          >
            {t("settings.office.courses.form.cancel")}
          </Button>
          <Button
            onClick={handleConfirm}
            variant="contained"
            color={confirmAction === "delete" ? "error" : "primary"}
            disabled={isActing}
            startIcon={isActing ? <CircularProgress size={16} color="inherit" /> : undefined}
            sx={{
              textTransform: "none", borderRadius: "10px", paddingX: "18px", fontWeight: 600, boxShadow: "none",
              ...(confirmAction !== "delete" && { bgcolor: "#5c7fa3", "&:hover": { bgcolor: "#4a6a8a" } }),
            }}
          >
            {t(`settings.office.courses.${confirmAction}`)}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

const BannerAction = ({ title, onClick, children }: { title: string; onClick: () => void; children: React.ReactNode }) => (
  <Box
    sx={{
      width: 34,
      height: 34,
      border: "1.5px solid rgba(255,255,255,0.8)",
      borderRadius: "50%",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      cursor: "pointer",
      bgcolor: "rgba(255,255,255,0.15)",
      "&:hover": { bgcolor: "rgba(255,255,255,0.3)" },
    }}
    onClick={onClick}
    title={title}
  >
    {children}
  </Box>
);

const InfoRow = ({ label, value }: { label: string; value: string }) => (
  <Box sx={{ mb: 1.5 }}>
    <Typography fontSize={12} color="var(--color-text-muted)" mb={0.2}>{label}</Typography>
    <Typography fontSize={14} fontWeight={500}>{value}</Typography>
  </Box>
);
