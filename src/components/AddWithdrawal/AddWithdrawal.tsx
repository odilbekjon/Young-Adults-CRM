import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { RightDrawer } from "../common/RightDrawer";
import { useToast } from "../../Context/ToastContext";
import { useAllBranchesQuery } from "../../app/api/branchesApi/branchesApi";
import { useCreateWithdrawalMutation } from "../../app/api/financeApi/financeApi";
import { PaymentMethodPicker } from "../PaymentMethodPicker";
import type { RootState } from "../../app/store";
import { DatePickerField } from "../../pages/SingleGroup/DatePickerField";

import { MdKeyboardArrowDown } from "react-icons/md";

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

const todayISO = () => new Date().toISOString().split("T")[0];

export const AddWithdrawal = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
  const { t } = useTranslation();
  const toast = useToast();
  const headerBranchId = useSelector((s: RootState) => s.branch.selectedBranchId);

  const { data: branchesData, isFetching: isBranchesLoading, isError: isBranchesError } = useAllBranchesQuery(
    undefined,
    { skip: !open }
  );
  const branches = (branchesData?.data ?? []).filter((b) => b.status === "ACTIVE");

  const [createWithdrawal, { isLoading: isSaving }] = useCreateWithdrawalMutation();

  const [recipientName, setRecipientName] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentMethodId, setPaymentMethodId] = useState("");
  const [selectedBranchId, setSelectedBranchId] = useState("");
  const [date, setDate] = useState(todayISO());
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Default to whichever branch is active in the header each time the
  // drawer opens — still editable, just no longer defaulting to blank.
  useEffect(() => {
    if (open) setSelectedBranchId(headerBranchId ?? "");
  }, [open, headerBranchId]);

  const handleClose = () => {
    setRecipientName(""); setAmount(""); setPaymentMethodId(""); setSelectedBranchId("");
    setDate(todayISO()); setReason(""); setError(null);
    onClose();
  };

  const handleSubmit = async () => {
    setError(null);
    if (!recipientName.trim()) { setError(t("addWithdrawal.errors.recipientName")); return; }
    if (!selectedBranchId) { setError(t("addWithdrawal.errors.branch")); return; }
    if (!amount || Number(amount) <= 0) { setError(t("addWithdrawal.errors.amount")); return; }
    if (!paymentMethodId) { setError(t("addWithdrawal.errors.paymentMethodId")); return; }

    try {
      await createWithdrawal({
        recipientName: recipientName.trim(),
        amount: Number(amount),
        paymentMethodId,
        branchId: selectedBranchId,
        date: date || undefined,
        reason: reason.trim() || undefined,
      }).unwrap();
      toast.success(t("addWithdrawal.toast.created"));
      handleClose();
    } catch {
      setError(t("addWithdrawal.errors.save"));
      toast.error(t("addWithdrawal.errors.save"));
    }
  };

  return (
    <RightDrawer open={open} onClose={handleClose} title={t("addWithdrawal.title")} width={440}>
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

        {/* Recipient */}
        <div>
          <label style={labelStyle}>{t("addWithdrawal.recipientName")}</label>
          <input
            style={inputStyle}
            value={recipientName}
            onChange={(e) => setRecipientName(e.target.value)}
            placeholder={t("addWithdrawal.recipientNamePlaceholder")}
          />
        </div>

        {/* Branch */}
        <div>
          <label style={labelStyle}>{t("addWithdrawal.branch")}</label>
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
                {isBranchesLoading ? t("addWithdrawal.branchLoading") : t("addWithdrawal.selectBranch")}
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
            <div style={{ fontSize: 12, color: "#d93f4f", marginTop: 6 }}>{t("addWithdrawal.branchError")}</div>
          )}
        </div>

        {/* Payment method */}
        <div>
          <label style={labelStyle}>{t("addWithdrawal.paymentMethodId")}</label>
          <PaymentMethodPicker value={paymentMethodId} onChange={setPaymentMethodId} />
        </div>

        {/* Amount */}
        <div>
          <label style={labelStyle}>{t("addWithdrawal.amount")}</label>
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
          <label style={labelStyle}>{t("addWithdrawal.date")}</label>
          <DatePickerField value={date} onChange={setDate} />
        </div>

        {/* Reason */}
        <div>
          <label style={labelStyle}>{t("addWithdrawal.reason")}</label>
          <textarea
            style={{ ...inputStyle, minHeight: 80, resize: "vertical" }}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
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
            {isSaving ? t("addWithdrawal.saving") : t("addWithdrawal.submit")}
          </button>
        </div>
      </div>
    </RightDrawer>
  );
};
