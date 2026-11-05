// One roster row of the TEACHER Account → Profile → selected-group panel. Hovering
// (or focusing, or tapping) it opens the same teacher card as the group page
// roster (TeacherStudentHoverCard): balance status — debtor / no debt, never an
// amount —, phone, the day the student joined the group and the day billing
// became active. Data comes only from GET /teacher-portal/groups/{id}/students; no
// staff endpoint (GET /students/{id} and the like) is called from a teacher
// session. A teacher must not open the student profile, so there is deliberately
// no "Go to profile" link and the row itself is not clickable.
import { useTranslation } from "react-i18next";
import { Box, Typography } from "@mui/material";
import type { TeacherPortalGroupStudent } from "../../app/api/teacherPortalApi/types";
import { formatPhone } from "../../utils/formatPhone";
import { GROUP_STATUS_STYLE, toGroupStatus } from "../SingleGroup/StudentStatusDot";
import { TeacherStudentHoverCard } from "../SingleGroup/StudentHoverCard/TeacherStudentHoverCard";
import { useStudentCardTrigger } from "../SingleGroup/StudentHoverCard/useStudentCardTrigger";

export const TeacherStudentRow = ({ student }: { student: TeacherPortalGroupStudent }) => {
  const { t } = useTranslation();
  const { open, triggerProps, cardProps, anchorRef } = useStudentCardTrigger<HTMLDivElement>();
  // A trial lesson / freeze tints the name like the group roster does.
  const groupStatus = toGroupStatus(student.status);
  const pill = groupStatus === "PROBATION" || groupStatus === "FROZEN" ? GROUP_STATUS_STYLE[groupStatus] : undefined;

  return (
    <>
      <Box
        {...triggerProps}
        sx={{
          display: "flex", justifyContent: "space-between", alignItems: "center", gap: 2, py: 0.9,
          cursor: "default",
          "& .name": { color: open ? "#185FA5" : "var(--color-text-primary)", transition: "color 0.12s" },
        }}
      >
        <Typography
          className="name"
          fontSize={14}
          sx={{
            minWidth: 0, wordBreak: "break-word",
            ...(pill && { backgroundColor: pill.background, color: `${pill.color} !important`, borderRadius: "6px", px: 1, py: 0.25 }),
          }}
        >
          {student.name}
        </Typography>
        <Typography fontSize={12} sx={{ color: "var(--color-text-secondary)", whiteSpace: "nowrap" }}>
          {formatPhone(student.phone) || t("teacherGroups.noPhone")}
        </Typography>
      </Box>
      <TeacherStudentHoverCard student={student} open={open} anchorRef={anchorRef} {...cardProps} />
    </>
  );
};
