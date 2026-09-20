// src/pages/groups/ActivateModal.tsx
import { Dialog, DialogTitle, DialogContent, DialogActions, Typography, IconButton, Button } from "@mui/material";
import { MdClose } from "react-icons/md";
import { useTranslation } from "react-i18next";

// POST /student-groups/{id}/unfreeze takes no request body (Swagger) — this
// is a plain confirm, not a date picker. `onConfirm` no longer takes a
// date; SingleGroup.tsx stamps "Activated at" with today's date locally.
export const ActivateModal = ({
  open, onClose, onConfirm, isSaving,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isSaving?: boolean;
}) => {
  const { t } = useTranslation();

  return (
    <Dialog
      open={open}
      onClose={onClose}
      PaperProps={{ sx: { borderRadius: 3, width: 400, maxWidth: "95vw" } }}
    >
      <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", pb: 1, pt: 2.5, px: 2.5 }}>
        <Typography fontWeight={600} fontSize={16} color="#1a1a1a">
          {t("singleGroup.activateModal.title")}
        </Typography>
        <IconButton size="small" onClick={onClose} sx={{ color: "#9ca3af" }}>
          <MdClose size={18} />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ px: 2.5, pt: 1, pb: 2 }}>
        <Typography fontSize={13} color="#6b7280">
          {t("singleGroup.activateModal.description")}
        </Typography>
      </DialogContent>

      <DialogActions sx={{ justifyContent: "center", pb: 3, px: 2.5 }}>
        <Button
          variant="contained"
          onClick={onConfirm}
          disabled={isSaving}
          sx={{
            borderRadius: 999,
            textTransform: "none",
            bgcolor: "#7a8fa6",
            fontSize: 14,
            fontWeight: 600,
            px: 5,
            py: 1.2,
            minWidth: 140,
            boxShadow: "none",
            "&:hover": { bgcolor: "#6b7f96", boxShadow: "none" },
          }}
        >
          {isSaving ? t("singleGroup.activateModal.saving") : t("singleGroup.activateModal.submit")}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ActivateModal;
