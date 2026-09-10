import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { MdKeyboardArrowDown } from "react-icons/md";
import { useToast } from "../../Context/ToastContext";
import { useAllStudentsQuery } from "../../app/api/studentsApi/studentsApi";
import { useCreatePaymentMutation } from "../../app/api/financeApi/financeApi";
import { PaymentMethodPicker } from "../PaymentMethodPicker";
import { PaymentReceiptModal } from "../PaymentReceiptModal";
import { DatePickerField } from "../../pages/SingleGroup/DatePickerField";
import { RightDrawer } from "../RightDrawer";
import { inputStyle, labelStyle, paymentSubmitBtn } from "../../pages/SingleGroup/styles/styles";
import type { RootState } from "../../app/store";
import type { PaymentMethod, PaymentProvider } from "../../app/api/financeApi/types";
import { extractApiError } from "../../utils/extractApiError";
import { getProviderFromMethodName } from "../../utils/paymentProvider";

const todayISO = () => new Date().toISOString().split("T")[0];

// Matches the reference "Add payment" modal: student, method pay, amount,
// date, comment. Branch is not a field here — it comes from the branch
// already selected in the header (state.branch.selectedBranchId), which is
// also what every request is scoped to via the x-branch-id header, so asking
// for it a second time in this form would be redundant.
export const AddPayment = ({ open, onClose, initialStudentId, initialStudentName, groupId }: {
  open: boolean; onClose: () => void; initialStudentId?: string; initialStudentName?: string; groupId?: string;
}) => {
  const { t } = useTranslation();
  const toast = useToast();
  const selectedBranchId = useSelector((s: RootState) => s.branch.selectedBranchId);

  const { data: studentsData, isFetching: isStudentsLoading, isError: isStudentsError } = useAllStudentsQuery(
    { page: 1, limit: 100, branchId: selectedBranchId ?? undefined },
    { skip: !open }
  );
  const [createPayment, { isLoading: isSaving }] = useCreatePaymentMutation();

  const students = studentsData?.data ?? [];
  // The dropdown's own list is fetched separately (branch-scoped, first 100)
  // from wherever initialStudentId came from — if the two don't happen to
  // agree (e.g. this student falls outside that scope/page), the <select>
  // would silently show no selection at all instead of the intended
  // student. Rather than leave that unexplained, the known student is
  // injected as an explicit option so the pre-fill always visibly works.
  const missingInitialStudent = Boolean(
    initialStudentId && initialStudentName && !students.some((s) => s.id === initialStudentId)
  );

  const [paymentMethodId, setPaymentMethodId] = useState("");
  const [provider, setProvider] = useState<PaymentProvider>("MANUAL");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayISO());
  const [notes, setNotes] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [receiptPaymentId, setReceiptPaymentId] = useState<string | null>(null);

  const selectedStudent = students.find((s) => s.id === selectedStudentId);

  // Pre-fill the student when this drawer is opened from a specific
  // student's page (e.g. StudentProfile's "Add payment" action).
  useEffect(() => {
    if (open && initialStudentId) setSelectedStudentId(initialStudentId);
  }, [open, initialStudentId]);

  const handleClose = () => {
    setPaymentMethodId(""); setProvider("MANUAL"); setAmount(""); setNotes("");
    setSelectedStudentId(""); setDate(todayISO()); setError(null);
    onClose();
  };

  const handlePaymentMethodChange = (id: string, method?: PaymentMethod) => {
    setPaymentMethodId(id);
    if (method) setProvider(getProviderFromMethodName(method.name));
  };

  const handleSubmit = async () => {
    setError(null);

    if (!selectedStudentId) { setError(t("addPayment.errors.student")); return; }
    if (!selectedBranchId) { setError(t("addPayment.errors.branch")); return; }
    if (!amount || Number(amount) <= 0) { setError(t("addPayment.errors.amount")); return; }
    if (!paymentMethodId.trim()) { setError(t("addPayment.errors.paymentMethodId")); return; }

    try {
      const created = await createPayment({
        amount: Number(amount),
        paymentMethodId: paymentMethodId.trim(),
        studentId: selectedStudentId,
        branchId: selectedBranchId,
        groupId: groupId || undefined,
        date: date || undefined,
        notes: notes.trim() || undefined,
        provider,
      }).unwrap();
      toast.success(t("addPayment.toast.created"));
      handleClose();
      setReceiptPaymentId(created.data.id);
    } catch (err) {
      const detail = extractApiError(err);
      const message = detail ? `${t("addPayment.errors.save")}: ${detail}` : t("addPayment.errors.save");
      setError(message);
      toast.error(message);
    }
  };

  return (
    <>
    <RightDrawer open={open} onClose={handleClose} title={t("addPayment.title")} width={420}>
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

        {/* Student */}
        <div>
          <label style={labelStyle}>{t("addPayment.student")}</label>
          <div style={{ position: "relative" }}>
            <select
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
              disabled={isStudentsLoading}
              style={{
                ...inputStyle, appearance: "none",
                color: selectedStudentId ? "#1a1a1a" : "#aaa", paddingRight: 36,
              }}
            >
              <option value="">
                {isStudentsLoading ? t("addPayment.studentLoading") : t("addPayment.selectStudent")}
              </option>
              {missingInitialStudent && (
                <option value={initialStudentId}>{initialStudentName}</option>
              )}
              {!isStudentsLoading && students.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            <MdKeyboardArrowDown size={18} style={{
              position: "absolute", right: 12, top: "50%",
              transform: "translateY(-50%)", color: "#aaa", pointerEvents: "none",
            }} />
          </div>
          {isStudentsError && (
            <div style={{ fontSize: 12, color: "#d93f4f", marginTop: 6 }}>{t("addPayment.studentError")}</div>
          )}
        </div>

        {/* Show balance if student selected */}
        {selectedStudent && (
          <div>
            <label style={labelStyle}>{t("addPayment.balance")}</label>
            <span
              style={{
                display: "inline-block",
                background: "#1a3a5c",
                color: "#fff",
                fontSize: 13,
                fontWeight: 600,
                padding: "6px 14px",
                borderRadius: 999,
              }}
            >
              {(selectedStudent.balance ?? 0).toLocaleString("ru-RU")} UZS
            </span>
          </div>
        )}

        {/* Payment method */}
        <div>
          <label style={labelStyle}>{t("addPayment.methodPay")}</label>
          <PaymentMethodPicker
            value={paymentMethodId}
            onChange={handlePaymentMethodChange}
            loadingLabel={t("addPayment.paymentMethodLoading")}
            errorLabel={t("addPayment.paymentMethodError")}
          />
        </div>

        {/* Amount */}
        <div>
          <label style={labelStyle}>{t("addPayment.amount")}</label>
          <input
            style={inputStyle}
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0"
          />
        </div>

        {/* Date */}
        <div>
          <label style={labelStyle}>{t("addPayment.date")}</label>
          <DatePickerField value={date} onChange={setDate} />
        </div>

        {/* Comment / notes */}
        <div>
          <label style={labelStyle}>{t("addPayment.comment")}</label>
          <textarea
            style={{ ...inputStyle, minHeight: 100, resize: "vertical" }}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        {error && (
          <div style={{ fontSize: 13, color: "#d93f4f" }}>{error}</div>
        )}

        <button
          type="button"
          style={{ ...paymentSubmitBtn, opacity: isSaving ? 0.7 : 1, cursor: isSaving ? "default" : "pointer" }}
          onClick={handleSubmit}
          disabled={isSaving}
        >
          {isSaving ? t("addPayment.saving") : t("addPayment.submit")}
        </button>
      </div>
    </RightDrawer>

    <PaymentReceiptModal
      open={Boolean(receiptPaymentId)}
      onClose={() => setReceiptPaymentId(null)}
      paymentId={receiptPaymentId}
    />
    </>
  );
};
