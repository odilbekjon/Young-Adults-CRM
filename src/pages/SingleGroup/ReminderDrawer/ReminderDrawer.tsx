// src/pages/groups/ReminderDrawer.tsx
import { useEffect, useState } from "react";
import { TopModal } from "../../../components/TopModal";
import { DatePickerField } from "../DatePickerField";
import { inputStyle, labelStyle } from "../styles";
import { Student } from "../../../constants/Teachers";

export const ReminderDrawer = ({
  open, onClose, student,
}: {
  open: boolean; onClose: () => void; student: Student | null;
}) => {
  const [name, setName] = useState(student?.name ?? "");
  const [comment, setComment] = useState("");
  const [reminderDate, setReminderDate] = useState("");
  const [employee, setEmployee] = useState("");

  useEffect(() => {
    if (open) setName(student?.name ?? "");
  }, [open, student]);

  const handleClose = () => {
    setName(student?.name ?? "");
    setComment("");
    setReminderDate("");
    setEmployee("");
    onClose();
  };

  return (
    <TopModal open={open} onClose={handleClose} title="Add new note" maxWidth={640}>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <label style={labelStyle}>Name</label>
          <input
            style={inputStyle}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder=""
          />
        </div>
        <div>
          <label style={labelStyle}>Comment</label>
          <textarea
            style={{ ...inputStyle, minHeight: 110, resize: "vertical" }}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder=""
          />
        </div>
        <DatePickerField value={reminderDate} onChange={setReminderDate} />
        <div>
          <select
            style={{ ...inputStyle, color: employee ? "#1a1a1a" : "#b0b8c1" }}
            value={employee}
            onChange={(e) => setEmployee(e.target.value)}
          >
            <option value="">Select employee</option>
            <option value="Ugilbeka Abdullaeva">Ugilbeka Abdullaeva</option>
            <option value="Maksuda Abraykulova">Maksuda Abraykulova</option>
            <option value="Iskandar Tojiyev">Iskandar Tojiyev</option>
          </select>
        </div>
        <div style={{ marginTop: 8 }}>
          <button
            style={{
              background: "#0f5c9a", color: "#fff", border: "none",
              borderRadius: 999, padding: "12px 30px", fontSize: 14,
              fontWeight: 600, cursor: "pointer",
            }}
            onClick={handleClose}
          >
            Save
          </button>
        </div>
      </div>
    </TopModal>
  );
};

export default ReminderDrawer;