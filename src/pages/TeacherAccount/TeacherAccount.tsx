// TEACHER "Account" page: the header menu's Account entry (/profile) and the
// sidebar's Salary entry (/salary) both land here — same page, the route only
// decides which tab is open (Profile: own info + groups, Salary: own payroll).
import { Box, Tab, Tabs, Typography } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useTeacherPortalProfileQuery } from "../../app/api/teacherPortalApi";
import { TeacherOwnProfile } from "../Profile/TeacherOwnProfile";
import { TeacherSalary } from "../TeacherSalary/TeacherSalary";

export type TeacherAccountTab = "profile" | "salary";

export const TeacherAccount = ({ tab }: { tab: TeacherAccountTab }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: profile } = useTeacherPortalProfileQuery();

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "var(--color-bg-page)", px: { xs: 2, md: 4 }, pt: 3, pb: 6 }}>
      <Typography variant="h4" sx={{ mb: 1.5, color: "var(--color-text-primary)", wordBreak: "break-word" }}>
        {profile?.name || profile?.email || " "}
      </Typography>
      <Tabs
        value={tab}
        onChange={(_, v: TeacherAccountTab) => navigate(`/${v}`)}
        sx={{ borderBottom: "1px solid var(--color-border)", mb: 3 }}
      >
        <Tab value="profile" label={t("teacherPortal.nav.profile")} sx={{ textTransform: "none", fontSize: 15 }} />
        <Tab value="salary" label={t("teacherPortal.nav.salary")} sx={{ textTransform: "none", fontSize: 15 }} />
      </Tabs>

      {tab === "profile" ? <TeacherOwnProfile /> : <TeacherSalary />}
    </Box>
  );
};

export default TeacherAccount;
