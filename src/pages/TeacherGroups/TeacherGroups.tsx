// TEACHER-role landing page — replaces Dashboard entirely for a TEACHER
// session (product direction: a teacher only needs their own groups and
// schedule, not the admin dashboard). Shows this teacher's own schedule
// (GET /teacher-portal/schedule, scoped server-side, previously unused
// anywhere in this app) above their group cards (GET /teacher-portal/groups,
// same server-side scoping). Rendered in place of the full admin `Groups`
// page by `src/routes/RoleGroupsRoute.tsx`, and is where PublicRoute now
// sends a TEACHER session right after login instead of /dashboard.
import { useMemo } from "react";
import { Box, Paper, Typography, CircularProgress, Chip, Stack } from "@mui/material";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { TbUsers, TbClock } from "react-icons/tb";
import { useTeacherPortalGroupsQuery, useTeacherPortalScheduleQuery } from "../../app/api/teacherPortalApi";

const DAY_ORDER = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"];

const TeacherSchedule = () => {
  const { t } = useTranslation();
  const { data, isLoading, isError } = useTeacherPortalScheduleQuery();
  const items = useMemo(() => data ?? [], [data]);

  const byDay = useMemo(() => {
    const map = new Map<string, typeof items>();
    items.forEach((item) => {
      const key = (item.day || "").toUpperCase();
      map.set(key, [...(map.get(key) ?? []), item]);
    });
    return Array.from(map.entries())
      .sort(([a], [b]) => {
        const ai = DAY_ORDER.indexOf(a);
        const bi = DAY_ORDER.indexOf(b);
        return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
      })
      .map(([day, dayItems]) => [day, [...dayItems].sort((a, b) => (a.time ?? "").localeCompare(b.time ?? ""))] as const);
  }, [items]);

  if (isLoading) {
    return <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}><CircularProgress size={22} /></Box>;
  }
  if (isError) {
    return <Typography color="error" fontSize={13.5}>{t("teacherGroups.schedule.loadError")}</Typography>;
  }
  if (items.length === 0) {
    return <Typography color="text.secondary" fontSize={13.5}>{t("teacherGroups.schedule.empty")}</Typography>;
  }

  return (
    <Box sx={{ display: "flex", gap: 2, overflowX: "auto", pb: 1 }}>
      {byDay.map(([day, dayItems]) => (
        <Paper
          key={day}
          elevation={0}
          sx={{ minWidth: 200, flexShrink: 0, p: 2, borderRadius: "12px", border: "1px solid #e5e7eb" }}
        >
          <Typography fontSize={13.5} fontWeight={700} mb={1.2}>
            {t(`singleGroup.editGroupDrawer.weekdays.${day}`, { defaultValue: day })}
          </Typography>
          <Stack gap={1}>
            {dayItems.map((item, i) => (
              <Stack key={`${item.groupId}-${i}`} direction="row" alignItems="center" gap={1}>
                <TbClock size={14} color="#9ca3af" />
                <Typography fontSize={12.5} color="text.secondary" sx={{ minWidth: 42 }}>{item.time || "—"}</Typography>
                <Typography fontSize={12.5} fontWeight={500}>{item.groupName}</Typography>
              </Stack>
            ))}
          </Stack>
        </Paper>
      ))}
    </Box>
  );
};

export const TeacherGroups = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data, isLoading, isError } = useTeacherPortalGroupsQuery();
  const groups = data ?? [];

  return (
    <Box sx={{ p: 3 }}>
      <Typography fontSize={22} fontWeight={700} mb={2}>
        {t("teacherGroups.scheduleTitle")}
      </Typography>
      <TeacherSchedule />

      <Typography fontSize={22} fontWeight={700} mt={4} mb={2.5}>
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
