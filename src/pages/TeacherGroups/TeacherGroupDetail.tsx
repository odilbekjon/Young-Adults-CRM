// TEACHER-role read-only detail view for one of their own groups — reached
// at the same /groups/:id route the admin SingleGroup page uses, selected
// by role in src/routes/RoleGroupsRoute.tsx. Backed by
//   GET /teacher-portal/groups/{id}           (header: name/course/days/room)
//   GET /teacher-portal/groups/{id}/students  (roster with phones)
// both scoped server-side to this teacher; a group that isn't theirs comes
// back as an error, handled as "not found" below rather than trying to
// distinguish 403 from 404. Shows only the roster + Attendance — no
// freeze/remove/move/payment/edit actions, and no per-student profile links
// (StudentProfile is outside ProtectedRoute's TEACHER_ALLOWED_PREFIXES
// anyway, so the rows simply aren't clickable — nothing dead-ended).
import { useMemo } from "react";
import { Box, Paper, Typography, CircularProgress, Chip, Avatar, Stack, Button } from "@mui/material";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { IoArrowBack } from "react-icons/io5";
import {
  useTeacherPortalGroupByIdQuery,
  useTeacherPortalGroupStudentsQuery,
} from "../../app/api/teacherPortalApi";
import { formatTrainingDate } from "../../utils/formatTrainingDate";
import { Attendance } from "../SingleGroup/tabs/Attendance";

export const TeacherGroupDetail = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { data: group, isLoading, isError } = useTeacherPortalGroupByIdQuery(id ?? "", { skip: !id });
  const {
    data: rosterData, isLoading: rosterLoading, isError: rosterError, refetch: refetchRoster,
  } = useTeacherPortalGroupStudentsQuery(id ?? "", { skip: !id });

  // The roster endpoint is the source of truth; the student list embedded in
  // the group payload (if any) is only used when that request itself failed.
  const students = useMemo(
    () => (rosterData ?? (rosterError ? group?.students : undefined) ?? []).filter((s) => s.id && s.name),
    [rosterData, rosterError, group],
  );
  const attendanceStudents = useMemo(
    () => students.map((s, i) => ({ id: i + 1, realId: s.id, name: s.name, phone: s.phone ?? "", active: true })),
    [students],
  );

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

  const daysKey = group.daysType?.toUpperCase();
  const daysLabel = daysKey === "ODD" || daysKey === "EVEN" ? t(`teacherGroups.days.${daysKey}`) : group.daysType;
  const dates = group.trainingStart || group.trainingEnd
    ? `${formatTrainingDate(group.trainingStart)} – ${formatTrainingDate(group.trainingEnd)}`
    : "";
  const subtitle = [daysLabel, group.time, group.roomName && `${t("teacherGroups.room")}: ${group.roomName}`, dates]
    .filter(Boolean)
    .join(" · ");

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Button startIcon={<IoArrowBack />} onClick={() => navigate("/groups")} sx={{ textTransform: "none", mb: 2 }}>
        {t("teacherGroups.backToGroups")}
      </Button>

      <Stack direction="row" alignItems="center" gap={1.5} flexWrap="wrap" mb={1}>
        <Typography variant="h5" fontWeight={700} color="var(--color-text-primary)">{group.name}</Typography>
        {group.courseName && <Chip label={group.courseName} size="small" />}
      </Stack>
      <Typography fontSize={13} color="text.secondary" mb={2}>{subtitle || "—"}</Typography>

      <Paper elevation={0} sx={{ border: "1px solid var(--color-border)", borderRadius: 2, p: 2, mb: 2.5, bgcolor: "var(--color-accent-surface)" }}>
        <Typography fontSize={13} color="text.secondary">{t("teacherGroups.attendanceOnlyNote")}</Typography>
      </Paper>

      <Typography fontSize={14} fontWeight={600} mb={1} color="var(--color-text-primary)">
        {t("teacherGroups.roster")}{!rosterLoading && !rosterError ? ` (${students.length})` : ""}
      </Typography>
      <Paper elevation={0} sx={{ border: "1px solid var(--color-border)", borderRadius: 2, background: "var(--color-surface)", mb: 3, overflow: "hidden" }}>
        {rosterLoading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}><CircularProgress size={22} /></Box>
        ) : rosterError && students.length === 0 ? (
          <Box sx={{ p: 2 }}>
            <Typography color="error" fontSize={13} mb={1}>{t("teacherGroups.rosterLoadError")}</Typography>
            <Button size="small" variant="outlined" onClick={() => refetchRoster()} sx={{ textTransform: "none" }}>
              {t("teacherDashboard.schedule.retry")}
            </Button>
          </Box>
        ) : students.length === 0 ? (
          <Typography fontSize={13} color="text.secondary" sx={{ p: 2 }}>{t("teacherGroups.rosterEmpty")}</Typography>
        ) : (
          <Box>
            {students.map((s, i) => (
              <Stack
                key={s.id}
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                gap={2}
                sx={{ px: 2, py: 1.1, borderTop: i === 0 ? "none" : "1px solid var(--color-border-subtle)" }}
              >
                <Stack direction="row" alignItems="center" gap={1.25} sx={{ minWidth: 0 }}>
                  <Avatar sx={{ width: 28, height: 28, fontSize: 12 }}>{s.name[0]}</Avatar>
                  <Typography fontSize={13.5} color="var(--color-text-primary)" noWrap>{s.name}</Typography>
                </Stack>
                {s.phone ? (
                  <Typography
                    component="a"
                    href={`tel:${s.phone.replace(/\s+/g, "")}`}
                    fontSize={13}
                    sx={{ color: "var(--color-primary)", textDecoration: "none", whiteSpace: "nowrap" }}
                  >
                    {s.phone}
                  </Typography>
                ) : (
                  <Typography fontSize={13} color="text.disabled" sx={{ whiteSpace: "nowrap" }}>
                    {t("teacherGroups.noPhone")}
                  </Typography>
                )}
              </Stack>
            ))}
          </Box>
        )}
      </Paper>

      <Paper elevation={0} sx={{ border: "1px solid var(--color-border)", borderRadius: 2, p: { xs: 1.5, md: 2.5 }, background: "var(--color-surface)" }}>
        {rosterLoading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}><CircularProgress size={22} /></Box>
        ) : (
          <Attendance groupId={group.id || id || ""} students={attendanceStudents} restrictToToday />
        )}
      </Paper>
    </Box>
  );
};

export default TeacherGroupDetail;
