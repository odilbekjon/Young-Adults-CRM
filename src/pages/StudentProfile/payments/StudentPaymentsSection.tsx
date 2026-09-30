import { useMemo, useState } from "react";
import { Button, Dialog, DialogActions, DialogContent, DialogTitle } from "@mui/material";
import { useTranslation } from "react-i18next";
import {
  useStudentPaymentsQuery,
  useStudentFinanceHistoryQuery,
  useStudentGroupMembershipsQuery,
} from "../../../app/api/studentsApi";
import { useDeletePaymentMutation } from "../../../app/api/financeApi";
import { useToast } from "../../../Context/ToastContext";
import { extractApiError } from "../../../utils/extractApiError";
import { PaymentReceiptModal } from "../../../components/PaymentReceiptModal";
import { DebtorReceiptModal } from "../../../components/DebtorReceiptModal";
import { buildTransactions, type PaymentTx } from "./buildTransactions";
import { MonthlyBalance, OutstandingBalanceCard } from "./BalanceCards";
import { PaymentsTable } from "./PaymentsTable";
import { EditPaymentDrawer } from "./EditPaymentDrawer";
import { EditDebtDialog } from "./EditDebtDialog";

// Student profile > Payments: outstanding-balance card, the monthly balance
// cards, and the payments/charges table with its receipts and Refund / Edit /
// Remove actions. Owns all of its data fetching:
//   GET /students/{id}/payments        -> real payments (id, creator, group, status) + totals
//   GET /students/{id}/finance-history -> per-month debts ("system") / payments / monthBalance
//   GET /students/{id}/groups          -> group names/teachers for receipts + the edit form
// Every mutation (finance PATCH/DELETE) invalidates the "payment"/"student"
// tags, which both queries above provide, so the whole section refetches.
export const StudentPaymentsSection = ({
  studentId, studentName, balance,
}: {
  studentId: string;
  studentName: string;
  balance: number;
}) => {
  const { t } = useTranslation();
  const toast = useToast();

  const {
    data: paymentsData, isFetching: isPaymentsLoading, isError: isPaymentsError,
  } = useStudentPaymentsQuery({ id: studentId, page: 1, limit: 50 }, { skip: !studentId });
  const {
    data: history, isFetching: isHistoryLoading, isError: isHistoryError,
  } = useStudentFinanceHistoryQuery(studentId, { skip: !studentId });
  const { data: memberships } = useStudentGroupMembershipsQuery(studentId, { skip: !studentId });

  const transactions = useMemo(
    () => buildTransactions(history ?? [], paymentsData?.rows ?? []),
    [history, paymentsData]
  );
  const groups = useMemo(() => memberships ?? [], [memberships]);
  const teacherOf = (groupId: string | null) =>
    (groupId ? groups.find((g) => g.id === groupId)?.teachers[0]?.name : undefined) ?? null;

  const [receiptTx, setReceiptTx] = useState<PaymentTx | null>(null);
  const [statementOpen, setStatementOpen] = useState(false);
  const [editPaymentTx, setEditPaymentTx] = useState<PaymentTx | null>(null);
  const [editDebtTx, setEditDebtTx] = useState<PaymentTx | null>(null);
  const [confirm, setConfirm] = useState<{ tx: PaymentTx; mode: "refund" | "remove" } | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);

  // DELETE /finance/payments/{id} — "Xato kiritilgan to'lovni bekor qiladi
  // (status: REFUNDED)": the backend has a single cancel/refund operation, so
  // both the Refund and the Remove menu items go through it (soft delete; the
  // row then shows as "refunded" and stops counting toward the balance).
  const [deletePayment, { isLoading: isDeleting }] = useDeletePaymentMutation();

  const runConfirm = async () => {
    if (!confirm?.tx.paymentId) return;
    setConfirmError(null);
    try {
      await deletePayment(confirm.tx.paymentId).unwrap();
      toast.success(
        confirm.mode === "refund"
          ? t("studentPayments.toast.refunded", "Payment refunded")
          : t("studentPayments.toast.removed", "Payment removed")
      );
      setConfirm(null);
    } catch (err) {
      const detail = extractApiError(err);
      const base = confirm.mode === "refund"
        ? t("studentPayments.errors.refund", "Failed to refund the payment")
        : t("studentPayments.errors.remove", "Failed to remove the payment");
      const message = detail ? `${base}: ${detail}` : base;
      setConfirmError(message);
      toast.error(message);
    }
  };

  const isRefund = confirm?.mode === "refund";

  return (
    <>
      <OutstandingBalanceCard
        balance={balance}
        summary={paymentsData?.summary}
        isLoading={isPaymentsLoading}
        onPrintNotice={() => setStatementOpen(true)}
      />
      <MonthlyBalance rows={history ?? []} isLoading={isHistoryLoading} isError={isHistoryError} />
      <PaymentsTable
        transactions={transactions}
        isLoading={isPaymentsLoading || isHistoryLoading}
        isError={isPaymentsError || isHistoryError}
        onPrint={setReceiptTx}
        onEdit={(tx) => (tx.kind === "system" ? setEditDebtTx(tx) : setEditPaymentTx(tx))}
        onRefund={(tx) => { setConfirmError(null); setConfirm({ tx, mode: "refund" }); }}
        onRemove={(tx) => { setConfirmError(null); setConfirm({ tx, mode: "remove" }); }}
      />

      {/* Receipts: a real payment prints its own GET /finance/payments/{id}/receipt;
          a system charge prints the student's GET /finance/debtors/{id}/receipt. */}
      <PaymentReceiptModal
        open={Boolean(receiptTx) && receiptTx?.kind === "payment"}
        onClose={() => setReceiptTx(null)}
        paymentId={receiptTx?.kind === "payment" ? receiptTx.paymentId : null}
        fallback={{
          creator: receiptTx?.creator,
          createdAt: receiptTx?.createdAt,
          groupName: receiptTx?.groupName,
          teacherName: teacherOf(receiptTx?.groupId ?? null),
        }}
      />
      <DebtorReceiptModal
        open={Boolean(receiptTx) && receiptTx?.kind === "system"}
        onClose={() => setReceiptTx(null)}
        studentId={studentId}
        variant="system"
        groupName={receiptTx?.groupName}
        teacherName={teacherOf(receiptTx?.groupId ?? null)}
      />
      <DebtorReceiptModal open={statementOpen} onClose={() => setStatementOpen(false)} studentId={studentId} />

      {/* Mounted only while editing — RightDrawer always renders its
          children, and this one embeds PaymentMethodPicker (a fetch). */}
      {editPaymentTx && (
        <EditPaymentDrawer open onClose={() => setEditPaymentTx(null)} tx={editPaymentTx} groups={groups} />
      )}
      <EditDebtDialog
        open={Boolean(editDebtTx)}
        onClose={() => setEditDebtTx(null)}
        tx={editDebtTx}
        studentId={studentId}
      />

      <Dialog
        open={Boolean(confirm)}
        onClose={() => (isDeleting ? undefined : setConfirm(null))}
        PaperProps={{ sx: { borderRadius: 3, width: 400, maxWidth: "calc(100vw - 32px)" } }}
      >
        <DialogTitle sx={{ fontWeight: 600 }}>
          {isRefund ? t("studentPayments.refundTitle", "Refund payment") : t("studentPayments.removeTitle", "Remove payment")}
        </DialogTitle>
        <DialogContent>
          <div style={{ fontSize: 14, color: "var(--color-text-secondary, #6b7280)" }}>
            {confirm && `${studentName} · ${confirm.tx.amount.toLocaleString("ru-RU")} UZS`}
          </div>
          <div style={{ fontSize: 14, color: "var(--color-text-secondary, #6b7280)", marginTop: 8 }}>
            {isRefund
              ? t("studentPayments.refundMessage", "This payment will be cancelled and marked as refunded. It no longer counts toward the student's balance.")
              : t("studentPayments.removeMessage", "Are you sure you want to remove this payment? It will be marked as refunded and removed from the student's balance.")}
          </div>
          {confirmError && <div style={{ marginTop: 12, fontSize: 13, color: "var(--color-danger, #ef4444)" }}>{confirmError}</div>}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setConfirm(null)} disabled={isDeleting} sx={{ color: "#6b7280", textTransform: "none" }}>
            {t("studentPayments.cancel", "Cancel")}
          </Button>
          <Button
            variant="contained"
            color={isRefund ? "success" : "error"}
            disabled={isDeleting}
            onClick={runConfirm}
            sx={{ borderRadius: 2, textTransform: "none" }}
          >
            {isDeleting ? "…" : isRefund ? t("studentPayments.menu.refund", "Refund") : t("studentPayments.menu.remove", "Remove")}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default StudentPaymentsSection;
