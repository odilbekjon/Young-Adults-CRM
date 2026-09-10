import { Box, Paper, Typography, CircularProgress, Chip, Stack } from "@mui/material";
import { useTranslation } from "react-i18next";
import { TbUsers } from "react-icons/tb";
import { useStudentPortalGroupsQuery } from "../../../app/api/studentPortalApi";

export const StudentPortalGroups = () => {
  const { t } = useTranslation();
  const { data, isLoading, isError } = useStudentPortalGroupsQuery();
  const groups = data ?? [];

  return (
    <Box>
      <Typography fontSize={22} fontWeight={700} color="var(--color-text-primary)" mb={2.5}>
        {t("studentPortal.groups.title")}
      </Typography>

      {isLoading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}><CircularProgress size={26} /></Box>
      ) : isError ? (
        <Typography color="var(--color-danger)" fontSize={14}>{t("studentPortal.groups.loadError")}</Typography>
      ) : groups.length === 0 ? (
        <Typography color="var(--color-text-muted)" fontSize={14}>{t("studentPortal.groups.empty")}</Typography>
      ) : (
        <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
          {groups.map((g) => (
            <Paper
              key={g.id}
              elevation={0}
              sx={{ width: 280, p: 2.5, borderRadius: "12px", border: "1px solid var(--color-border)", bgcolor: "var(--color-surface)" }}
            >
              <Stack direction="row" alignItems="center" gap={1} mb={1}>
                <TbUsers size={18} color="var(--color-primary)" />
                <Typography fontSize={15} fontWeight={700} color="var(--color-text-primary)">{g.name}</Typography>
              </Stack>
              {g.courseName && (
                <Chip label={g.courseName} size="small" sx={{ mb: 1, fontSize: 11, bgcolor: "var(--color-primary-surface)", color: "var(--color-primary)" }} />
              )}
              <Typography fontSize={12.5} color="var(--color-text-secondary)" mb={0.5}>
                {[g.daysType, g.time].filter(Boolean).join(" · ") || "—"}
              </Typography>
              <Typography fontSize={12.5} color="var(--color-text-muted)">
                {g.teachers.length > 0 ? g.teachers.map((tc) => tc.name).join(", ") : t("studentPortal.groups.noTeacher")}
              </Typography>
            </Paper>
          ))}
        </Box>
      )}
    </Box>
  );
};

export default StudentPortalGroups;
