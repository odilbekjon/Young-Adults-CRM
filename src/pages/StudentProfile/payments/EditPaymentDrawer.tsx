import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useToast } from "../../../Context/ToastContext";
import { useUpdatePaymentMutation } from "../../../app/api/financeApi";
import type { PaymentMethod, UpdatePaymentRequest } from "../../../app/api/financeApi/types";
import type { StudentGroupMembership } from "../../../app/api/studentsApi/types";
import { PaymentMethodPicker } from "../../../components/PaymentMethodPicker";
import { RightDrawer } from "../../../components/RightDrawer";
import { DatePickerField } from "../../SingleGroup/DatePickerField";
import { inputStyle, labelStyle, paymentSubmitBtn } from "../../SingleGroup/styles/styles";
import { extractApiError } from "../../../utils/extractApiError";
import { getProviderFromMethodName } from "../../../utils/paymentProvider";
import { submitOnEnter } from "../../../utils/submitOnEnter";
import type { PaymentTx } from "./buildTransactions";

const day = (iso: string | null | undefined) => (iso ?? "").slice(0, 10);

// Ledger month label ("2026-09" / "2026-09-01...") -> forMonth "2026-09-01".
const monthStart = (month: string | null | undefined) => {
  const m = /^(\d{4})-(\d{2})/.exec(month ?? "");
  return m ? `${m[1]}-${m[2]}-01` : "";
};

// Edit an existing payment: PATCH /finance/payments/{id} (multipart/form-data,
// every field optional). Only fields the user actually changed (or, for
// `forMonth`, filled in — the list endpoints don't return it) are sent;
// empty/false values are dropped by financeApi's FormData builder.
export const EditPaymentDrawer = ({
  open, onClose, tx, groups,
}: {
  open: boolean;
  onClose: () => void;
  tx: PaymentTx | null;
  groups: StudentGroupMembership[];
}) => {
  const { t } = useTranslation();
  const toast = useToast();
  const [updatePayment, { isLoading }] = useUpdatePaymentMutation();

  const [amount, setAmount] = useState("");
  const [methodId, setMethodId] = useState("");
  const [method, setMethod] = useState<PaymentMethod | undefined>();
  const [date, setDate] = useState("");
  const [forMonth, setForMonth] = useState("");
  const [notes, setNotes] = useState("");
  const [groupId, setGroupId] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Prefill from the row each time the drawer opens for a (different) payment.
  useEffect(() => {
    if (!open || !tx) return;
    setAmount(String(tx.amount));
    setMethodId(tx.paymentMethodId ?? "");
    setMethod(undefined);
    setDate(day(tx.date));
    setForMonth(monthStart(tx.month));
    setNotes(tx.notes ?? "");
    setGroupId(tx.groupId ?? "");
    setError(null);
  }, [open, tx]);

  const groupOptions = [...groups.map((g) => ({ id: g.id, name: g.name }))];
  if (tx?.groupId && !groupOptions.some((g) => g.id === tx.groupId)) {
    groupOptions.unshift({ id: tx.groupId, name: tx.groupName ?? tx.groupId });
  }

  const handleSubmit = async () => {
    if (!tx?.paymentId) return;
    setError(null);
    const num = Number(amount);
    if (!amount || !Number.isFinite(num) || num <= 0) {
      setError(t("addPayment.errors.amount", "Enter a valid amount"));
      return;
    }

    const body: Omit<UpdatePaymentRequest, "id"> = {};
    if (num !== tx.amount) body.amount = num;
    if (methodId && methodId !== (tx.paymentMethodId ?? "")) {
      body.paymentMethodId = methodId;
      if (method) body.provider = getProviderFromMethodName(method.name);
    }
    if (date && date !== day(tx.date)) body.date = date;
    const originalMonth = monthStart(tx.month);
    const monthChanged = Boolean(forMonth) && forMonth !== originalMonth;
    if (notes.trim() !== (tx.notes ?? "").trim()) body.notes = notes.trim();
    if (groupId && groupId !== (tx.groupId ?? "")) body.groupId = groupId;

    if (Object.keys(body).length === 0 && !monthChanged) {
      setError(t("studentPayments.edit.noChanges", "Nothing was changed"));
      return;
    }
    // Always send the month the payment already counts for (or the one the
    // user picked): a PATCH without it can re-file the payment under another
    // month (e.g. the month of the edit/date) instead of leaving it where it was.
    if (forMonth) body.forMonth = forMonth;

    try {
      await updatePayment({ id: tx.paymentId, ...body }).unwrap();
      toast.success(t("addPayment.toast.updated", "Payment updated successfully"));
      onClose();
    } catch (err) {
      const detail = extractApiError(err);
      const base = t("addPayment.errors.save", "Failed to save the payment");
      const message = detail ? `${base}: ${detail}` : base;
      setError(message);
      toast.error(message);
    }
  };

  return (
    <RightDrawer
      open={open}
      onClose={onClose}
      title={t("addPayment.editTitle", "Edit payment")}
      width={420}
      onKeyDown={submitOnEnter(handleSubmit, isLoading)}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div>
          <label style={labelStyle}>{t("addPayment.methodPay", "Method pay")}</label>
          <PaymentMethodPicker
            value={methodId}
            onChange={(id, m) => { setMethodId(id); setMethod(m); }}
            loadingLabel={t("addPayment.paymentMethodLoading")}
            errorLabel={t("addPayment.paymentMethodError")}
          />
        </div>

        <div>
          <label style={labelStyle}>{t("studentPayments.edit.group", "Group")}</label>
          <select
            value={groupId}
            onChange={(e) => setGroupId(e.target.value)}
            style={{ ...inputStyle, color: groupId ? "var(--color-text-primary)" : "var(--color-text-muted)" }}
          >
            <option value="">—</option>
            {groupOptions.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
        </div>

        <div>
          <label style={labelStyle}>{t("addPayment.amount", "Amount")}</label>
          <input style={inputStyle} type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" />
        </div>

        <div>
          <label style={labelStyle}>{t("addPayment.date", "Date")}</label>
          <DatePickerField value={date} onChange={setDate} />
        </div>

        <div>
          <label style={labelStyle}>{t("addPayment.forMonth", "For month")}</label>
          <DatePickerField value={forMonth} onChange={setForMonth} />
        </div>

        <div>
          <label style={labelStyle}>{t("addPayment.comment", "Comment")}</label>
          <textarea
            style={{ ...inputStyle, minHeight: 90, resize: "vertical" }}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        {error && <div style={{ fontSize: 13, color: "#d93f4f" }}>{error}</div>}

        <button
          type="button"
          style={{ ...paymentSubmitBtn, opacity: isLoading ? 0.7 : 1, cursor: isLoading ? "default" : "pointer" }}
          onClick={handleSubmit}
          disabled={isLoading}
        >
          {isLoading ? t("addPayment.saving", "Saving...") : t("addPayment.updateSubmit", "Save")}
        </button>
      </div>
    </RightDrawer>
  );
};
