import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { MdKeyboardArrowDown } from "react-icons/md";
import { RightDrawer } from "../../../components/RightDrawer";
import { PaymentMethodPicker } from "../../../components/PaymentMethodPicker";
import { DatePickerField } from "../../SingleGroup/DatePickerField";
import { useToast } from "../../../Context/ToastContext";
import { useCreateWithdrawalMutation } from "../../../app/api/financeApi";
import { useWriteOffStudentMutation } from "../../../app/api/studentsApi";
import type { StudentGroupMembership } from "../../../app/api/studentsApi/types";
import type { RootState } from "../../../app/store";
import { extractApiError } from "../../../utils/extractApiError";
import { todayLocalISO } from "../../../utils/localDate";

export type BalanceAction = "return" | "writeoff";

const inputStyle: React.CSSProperties = {
  width: "100%", border: "1px solid var(--color-border)", borderRadius: 8, padding: "10px 12px",
  fontSize: 13, color: "var(--color-text-primary)", outline: "none", boxSizing: "border-box",
  background: "var(--color-surface)", fontFamily: "inherit",
};
const labelStyle: React.CSSProperties = {
  fontSize: 13, fontWeight: 500, color: "var(--color-text-primary)", marginBottom: 6, display: "block",
};
const hintStyle: React.CSSProperties = { fontSize: 12, color: "var(--color-text-muted)", marginTop: 6, lineHeight: 1.45 };

const todayISO = todayLocalISO;

// "Return money" and "Write-off", opened from the chevron next to "Add payment".
//
//  - Return money = the student gets cash back (e.g. paid for a course they
//    left). Money physically leaves the cashbox, so it is recorded through the
//    existing POST /finance/withdrawals (recipient = the student, chosen payment
//    method, branch from the header, the comment goes into `reason`).
//    NOTE: that endpoint knows nothing about the student, so the student's
//    balance is not reduced by it — the backend needs to link it (see report).
//  - Write-off = part of the student's debt is forgiven: no cash moves, the
//    balance simply goes up by the amount and the reason is audited. There is no
//    such route in the documented backend yet — POST /students/{id}/write-off
//    is the proposed contract (see WriteOffStudentRequest), so until it exists
//    submitting shows the server's error.
export const StudentBalanceActionDrawer = ({
  action, onClose, studentId, studentName, memberships,
}: {
  action: BalanceAction | null;
  onClose: () => void;
  studentId: string;
  studentName: string;
  memberships: StudentGroupMembership[];
}) => {
  const { t } = useTranslation();
  const toast = useToast();
  const open = action !== null;
  const isReturn = action === "return";
  const branchId = useSelector((s: RootState) => s.branch.selectedBranchId);

  const [createWithdrawal, { isLoading: isReturning }] = useCreateWithdrawalMutation();
  const [writeOff, { isLoading: isWritingOff }] = useWriteOffStudentMutation();
  const isSaving = isReturning || isWritingOff;

  const [amount, setAmount] = useState("");
  const [paymentMethodId, setPaymentMethodId] = useState("");
  const [groupId, setGroupId] = useState("");
  const [date, setDate] = useState(todayISO());
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setAmount(""); setPaymentMethodId(""); setGroupId(""); setDate(todayISO()); setComment(""); setError(null);
  }, [open, action]);

  const title = isReturn
    ? t("studentPayments.actions.returnMoney", "Return money")
    : t("studentPayments.actions.writeOff", "Write-off");

  const fail = (err: unknown, fallback: string) => {
    const detail = extractApiError(err);
    const message = detail ? `${fallback}: ${detail}` : fallback;
    setError(message);
    toast.error(message);
  };

  const handleSubmit = async () => {
    setError(null);
    const value = Number(amount);
    if (!amount || !Number.isFinite(value) || value <= 0) {
      setError(t("addPayment.errors.amount", "Enter a valid amount"));
      return;
    }

    if (isReturn) {
      if (!paymentMethodId) { setError(t("addWithdrawal.errors.paymentMethodId", "Select a payment method")); return; }
      if (!branchId) { setError(t("addWithdrawal.errors.branch", "Select a branch in the header")); return; }
      try {
        await createWithdrawal({
          recipientName: studentName,
          amount: value,
          paymentMethodId,
          branchId,
          date: date || undefined,
          reason: [`Return money (student ${studentId})`, comment.trim()].filter(Boolean).join(": "),
        }).unwrap();
        toast.success(t("studentPayments.actions.returnDone", "Money returned"));
        onClose();
      } catch (err) {
        fail(err, t("studentPayments.actions.returnError", "Failed to return the money"));
      }
      return;
    }

    if (!comment.trim()) { setError(t("studentPayments.debt.reasonRequired", "Enter the reason for the change")); return; }
    try {
      await writeOff({
        id: studentId,
        amount: value,
        reason: comment.trim(),
        groupId: groupId || undefined,
        date: date || undefined,
      }).unwrap();
      toast.success(t("studentPayments.actions.writeOffDone", "Amount written off"));
      onClose();
    } catch (err) {
      fail(err, t("studentPayments.actions.writeOffError", "Failed to write off the amount"));
    }
  };

  return (
    <RightDrawer open={open} onClose={() => !isSaving && onClose()} title={title} width={440}>
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div>
          <label style={labelStyle}>{t("addPayment.student", "Student")}</label>
          <div style={{ ...inputStyle, background: "var(--color-surface-alt)", color: "var(--color-text-secondary)" }}>{studentName}</div>
        </div>

        {isReturn ? (
          <div>
            <label style={labelStyle}>{t("addWithdrawal.paymentMethodId", "Payment method")}</label>
            <PaymentMethodPicker value={paymentMethodId} onChange={setPaymentMethodId} />
          </div>
        ) : (
          <div>
            <label style={labelStyle}>{t("studentPayments.actions.group", "Group")}</label>
            <div style={{ position: "relative" }}>
              <select
                value={groupId}
                onChange={(e) => setGroupId(e.target.value)}
                style={{ ...inputStyle, appearance: "none", paddingRight: 36 }}
              >
                <option value="">{t("studentPayments.actions.allGroups", "All groups (overall balance)")}</option>
                {memberships.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}{m.courseName ? ` — ${m.courseName}` : ""}</option>
                ))}
              </select>
              <MdKeyboardArrowDown size={18} style={{
                position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
                color: "var(--color-text-muted)", pointerEvents: "none",
              }} />
            </div>
          </div>
        )}

        <div>
          <label style={labelStyle}>{t("addPayment.amount", "Amount")}</label>
          <input
            style={inputStyle}
            type="number"
            min={0}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0"
          />
          <div style={hintStyle}>
            {isReturn
              ? t("studentPayments.actions.returnHint", "Cash given back to the student. It is recorded as a cashbox withdrawal.")
              : t("studentPayments.actions.writeOffHint", "Cancels part of the student's debt. No cash moves — the balance simply increases.")}
          </div>
        </div>

        <div>
          <label style={labelStyle}>{t("addPayment.date", "Date")}</label>
          <DatePickerField value={date} onChange={setDate} />
        </div>

        <div>
          <label style={labelStyle}>
            {isReturn ? t("addPayment.comment", "Comment") : t("studentPayments.debt.reason", "Reason")}
          </label>
          <textarea
            style={{ ...inputStyle, minHeight: 80, resize: "vertical" }}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
        </div>

        {error && <div style={{ fontSize: 13, color: "#d93f4f" }}>{error}</div>}

        <div>
          <button
            onClick={handleSubmit}
            disabled={isSaving}
            style={{
              background: "#e5484d", color: "#fff", border: "none", borderRadius: 20, padding: "11px 32px",
              fontSize: 14, fontWeight: 600, cursor: isSaving ? "default" : "pointer", opacity: isSaving ? 0.7 : 1,
            }}
          >
            {isSaving ? t("addWithdrawal.saving", "Saving...") : title}
          </button>
        </div>
      </div>
    </RightDrawer>
  );
};
