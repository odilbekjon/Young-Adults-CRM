// "Groups" half of the TEACHER Account → Profile tab: this teacher's own groups
// as cards (GET /teacher-portal/groups) and, for the selected one, its details
// and roster (GET /teacher-portal/groups/{id} + /students).
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Box, Button, Chip, CircularProgress, Paper, Typography } from "@mui/material";
import {
  useTeacherPortalGroupByIdQuery,
  useTeacherPortalGroupsQuery,
  useTeacherPortalGroupStudentsQuery,
} from "../../app/api/teacherPortalApi";
import { formatTrainingDate } from "../../utils/formatTrainingDate";

const cardSx = {
  bgcolor: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 2, minWidth: 0,
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

  const selected = groups.find((g) => g.id === selectedId);
  const { data: detail } = useTeacherPortalGroupByIdQuery(selectedId, { skip: !selectedId });
  const {
    data: students, isLoading: studentsLoading, isError: studentsError, refetch: refetchStudents,
  } = useTeacherPortalGroupStudentsQuery(selectedId, { skip: !selectedId });

  const daysLabel = (daysType: string | null) => {
    const key = daysType?.toUpperCase();
    return key === "ODD" || key === "EVEN" ? t(`teacherGroups.days.${key}`) : daysType;
  };
  const dates = (start: string | null, end: string | null) =>
    start || end ? `${formatTrainingDate(start)} — ${formatTrainingDate(end)}` : "";

  if (isLoading) {
    return <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}><CircularProgress size={26} /></Box>;
  }
  if (isError) {
    return (
      <Box>
        <Typography color="error" fontSize={14} mb={1.5}>{t("teacherGroups.loadError")}</Typography>
        <Button size="small" variant="outlined" onClick={() => refetch()} sx={{ textTransform: "none" }}>
          {t("teacherDashboard.schedule.retry")}
        </Button>
      </Box>
    );
  }

  const room = detail?.roomName ?? selected?.roomName;
  const time = detail?.time ?? selected?.time;

  return (
    <Box>
      <Typography variant="h5" fontWeight={500} sx={{ mb: 2, color: "var(--color-text-primary)" }}>
        {t("teacherPortal.account.groups")}
      </Typography>

      {groups.length === 0 ? (
        <Typography color="text.secondary" fontSize={14}>{t("teacherGroups.empty")}</Typography>
      ) : (
        <Box sx={{
          display: "grid", gap: 2.5, alignItems: "start",
          gridTemplateColumns: { xs: "minmax(0, 1fr)", md: "minmax(0, 1fr) minmax(0, 1fr)" },
        }}>
          {/* ── Group cards ── */}
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
            {groups.map((g) => {
              const active = g.id === selectedId;
              const schedule = [daysLabel(g.daysType), g.time].filter(Boolean).join(" • ");
              return (
                <Paper
                  key={g.id}
                  elevation={0}
                  onClick={() => setSelectedId(g.id)}
                  sx={{
                    ...cardSx, p: 2, cursor: "pointer", display: "flex", alignItems: "center",
                    justifyContent: "space-between", gap: 1.5,
                    borderColor: active ? "var(--color-primary)" : "var(--color-border)",
                    boxShadow: active ? "0 0 0 1px var(--color-primary)" : "none",
                  }}
                >
                  <Box sx={{ minWidth: 0 }}>
                    <Chip label={g.name} size="small" sx={{ fontWeight: 600, mb: 0.75, maxWidth: "100%" }} />
                    <Typography fontSize={14} sx={{ color: "var(--color-text-primary)", wordBreak: "break-word" }}>
                      {g.courseName || "—"}
                    </Typography>
                  </Box>
                  <Box sx={{ textAlign: "left", fontSize: 13, color: "var(--color-text-secondary)", flexShrink: 0 }}>
                    <Box>{dates(g.trainingStart, g.trainingEnd)}</Box>
                    <Box>{schedule}</Box>
                  </Box>
                  <Box sx={{
                    bgcolor: "#1a5490", color: "#fff", borderRadius: 1, px: 1, py: 0.25,
                    fontSize: 12, fontWeight: 700, flexShrink: 0,
                  }}>
                    {g.studentsCount}
                  </Box>
                </Paper>
              );
            })}
          </Box>

          {/* ── Selected group ── */}
          {selected && (
            <Paper elevation={0} sx={{ ...cardSx, p: 2.5 }}>
              <Box sx={{ textAlign: "right", mb: 2 }}>
                <Chip label={selected.name} sx={{ fontWeight: 600, fontSize: 16, height: 34, mb: 1 }} />
                <Typography fontSize={20} sx={{ color: "var(--color-text-primary)" }}>{selected.courseName || "—"}</Typography>
                <Typography fontSize={15} sx={{ color: "var(--color-text-secondary)" }}>
                  {t("singleGroup.leftPanel.rooms")}: <b>{room || "—"}</b>
                </Typography>
                <Typography fontSize={15} sx={{ color: "var(--color-text-secondary)" }}>
                  {t("teacherPortal.account.start")}: <b>{time || "—"}</b>
                </Typography>
              </Box>

              <Box sx={{ borderTop: "1px solid var(--color-border)", pt: 1.5 }}>
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
                  (students ?? []).map((s) => (
                    <Box key={s.id} sx={{ display: "flex", justifyContent: "space-between", gap: 2, py: 0.9 }}>
                      <Typography fontSize={14} sx={{ color: "var(--color-text-primary)" }}>{s.name}</Typography>
                      <Typography fontSize={13} sx={{ color: "var(--color-text-secondary)", whiteSpace: "nowrap" }}>
                        {s.phone || t("teacherGroups.noPhone")}
                      </Typography>
                    </Box>
                  ))
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
        </Box>
      )}
    </Box>
  );
};
