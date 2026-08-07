// src/pages/groups/FreezeModal.tsx
import { useState } from "react";
import { MdClose } from "react-icons/md";
import { useTranslation } from "react-i18next";
import { DatePickerField } from "../DatePickerField";
import { labelStyle, inputStyle, submitBtn, cancelBtn } from "../styles";
import { Student } from "../../../constants/Teachers";

interface FreezeModalProps {
  open: boolean;
  onClose: () => void;
  student: Student | null;
  onConfirm: (data: { comment: string; fromDate: string; recalculate: boolean }) => void;
}

export const FreezeModal = ({ open, onClose, student, onConfirm }: FreezeModalProps) => {
  const { t } = useTranslation();
  const [comment, setComment] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [recalculate, setRecalculate] = useState(false);

  if (!open) return null;

  const handleClose = () => {
    setComment("");
    setFromDate("");
    setRecalculate(false);
    onClose();
  };

  const handleSubmit = () => {
    onConfirm({ comment, fromDate, recalculate });
    handleClose();
  };

  return (
    <div
      onClick={handleClose}
      style={{
        position: "fixed", inset: 0, zIndex: 1300,
        background: "rgba(0,0,0,0.35)",
        display: "flex", alignItems: "flex-start", justifyContent: "center",
        paddingTop: "8vh", overflowY: "auto",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff", borderRadius: 14, width: 460, maxWidth: "92vw",
          boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
        }}
      >
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "20px 24px", borderBottom: "1px solid #f0f0f0",
        }}>
          <span style={{ fontSize: 18, fontWeight: 600, color: "#1a1a1a" }}>
            {t("singleGroup.freezeModal.title")}
          </span>
          <MdClose size={20} color="#888" style={{ cursor: "pointer" }} onClick={handleClose} />
        </div>

        <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 18 }}>
          {student && (
            <div style={{ fontSize: 13, color: "#9ca3af" }}>
              {t("singleGroup.freezeModal.student")}: <span style={{ color: "#1a1a1a", fontWeight: 600 }}>{student.name}</span>
            </div>
          )}

          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder=""
            style={{ ...inputStyle, minHeight: 90, resize: "vertical" }}
          />

          <div>
            <label style={labelStyle}>{t("singleGroup.freezeModal.dateFrom")}</label>
            <DatePickerField value={fromDate} onChange={setFromDate} />
          </div>

          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#374151", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={recalculate}
              onChange={(e) => setRecalculate(e.target.checked)}
            />
            {t("singleGroup.freezeModal.recalculateBalance")}
          </label>

          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 4 }}>
            <button style={cancelBtn} onClick={handleClose}>{t("singleGroup.freezeModal.cancel")}</button>
            <button style={{ ...submitBtn, background: "#1976d2" }} onClick={handleSubmit}>
              {t("singleGroup.freezeModal.confirm")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FreezeModal;