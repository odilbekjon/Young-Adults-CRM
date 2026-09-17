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
import { MdEdit, MdArchive, MdArrowBack } from "react-icons/md";
import {
  useAllCoursesQuery,
  useToggleCourseStatusMutation,
} from "../../app/api/coursesApi/coursesApi";
import { useToast } from "../../Context/ToastContext";
import { CARD_COLORS } from "../../constants/CardColors";

const fmt = (n: number) =>
  n.toLocaleString("ru-RU").replace(/,/g, " ") + " UZS";

const colorForId = (id: string) => {
  const hash = [...id].reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return CARD_COLORS[hash % CARD_COLORS.length];
};

export const SingleCourse = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const toast = useToast();
  const [tab, setTab] = useState(0);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [archiveError, setArchiveError] = useState<string | null>(null);

  const { data, isLoading } = useAllCoursesQuery();
  const [toggleCourseStatus, { isLoading: isToggling }] = useToggleCourseStatusMutation();

  const course = data?.data.find((c) => c.id === id);

  // Archive (PATCH toggle-status -> INACTIVE), not a permanent delete — this
  // page has no confirmation-free destructive action; permanent delete lives
  // only in the Archived tab of the Courses list, matching that page's
  // Active-vs-Archived split.
  const handleArchive = async () => {
    if (!course) return;
    setArchiveError(null);
    try {
      await toggleCourseStatus(course.id).unwrap();
      toast.success(t("settings.office.courses.toast.archived"));
      setArchiveOpen(false);
      navigate("/settings/office/courses");
    } catch {
      setArchiveError(t("settings.office.courses.archiveConfirm.error"));
      toast.error(t("settings.office.courses.archiveConfirm.error"));
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
    <Box sx={{ p: 3, bgcolor: "#f5f5f5", minHeight: "100vh" }}>
      {/* Back + Title */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
        <IconButton size="small" onClick={() => navigate("/settings/office/courses")}>
          <MdArrowBack size={20} />
        </IconButton>
        <Typography variant="h5" fontWeight={400}>
          {course.name}
        </Typography>
      </Box>

      <Box sx={{ display: "flex", gap: 3, alignItems: "flex-start" }}>
        {/* Left: Course card info */}
        <Box sx={{ width: 280, flexShrink: 0 }}>
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
                  onClick={() => navigate("/settings/office/courses")}
                >
                  <MdEdit size={16} color="#fff" />
                </Box>
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
                  onClick={() => { setArchiveError(null); setArchiveOpen(true); }}
                  title={t("settings.office.courses.archive")}
                >
                  <MdArchive size={16} color="#fff" />
                </Box>
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
              <InfoRow label="Price" value={fmt(course.price?.d?.[0] ?? 0)} />
              <InfoRow label="Branch" value={course.branch?.name || "—"} />
              <InfoRow label="Status" value={course.status} />
            </Box>
          </Paper>
        </Box>

        {/* Right: Tabs + Groups */}
        <Box sx={{ flex: 1 }}>
          <Box sx={{ borderBottom: "1px solid #e0e0e0", mb: 2 }}>
            <Tabs
              value={tab}
              onChange={(_, v) => setTab(v)}
              sx={{
                "& .MuiTab-root": { textTransform: "none", fontSize: 14, fontWeight: 400, color: "#555", minWidth: "auto", mr: 3, px: 0 },
                "& .Mui-selected": { color: "#1a3f6f", fontWeight: 600 },
                "& .MuiTabs-indicator": { bgcolor: "#1a3f6f" },
              }}
            >
              <Tab label="Groups" />
              <Tab label="Subcourses" />
              <Tab label="Online lessons and materials" />
              <Tab label="Materials" />
            </Tabs>
          </Box>

          {tab === 0 && (
            <Typography fontSize={13} color="#999">No groups yet.</Typography>
          )}
          {tab === 1 && (
            <Typography fontSize={13} color="#999">No subcourses available.</Typography>
          )}
          {tab === 2 && (
            <Typography fontSize={13} color="#999">No online lessons and materials available.</Typography>
          )}
          {tab === 3 && (
            <Typography fontSize={13} color="#999">No materials available.</Typography>
          )}
        </Box>
      </Box>

      {/* Archive confirmation */}
      <Dialog
        open={archiveOpen}
        onClose={() => setArchiveOpen(false)}
        PaperProps={{ sx: { borderRadius: "14px", width: 380 } }}
      >
        <DialogTitle sx={{ fontWeight: 600 }}>
          {t("settings.office.courses.archiveConfirm.title")}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            {t("settings.office.courses.archiveConfirm.message", { name: course.name })}
          </DialogContentText>
          {archiveError && (
            <Typography fontSize={13} color="error" mt={1.5}>{archiveError}</Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button
            onClick={() => setArchiveOpen(false)}
            variant="outlined"
            disabled={isToggling}
            sx={{ textTransform: "none", borderRadius: "10px", paddingX: "18px" }}
          >
            {t("settings.office.courses.form.cancel")}
          </Button>
          <Button
            onClick={handleArchive}
            variant="contained"
            disabled={isToggling}
            startIcon={isToggling ? <CircularProgress size={16} color="inherit" /> : undefined}
            sx={{ textTransform: "none", borderRadius: "10px", paddingX: "18px", fontWeight: 600, boxShadow: "none", bgcolor: "#5c7fa3", "&:hover": { bgcolor: "#4a6a8a" } }}
          >
            {t("settings.office.courses.archive")}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

const InfoRow = ({ label, value }: { label: string; value: string }) => (
  <Box sx={{ mb: 1.5 }}>
    <Typography fontSize={12} color="#aaa" mb={0.2}>{label}</Typography>
    <Typography fontSize={14} fontWeight={500}>{value}</Typography>
  </Box>
);
