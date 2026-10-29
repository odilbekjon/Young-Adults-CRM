import { Box } from "@mui/material";
import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";
import { todayLocalISO } from "../../utils/localDate";
import { getStudyPeriod, type StudySpan } from "../../utils/studyPeriod";

// "1 month 2 weeks", "10 months", "3 weeks"; "3 days" when it is under a week.
const spanText = (t: TFunction, { months, weeks, days }: StudySpan): string => {
  const parts: string[] = [];
  if (months) parts.push(t("groups.table.span.month", { count: months }));
  if (weeks) parts.push(t("groups.table.span.week", { count: weeks }));
  return (parts.length ? parts : [t("groups.table.span.day", { count: days })]).join(" ");
};

// "Week of study" column: how much of the group's course has passed and how long
// it lasts in total, both worked out from its training dates (the backend only
// sends a free-text `weekOfStudy`, shown when a group has no start date).
export const StudyPeriodCell = ({ startDate, endDate, fallback }: { startDate: string; endDate: string; fallback: string }) => {
  const { t } = useTranslation();
  const period = getStudyPeriod(startDate, endDate, todayLocalISO());
  if (!period) return <>{fallback || "—"}</>;

  const total = period.total ? spanText(t, period.total) : null;
  const progress =
    period.state === "running" ? spanText(t, period.elapsed)
    : period.state === "finished" ? t("groups.table.finished")
    : t("groups.table.notStarted");

  return (
    <>
      <Box>{progress}</Box>
      {total && (
        <Box sx={{ color: "var(--color-text-muted)", fontSize: 12 }}>
          {period.state === "running" ? t("groups.table.studyOf", { total }) : total}
        </Box>
      )}
    </>
  );
};
