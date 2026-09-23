// src/pages/groups/AddNoteModal.tsx
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { TopModal } from "../../../components/TopModal";
import { inputStyle, labelStyle, paymentSubmitBtn, cancelBtn } from "../styles";
import { Student } from "../../../constants/Teachers";

export const AddNoteModal = ({
  open, onClose, student,
}: {
  open: boolean; onClose: () => void; student: Student | null;
}) => {
  const { t } = useTranslation();
  const [note, setNote] = useState("");

  const handleClose = () => {
    setNote("");
    onClose();
  };

  return (
    <TopModal open={open} onClose={handleClose} title={t("singleGroup.addNoteModal.title")}>
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        {student && (
          <div>
            <label style={labelStyle}>{t("singleGroup.addNoteModal.student")}</label>
            <input style={{ ...inputStyle, background: "#f5f5f5", color: "#666" }} value={student.name} readOnly />
          </div>
        )}
        <div>
          <label style={labelStyle}>{t("singleGroup.addNoteModal.note")}</label>
          <textarea
            style={{ ...inputStyle, minHeight: 120, resize: "vertical" }}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t("singleGroup.addNoteModal.notePlaceholder")}
          />
        </div>
        {/* No POST endpoint for student notes exists anywhere in Swagger
            (see studentsApi/types.d.ts's StudentComment doc comment) — Save
            used to silently discard the typed note, which looked like it
            worked. Disabled instead of faking success until the backend
            adds a create endpoint for this. */}
        <div style={{ fontSize: 12.5, color: "#b45309" }}>{t("singleGroup.addNoteModal.notConnected")}</div>
        <div style={{ display: "flex", gap: 10 }}>
          <button style={{ ...paymentSubmitBtn, opacity: 0.5, cursor: "not-allowed" }} disabled>
            {t("singleGroup.addNoteModal.save")}
          </button>
          <button style={cancelBtn} onClick={handleClose}>{t("singleGroup.addNoteModal.cancel")}</button>
        </div>
      </div>
    </TopModal>
  );
};

export default AddNoteModal;