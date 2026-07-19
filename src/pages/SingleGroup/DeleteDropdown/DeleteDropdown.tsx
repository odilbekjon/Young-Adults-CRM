// src/pages/groups/DeleteDropdown.tsx
import { MdClose } from "react-icons/md";
import { TopDropdown } from "../../../components/TopDropdown";
import { cancelBtn, submitBtn } from "../styles";

export const DeleteDropdown = ({
  open, onClose, anchorRef, groupName, onConfirm,
}: {
  open: boolean; onClose: () => void;
  anchorRef: React.RefObject<HTMLElement>;
  groupName: string; onConfirm: () => void;
}) => (
  <TopDropdown open={open} onClose={onClose} anchorRef={anchorRef} width={300}>
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
      <span style={{ fontSize: 14, fontWeight: 600, color: "#c0392b" }}>🗑 Delete Group</span>
      <MdClose size={16} color="#aaa" style={{ cursor: "pointer" }} onClick={onClose} />
    </div>
    <p style={{ fontSize: 13, color: "#555", margin: "0 0 16px" }}>
      <b>{groupName}</b> guruhini o'chirishni tasdiqlaysizmi?
    </p>
    <div style={{ display: "flex", gap: 8 }}>
      <button style={cancelBtn} onClick={onClose}>Cancel</button>
      <button style={{ ...submitBtn, background: "#c0392b" }} onClick={onConfirm}>Delete</button>
    </div>
  </TopDropdown>
);

export default DeleteDropdown;