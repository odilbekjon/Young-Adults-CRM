// src/pages/groups/MoveStudentDialog.tsx
import { MdClose } from "react-icons/md";
import { useTranslation } from "react-i18next";
import { inputStyle, submitBtn, cancelBtn } from "../styles";
import { GroupStudent } from "../types";

interface GroupOption {
  id: number;
  name: string;
}

export const MoveStudentDialog = ({
  open, onClose, student, groups, onMove,
}: {
  open: boolean;
  onClose: () => void;
  student: GroupStudent | null;
  groups: GroupOption[];
  onMove: () => void;
}) => {
  const { t } = useTranslation();
  if (!open) return null;

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
        <select style={inputStyle}>
          <option value="">{t("singleGroup.moveStudentDialog.selectGroup")}</option>
          {groups.map((g) => (
            <option key={g.id} value={g.id}>{g.name}</option>
          ))}
        </select>
        <div style={{ display: "flex", gap: 10 }}>
          <button style={submitBtn} onClick={onMove}>{t("singleGroup.moveStudentDialog.move")}</button>
          <button style={cancelBtn} onClick={onClose}>{t("singleGroup.moveStudentDialog.cancel")}</button>
        </div>
      </div>
    </div>
  );
};

export default MoveStudentDialog;