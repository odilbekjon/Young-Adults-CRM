// src/pages/groups/AddNoteModal.tsx
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { TopModal } from "../../../components/TopModal";
import { inputStyle, labelStyle, paymentSubmitBtn, cancelBtn } from "../styles";
import { useCreateStudentCommentMutation } from "../../../app/api/studentsApi";
import { useToast } from "../../../Context/ToastContext";
import { extractApiError } from "../../../utils";

// Only what this modal actually needs — `student` is passed in as
// SingleGroup's RealGroupStudent, which carries the real backend id as
// `realId` (its own `id` is a local roster index, not usable here).
interface NoteTargetStudent {
  name: string;
  realId: string;
}

export const AddNoteModal = ({
  open, onClose, student,
}: {
  open: boolean; onClose: () => void; student: NoteTargetStudent | null;
}) => {
  const { t } = useTranslation();
  const toast = useToast();
  const [note, setNote] = useState("");
  const [createComment, { isLoading }] = useCreateStudentCommentMutation();

  const handleClose = () => {
    setNote("");
    onClose();
  };

  const handleSave = async () => {
    if (!student || !note.trim() || isLoading) return;
    try {
      // POST /students/{id}/comments — application/json {comment}.
      await createComment({ id: student.realId, comment: note.trim() }).unwrap();
      toast.success(t("singleGroup.addNoteModal.toast.success"));
      handleClose();
    } catch (err) {
      const detail = extractApiError(err);
      const generic = t("singleGroup.addNoteModal.toast.error");
      toast.error(detail ? `${generic}: ${detail}` : generic);
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
            style={{ ...paymentSubmitBtn, opacity: !note.trim() || isLoading ? 0.6 : 1 }}
            onClick={handleSave}
            disabled={!note.trim() || isLoading}
          >
            {isLoading ? t("singleGroup.addNoteModal.saving") : t("singleGroup.addNoteModal.save")}
          </button>
          <button style={cancelBtn} onClick={handleClose} disabled={isLoading}>{t("singleGroup.addNoteModal.cancel")}</button>
        </div>
      </div>
    </TopModal>
  );
};

export default AddNoteModal;