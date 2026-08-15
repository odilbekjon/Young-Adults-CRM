// src/pages/groups/MoveStudentDialog.tsx
import { useEffect, useState } from "react";
import { MdClose } from "react-icons/md";
import { useTranslation } from "react-i18next";
import { inputStyle, submitBtn, cancelBtn } from "../styles";
import { GroupStudent } from "../types";

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
  onMove: (groupId: string) => void;
  isSubmitting?: boolean;
}) => {
  const { t } = useTranslation();
  const [selectedGroupId, setSelectedGroupId] = useState("");

  useEffect(() => {
    if (!open) setSelectedGroupId("");
  }, [open]);

  if (!open) return null;

  const handleSubmit = () => {
    if (!selectedGroupId || isSubmitting) return;
    onMove(selectedGroupId);
  };

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 1300, background: "rgba(0,0,0,0.25)", display: "flex", alignItems: "center", justifyContent: "center" }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: "#fff", borderRadius: 12, padding: 24, width: 360, display: "flex", flexDirection: "column", gap: 14 }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 16, fontWeight: 600 }}>{t("singleGroup.moveStudentDialog.title")} — {student?.name}</span>
          <MdClose size={18} style={{ cursor: "pointer", color: "#888" }} onClick={onClose} />
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
        <div style={{ display: "flex", gap: 10 }}>
          <button
            style={{ ...submitBtn, opacity: selectedGroupId && !isSubmitting ? 1 : 0.5 }}
            onClick={handleSubmit}
            disabled={!selectedGroupId || isSubmitting}
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
