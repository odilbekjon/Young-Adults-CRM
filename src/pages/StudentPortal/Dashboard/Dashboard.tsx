import { Box, Paper, Typography, CircularProgress } from "@mui/material";
import { useTranslation } from "react-i18next";
import { TbCalendarCheck, TbBook } from "react-icons/tb";
import { useStudentPortalDashboardQuery } from "../../../app/api/studentPortalApi";

const StatCard = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) => (
  <Paper
    elevation={0}
    sx={{
      flex: 1, minWidth: 200, p: 2.5, borderRadius: "12px",
      border: "1px solid var(--color-border)", bgcolor: "var(--color-surface)",
    }}
  >
    <Box sx={{ display: "flex", alignItems: "center", gap: 1, color: "var(--color-primary)", mb: 1 }}>
      {icon}
      <Typography fontSize={13} fontWeight={600} color="var(--color-text-secondary)">{label}</Typography>
    </Box>
    <Typography fontSize={28} fontWeight={700} color="var(--color-text-primary)">{value}</Typography>
  </Paper>
);

export const StudentPortalDashboard = () => {
  const { t } = useTranslation();
  const { data, isLoading, isError } = useStudentPortalDashboardQuery();

  return (
    <Box>
      <Typography fontSize={22} fontWeight={700} color="var(--color-text-primary)" mb={2.5}>
        {t("studentPortal.dashboard.title")}
      </Typography>

      {isLoading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}><CircularProgress size={26} /></Box>
      ) : isError ? (
        <Typography color="var(--color-danger)" fontSize={14}>{t("studentPortal.dashboard.loadError")}</Typography>
      ) : (
        <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
          <StatCard
            icon={<TbCalendarCheck size={20} />}
            label={t("studentPortal.dashboard.attendancePercentage")}
            value={`${data?.attendancePercentage ?? 0}%`}
          />
          <StatCard
            icon={<TbBook size={20} />}
            label={t("studentPortal.dashboard.activeCourses")}
            value={data?.activeCoursesCount ?? 0}
          />
        </Box>
      )}
    </Box>
  );
};

export default StudentPortalDashboard;
