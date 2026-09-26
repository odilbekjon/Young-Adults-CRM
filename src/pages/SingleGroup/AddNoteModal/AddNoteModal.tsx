// src/pages/groups/AddNoteModal.tsx
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { TopModal } from "../../../components/TopModal";
import { inputStyle, labelStyle, paymentSubmitBtn, cancelBtn } from "../styles";
import { Student } from "../../../constants/Teachers";
import { useCreateStudentCommentMutation } from "../../../app/api/studentsApi";
import { useToast } from "../../../Context/ToastContext";
import { extractApiError } from "../../../utils";

type NoteStudent = Student & { realId: string };

export const AddNoteModal = ({
  open, onClose, student,
}: {
  open: boolean; onClose: () => void; student: NoteStudent | null;
}) => {
  const { t } = useTranslation();
  const toast = useToast();
  const [note, setNote] = useState("");
  const [createStudentComment, { isLoading }] = useCreateStudentCommentMutation();

  const handleClose = () => {
    if (isLoading) return;
    setNote("");
    onClose();
  };

  const handleSave = async () => {
    if (!student || !note.trim()) return;
    try {
      await createStudentComment({ id: student.realId, comment: note.trim() }).unwrap();
      toast.success(t("singleGroup.addNoteModal.saved"));
      setNote("");
      onClose();
    } catch (err) {
      toast.error(extractApiError(err) || t("singleGroup.addNoteModal.error"));
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
          />
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button
            style={{ ...paymentSubmitBtn, opacity: !note.trim() || isLoading ? 0.6 : 1, cursor: !note.trim() || isLoading ? "not-allowed" : "pointer" }}
            onClick={handleSave}
            disabled={!note.trim() || isLoading}
          >
            {isLoading ? t("singleGroup.addNoteModal.saving") : t("singleGroup.addNoteModal.save")}
          </button>
          <button style={cancelBtn} onClick={handleClose}>{t("singleGroup.addNoteModal.cancel")}</button>
        </div>
      </div>
    </TopModal>
  );
};

export default AddNoteModal;
