// src/pages/groups/GraduateTrialModal.tsx
// Promotes a PROBATION (trial-lesson) membership to ACTIVE and lets staff
// pick the date payment calculation should start from — PATCH
// /student-groups/{id}/status {status: "ACTIVE"} followed by PATCH
// /student-groups/{id} {paymentStartDate} (see handleGraduateTrialConfirm in
// SingleGroup.tsx).
import { useEffect, useState } from "react";
import { Dialog, DialogTitle, DialogContent, DialogActions, Typography, IconButton, Button } from "@mui/material";
import { MdClose } from "react-icons/md";
import { useTranslation } from "react-i18next";
import { DatePickerField } from "../DatePickerField";

const todayISO = () => new Date().toISOString().slice(0, 10);

export const GraduateTrialModal = ({
  open, onClose, onConfirm, isSaving,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: (paymentStartDate: string) => void;
  isSaving?: boolean;
}) => {
  const { t } = useTranslation();
  const [paymentStartDate, setPaymentStartDate] = useState(todayISO());

  useEffect(() => {
    if (open) setPaymentStartDate(todayISO());
  }, [open]);

  const handleSubmit = () => {
    if (!paymentStartDate) return;
    onConfirm(paymentStartDate);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      PaperProps={{ sx: { borderRadius: 3, width: 400, maxWidth: "95vw" } }}
    >
      <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", pb: 1, pt: 2.5, px: 2.5 }}>
        <Typography fontWeight={600} fontSize={16} color="#1a1a1a">
          {t("singleGroup.graduateTrialModal.title")}
        </Typography>
        <IconButton size="small" onClick={onClose} sx={{ color: "#9ca3af" }}>
          <MdClose size={18} />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ px: 2.5, pt: 1, pb: 2 }}>
        <Typography fontSize={13} color="#6b7280" mb={1.5}>
          {t("singleGroup.graduateTrialModal.description")}
        </Typography>
        <DatePickerField value={paymentStartDate} onChange={setPaymentStartDate} />
      </DialogContent>

      <DialogActions sx={{ justifyContent: "center", pb: 3, px: 2.5 }}>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={!paymentStartDate || isSaving}
          sx={{
            borderRadius: 999,
            textTransform: "none",
            bgcolor: paymentStartDate ? "#5c7fa3" : "#c5cdd8",
            fontSize: 14,
            fontWeight: 600,
            px: 5,
            py: 1.2,
            minWidth: 140,
            boxShadow: "none",
            "&:hover": { bgcolor: paymentStartDate ? "#4a6a8a" : "#c5cdd8", boxShadow: "none" },
          }}
        >
          {isSaving ? t("singleGroup.graduateTrialModal.saving") : t("singleGroup.graduateTrialModal.submit")}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default GraduateTrialModal;
