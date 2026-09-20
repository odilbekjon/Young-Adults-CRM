// src/pages/groups/SmsDrawer.tsx
import { useState } from "react";
import { RightDrawer } from "../RightDrawer";
import { inputStyle, submitBtn, cancelBtn } from "../../pages/SingleGroup/styles";
import { useSendSmsToStudentsMutation } from "../../app/api/smsApi";
import { useToast } from "../../Context/ToastContext";
import { extractApiError } from "../../utils";

export const SmsDrawer = ({
  open, onClose, studentIds,
}: {
  open: boolean; onClose: () => void; studentIds: string[];
}) => {
  const toast = useToast();
  const [sendSms, { isLoading }] = useSendSmsToStudentsMutation();
  const [message, setMessage] = useState("");
  const smsCount = message.length === 0 ? 1 : Math.ceil(message.length / 160);

  const handleClose = () => {
    setMessage("");
    onClose();
  };

  const handleSend = async () => {
    if (!message.trim() || studentIds.length === 0 || isLoading) return;
    try {
      await sendSms({ studentIds, text: message.trim() }).unwrap();
      toast.success("SMS sent");
      handleClose();
    } catch (err) {
      const detail = extractApiError(err);
      toast.error(detail ? `Failed to send SMS: ${detail}` : "Failed to send SMS");
    }
  };

  return (
    <RightDrawer open={open} onClose={handleClose} title="Send SMS to group" width={480}>
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
            disabled={isLoading}
          />
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 12, color: "#888" }}>
            <span>{message.length} symbols ( ~ {smsCount} SMS )</span>
            <span>{studentIds.length} selected stud.</span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button
            style={{ ...submitBtn, opacity: !message.trim() || studentIds.length === 0 || isLoading ? 0.6 : 1 }}
            onClick={handleSend}
            disabled={!message.trim() || studentIds.length === 0 || isLoading}
          >
            {isLoading ? "…" : "Send SMS"}
          </button>
          <button style={cancelBtn} onClick={handleClose} disabled={isLoading}>Cancel</button>
        </div>
      </div>
    </RightDrawer>
  );
};

export default SmsDrawer;