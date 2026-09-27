// src/pages/groups/AddNoteModal.tsx
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { TopModal } from "../../../components/TopModal";
import { inputStyle, labelStyle, paymentSubmitBtn, cancelBtn } from "../styles";
import { useCreateStudentCommentMutation } from "../../../app/api/studentsApi";
import { useToast } from "../../../Context/ToastContext";
import { extractApiError } from "../../../utils";

interface NoteStudent {
  realId: string;
  name: string;
}

export const AddNoteModal = ({
  open, onClose, student,
}: {
  open: boolean; onClose: () => void; student: NoteStudent | null;
}) => {
  const { t } = useTranslation();
  const toast = useToast();
  const [createStudentComment, { isLoading: isSaving }] = useCreateStudentCommentMutation();
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleClose = () => {
    setNote("");
    setError(null);
    onClose();
  };

  const handleSave = async () => {
    if (!student || !note.trim() || isSaving) return;
    setError(null);
    try {
      await createStudentComment({ id: student.realId, comment: note.trim() }).unwrap();
      toast.success(t("singleGroup.addNoteModal.toast.success"));
      handleClose();
    } catch (err) {
      const detail = extractApiError(err);
      const message = detail ? `${t("singleGroup.addNoteModal.toast.error")}: ${detail}` : t("singleGroup.addNoteModal.toast.error");
      setError(message);
      toast.error(message);
    }
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
            disabled={isSaving}
          />
        </div>
        {error && <div style={{ fontSize: 12.5, color: "#dc2626" }}>{error}</div>}
        <div style={{ display: "flex", gap: 10 }}>
          <button
            style={{ ...paymentSubmitBtn, opacity: !note.trim() || isSaving ? 0.6 : 1, cursor: !note.trim() || isSaving ? "not-allowed" : "pointer" }}
            onClick={handleSave}
            disabled={!note.trim() || isSaving}
          >
            {isSaving ? t("singleGroup.addNoteModal.saving") : t("singleGroup.addNoteModal.save")}
          </button>
          <button style={cancelBtn} onClick={handleClose} disabled={isSaving}>{t("singleGroup.addNoteModal.cancel")}</button>
        </div>
      </div>
    </TopModal>
  );
};

export default AddNoteModal;
