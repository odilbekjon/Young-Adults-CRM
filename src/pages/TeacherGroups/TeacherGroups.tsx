// TEACHER-role "My groups" page — GET /teacher-portal/groups (scoped
// server-side to this teacher). Rendered in place of the full admin `Groups`
// page by `src/routes/RoleGroupsRoute.tsx`. The lesson schedule lives on the
// teacher Dashboard (TeacherDashboard), not here.
import { Box, Paper, Typography, CircularProgress, Chip, Stack, Button } from "@mui/material";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { TbUsers } from "react-icons/tb";
import { useTeacherPortalGroupsQuery } from "../../app/api/teacherPortalApi";

const formatDaysType = (daysType: string | null, t: (k: string, o?: Record<string, unknown>) => string) => {
  if (!daysType) return "";
  const key = daysType.toUpperCase();
  return key === "ODD" || key === "EVEN" ? t(`teacherGroups.days.${key}`) : daysType;
};

export const TeacherGroups = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data, isLoading, isError, refetch } = useTeacherPortalGroupsQuery(undefined, {
    refetchOnMountOrArgChange: true,
  });
  const groups = data ?? [];

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Typography fontSize={22} fontWeight={700} mb={2.5} color="var(--color-text-primary)">
        {t("teacherGroups.title")}
      </Typography>

      {isLoading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}><CircularProgress size={26} /></Box>
      ) : isError ? (
        <Box>
          <Typography color="error" fontSize={14} mb={1.5}>{t("teacherGroups.loadError")}</Typography>
          <Button size="small" variant="outlined" onClick={() => refetch()} sx={{ textTransform: "none" }}>
            {t("teacherDashboard.schedule.retry")}
          </Button>
        </Box>
      ) : groups.length === 0 ? (
        <Typography color="text.secondary" fontSize={14}>{t("teacherGroups.empty")}</Typography>
      ) : (
        <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 260px), 1fr))" }}>
          {groups.map((g) => (
            <Paper
              key={g.id}
              elevation={0}
              onClick={() => navigate(`/groups/${g.id}`)}
              sx={{
                p: 2.5, borderRadius: "12px", border: "1px solid var(--color-border)", background: "var(--color-surface)",
                cursor: "pointer", transition: "box-shadow 0.15s, transform 0.15s",
                "&:hover": { boxShadow: 3, transform: "translateY(-2px)" },
              }}
            >
              <Stack direction="row" alignItems="center" gap={1} mb={1}>
                <TbUsers size={18} color="#1976d2" />
                <Typography fontSize={15} fontWeight={700} color="var(--color-text-primary)" sx={{ wordBreak: "break-word" }}>
                  {g.name}
                </Typography>
              </Stack>
              {g.courseName && (
                <Chip label={g.courseName} size="small" sx={{ mb: 1, fontSize: 11, bgcolor: "var(--color-accent-surface)", color: "var(--color-text-secondary)" }} />
              )}
              <Typography fontSize={12.5} color="text.secondary" mb={0.5}>
                {[formatDaysType(g.daysType, t), g.time].filter(Boolean).join(" · ") || "—"}
              </Typography>
              <Typography fontSize={12.5} color="text.disabled">
                {g.studentsCount} {t("teacherGroups.students")}
              </Typography>
            </Paper>
          ))}
        </Box>
      )}
    </Box>
  );
};

export default TeacherGroups;
