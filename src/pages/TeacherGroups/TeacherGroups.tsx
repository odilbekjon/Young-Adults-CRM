// TEACHER-role read-only view of the Groups page — shows only this
// teacher's own groups (GET /teacher-portal/groups, scoped server-side by
// the logged-in teacher's token, not client-side filtering) with no create/
// edit/delete/archive controls, since group management is admin/CEO
// territory. Rendered in place of the full admin `Groups` page by
// `src/routes/RoleGroupsRoute.tsx`.
import { Box, Paper, Typography, CircularProgress, Chip, Stack } from "@mui/material";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { TbUsers } from "react-icons/tb";
import { useTeacherPortalGroupsQuery } from "../../app/api/teacherPortalApi";

export const TeacherGroups = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data, isLoading, isError } = useTeacherPortalGroupsQuery();
  const groups = data ?? [];

  return (
    <Box sx={{ p: 3 }}>
      <Typography fontSize={22} fontWeight={700} mb={2.5}>
        {t("teacherGroups.title")}
      </Typography>

      {isLoading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}><CircularProgress size={26} /></Box>
      ) : isError ? (
        <Typography color="error" fontSize={14}>{t("teacherGroups.loadError")}</Typography>
      ) : groups.length === 0 ? (
        <Typography color="text.secondary" fontSize={14}>{t("teacherGroups.empty")}</Typography>
      ) : (
        <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
          {groups.map((g) => (
            <Paper
              key={g.id}
              elevation={0}
              onClick={() => navigate(`/groups/${g.id}`)}
              sx={{
                width: 280, p: 2.5, borderRadius: "12px", border: "1px solid #e5e7eb",
                cursor: "pointer", transition: "box-shadow 0.15s, transform 0.15s",
                "&:hover": { boxShadow: 3, transform: "translateY(-2px)" },
              }}
            >
              <Stack direction="row" alignItems="center" gap={1} mb={1}>
                <TbUsers size={18} color="#1976d2" />
                <Typography fontSize={15} fontWeight={700}>{g.name}</Typography>
              </Stack>
              {g.courseName && (
                <Chip label={g.courseName} size="small" sx={{ mb: 1, fontSize: 11, bgcolor: "#eef2f6", color: "#1a3f6f" }} />
              )}
              <Typography fontSize={12.5} color="text.secondary" mb={0.5}>
                {[g.daysType, g.time].filter(Boolean).join(" · ") || "—"}
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
