// src/pages/groups/SmsDrawer.tsx
import { useState } from "react";
import { RightDrawer } from "../RightDrawer";
import { inputStyle, submitBtn, cancelBtn } from "../../pages/SingleGroup/styles";

export const SmsDrawer = ({
  open, onClose, studentCount,
}: {
  open: boolean; onClose: () => void; studentCount: number;
}) => {
  const [message, setMessage] = useState("");
  const smsCount = message.length === 0 ? 1 : Math.ceil(message.length / 160);

  return (
    <RightDrawer open={open} onClose={onClose} title="Send SMS to group" width={480}>
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div style={{ fontSize: 15, fontWeight: 500, color: "#1a1a1a" }}>
          Sender: <span style={{ color: "#185FA5" }}>3700</span>
        </div>
        <div>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Enter a message"
            style={{ ...inputStyle, minHeight: 140, resize: "vertical" }}
          />
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 12, color: "#888" }}>
            <span>{message.length} symbols ( ~ {smsCount} SMS )</span>
            <span>{studentCount} selected stud.</span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button style={submitBtn} onClick={() => { setMessage(""); onClose(); }}>Send SMS</button>
          <button style={cancelBtn} onClick={onClose}>Cancel</button>
        </div>
      </div>
    </RightDrawer>
  );
};

export default SmsDrawer;