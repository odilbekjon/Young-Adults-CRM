// src/pages/groups/ActivateModal.tsx
import { useState } from "react";
import { Dialog, DialogTitle, DialogContent, DialogActions, Typography, IconButton, Button } from "@mui/material";
import { MdClose } from "react-icons/md";
import { useTranslation } from "react-i18next";
import { DatePickerField } from "../DatePickerField";

export const ActivateModal = ({
  open, onClose, onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: (activateDate: string) => void;
}) => {
  const { t } = useTranslation();
  const [activateDate, setActivateDate] = useState("");

  const handleSubmit = () => {
    if (!activateDate) return;
    onConfirm(activateDate);
    setActivateDate("");
    onClose();
  };

  const handleClose = () => {
    setActivateDate("");
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      PaperProps={{ sx: { borderRadius: 3, width: 400, maxWidth: "95vw" } }}
    >
      <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", pb: 1, pt: 2.5, px: 2.5 }}>
        <Typography fontWeight={600} fontSize={16} color="#1a1a1a">
          {t("singleGroup.activateModal.title")}
        </Typography>
        <IconButton size="small" onClick={handleClose} sx={{ color: "#9ca3af" }}>
          <MdClose size={18} />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ px: 2.5, pt: 1, pb: 2 }}>
        <DatePickerField value={activateDate} onChange={setActivateDate} />
      </DialogContent>

      <DialogActions sx={{ justifyContent: "center", pb: 3, px: 2.5 }}>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={!activateDate}
          sx={{
            borderRadius: 999,
            textTransform: "none",
            bgcolor: activateDate ? "#7a8fa6" : "#c5cdd8",
            fontSize: 14,
            fontWeight: 600,
            px: 5,
            py: 1.2,
            minWidth: 140,
            boxShadow: "none",
            "&:hover": { bgcolor: activateDate ? "#6b7f96" : "#c5cdd8", boxShadow: "none" },
          }}
        >
          {t("singleGroup.activateModal.submit")}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ActivateModal;