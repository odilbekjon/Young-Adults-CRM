// TEACHER-role read-only detail view for one of their own groups — reached
// at the same /groups/:id route the admin SingleGroup page uses, selected
// by role in src/routes/RoleGroupsRoute.tsx. Backed by
// GET /teacher-portal/groups/{id} (scoped server-side to this teacher; a
// group that isn't theirs comes back as an error here, handled as "not
// found" below rather than trying to distinguish 403 from 404). Shows only
// the roster + Attendance — no freeze/remove/move/payment/edit actions, and
// no per-student profile links (StudentProfile is outside
// ProtectedRoute's TEACHER_ALLOWED_PREFIXES anyway, but the rows simply
// aren't clickable here either, so there's nothing dead-ended to click).
import { Box, Paper, Typography, CircularProgress, Chip, Avatar, Stack, Button } from "@mui/material";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { IoArrowBack } from "react-icons/io5";
import { useTeacherPortalGroupByIdQuery } from "../../app/api/teacherPortalApi";
import { Attendance } from "../SingleGroup/tabs/Attendance";

const formatDaysType = (daysType: string | null) =>
  daysType === "EVEN" ? "Even days" : daysType === "ODD" ? "Odd days" : (daysType || "—");

export const TeacherGroupDetail = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { data: group, isLoading, isError } = useTeacherPortalGroupByIdQuery(id ?? "", { skip: !id });

  if (isLoading) {
    return <Box sx={{ p: 4, display: "flex", justifyContent: "center" }}><CircularProgress /></Box>;
  }

  if (isError || !group) {
    return (
      <Box sx={{ p: 4 }}>
        <Typography color="error" mb={2}>{t("teacherGroups.notFound")}</Typography>
        <Button startIcon={<IoArrowBack />} onClick={() => navigate("/groups")} sx={{ textTransform: "none" }}>
          {t("teacherGroups.backToGroups")}
        </Button>
      </Box>
    );
  }

  const attendanceStudents = group.students.map((s, i) => ({
    id: i + 1,
    realId: s.id,
    name: s.name,
    phone: s.phone ?? "",
    active: true,
  }));

  return (
    <Box sx={{ p: 3 }}>
      <Button startIcon={<IoArrowBack />} onClick={() => navigate("/groups")} sx={{ textTransform: "none", mb: 2 }}>
        {t("teacherGroups.backToGroups")}
      </Button>

      <Stack direction="row" alignItems="center" gap={1.5} flexWrap="wrap" mb={1}>
        <Typography variant="h5" fontWeight={700}>{group.name}</Typography>
        {group.courseName && <Chip label={group.courseName} size="small" />}
      </Stack>
      <Typography fontSize={13} color="text.secondary" mb={2}>
        {[formatDaysType(group.daysType), group.time, group.roomName].filter(Boolean).join(" · ") || "—"}
      </Typography>

      <Paper elevation={0} sx={{ border: "1px solid #e5e7eb", borderRadius: 2, p: 2, mb: 2.5, bgcolor: "#f0f7ff" }}>
        <Typography fontSize={13} color="text.secondary">{t("teacherGroups.attendanceOnlyNote")}</Typography>
      </Paper>

      <Typography fontSize={14} fontWeight={600} mb={1}>{t("teacherGroups.roster")}</Typography>
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mb: 3 }}>
        {attendanceStudents.map((s) => (
          <Stack key={s.realId} direction="row" alignItems="center" gap={1} sx={{ border: "1px solid #eee", borderRadius: 999, px: 1.2, py: 0.5 }}>
            <Avatar sx={{ width: 22, height: 22, fontSize: 11 }}>{s.name[0]}</Avatar>
            <Typography fontSize={12.5}>{s.name}</Typography>
          </Stack>
        ))}
        {attendanceStudents.length === 0 && (
          <Typography fontSize={13} color="text.secondary">—</Typography>
        )}
      </Box>

      <Paper elevation={0} sx={{ border: "1px solid #e5e7eb", borderRadius: 2, p: 2.5 }}>
        <Attendance groupId={group.id} students={attendanceStudents} restrictToToday />
      </Paper>
    </Box>
  );
};

export default TeacherGroupDetail;
