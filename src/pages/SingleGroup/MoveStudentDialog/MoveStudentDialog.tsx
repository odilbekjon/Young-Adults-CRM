// src/pages/groups/MoveStudentDialog.tsx
import { useEffect, useState } from "react";
import { MdClose } from "react-icons/md";
import { useTranslation } from "react-i18next";
import { inputStyle, labelStyle, submitBtn, cancelBtn } from "../styles";
import { GroupStudent } from "../types";
import { DatePickerField } from "../DatePickerField";
import { submitOnEnter } from "../../../utils/submitOnEnter";
import { todayLocalISO } from "../../../utils/localDate";

interface GroupOption {
  id: string;
  name: string;
}

export const MoveStudentDialog = ({
  open, onClose, student, groups, onMove, isSubmitting,
}: {
  open: boolean;
  onClose: () => void;
  student: GroupStudent | null;
  groups: GroupOption[];
  // `moveFrom` (YYYY-MM-DD) is the day the student leaves this group: payment here
  // ends the day before (see transferEndDate).
  onMove: (groupId: string, reason: string, moveFrom: string) => void;
  isSubmitting?: boolean;
}) => {
  const { t } = useTranslation();
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [reason, setReason] = useState("");
  const [moveFrom, setMoveFrom] = useState(todayLocalISO());

  useEffect(() => {
    if (!open) { setSelectedGroupId(""); setReason(""); setMoveFrom(todayLocalISO()); }
  }, [open]);

  if (!open) return null;

  const canSubmit = selectedGroupId && moveFrom && reason.trim() && !isSubmitting;

  const handleSubmit = () => {
    if (!canSubmit) return;
    onMove(selectedGroupId, reason.trim(), moveFrom);
  };

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 1300, background: "rgba(0,0,0,0.25)", display: "flex", alignItems: "center", justifyContent: "center" }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        onKeyDown={submitOnEnter(handleSubmit)}
        style={{ background: "var(--color-surface)", borderRadius: 12, padding: 24, width: 360, maxWidth: "calc(100vw - 24px)", display: "flex", flexDirection: "column", gap: 14 }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 16, fontWeight: 600 }}>{t("singleGroup.moveStudentDialog.title")} — {student?.name}</span>
          <MdClose size={18} style={{ cursor: "pointer", color: "var(--color-text-muted)" }} onClick={onClose} />
        </div>
        <select
          style={inputStyle}
          value={selectedGroupId}
          onChange={(e) => setSelectedGroupId(e.target.value)}
          disabled={isSubmitting}
        >
          <option value="">{t("singleGroup.moveStudentDialog.selectGroup")}</option>
          {groups.map((g) => (
            <option key={g.id} value={g.id}>{g.name}</option>
          ))}
        </select>
        {/* From when the student is out of this group (payment here ends the day
            before). In the new group they start on a trial lesson, unbilled. */}
        <div>
          <label style={labelStyle}>{t("singleGroup.moveStudentDialog.dateFrom")}</label>
          <DatePickerField value={moveFrom} onChange={setMoveFrom} disabled={isSubmitting} shortcuts />
          <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 6 }}>
            {t("singleGroup.moveStudentDialog.dateHint")}
          </div>
        </div>
        <input
          style={inputStyle}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder={t("singleGroup.moveStudentDialog.reasonPlaceholder")}
          disabled={isSubmitting}
        />
        <div style={{ display: "flex", gap: 10 }}>
          <button
            style={{ ...submitBtn, opacity: canSubmit ? 1 : 0.5 }}
            onClick={handleSubmit}
            disabled={!canSubmit}
          >
            {isSubmitting ? "…" : t("singleGroup.moveStudentDialog.move")}
          </button>
          <button style={cancelBtn} onClick={onClose} disabled={isSubmitting}>
            {t("singleGroup.moveStudentDialog.cancel")}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MoveStudentDialog;
