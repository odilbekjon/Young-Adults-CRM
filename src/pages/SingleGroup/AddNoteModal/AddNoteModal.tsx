// src/pages/groups/AddNoteModal.tsx
import { useState } from "react";
import { TopModal } from "../../../components/TopModal";
import { inputStyle, labelStyle, paymentSubmitBtn, cancelBtn } from "../styles";
import { Student } from "../../../constants/Teachers";

export const AddNoteModal = ({
  open, onClose, student,
}: {
  open: boolean; onClose: () => void; student: Student | null;
}) => {
  const [note, setNote] = useState("");

  const handleClose = () => {
    setNote("");
    onClose();
  };

  return (
    <TopModal open={open} onClose={handleClose} title="Add new note">
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        {student && (
          <div>
            <label style={labelStyle}>Student</label>
            <input style={{ ...inputStyle, background: "#f5f5f5", color: "#666" }} value={student.name} readOnly />
          </div>
        )}
        <div>
          <label style={labelStyle}>Note</label>
          <textarea
            style={{ ...inputStyle, minHeight: 120, resize: "vertical" }}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Enter note..."
          />
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button style={paymentSubmitBtn} onClick={handleClose}>Save</button>
          <button style={cancelBtn} onClick={handleClose}>Cancel</button>
        </div>
      </div>
    </TopModal>
  );
};

export default AddNoteModal;