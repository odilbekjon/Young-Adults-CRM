// src/pages/groups/FreezeModal.tsx
import { useEffect, useState } from "react";
import { MdClose } from "react-icons/md";
import { useTranslation } from "react-i18next";
import { DatePickerField } from "../DatePickerField";
import { labelStyle, inputStyle, paymentSubmitBtn, cancelBtn } from "../styles";
import { Student } from "../../../constants/Teachers";

interface FreezeModalProps {
  open: boolean;
  onClose: () => void;
  student: Student | null;
  isSaving?: boolean;
  onConfirm: (data: { reason: string; startDate: string; recalculateBalance: boolean }) => void;
}

export const FreezeModal = ({ open, onClose, isSaving, onConfirm }: FreezeModalProps) => {
  const { t } = useTranslation();
  const [reason, setReason] = useState("");
  const [startDate, setStartDate] = useState("");
  const [recalculateBalance, setRecalculateBalance] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset the form whenever the modal is closed, however that happens
  // (Cancel, backdrop click, or the parent closing it after a successful
  // save) — the parent controls `open` directly on success, so this can't
  // rely on a local handleClose alone.
  useEffect(() => {
    if (!open) {
      setReason("");
      setStartDate("");
      setRecalculateBalance(false);
      setError(null);
    }
  }, [open]);

  if (!open) return null;

  const handleSubmit = () => {
    if (!startDate) {
      setError(t("singleGroup.freezeModal.errors.dates"));
      return;
    }
    setError(null);
    onConfirm({ reason, startDate, recalculateBalance });
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 1400,
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
          <MdClose size={20} color="#888" style={{ cursor: "pointer" }} onClick={onClose} />
        </div>

        <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 18 }}>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder=""
            style={{ ...inputStyle, minHeight: 90, resize: "vertical" }}
          />

          <div>
            <label style={labelStyle}>{t("singleGroup.freezeModal.dateFrom")}</label>
            <DatePickerField value={startDate} onChange={setStartDate} />
          </div>

          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#374151", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={recalculateBalance}
              onChange={(e) => setRecalculateBalance(e.target.checked)}
            />
            {t("singleGroup.freezeModal.recalculateBalance")}
          </label>

          {error && <div style={{ fontSize: 13, color: "#d93f4f" }}>{error}</div>}

          <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 4 }}>
            <button style={cancelBtn} onClick={onClose} disabled={isSaving}>
              {t("singleGroup.freezeModal.cancel")}
            </button>
            <button
              style={{ ...paymentSubmitBtn, background: "#4a7ea3", opacity: isSaving ? 0.7 : 1, cursor: isSaving ? "default" : "pointer" }}
              onClick={handleSubmit}
              disabled={isSaving}
            >
              {isSaving ? t("singleGroup.freezeModal.saving") : t("singleGroup.freezeModal.confirm")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FreezeModal;
