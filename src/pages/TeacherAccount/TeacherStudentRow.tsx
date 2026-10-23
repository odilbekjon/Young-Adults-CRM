// One roster row of the TEACHER Account → Profile → selected-group panel, with
// the student hover card (name/id, status, debtor badge, phone, balance,
// added/activated dates, note, coins). Data comes from GET
// /teacher-portal/groups/{id}/students; whatever that roster row leaves out
// (the added/activated dates in particular) is filled from GET
// /students/{id} while the card is open - a best-effort lookup whose failure
// (e.g. no permission for a teacher) is ignored. A teacher must not open the
// student profile, so unlike the admin cards there is deliberately no
// "Go to profile" link and the row itself is not clickable.
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Box, Typography } from "@mui/material";
import type { TeacherPortalGroupStudent } from "../../app/api/teacherPortalApi/types";
import { useStudentByIdQuery, useStudentGroupMembershipsQuery } from "../../app/api/studentsApi";
import { BALANCE_STATUS_COLOR, classifyBalance, formatPhone, formatTrainingDate } from "../../utils";

const CARD_WIDTH = 300;
const CARD_HEIGHT = 420; // conservative estimate, only used to keep the card on screen

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <Box sx={{ borderTop: "1px solid var(--color-border-subtle)", py: 1.1 }}>
    <Box sx={{ fontSize: 12, color: "var(--color-text-muted)", mb: 0.4 }}>{label}</Box>
    <Box sx={{ fontSize: 14, color: "var(--color-text-primary)" }}>{children}</Box>
  </Box>
);

const StudentHoverCard = ({
  student, groupId, position, onMouseEnter, onMouseLeave,
}: {
  student: TeacherPortalGroupStudent;
  groupId: string;
  position: { top: number; left: number; arrowSide: "left" | "right" };
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}) => {
  const { t } = useTranslation();
  const { data: detailData } = useStudentByIdQuery(student.id, { skip: !student.id });
  const detail = detailData?.data;
  // This student's own dates in THIS group (entry `id` = group id); a failure
  // (e.g. no permission for a teacher) just leaves the lines out.
  const { data: memberships } = useStudentGroupMembershipsQuery(student.id, { skip: !student.id });
  const membership = memberships?.find((m) => m.id === groupId);
  const balance = student.balance ?? detail?.balance ?? null;
  const createdAt = student.createdAt ?? detail?.createdAt ?? null;
  const joinedAt = membership?.joinedAt ?? null;
  const activatedAt = membership?.paymentStartDate ?? student.activatedAt ?? null;
  const comment = student.comment ?? detail?.description ?? detail?.comment ?? null;
  const isDebtor = balance !== null && balance < 0;
  const knownStatus = student.status || detail?.status;
  const statusLabel = !knownStatus
    ? null
    : knownStatus === "INACTIVE"
    ? t("singleGroup.studentHoverCard.inactiveArchived")
    : knownStatus === "FROZEN"
    ? t("singleGroup.studentHoverCard.frozenPaused")
    : t("singleGroup.studentHoverCard.activeLearns");
  const shortId = student.id.length > 12 ? `${student.id.slice(0, 8)}…` : student.id;

  return (
    <Box
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      sx={{
        position: "fixed", top: position.top, left: position.left, zIndex: 2000,
        width: CARD_WIDTH, maxWidth: "calc(100vw - 24px)",
        bgcolor: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "4px",
        boxShadow: "0 4px 18px rgba(0,0,0,0.16)", px: 2.5, pt: 2, pb: 0.5,
        animation: "teacherStudentCardIn 0.15s ease",
        "@keyframes teacherStudentCardIn": {
          from: { opacity: 0, transform: "translateY(4px)" },
          to: { opacity: 1, transform: "translateY(0)" },
        },
      }}
    >
      {/* Pointer toward the hovered row */}
      <Box
        aria-hidden
        sx={{
          position: "absolute", top: 28, width: 10, height: 10, transform: "rotate(45deg)",
          bgcolor: "var(--color-surface)", border: "1px solid var(--color-border)",
          ...(position.arrowSide === "right"
            ? { right: -6, borderLeft: "none", borderBottom: "none" }
            : { left: -6, borderRight: "none", borderTop: "none" }),
        }}
      />

      <Box sx={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 1, mb: 0.25 }}>
        <Typography component="span" sx={{ fontSize: 16, color: "var(--color-text-primary)", wordBreak: "break-word" }}>
          {student.name}
        </Typography>
        <Typography component="span" sx={{ fontSize: 12, color: "var(--color-text-muted)", whiteSpace: "nowrap" }} title={student.id}>
          (id:{shortId})
        </Typography>
      </Box>
      {statusLabel && <Box sx={{ fontSize: 13, color: "var(--color-text-muted)", mb: 1 }}>{statusLabel}</Box>}
      {isDebtor && (
        <Box
          component="span"
          sx={{
            display: "inline-block", bgcolor: BALANCE_STATUS_COLOR.debtor, color: "#fff",
            fontSize: 11, fontWeight: 600, borderRadius: "20px", px: 1.5, py: 0.4, mb: 1.5,
          }}
        >
          {t("singleGroup.studentHoverCard.debtor")}
        </Box>
      )}

      {formatPhone(student.phone) && (
        <Field label={t("singleGroup.studentHoverCard.phone")}>{formatPhone(student.phone)}</Field>
      )}

      {balance !== null && (
        <Field label={t("singleGroup.studentHoverCard.balance")}>
          <Box
            component="span"
            sx={{
              display: "inline-block", bgcolor: balance === 0 ? "#6b7280" : BALANCE_STATUS_COLOR[classifyBalance(balance)], color: "#fff",
              fontSize: 12, fontWeight: 600, borderRadius: "20px", px: 1.5, py: 0.4,
            }}
          >
            {balance > 0 ? "+" : ""}{balance.toLocaleString("ru-RU")} UZS
          </Box>
        </Field>
      )}

      {createdAt && <Field label={t("singleGroup.studentHoverCard.addedAt")}>{formatTrainingDate(createdAt)}</Field>}
      {joinedAt && <Field label={t("singleGroup.studentHoverCard.joinedAt")}>{formatTrainingDate(joinedAt)}</Field>}
      {activatedAt && <Field label={t("singleGroup.studentHoverCard.activatedAt")}>{formatTrainingDate(activatedAt)}</Field>}

      {comment && (
        <Field label={t("singleGroup.studentHoverCard.note")}>
          <Box component="span" sx={{ whiteSpace: "pre-wrap", fontSize: 13 }}>{comment}</Box>
        </Field>
      )}

    </Box>
  );
};

export const TeacherStudentRow = ({ student, groupId }: { student: TeacherPortalGroupStudent; groupId: string }) => {
  const { t } = useTranslation();
  const [hovered, setHovered] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number; arrowSide: "left" | "right" }>({
    top: 0, left: 0, arrowSide: "right",
  });
  const rowRef = useRef<HTMLDivElement>(null);
  const enterTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimers = () => {
    if (enterTimer.current) clearTimeout(enterTimer.current);
    if (leaveTimer.current) clearTimeout(leaveTimer.current);
  };
  useEffect(() => clearTimers, []);

  const handleMouseEnter = () => {
    clearTimers();
    if (rowRef.current) {
      const rect = rowRef.current.getBoundingClientRect();
      const width = Math.min(CARD_WIDTH, window.innerWidth - 24);
      const leftCandidate = rect.left - width - 8;
      const fitsLeft = leftCandidate >= 12;
      const left = fitsLeft
        ? leftCandidate
        : Math.max(12, Math.min(rect.right + 8, window.innerWidth - width - 12));
      setPosition({
        top: Math.max(12, Math.min(rect.top - 20, window.innerHeight - CARD_HEIGHT - 12)),
        left,
        arrowSide: fitsLeft ? "right" : "left",
      });
    }
    enterTimer.current = setTimeout(() => setHovered(true), 150);
  };

  // Short grace period so the pointer can travel from the row into the card.
  const handleMouseLeave = () => {
    clearTimers();
    leaveTimer.current = setTimeout(() => setHovered(false), 200);
  };

  return (
    <>
      <Box
        ref={rowRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        sx={{
          display: "flex", justifyContent: "space-between", alignItems: "center", gap: 2, py: 0.9,
          cursor: "default",
          "& .name": { color: hovered ? "#185FA5" : "var(--color-text-primary)", transition: "color 0.12s" },
        }}
      >
        <Typography className="name" fontSize={14} sx={{ minWidth: 0, wordBreak: "break-word" }}>{student.name}</Typography>
        <Typography fontSize={12} sx={{ color: "var(--color-text-secondary)", whiteSpace: "nowrap" }}>
          {formatPhone(student.phone) || t("teacherGroups.noPhone")}
        </Typography>
      </Box>
      {hovered && (
        <StudentHoverCard
          student={student}
          groupId={groupId}
          position={position}
          onMouseEnter={clearTimers}
          onMouseLeave={handleMouseLeave}
        />
      )}
    </>
  );
};
