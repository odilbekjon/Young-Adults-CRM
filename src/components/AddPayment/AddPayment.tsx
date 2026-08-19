import { useState } from "react";
import { useTranslation } from "react-i18next";
import { RightDrawer } from "../common/RightDrawer";
import { useToast } from "../../Context/ToastContext";
import { useAllStudentsQuery } from "../../app/api/studentsApi/studentsApi";
import { useAllBranchesQuery } from "../../app/api/branchesApi/branchesApi";
import { useCreatePaymentMutation } from "../../app/api/financeApi/financeApi";
import type { PaymentProvider } from "../../app/api/financeApi/types";

import {
  MdKeyboardArrowDown, MdCalendarToday, MdOutlineAttachFile,
} from "react-icons/md";

/* ─── shared styles ─── */
const inputStyle: React.CSSProperties = {
  width: "100%",
  border: "1px solid #e0e0e0",
  borderRadius: 8,
  padding: "10px 12px",
  fontSize: 13,
  color: "#1a1a1a",
  outline: "none",
  boxSizing: "border-box",
  background: "#fff",
  fontFamily: "inherit",
};

const labelStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 500,
  color: "#1a1a1a",
  marginBottom: 6,
  display: "block",
};

/* payment method keys map to translation.json -> addPayment.methods.*
   Also drives the optional `provider` field sent to the backend. */
const PAYMENT_METHOD_ROWS: (string | null)[][] = [
  ["cash", "click"],
  ["card", "uzum"],
  ["bankAccount", "humo"],
  ["payme", null],
];

const METHOD_TO_PROVIDER: Record<string, PaymentProvider> = {
  cash: "MANUAL",
  card: "MANUAL",
  bankAccount: "MANUAL",
  humo: "MANUAL",
  click: "CLICK",
  uzum: "UZUM",
  payme: "PAYME",
};

const todayISO = () => new Date().toISOString().split("T")[0];

export const AddPayment = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
  const { t } = useTranslation();
  const toast = useToast();

  const { data: studentsData, isFetching: isStudentsLoading, isError: isStudentsError } = useAllStudentsQuery(
    { page: 1, limit: 100 },
    { skip: !open }
  );
  const { data: branchesData, isFetching: isBranchesLoading, isError: isBranchesError } = useAllBranchesQuery(
    undefined,
    { skip: !open }
  );
  const [createPayment, { isLoading: isSaving }] = useCreatePaymentMutation();

  const students = studentsData?.data ?? [];
  const branches = (branchesData?.data ?? []).filter((b) => b.status === "ACTIVE");

  const [method, setMethod] = useState("cash");
  const [paymentMethodId, setPaymentMethodId] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayISO());
  const [notes, setNotes] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [selectedBranchId, setSelectedBranchId] = useState("");
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [transactionId, setTransactionId] = useState("");
  const [error, setError] = useState<string | null>(null);

  const selectedStudent = students.find((s) => s.id === selectedStudentId);
  const studentGroups = selectedStudent?.groups ?? [];

  const handleClose = () => {
    setMethod("cash"); setPaymentMethodId(""); setAmount(""); setNotes("");
    setSelectedStudentId(""); setSelectedBranchId(""); setSelectedGroupId("");
    setReceiptFile(null); setShowAdvanced(false); setTransactionId("");
    setDate(todayISO()); setError(null);
    onClose();
  };

  const handleStudentChange = (id: string) => {
    setSelectedStudentId(id);
    setSelectedGroupId("");
  };

  const handleSubmit = async () => {
    setError(null);

    if (!selectedStudentId) { setError(t("addPayment.errors.student")); return; }
    if (!selectedBranchId) { setError(t("addPayment.errors.branch")); return; }
    if (!amount || Number(amount) <= 0) { setError(t("addPayment.errors.amount")); return; }
    if (!paymentMethodId.trim()) { setError(t("addPayment.errors.paymentMethodId")); return; }

    try {
      await createPayment({
        amount: Number(amount),
        paymentMethodId: paymentMethodId.trim(),
        studentId: selectedStudentId,
        branchId: selectedBranchId,
        groupId: selectedGroupId || undefined,
        date: date || undefined,
        notes: notes.trim() || undefined,
        receiptUrl: receiptFile || undefined,
        provider: METHOD_TO_PROVIDER[method],
        transactionId: transactionId.trim() || undefined,
      }).unwrap();
      toast.success(t("addPayment.toast.created"));
      handleClose();
    } catch {
      setError(t("addPayment.errors.save"));
      toast.error(t("addPayment.errors.save"));
    }
  };

  return (
    <RightDrawer open={open} onClose={handleClose} title={t("addPayment.title")} width={440}>
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

        {/* Student */}
        <div>
          <label style={labelStyle}>{t("addPayment.student")}</label>
          <div style={{ position: "relative" }}>
            <select
              value={selectedStudentId}
              onChange={(e) => handleStudentChange(e.target.value)}
              disabled={isStudentsLoading}
              style={{
                ...inputStyle, appearance: "none",
                color: selectedStudentId ? "#1a1a1a" : "#aaa", paddingRight: 36,
              }}
            >
              <option value="">
                {isStudentsLoading ? t("addPayment.studentLoading") : t("addPayment.selectStudent")}
              </option>
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
          <div style={{
            background: "#2d4a5a", color: "#fff", borderRadius: 20,
            padding: "6px 16px", fontSize: 13, fontWeight: 600,
            display: "inline-flex", alignSelf: "flex-start",
          }}>
            {t("addPayment.balance")}: {(selectedStudent.balance ?? 0).toLocaleString("ru-RU")} UZS
          </div>
        )}

        {/* Branch */}
        <div>
          <label style={labelStyle}>{t("addPayment.branch")}</label>
          <div style={{ position: "relative" }}>
            <select
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
              disabled={isBranchesLoading}
              style={{
                ...inputStyle, appearance: "none",
                color: selectedBranchId ? "#1a1a1a" : "#aaa", paddingRight: 36,
              }}
            >
              <option value="">
                {isBranchesLoading ? t("addPayment.branchLoading") : t("addPayment.selectBranch")}
              </option>
              {!isBranchesLoading && branches.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
            <MdKeyboardArrowDown size={18} style={{
              position: "absolute", right: 12, top: "50%",
              transform: "translateY(-50%)", color: "#aaa", pointerEvents: "none",
            }} />
          </div>
          {isBranchesError && (
            <div style={{ fontSize: 12, color: "#d93f4f", marginTop: 6 }}>{t("addPayment.branchError")}</div>
          )}
        </div>

        {/* Group (optional, scoped to the selected student's groups) */}
        {selectedStudentId && (
          <div>
            <label style={labelStyle}>{t("addPayment.group")}</label>
            <div style={{ position: "relative" }}>
              <select
                value={selectedGroupId}
                onChange={(e) => setSelectedGroupId(e.target.value)}
                disabled={studentGroups.length === 0}
                style={{
                  ...inputStyle, appearance: "none",
                  color: selectedGroupId ? "#1a1a1a" : "#aaa", paddingRight: 36,
                }}
              >
                <option value="">{t("addPayment.selectGroup")}</option>
                {studentGroups.map((g) => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
              <MdKeyboardArrowDown size={18} style={{
                position: "absolute", right: 12, top: "50%",
                transform: "translateY(-50%)", color: "#aaa", pointerEvents: "none",
              }} />
            </div>
            {studentGroups.length === 0 && (
              <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 6 }}>
                {t("addPayment.noGroupsForStudent")}
              </div>
            )}
          </div>
        )}

        {/* Method pay */}
        <div>
          <label style={labelStyle}>{t("addPayment.methodPay")}</label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 24px" }}>
            {PAYMENT_METHOD_ROWS.map((row, ri) =>
              row.map((m, ci) =>
                m ? (
                  <label key={m} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
                    <div
                      onClick={() => setMethod(m)}
                      style={{
                        width: 18, height: 18, borderRadius: "50%",
                        border: `2px solid ${method === m ? "#185FA5" : "#ccc"}`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        cursor: "pointer", flexShrink: 0,
                        background: method === m ? "#185FA5" : "#fff",
                      }}
                    >
                      {method === m && <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#fff" }} />}
                    </div>
                    {t(`addPayment.methods.${m}`)}
                  </label>
                ) : <div key={`empty-${ri}-${ci}`} />
              )
            )}
          </div>
        </div>

        {/* Payment method ID (backend PaymentMethod reference) */}
        <div>
          <label style={labelStyle}>{t("addPayment.paymentMethodId")}</label>
          <input
            style={inputStyle}
            value={paymentMethodId}
            onChange={(e) => setPaymentMethodId(e.target.value)}
            placeholder={t("addPayment.paymentMethodIdPlaceholder")}
          />
          <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 4 }}>
            {t("addPayment.paymentMethodIdHelper")}
          </div>
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
          <div style={{ position: "relative" }}>
            <MdCalendarToday size={14} style={{
              position: "absolute", left: 12, top: "50%",
              transform: "translateY(-50%)", color: "#aaa", pointerEvents: "none",
            }} />
            <input
              type="date"
              style={{ ...inputStyle, paddingLeft: 34 }}
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
        </div>

        {/* Comment / notes */}
        <div>
          <label style={labelStyle}>{t("addPayment.comment")}</label>
          <textarea
            style={{ ...inputStyle, minHeight: 80, resize: "vertical" }}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        {/* Receipt photo */}
        <div>
          <label style={labelStyle}>{t("addPayment.receipt")}</label>
          <label style={{
            ...inputStyle, display: "flex", alignItems: "center", gap: 8,
            cursor: "pointer", color: receiptFile ? "#1a1a1a" : "#aaa",
          }}>
            <MdOutlineAttachFile size={16} color="#4a7aaa" />
            {receiptFile ? receiptFile.name : t("addPayment.receiptPlaceholder")}
            <input
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={(e) => setReceiptFile(e.target.files?.[0] ?? null)}
            />
          </label>
        </div>

        {/* Advanced (transaction id) */}
        <div>
          <span
            onClick={() => setShowAdvanced((p) => !p)}
            style={{ fontSize: 13, color: "#555", cursor: "pointer", userSelect: "none" }}
          >
            {t("addPayment.advanced")}
          </span>
          {showAdvanced && (
            <input
              style={{ ...inputStyle, marginTop: 8 }}
              value={transactionId}
              onChange={(e) => setTransactionId(e.target.value)}
              placeholder={t("addPayment.transactionId")}
            />
          )}
        </div>

        {error && (
          <div style={{ fontSize: 13, color: "#d93f4f" }}>{error}</div>
        )}

        {/* Submit */}
        <div>
          <button
            onClick={handleSubmit}
            disabled={isSaving}
            style={{
              background: "#4a9bb5", color: "#fff", border: "none",
              borderRadius: 20, padding: "11px 32px",
              fontSize: 14, fontWeight: 600, cursor: isSaving ? "default" : "pointer",
              opacity: isSaving ? 0.7 : 1,
            }}
          >
            {isSaving ? t("addPayment.saving") : t("addPayment.submit")}
          </button>
        </div>
      </div>
    </RightDrawer>
  );
};
