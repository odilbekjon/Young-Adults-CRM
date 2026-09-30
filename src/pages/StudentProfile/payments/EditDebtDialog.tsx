import { useEffect, useState } from "react";
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField } from "@mui/material";
import { useTranslation } from "react-i18next";
import { useToast } from "../../../Context/ToastContext";
import { useUpdateDebtMutation } from "../../../app/api/financeApi";
import { extractApiError } from "../../../utils/extractApiError";
import type { PaymentTx } from "./buildTransactions";

// Edit a "system" (charge) row: PATCH /finance/debt/{studentId}/{groupId},
// JSON {amount, reason}. Per Swagger this edits the student's special debt /
// the current group's monthly payment amount for that group — not one
// historical charge line — hence the hint below the fields.
export const EditDebtDialog = ({
  open, onClose, tx, studentId,
}: {
  open: boolean;
  onClose: () => void;
  tx: PaymentTx | null;
  studentId: string;
}) => {
  const { t } = useTranslation();
  const toast = useToast();
  const [updateDebt, { isLoading }] = useUpdateDebtMutation();
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !tx) return;
    setAmount(String(tx.amount));
    setReason("");
    setError(null);
  }, [open, tx]);

  const submit = async () => {
    if (!tx?.groupId) return;
    const num = Number(amount);
    if (!amount || !Number.isFinite(num) || num < 0) {
      setError(t("addPayment.errors.amount", "Enter a valid amount"));
      return;
    }
    if (!reason.trim()) {
      setError(t("studentPayments.debt.reasonRequired", "Enter the reason for the change"));
      return;
    }
    setError(null);
    try {
      await updateDebt({ studentId, groupId: tx.groupId, amount: num, reason: reason.trim() }).unwrap();
      toast.success(t("studentPayments.toast.debtUpdated", "Amount updated"));
      onClose();
    } catch (err) {
      const detail = extractApiError(err);
      const base = t("studentPayments.errors.debtSave", "Failed to update the amount");
      const message = detail ? `${base}: ${detail}` : base;
      setError(message);
      toast.error(message);
    }
  };

  return (
    <Dialog open={open} onClose={isLoading ? undefined : onClose} PaperProps={{ sx: { borderRadius: 3, width: 420, maxWidth: "calc(100vw - 32px)" } }}>
      <DialogTitle sx={{ fontWeight: 600 }}>{t("studentPayments.debt.title", "Edit amount")}</DialogTitle>
      <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: "8px !important" }}>
        {tx?.groupName && (
          <div style={{ fontSize: 13, color: "var(--color-text-secondary, #6b7280)" }}>{tx.groupName}</div>
        )}
        <TextField
          label={t("addPayment.amount", "Amount")}
          type="number"
          size="small"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          fullWidth
        />
        <TextField
          label={t("studentPayments.debt.reason", "Reason")}
          size="small"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          multiline
          minRows={2}
          fullWidth
        />
        <div style={{ fontSize: 12, color: "var(--color-text-muted, #9ca3af)" }}>
          {t("studentPayments.debt.hint", "This changes the student's special debt / the group's monthly payment amount, not a single past charge.")}
        </div>
        {error && <div style={{ fontSize: 13, color: "var(--color-danger, #ef4444)" }}>{error}</div>}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={isLoading} sx={{ color: "#6b7280", textTransform: "none" }}>
          {t("studentPayments.cancel", "Cancel")}
        </Button>
        <Button variant="contained" onClick={submit} disabled={isLoading} sx={{ borderRadius: 2, textTransform: "none", bgcolor: "#26a9b8", "&:hover": { bgcolor: "#1f8c99" } }}>
          {isLoading ? t("addPayment.saving", "Saving...") : t("addPayment.updateSubmit", "Save")}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
