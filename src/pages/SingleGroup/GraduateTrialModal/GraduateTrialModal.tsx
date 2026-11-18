// src/pages/groups/GraduateTrialModal.tsx
// Confirms promoting a PROBATION (trial-lesson) membership to ACTIVE - POST
// /student-groups/{id}/graduate-trial (see handleGraduateTrialConfirm in
// SingleGroup.tsx). No billing start date is asked for or sent - the backend
// decides where payment accounting starts - so this is a plain confirmation.
import { Dialog, DialogTitle, DialogContent, DialogActions, Typography, IconButton, Button } from "@mui/material";
import { MdClose } from "react-icons/md";
import { useTranslation } from "react-i18next";
import { submitOnEnter } from "../../../utils/submitOnEnter";

export const GraduateTrialModal = ({
  open, onClose, onConfirm, isSaving,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isSaving?: boolean;
}) => {
  const { t } = useTranslation();

  const handleSubmit = () => {
    if (isSaving) return;
    onConfirm();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      onKeyDown={submitOnEnter(handleSubmit, isSaving)}
      PaperProps={{ sx: { borderRadius: 3, width: 400, maxWidth: "95vw" } }}
    >
      <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", pb: 1, pt: 2.5, px: 2.5 }}>
        <Typography fontWeight={600} fontSize={16} color="var(--color-text-primary)">
          {t("singleGroup.graduateTrialModal.title")}
        </Typography>
        <IconButton size="small" onClick={onClose} sx={{ color: "var(--color-text-muted)" }}>
          <MdClose size={18} />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ px: 2.5, pt: 1, pb: 2 }}>
        <Typography fontSize={13} color="var(--color-text-secondary)">
          {t("singleGroup.graduateTrialModal.description")}
        </Typography>
      </DialogContent>

      <DialogActions sx={{ justifyContent: "center", pb: 3, px: 2.5 }}>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={isSaving}
          sx={{
            borderRadius: 999,
            textTransform: "none",
            bgcolor: "#5c7fa3",
            fontSize: 14,
            fontWeight: 600,
            px: 5,
            py: 1.2,
            minWidth: 140,
            boxShadow: "none",
            "&:hover": { bgcolor: "#4a6a8a", boxShadow: "none" },
          }}
        >
          {isSaving ? t("singleGroup.graduateTrialModal.saving") : t("singleGroup.graduateTrialModal.submit")}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default GraduateTrialModal;
