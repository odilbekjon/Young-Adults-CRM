// The hover card a TEACHER-role session gets on a student row — both the group
// page roster (TeacherGroupDetail) and the Account page roster (TeacherStudentRow).
// The staff card (StudentHoverCard) is a different thing: it shows money and links
// to the profile, which a teacher must not get. This one carries ONLY
//   - the balance STATUS: "Debtor" / "No debt" — never an amount, a currency
//     figure or a sign, anywhere in the DOM (text, title, aria-*),
//   - the phone number,
//   - the day the student joined this group,
//   - the day billing in this group became active.
// A value the backend did not send reads "—". Everything comes from the teacher's
// own roster row (GET /teacher-portal/groups/{id}/students); no staff endpoint is
// called.
//
// `useStudentCardTrigger` (its own file) gives the row its behaviour: hover, keyboard
// focus and tap open the card; blur, Escape and a press elsewhere close it.
import { useCallback, useLayoutEffect, useState, type RefObject } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { BALANCE_STATUS_COLOR } from "../../../utils/balance";
import { formatPhone } from "../../../utils/formatPhone";
import { formatTrainingDate } from "../../../utils/formatTrainingDate";

const CARD_WIDTH = 280;
const GAP = 10;
const VIEWPORT_MARGIN = 12;

export interface TeacherStudentCardData {
  phone?: string | null;
  /** true = in debt, false = not in debt, null/undefined = the backend did not say. */
  debtor?: boolean | null;
  /** Day the student joined this group. */
  joinedAt?: string | null;
  /** Day billing in this group became active. */
  paymentStartDate?: string | null;
}

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div style={{ borderTop: "1px solid var(--color-border-subtle)", padding: "9px 0" }}>
    <div style={{ fontSize: 11, color: "var(--color-text-muted)", marginBottom: 3 }}>{label}</div>
    <div style={{ fontSize: 13, color: "var(--color-text-primary)", fontWeight: 500 }}>{children}</div>
  </div>
);

const Card = ({
  student, anchorRef, cardRef, id, onMouseEnter, onMouseLeave,
}: {
  student: TeacherStudentCardData;
  anchorRef: RefObject<HTMLElement>;
  cardRef: RefObject<HTMLDivElement>;
  id: string;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}) => {
  const { t } = useTranslation();
  const [pos, setPos] = useState({ top: 0, left: 0 });

  // Beside the row (right, else left) so the card never covers the rows being
  // scanned; when neither side has room (a phone), under — or over — the row.
  const place = useCallback(() => {
    const anchor = anchorRef.current;
    const card = cardRef.current;
    if (!anchor || !card) return;
    const rect = anchor.getBoundingClientRect();
    const width = card.offsetWidth;
    const height = card.offsetHeight;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const clampTop = (top: number) => Math.max(VIEWPORT_MARGIN, Math.min(top, vh - height - VIEWPORT_MARGIN));
    if (vw - rect.right - GAP - VIEWPORT_MARGIN >= width) {
      setPos({ top: clampTop(rect.top), left: rect.right + GAP });
    } else if (rect.left - GAP - VIEWPORT_MARGIN >= width) {
      setPos({ top: clampTop(rect.top), left: rect.left - GAP - width });
    } else {
      const below = rect.bottom + GAP;
      setPos({
        top: below + height <= vh - VIEWPORT_MARGIN ? below : clampTop(rect.top - GAP - height),
        left: Math.max(VIEWPORT_MARGIN, Math.min(rect.left, vw - width - VIEWPORT_MARGIN)),
      });
    }
  }, [anchorRef, cardRef]);

  useLayoutEffect(() => {
    place();
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
  }, [place]);

  const debtor = student.debtor ?? null;
  const phone = formatPhone(student.phone) || "—";

  return createPortal(
    <div
      ref={cardRef}
      id={id}
      role="tooltip"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{
        position: "fixed",
        top: pos.top,
        left: pos.left,
        zIndex: 2000,
        boxSizing: "border-box",
        width: CARD_WIDTH,
        maxWidth: `calc(100vw - ${VIEWPORT_MARGIN * 2}px)`,
        background: "var(--color-surface)",
        border: "1px solid var(--color-border)",
        borderRadius: 12,
        boxShadow: "0 8px 32px rgba(0,0,0,0.13)",
        padding: "4px 18px",
      }}
    >
      <div style={{ padding: "9px 0" }}>
        <div style={{ fontSize: 11, color: "var(--color-text-muted)", marginBottom: 4 }}>
          {t("singleGroup.studentHoverCard.balanceStatus")}
        </div>
        {debtor === null ? (
          <span style={{ fontSize: 13, color: "var(--color-text-primary)", fontWeight: 500 }}>—</span>
        ) : (
          <span
            style={{
              display: "inline-block",
              background: debtor ? BALANCE_STATUS_COLOR.debtor : BALANCE_STATUS_COLOR.creditor,
              color: "#fff",
              fontSize: 12,
              fontWeight: 600,
              borderRadius: 20,
              padding: "3px 12px",
            }}
          >
            {debtor ? t("singleGroup.studentHoverCard.debtor") : t("singleGroup.studentHoverCard.noDebt")}
          </span>
        )}
      </div>
      <Field label={t("singleGroup.studentHoverCard.phone")}>{phone}</Field>
      <Field label={t("singleGroup.studentHoverCard.joinedAt")}>{formatTrainingDate(student.joinedAt)}</Field>
      <Field label={t("singleGroup.studentHoverCard.activatedAt")}>{formatTrainingDate(student.paymentStartDate)}</Field>
    </div>,
    document.body,
  );
};

export const TeacherStudentHoverCard = ({
  student, open, anchorRef, cardRef, id, onMouseEnter, onMouseLeave,
}: {
  student: TeacherStudentCardData;
  open: boolean;
  anchorRef: RefObject<HTMLElement>;
  cardRef: RefObject<HTMLDivElement>;
  id: string;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}) =>
  open ? (
    <Card
      student={student}
      anchorRef={anchorRef}
      cardRef={cardRef}
      id={id}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    />
  ) : null;

export default TeacherStudentHoverCard;
