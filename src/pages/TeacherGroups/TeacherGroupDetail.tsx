// TEACHER-role detail view for one of their own groups — reached at the same
// /groups/:id route the admin SingleGroup page uses, selected by role in
// src/routes/RoleGroupsRoute.tsx. Backed by
//   GET /teacher-portal/groups/{id}           (header: name/course/days/room)
//   GET /teacher-portal/groups/{id}/students  (roster with phones)
// both scoped server-side to this teacher; a group that isn't theirs comes
// back as an error, handled as "not found" below rather than trying to
// distinguish 403 from 404. Laid out like the admin SingleGroup page (title,
// info + roster panel on the left, tabs on the right) but with only the
// Attendance / Grade / Online lessons tabs — no Discount prices, Exams,
// History or Comments, no freeze/remove/move/payment/edit actions, and no
// per-student profile links (StudentProfile is outside ProtectedRoute's
// teacher allowlist anyway, so the rows simply aren't clickable).
import { useEffect, useMemo, useState } from "react";
import {
  Box, Paper, Typography, CircularProgress, Stack, Button, Divider, List, ListItem, ListItemText, Tabs, Tab,
} from "@mui/material";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { IoArrowBack } from "react-icons/io5";
import { MdCalendarToday } from "react-icons/md";
import {
  useTeacherPortalGroupByIdQuery,
  useTeacherPortalGroupsQuery,
  useTeacherPortalGroupStudentsQuery,
  useTeacherPortalScheduleQuery,
} from "../../app/api/teacherPortalApi";
import { formatTrainingDate } from "../../utils/formatTrainingDate";
import { useAuth } from "../../hooks/useAuth";
import { Attendance } from "../SingleGroup/tabs/Attendance";
import { Grade } from "../SingleGroup/tabs/Grade";
import { OnlineLessons } from "../SingleGroup/tabs/OnlineLessons";

// Tabs a TEACHER gets on a group page (keys of singleGroup.tabs.*).
const TEACHER_TAB_KEYS = ["attendance", "grade", "onlineLessons"] as const;

export const TeacherGroupDetail = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [tabIndex, setTabIndex] = useState(0);
  // Client-side ownership check on top of the backend's own scoping: a group
  // id that isn't in this teacher's own group list (GET /teacher-portal/groups,
  // refetched fresh so a just-assigned group isn't rejected from a stale
  // cache) is treated as "not found" and nothing about it is fetched/shown —
  // the group's own requests wait until that list has answered.
  const { data: myGroups, isSuccess: myGroupsLoaded, isFetching: myGroupsFetching } =
    useTeacherPortalGroupsQuery(undefined, { refetchOnMountOrArgChange: true });
  // The query refetches on mount (effect), so the first render still sees the
  // pre-mount cache — only trust the list once a fetch has run and finished.
  const [sawListFetch, setSawListFetch] = useState(false);
  useEffect(() => {
    if (myGroupsFetching) setSawListFetch(true);
  }, [myGroupsFetching]);
  const ownListSettled = sawListFetch && !myGroupsFetching;
  const notMine =
    !!id && ownListSettled && myGroupsLoaded && (myGroups?.length ?? 0) > 0 && !myGroups?.some((g) => g.id === id);
  const skipGroup = !id || notMine || !ownListSettled;
  const { data: group, isLoading, isError } = useTeacherPortalGroupByIdQuery(id ?? "", { skip: skipGroup });
  const {
    data: rosterData, isLoading: rosterLoading, isError: rosterError, refetch: refetchRoster,
  } = useTeacherPortalGroupStudentsQuery(id ?? "", { skip: skipGroup });

  // The group endpoint can leave out schedule/room/price fields the list and
  // schedule endpoints do carry — each one falls back to those (see `info`).
  const { data: schedule } = useTeacherPortalScheduleQuery();

  // The roster endpoint is the source of truth; the student list embedded in
  // the group payload (if any) is only used when that request itself failed.
  const students = useMemo(
    () => (rosterData ?? (rosterError ? group?.students : undefined) ?? []).filter((s) => s.id && s.name),
    [rosterData, rosterError, group],
  );
  // Students who already left the group (INACTIVE/DELETED) stay out of the
  // attendance grid — same as the admin group page, which hides archived
  // members — so a mark is never attempted for someone the backend no longer
  // counts as a member (it rejects those).
  const attendanceStudents = useMemo(
    () =>
      students
        .filter((s) => s.status !== "INACTIVE" && s.status !== "DELETED")
        .map((s, i) => ({ id: i + 1, realId: s.id, name: s.name, phone: s.phone ?? "", active: true })),
    [students],
  );

  if ((isLoading || !ownListSettled) && !notMine) {
    return <Box sx={{ p: 4, display: "flex", justifyContent: "center" }}><CircularProgress /></Box>;
  }

  if (notMine || isError || !group) {
    return (
      <Box sx={{ p: 4 }}>
        <Typography color="error" mb={2}>{t("teacherGroups.notFound")}</Typography>
        <Button startIcon={<IoArrowBack />} onClick={() => navigate("/dashboard")} sx={{ textTransform: "none" }}>
          {t("teacherGroups.backToGroups")}
        </Button>
      </Box>
    );
  }

  const listItem = myGroups?.find((g) => g.id === id);
  const scheduleItem = schedule?.find((s) => s.groupId === id);
  const info = {
    daysType: group.daysType ?? listItem?.daysType ?? (scheduleItem?.daysType || null),
    time: group.time ?? listItem?.time ?? scheduleItem?.time ?? null,
    roomName: group.roomName ?? listItem?.roomName ?? (scheduleItem?.roomName || null),
    roomCapacity: group.roomCapacity ?? listItem?.roomCapacity ?? scheduleItem?.maxStudents ?? null,
    price: group.price ?? listItem?.price ?? null,
    trainingStart: group.trainingStart ?? listItem?.trainingStart ?? scheduleItem?.trainingStart ?? null,
    trainingEnd: group.trainingEnd ?? listItem?.trainingEnd ?? scheduleItem?.trainingEnd ?? null,
  };
  const daysKey = info.daysType?.toUpperCase();
  const daysLabel = daysKey === "ODD" || daysKey === "EVEN" ? t(`teacherGroups.days.${daysKey}`) : info.daysType;
  const timeLabel = [daysLabel, info.time].filter(Boolean).join(" · ") || "—";
  const teacherName = user?.name || "—";

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#f7f8fa" }}>
      {/* PAGE TITLE */}
      <Stack direction="row" alignItems="center" spacing={1.5} flexWrap="wrap" rowGap={0.5} px={3} pt={3} pb={2}>
        <Typography variant="h5" fontWeight={700}>{group.name}</Typography>
        {group.courseName && (
          <>
            <Typography variant="h5" color="text.secondary">·</Typography>
            <Typography variant="h5" fontWeight={700}>{group.courseName}</Typography>
          </>
        )}
        <Typography variant="h5" color="text.secondary">·</Typography>
        <Typography variant="h5" fontWeight={700} sx={{ color: "#185FA5" }}>{teacherName}</Typography>
      </Stack>

      <Stack direction={{ xs: "column", md: "row" }} gap={2} px={3} pb={3} alignItems="flex-start">
        {/* ── LEFT PANEL ── */}
        <Paper sx={{ width: { xs: "100%", md: 300 }, flexShrink: 0, borderRadius: 3, p: 2.5 }}>
          <Typography fontSize={14}><b>{t("singleGroup.leftPanel.course")}:</b> {group.courseName || "—"}</Typography>
          <Typography fontSize={14}><b>{t("singleGroup.leftPanel.teacher")}:</b> {teacherName}</Typography>
          <Typography fontSize={14}>
            <b>{t("singleGroup.leftPanel.price")}:</b> {info.price ? `${info.price.toLocaleString()} UZS` : "—"}
          </Typography>
          <Typography fontSize={14}><b>{t("singleGroup.leftPanel.time")}:</b> {timeLabel}</Typography>

          <Divider sx={{ my: 1.5 }} />

          <Typography fontSize={14}><b>{t("singleGroup.leftPanel.rooms")}:</b> {info.roomName || "—"}</Typography>
          <Typography fontSize={14}><b>{t("singleGroup.leftPanel.roomCapacity")}:</b> {info.roomCapacity ?? "—"}</Typography>

          <Box sx={{ mt: 1.5, p: 1.5, borderRadius: 2, bgcolor: "#f5f7fb", border: "1px solid #eef0f4" }}>
            <Stack direction="row" alignItems="center" spacing={0.8} mb={1}>
              <MdCalendarToday size={14} color="#6b7280" />
              <Typography fontSize={11.5} fontWeight={700} color="text.secondary" sx={{ textTransform: "uppercase", letterSpacing: 0.4 }}>
                {t("singleGroup.leftPanel.trainingDates")}
              </Typography>
            </Stack>
            {info.trainingStart || info.trainingEnd ? (
              <Stack direction="row" alignItems="center" spacing={1.5} flexWrap="wrap" rowGap={1}>
                <Box>
                  <Typography fontSize={10.5} color="text.secondary">{t("singleGroup.leftPanel.trainingStart")}</Typography>
                  <Typography fontSize={13.5} fontWeight={600} color="#1a1a1a">{formatTrainingDate(info.trainingStart)}</Typography>
                </Box>
                <Typography fontSize={14} color="#c1c7d0">→</Typography>
                <Box>
                  <Typography fontSize={10.5} color="text.secondary">{t("singleGroup.leftPanel.trainingEnd")}</Typography>
                  <Typography fontSize={13.5} fontWeight={600} color="#1a1a1a">{formatTrainingDate(info.trainingEnd)}</Typography>
                </Box>
              </Stack>
            ) : (
              <Typography fontSize={13} color="text.secondary">{t("singleGroup.leftPanel.notScheduled")}</Typography>
            )}
          </Box>

          <Typography fontSize={12} color="text.secondary" sx={{ opacity: 0.55 }} mt={1.25}>
            {t("singleGroup.header.groupId")}: #{group.id || id}
          </Typography>

          <Divider sx={{ my: 1.5 }} />

          <Typography fontSize={14} fontWeight={600} mb={0.5}>
            {t("teacherGroups.roster")}{!rosterLoading && !rosterError ? ` (${students.length})` : ""}
          </Typography>
          {rosterLoading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}><CircularProgress size={22} /></Box>
          ) : rosterError && students.length === 0 ? (
            <Box>
              <Typography color="error" fontSize={13} mb={1}>{t("teacherGroups.rosterLoadError")}</Typography>
              <Button size="small" variant="outlined" onClick={() => refetchRoster()} sx={{ textTransform: "none" }}>
                {t("teacherDashboard.schedule.retry")}
              </Button>
            </Box>
          ) : students.length === 0 ? (
            <Typography fontSize={13} color="text.secondary">{t("teacherGroups.rosterEmpty")}</Typography>
          ) : (
            <List dense disablePadding>
              {students.map((s, i) => {
                const isArchived = s.status === "INACTIVE" || s.status === "DELETED";
                const isFrozen = s.status === "FROZEN";
                return (
                  <ListItem key={s.id} disablePadding sx={{ py: 0.6, opacity: isArchived ? 0.75 : 1 }}>
                    <Typography fontSize={12} color="text.secondary" sx={{ minWidth: 22, flexShrink: 0 }}>{i + 1}</Typography>
                    <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: isArchived ? "#bdbdbd" : "#43a047", mx: 1, flexShrink: 0 }} />
                    <ListItemText
                      primary={
                        <Typography
                          component="span"
                          fontSize={13}
                          fontWeight={500}
                          sx={{
                            display: "inline-block",
                            px: isFrozen ? 1 : 0,
                            py: isFrozen ? 0.35 : 0,
                            borderRadius: isFrozen ? "6px" : 0,
                            backgroundColor: isFrozen ? "#bfe3fa" : "transparent",
                            color: isArchived ? "dimgray" : "#1a1a1a",
                            textDecoration: isArchived ? "line-through" : "none",
                          }}
                        >
                          {s.name}
                        </Typography>
                      }
                      secondary={
                        <Typography fontSize={12} color="text.secondary" component="span" display="block">
                          {s.phone || t("teacherGroups.noPhone")}
                        </Typography>
                      }
                      sx={{ my: 0 }}
                    />
                  </ListItem>
                );
              })}
            </List>
          )}
        </Paper>

        {/* ── RIGHT PANEL ── */}
        <Box sx={{ flex: 1, minWidth: 0, overflow: "hidden" }}>
          <Paper sx={{ borderRadius: 3, overflow: "visible" }}>
            <Tabs
              value={tabIndex}
              onChange={(_, v) => setTabIndex(v)}
              variant="scrollable"
              scrollButtons="auto"
              sx={{
                borderBottom: "1px solid #eee",
                "& .MuiTab-root": { fontSize: 13, textTransform: "none", minWidth: "auto", px: 2 },
              }}
            >
              {TEACHER_TAB_KEYS.map((key) => (
                <Tab key={key} label={t(`singleGroup.tabs.${key}.tabLabel`)} />
              ))}
            </Tabs>
            <Box sx={{ p: 3, maxHeight: "calc(100vh - 220px)", overflowY: "auto", overflowX: "visible" }}>
              {rosterLoading ? (
                <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}><CircularProgress size={22} /></Box>
              ) : (
                <>
                  {tabIndex === 0 && (
                    <Attendance groupId={group.id || id || ""} students={attendanceStudents} groupName={group.name} restrictToToday />
                  )}
                  {tabIndex === 1 && <Grade students={attendanceStudents} />}
                  {tabIndex === 2 && <OnlineLessons />}
                </>
              )}
            </Box>
          </Paper>
        </Box>
      </Stack>
    </Box>
  );
};

export default TeacherGroupDetail;
