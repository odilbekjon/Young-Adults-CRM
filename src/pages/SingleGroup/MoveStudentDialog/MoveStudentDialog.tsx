// src/pages/groups/MoveStudentDialog.tsx
import { MdClose } from "react-icons/md";
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
          <span style={{ fontSize: 16, fontWeight: 600 }}>Move — {student?.name}</span>
          <MdClose size={18} style={{ cursor: "pointer", color: "#888" }} onClick={onClose} />
        </div>
        <select style={inputStyle}>
          <option value="">Select group</option>
          {groups.map((g) => (
            <option key={g.id} value={g.id}>{g.name}</option>
          ))}
        </select>
        <div style={{ display: "flex", gap: 10 }}>
          <button style={submitBtn} onClick={onMove}>Move</button>
          <button style={cancelBtn} onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
};

export default MoveStudentDialog;