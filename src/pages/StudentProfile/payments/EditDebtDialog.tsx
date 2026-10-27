import { useEffect, useState } from "react";
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField } from "@mui/material";
import { useTranslation } from "react-i18next";
import { useToast } from "../../../Context/ToastContext";
import { useUpdateDebtMutation } from "../../../app/api/financeApi";
import { extractApiError } from "../../../utils/extractApiError";
import { submitOnEnter } from "../../../utils/submitOnEnter";
import type { PaymentTx } from "./buildTransactions";

// Edit a "system" (charge) row: PATCH /finance/debt/{studentId}/{groupId},
// JSON {amount, reason}. Per Swagger this edits the student's special debt /
// the current group's monthly payment amount for that group — not one
// historical charge line — hence the hint below the fields.
// mode "remove": the backend has no DELETE for a charge, so removing it is the
// same PATCH with amount 0 (reason required), and only asks for the reason.
export const EditDebtDialog = ({
  open, onClose, tx, studentId, mode = "edit",
}: {
  open: boolean;
  onClose: () => void;
  tx: PaymentTx | null;
  studentId: string;
  mode?: "edit" | "remove";
}) => {
  const isRemove = mode === "remove";
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
    const num = isRemove ? 0 : Number(amount);
    if ((!isRemove && !amount) || !Number.isFinite(num) || num < 0) {
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
      toast.success(isRemove ? t("studentPayments.toast.removed", "Charge removed") : t("studentPayments.toast.debtUpdated", "Amount updated"));
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
    <Dialog
      open={open}
      onClose={isLoading ? undefined : onClose}
      // Removing a charge only asks for a reason (a textarea), so Enter submits just the amount edit.
      onKeyDown={isRemove ? undefined : submitOnEnter(submit, isLoading)}
      PaperProps={{ sx: { borderRadius: 3, width: 420, maxWidth: "calc(100vw - 32px)" } }}
    >
      <DialogTitle sx={{ fontWeight: 600 }}>
        {isRemove ? t("studentPayments.removeChargeTitle", "Remove charge") : t("studentPayments.debt.title", "Edit amount")}
      </DialogTitle>
      <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: "8px !important" }}>
        {tx?.groupName && (
          <div style={{ fontSize: 13, color: "var(--color-text-secondary, #6b7280)" }}>{tx.groupName}</div>
        )}
        {isRemove ? (
          <div style={{ fontSize: 14, color: "var(--color-text-secondary, #6b7280)" }}>
            {tx ? `${tx.amount.toLocaleString("ru-RU")} UZS` : ""}
          </div>
        ) : (
          <TextField
            label={t("addPayment.amount", "Amount")}
            type="number"
            size="small"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            fullWidth
          />
        )}
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
          {isRemove
            ? t("studentPayments.debt.removeHint", "The group's monthly charge for this student is set to 0.")
            : t("studentPayments.debt.hint", "This changes the student's special debt / the group's monthly payment amount, not a single past charge.")}
        </div>
        {error && <div style={{ fontSize: 13, color: "var(--color-danger, #ef4444)" }}>{error}</div>}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={isLoading} sx={{ color: "var(--color-text-secondary)", textTransform: "none" }}>
          {t("studentPayments.cancel", "Cancel")}
        </Button>
        <Button variant="contained" onClick={submit} disabled={isLoading} sx={{ borderRadius: 2, textTransform: "none", bgcolor: isRemove ? "#dc2626" : "#26a9b8", "&:hover": { bgcolor: isRemove ? "#b91c1c" : "#1f8c99" } }}>
          {isLoading ? t("addPayment.saving", "Saving...") : isRemove ? t("studentPayments.menu.remove", "Remove") : t("addPayment.updateSubmit", "Save")}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
