import { Box, Paper, Typography, CircularProgress, Stack } from "@mui/material";
import { useTranslation } from "react-i18next";
import { useMemo } from "react";
import { TbClock } from "react-icons/tb";
import { useStudentPortalScheduleQuery } from "../../../app/api/studentPortalApi";

const DAY_ORDER = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"];

export const StudentPortalSchedule = () => {
  const { t } = useTranslation();
  const { data, isLoading, isError } = useStudentPortalScheduleQuery();
  const items = data ?? [];

  const byDay = useMemo(() => {
    const map = new Map<string, typeof items>();
    items.forEach((item) => {
      const key = item.day || "—";
      map.set(key, [...(map.get(key) ?? []), item]);
    });
    return Array.from(map.entries()).sort(([a], [b]) => {
      const ai = DAY_ORDER.indexOf(a.toUpperCase());
      const bi = DAY_ORDER.indexOf(b.toUpperCase());
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    });
  }, [items]);

  return (
    <Box>
      <Typography fontSize={22} fontWeight={700} color="var(--color-text-primary)" mb={2.5}>
        {t("studentPortal.schedule.title")}
      </Typography>

      {isLoading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}><CircularProgress size={26} /></Box>
      ) : isError ? (
        <Typography color="var(--color-danger)" fontSize={14}>{t("studentPortal.schedule.loadError")}</Typography>
      ) : items.length === 0 ? (
        <Typography color="var(--color-text-muted)" fontSize={14}>{t("studentPortal.schedule.empty")}</Typography>
      ) : (
        <Stack gap={2}>
          {byDay.map(([day, dayItems]) => (
            <Paper key={day} elevation={0} sx={{ p: 2.5, borderRadius: "12px", border: "1px solid var(--color-border)", bgcolor: "var(--color-surface)" }}>
              <Typography fontSize={14} fontWeight={700} color="var(--color-text-primary)" mb={1.5}>
                {t(`studentPortal.schedule.days.${day.toLowerCase()}`, { defaultValue: day })}
              </Typography>
              <Stack gap={1}>
                {dayItems.map((item, i) => (
                  <Stack key={`${item.groupId}-${i}`} direction="row" alignItems="center" gap={1}>
                    <TbClock size={15} color="var(--color-text-muted)" />
                    <Typography fontSize={13} color="var(--color-text-secondary)">{item.time || "—"}</Typography>
                    <Typography fontSize={13} color="var(--color-text-primary)" fontWeight={500}>{item.groupName}</Typography>
                  </Stack>
                ))}
              </Stack>
            </Paper>
          ))}
        </Stack>
      )}
    </Box>
  );
};

export default StudentPortalSchedule;
