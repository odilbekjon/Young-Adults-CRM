// "Groups" part of the TEACHER Account → Profile tab: this teacher's own groups
// as cards (GET /teacher-portal/groups) and, for the selected one, its details
// and roster (GET /teacher-portal/groups/{id} + /students). The list endpoint
// often leaves out course/dates/room/time, so every group is completed from
// its own detail (GET /teacher-portal/groups/{id}) and the schedule
// (GET /teacher-portal/schedule) — see useMergedGroup. Renders two grid
// cells (cards column + selected-group panel) for TeacherOwnProfile's
// `.teacher-profile-grid`, mirroring the admin TeacherProfile layout.
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Box, Button, Chip, CircularProgress, Paper, Typography } from "@mui/material";
import {
  useTeacherPortalGroupByIdQuery,
  useTeacherPortalGroupsQuery,
  useTeacherPortalGroupStudentsQuery,
  useTeacherPortalScheduleQuery,
} from "../../app/api/teacherPortalApi";
import type { TeacherPortalGroup } from "../../app/api/teacherPortalApi/types";
import { formatTrainingDate } from "../../utils/formatTrainingDate";
import { TeacherStudentRow } from "./TeacherStudentRow";

const cardSx = {
  bgcolor: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 2, minWidth: 0,
};

// Same precedence as TeacherGroupDetail: detail → list → schedule, field by
// field, so whichever endpoint actually carries a value wins over an empty one.
const useMergedGroup = (g: TeacherPortalGroup | undefined): TeacherPortalGroup | undefined => {
  const { data: detail } = useTeacherPortalGroupByIdQuery(g?.id ?? "", { skip: !g?.id });
  const { data: schedule } = useTeacherPortalScheduleQuery();
  return useMemo(() => {
    if (!g) return undefined;
    const sch = schedule?.find((s) => (s.groupId && s.groupId === g.id) || (s.groupName && s.groupName === g.name));
    return {
      ...g,
      courseName: detail?.courseName || g.courseName || sch?.courseName || "",
      daysType: detail?.daysType ?? g.daysType ?? (sch?.daysType || null),
      time: detail?.time ?? g.time ?? sch?.time ?? null,
      roomName: detail?.roomName ?? g.roomName ?? (sch?.roomName || null),
      roomCapacity: detail?.roomCapacity ?? g.roomCapacity ?? sch?.maxStudents ?? null,
      price: detail?.price ?? g.price,
      trainingStart: detail?.trainingStart ?? g.trainingStart ?? sch?.trainingStart ?? null,
      trainingEnd: detail?.trainingEnd ?? g.trainingEnd ?? sch?.trainingEnd ?? null,
      studentsCount: detail?.studentsCount || g.studentsCount || detail?.students.length || sch?.studentsCount || 0,
    };
  }, [g, detail, schedule]);
};

const daysLabelOf = (daysType: string | null, t: (key: string) => string) => {
  const key = daysType?.toUpperCase();
  return key === "ODD" || key === "EVEN" ? t(`teacherGroups.days.${key}`) : daysType;
};

const datesOf = (start: string | null, end: string | null) =>
  start || end ? `${formatTrainingDate(start)} — ${formatTrainingDate(end)}` : "";

const GroupCard = ({ group, active, onSelect }: { group: TeacherPortalGroup; active: boolean; onSelect: () => void }) => {
  const { t } = useTranslation();
  const g = useMergedGroup(group) ?? group;
  const schedule = [daysLabelOf(g.daysType, t), g.time].filter(Boolean).join(" • ");
  return (
    <Paper
      elevation={0}
      onClick={onSelect}
      sx={{
        ...cardSx, p: 1.75, cursor: "pointer", display: "flex", alignItems: "center",
        justifyContent: "space-between", gap: 1.5, flexShrink: 0,
        borderColor: active ? "var(--color-primary)" : "var(--color-border)",
        boxShadow: active ? "0 0 0 1px var(--color-primary)" : "none",
      }}
    >
      <Box sx={{ minWidth: 0, flex: "1 1 0" }}>
        <Chip label={g.name} size="small" sx={{ fontWeight: 600, mb: 0.75, maxWidth: "100%" }} />
        <Typography fontSize={14} sx={{ color: "var(--color-text-primary)", wordBreak: "break-word" }}>
          {g.courseName || "—"}
        </Typography>
      </Box>
      <Box sx={{ textAlign: "center", fontSize: 12.5, lineHeight: 1.5, color: "var(--color-text-secondary)", flexShrink: 0 }}>
        <Box>{datesOf(g.trainingStart, g.trainingEnd) || "—"}</Box>
        <Box>{schedule || "—"}</Box>
      </Box>
      <Box sx={{
        bgcolor: "#1a5490", color: "#fff", borderRadius: 1, px: 1, py: 0.25,
        fontSize: 12, fontWeight: 700, flexShrink: 0,
      }}>
        {g.studentsCount}
      </Box>
    </Paper>
  );
};

export const TeacherAccountGroups = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data, isLoading, isError, refetch } = useTeacherPortalGroupsQuery(undefined, {
    refetchOnMountOrArgChange: true,
  });
  const groups = useMemo(() => data ?? [], [data]);
  const [selectedId, setSelectedId] = useState("");

  // Keep a valid selection: the first group until the user picks another.
  useEffect(() => {
    if (groups.length > 0 && !groups.some((g) => g.id === selectedId)) setSelectedId(groups[0].id);
  }, [groups, selectedId]);

  const selected = useMergedGroup(groups.find((g) => g.id === selectedId));
  const {
    data: students, isLoading: studentsLoading, isError: studentsError, refetch: refetchStudents,
  } = useTeacherPortalGroupStudentsQuery(selectedId, { skip: !selectedId });

  if (isLoading) {
    return <Box sx={{ display: "flex", justifyContent: "center", py: 6, gridColumn: { lg: "span 2" } }}><CircularProgress size={26} /></Box>;
  }
  if (isError) {
    return (
      <Box sx={{ gridColumn: { lg: "span 2" } }}>
        <Typography color="error" fontSize={14} mb={1.5}>{t("teacherGroups.loadError")}</Typography>
        <Button size="small" variant="outlined" onClick={() => refetch()} sx={{ textTransform: "none" }}>
          {t("teacherDashboard.schedule.retry")}
        </Button>
      </Box>
    );
  }

  return (
    <>
      {/* ── Group cards ── */}
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="h5" fontWeight={500} sx={{ mb: 1.5, color: "var(--color-text-primary)" }}>
          {t("teacherPortal.account.groups")}
        </Typography>

        {groups.length === 0 ? (
          <Typography color="text.secondary" fontSize={14}>{t("teacherGroups.empty")}</Typography>
        ) : (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.25, maxHeight: { lg: 560 }, overflowY: "auto", pr: 0.25 }}>
            {groups.map((g) => (
              <GroupCard key={g.id} group={g} active={g.id === selectedId} onSelect={() => setSelectedId(g.id)} />
            ))}
          </Box>
        )}
      </Box>

      {/* ── Selected group: details + roster ── */}
      {selected && (
        <Paper elevation={0} sx={{ ...cardSx, p: 2.5, mt: { lg: 5 } }}>
          <Box sx={{ textAlign: "right", mb: 2 }}>
            <Chip label={selected.name} sx={{ fontWeight: 600, fontSize: 15, height: 32, mb: 1, maxWidth: "100%" }} />
            <Typography fontSize={19} sx={{ color: "var(--color-text-primary)", wordBreak: "break-word" }}>{selected.courseName || "—"}</Typography>
            <Typography fontSize={15} sx={{ color: "var(--color-text-secondary)" }}>
              {t("singleGroup.leftPanel.rooms")}: <b>{selected.roomName || "—"}</b>
            </Typography>
            <Typography fontSize={15} sx={{ color: "var(--color-text-secondary)" }}>
              {t("teacherPortal.account.start")}: <b>{selected.time || "—"}</b>
            </Typography>
            <Typography fontSize={15} sx={{ color: "var(--color-text-secondary)" }}>
              {t("singleGroup.leftPanel.time")}:{" "}
              <b>{[daysLabelOf(selected.daysType, t), selected.time].filter(Boolean).join(" • ") || "—"}</b>
            </Typography>
            <Typography fontSize={15} sx={{ color: "var(--color-text-secondary)" }}>
              {t("singleGroup.leftPanel.trainingStart")}: <b>{formatTrainingDate(selected.trainingStart)}</b>
            </Typography>
            <Typography fontSize={15} sx={{ color: "var(--color-text-secondary)" }}>
              {t("singleGroup.leftPanel.trainingEnd")}: <b>{formatTrainingDate(selected.trainingEnd)}</b>
            </Typography>
          </Box>

          <Box sx={{ borderTop: "1px solid var(--color-border)", pt: 1.5, maxHeight: 360, overflowY: "auto" }}>
            {studentsLoading ? (
              <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}><CircularProgress size={22} /></Box>
            ) : studentsError ? (
              <Box>
                <Typography color="error" fontSize={13} mb={1}>{t("teacherGroups.rosterLoadError")}</Typography>
                <Button size="small" variant="outlined" onClick={() => refetchStudents()} sx={{ textTransform: "none" }}>
                  {t("teacherDashboard.schedule.retry")}
                </Button>
              </Box>
            ) : (students ?? []).length === 0 ? (
              <Typography fontSize={13} color="text.secondary">{t("teacherGroups.rosterEmpty")}</Typography>
            ) : (
              (students ?? []).map((s) => <TeacherStudentRow key={s.id} student={s} groupId={selectedId} />)
            )}
          </Box>

          <Button
            variant="outlined"
            size="small"
            onClick={() => navigate(`/groups/${selected.id}`)}
            sx={{ mt: 2, textTransform: "none" }}
          >
            {t("teacherPortal.account.openGroup")}
          </Button>
        </Paper>
      )}
    </>
  );
};
