import { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { MdLock } from "react-icons/md";
import { useToast } from "../../Context/ToastContext";
import { useStudentByIdQuery, useStudentGroupMembershipsQuery } from "../../app/api/studentsApi/studentsApi";
import { useCreatePaymentMutation, useUpdatePaymentMutation } from "../../app/api/financeApi/financeApi";
import { PaymentMethodPicker } from "../PaymentMethodPicker";
import { StudentSearchField, type SearchedStudent } from "./StudentSearchField";
import { PaymentGroupPicker, type PaymentGroupOption } from "./PaymentGroupPicker";
import { PaymentReceiptModal } from "../PaymentReceiptModal";
import { DatePickerField } from "../../pages/SingleGroup/DatePickerField";
import { RightDrawer } from "../RightDrawer";
import { inputStyle, labelStyle, paymentSubmitBtn } from "../../pages/SingleGroup/styles/styles";
import type { RootState } from "../../app/store";
import type { PaymentMethod, PaymentProvider } from "../../app/api/financeApi/types";
import { extractApiError } from "../../utils/extractApiError";
import { getProviderFromMethodName } from "../../utils/paymentProvider";

const todayISO = () => new Date().toISOString().split("T")[0];

// Set to edit an existing payment instead of creating a new one — the
// student is fixed (a payment doesn't move between students), everything
// else prefills from the real record and PATCH /finance/payments/{id}
// (confirmed live — see UpdatePaymentRequest's doc comment) is used instead
// of POST on submit.
export interface EditPaymentTarget {
  id: string;
  amount: number;
  paymentMethodId: string;
  date: string | null;
  notes: string | null;
  studentId: string;
  studentName: string;
  // Group the payment is tied to, when the caller knows it (optional -
  // prefills the group picker; PATCH accepts groupId).
  groupId?: string | null;
}

// Memberships that still count as "the student's groups" for a payment.
const LIVE_MEMBERSHIP_STATUSES = new Set(["ACTIVE", "PROBATION", "FROZEN"]);

// Set when the drawer is opened for one specific student (e.g. SingleGroup's
// student "..." menu): that student is pre-selected and locked — shown
// read-only instead of the student <select>, so a different student can't be
// picked by accident. Unset (Students page, Header quick-add, ...) keeps the
// normal select.
export interface LockedPaymentStudent {
  id: string;
  name: string;
  phone?: string;
  balance?: number;
}

// Matches the reference "Add payment" modal: student, method pay, amount,
// date, comment. Branch is not a field here — it comes from the branch
// already selected in the header (state.branch.selectedBranchId), which is
// also what every request is scoped to via the x-branch-id header, so asking
// for it a second time in this form would be redundant.
export const AddPayment = ({ open, onClose, initialStudentId, initialStudentName, groupId, groupName, editPayment, lockedStudent, branchId }: {
  open: boolean; onClose: () => void; initialStudentId?: string; initialStudentName?: string;
  // Group to preselect in the group picker (e.g. SingleGroup's own group).
  // groupName is only a display fallback for when that group isn't among the
  // student's live memberships (e.g. archived from it).
  groupId?: string; groupName?: string;
  editPayment?: EditPaymentTarget | null;
  lockedStudent?: LockedPaymentStudent;
  // Branch to record the payment against when the caller knows it (e.g. the
  // group's own branch) — used instead of the header's selected branch, which
  // is empty while "All branches" is active and would otherwise block the
  // payment with "No branch selected". Omitted -> header branch, as before.
  branchId?: string;
}) => {
  const { t } = useTranslation();
  const toast = useToast();
  const selectedBranchId = useSelector((s: RootState) => s.branch.selectedBranchId);
  const isEditing = Boolean(editPayment);
  const isLocked = Boolean(lockedStudent) && !isEditing;
  const lockedStudentId = lockedStudent?.id;
  const effectiveBranchId = branchId ?? selectedBranchId;

  const [createPayment, { isLoading: isCreating }] = useCreatePaymentMutation();
  const [updatePayment, { isLoading: isUpdating }] = useUpdatePaymentMutation();
  const isSaving = isCreating || isUpdating;

  const [paymentMethodId, setPaymentMethodId] = useState("");
  const [provider, setProvider] = useState<PaymentProvider>("MANUAL");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayISO());
  const [forMonth, setForMonth] = useState("");
  const [notes, setNotes] = useState("");
  const [pickedStudent, setPickedStudent] = useState<SearchedStudent | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [receiptPaymentId, setReceiptPaymentId] = useState<string | null>(null);

  // The student the payment is for: fixed when editing / locked, otherwise
  // whoever was picked in the search field.
  const studentId = editPayment ? editPayment.studentId : isLocked ? lockedStudentId ?? "" : pickedStudent?.id ?? "";

  // A student known only by id (StudentProfile's preselect, or the student
  // of a payment being edited) has no phone / balance - read from the
  // student record. Search results already carry both, so those skip this.
  const { data: studentDetail } = useStudentByIdQuery(studentId, {
    skip: !open || !studentId || isLocked || pickedStudent?.balance !== undefined,
  });
  const detailForStudent = studentDetail?.data?.id === studentId ? studentDetail.data : undefined;
  const shownBalance = isLocked
    ? lockedStudent?.balance
    : pickedStudent?.balance ?? detailForStudent?.balance;
  const pickedForField: SearchedStudent | null = pickedStudent && {
    ...pickedStudent,
    name: pickedStudent.name || detailForStudent?.name || "",
    phone: pickedStudent.phone || detailForStudent?.phone,
  };

  // Preselect the student when this drawer is opened from a specific
  // student's page (e.g. StudentProfile's "Add payment" action). Depends on
  // primitives only, so a re-render of the parent doesn't undo a "Change".
  useEffect(() => {
    if (!open || isEditing || lockedStudentId || !initialStudentId) return;
    setPickedStudent({ id: initialStudentId, name: initialStudentName ?? "" });
  }, [open, isEditing, lockedStudentId, initialStudentId, initialStudentName]);

  // The student's live group memberships. GET /students/{id}/groups' own `id`
  // is the group's id (confirmed live, see StudentProfile), which is exactly
  // what a payment's `groupId` wants.
  const { currentData: memberships, isFetching: isGroupsLoading, isError: isGroupsError } =
    useStudentGroupMembershipsQuery(studentId, { skip: !open || !studentId });
  const groupOptions = useMemo<PaymentGroupOption[]>(() => {
    const live: PaymentGroupOption[] = (memberships ?? [])
      .filter((m) => LIVE_MEMBERSHIP_STATUSES.has(String(m.status).toUpperCase()))
      .map((m) => ({
        id: m.id, name: m.name, courseName: m.courseName,
        status: String(m.status).toUpperCase(), customPrice: m.customPrice,
      }));
    const preferredId = groupId || editPayment?.groupId || "";
    // The caller's own group stays selectable even if it isn't a live
    // membership of this student (yet / anymore).
    if (preferredId && !live.some((o) => o.id === preferredId)) {
      live.unshift({ id: preferredId, name: groupName || t("addPayment.thisGroup") });
    }
    return live;
  }, [memberships, groupId, groupName, editPayment?.groupId, t]);

  // Group preselection: the caller's group when given, else the student's
  // only group. Re-runs when the student changes ("Change") so a stale group
  // from the previous student is dropped.
  useEffect(() => {
    if (!open) return;
    setSelectedGroupId((cur) => {
      if (cur && groupOptions.some((o) => o.id === cur)) return cur;
      const preferredId = groupId || editPayment?.groupId || "";
      if (preferredId && groupOptions.some((o) => o.id === preferredId)) return preferredId;
      return groupOptions.length === 1 && !isGroupsLoading ? groupOptions[0].id : "";
    });
  }, [open, groupOptions, groupId, editPayment?.groupId, isGroupsLoading]);

  // Prefill the full form when editing an existing payment.
  useEffect(() => {
    if (!open || !editPayment) return;
    setPaymentMethodId(editPayment.paymentMethodId);
    setAmount(String(editPayment.amount));
    setDate(editPayment.date || todayISO());
    setNotes(editPayment.notes || "");
  }, [open, editPayment]);

  const handleClose = () => {
    setPaymentMethodId(""); setProvider("MANUAL"); setAmount(""); setNotes("");
    setPickedStudent(null); setSelectedGroupId(""); setDate(todayISO()); setForMonth(""); setError(null);
    onClose();
  };

  const handlePaymentMethodChange = (id: string, method?: PaymentMethod) => {
    setPaymentMethodId(id);
    if (method) setProvider(getProviderFromMethodName(method.name));
  };

  const handleSubmit = async () => {
    setError(null);

    if (!studentId) { setError(t("addPayment.errors.student")); return; }
    if (!effectiveBranchId) { setError(t("addPayment.errors.branch")); return; }
    if (!amount || Number(amount) <= 0) { setError(t("addPayment.errors.amount")); return; }
    if (!paymentMethodId.trim()) { setError(t("addPayment.errors.paymentMethodId")); return; }

    // Only a group that is actually one of this student's options is sent -
    // never a stale id left over from a previously picked student.
    const chosenGroupId = groupOptions.some((o) => o.id === selectedGroupId) ? selectedGroupId : undefined;

    try {
      if (isEditing && editPayment) {
        await updatePayment({
          id: editPayment.id,
          amount: Number(amount),
          paymentMethodId: paymentMethodId.trim(),
          date: date || undefined,
          forMonth: forMonth || undefined,
          notes: notes.trim() || undefined,
          groupId: chosenGroupId,
        }).unwrap();
        toast.success(t("addPayment.toast.updated"));
        handleClose();
        return;
      }
      const created = await createPayment({
        amount: Number(amount),
        paymentMethodId: paymentMethodId.trim(),
        studentId,
        branchId: effectiveBranchId,
        groupId: chosenGroupId,
        date: date || undefined,
        forMonth: forMonth || undefined,
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
    <RightDrawer open={open} onClose={handleClose} title={isEditing ? t("addPayment.editTitle") : t("addPayment.title")} width={420}>
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

        {/* Student — fixed when editing an existing payment; a payment doesn't move between students */}
        <div>
          <label style={labelStyle}>{t("addPayment.student")}</label>
          {isEditing ? (
            <div style={{ ...inputStyle, display: "flex", alignItems: "center", background: "#f5f5f5", color: "#666" }}>
              {editPayment?.studentName}
            </div>
          ) : isLocked && lockedStudent ? (
            <div
              aria-readonly="true"
              style={{
                ...inputStyle, display: "flex", alignItems: "center", gap: 8,
                background: "#f5f5f5", color: "#444", cursor: "not-allowed",
              }}
            >
              <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {lockedStudent.name}
                {lockedStudent.phone && <span style={{ color: "#888" }}> — {lockedStudent.phone}</span>}
              </span>
              <MdLock size={15} color="#999" style={{ flexShrink: 0 }} />
            </div>
          ) : (
            <StudentSearchField active={open} value={pickedForField} onChange={setPickedStudent} disabled={isSaving} />
          )}
        </div>

        {/* Groups of the selected student - which one this payment is for */}
        {studentId && (
          <div>
            <label style={labelStyle}>{t("addPayment.group")}</label>
            <PaymentGroupPicker
              options={groupOptions}
              value={selectedGroupId}
              onChange={setSelectedGroupId}
              isLoading={isGroupsLoading && groupOptions.length === 0}
              isError={isGroupsError && groupOptions.length === 0}
              disabled={isSaving}
            />
          </div>
        )}

        {/* Show balance if student selected */}
        {shownBalance !== undefined && studentId && (
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
              {(shownBalance ?? 0).toLocaleString("ru-RU")} UZS
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

        {/* For month — which month this payment covers (distinct from the
            date above, which is when it was made); optional per Swagger */}
        <div>
          <label style={labelStyle}>{t("addPayment.forMonth")}</label>
          <DatePickerField value={forMonth} onChange={setForMonth} />
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
          disabled={isSaving || (isGroupsLoading && Boolean(studentId) && groupOptions.length === 0)}
        >
          {isSaving ? t("addPayment.saving") : isEditing ? t("addPayment.updateSubmit") : t("addPayment.submit")}
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
