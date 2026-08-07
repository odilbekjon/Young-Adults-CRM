// src/pages/groups/AddPaymentDrawer.tsx
import { useState } from "react";
import { FormControl, FormControlLabel, Radio, RadioGroup } from "@mui/material";
import { useTranslation } from "react-i18next";
import { RightDrawer } from "../../../components/RightDrawer";
import { DatePickerField } from "../DatePickerField";
import { inputStyle, labelStyle, paymentSubmitBtn, PAYMENT_METHODS_LEFT, PAYMENT_METHODS_RIGHT } from "../styles";
import { Student } from "../../../constants/Teachers";

export const AddPaymentDrawer = ({
  open, onClose, student,
}: {
  open: boolean; onClose: () => void; student: Student | null;
}) => {
  const { t } = useTranslation();
  const [method, setMethod] = useState("Cash");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [comment, setComment] = useState("");

  const balance = (student as Student & { balance?: number })?.balance ?? -23077;

  const handleClose = () => {
    setMethod("Cash");
    setAmount("");
    setDate(new Date().toISOString().slice(0, 10));
    setComment("");
    onClose();
  };

  const formatBalance = (n: number) =>
    `${n < 0 ? "-" : ""}${Math.abs(n).toLocaleString("ru-RU")} UZS`;

  return (
    <RightDrawer open={open} onClose={handleClose} title={t("singleGroup.addPaymentDrawer.title")} width={420}>
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div>
          <label style={labelStyle}>{t("singleGroup.addPaymentDrawer.student")}</label>
          <input
            style={{ ...inputStyle, background: "#f5f5f5", color: "#555", cursor: "default" }}
            value={student?.name ?? ""}
            readOnly
          />
        </div>

        <div>
          <label style={labelStyle}>{t("singleGroup.addPaymentDrawer.balance")}</label>
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
            {formatBalance(balance)}
          </span>
        </div>

        <div>
          <label style={labelStyle}>{t("singleGroup.addPaymentDrawer.methodPay")}</label>
          <div style={{ display: "flex", gap: 24, marginTop: 4 }}>
            <FormControl component="fieldset" sx={{ flex: 1 }}>
              <RadioGroup value={method} onChange={(e) => setMethod(e.target.value)}>
                {PAYMENT_METHODS_LEFT.map((m: string) => (
                  <FormControlLabel
                    key={m}
                    value={m}
                    control={<Radio size="small" sx={{ color: "#bdbdbd", "&.Mui-checked": { color: "#1a3a5c" } }} />}
                    label={<span style={{ fontSize: 13, color: "#374151" }}>{m}</span>}
                    sx={{ m: 0, mb: 0.5 }}
                  />
                ))}
              </RadioGroup>
            </FormControl>
            <FormControl component="fieldset" sx={{ flex: 1 }}>
              <RadioGroup value={method} onChange={(e) => setMethod(e.target.value)}>
                {PAYMENT_METHODS_RIGHT.map((m: string) => (
                  <FormControlLabel
                    key={m}
                    value={m}
                    control={<Radio size="small" sx={{ color: "#bdbdbd", "&.Mui-checked": { color: "#1a3a5c" } }} />}
                    label={<span style={{ fontSize: 13, color: "#374151" }}>{m}</span>}
                    sx={{ m: 0, mb: 0.5 }}
                  />
                ))}
              </RadioGroup>
            </FormControl>
          </div>
        </div>

        <div>
          <label style={labelStyle}>{t("singleGroup.addPaymentDrawer.amount")}</label>
          <input
            style={inputStyle}
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder=""
          />
        </div>

        <div>
          <label style={labelStyle}>{t("singleGroup.addPaymentDrawer.date")}</label>
          <DatePickerField value={date} onChange={setDate} />
        </div>

        <div>
          <label style={labelStyle}>{t("singleGroup.addPaymentDrawer.comment")}</label>
          <textarea
            style={{ ...inputStyle, minHeight: 100, resize: "vertical" }}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
        </div>

        <button type="button" style={paymentSubmitBtn} onClick={handleClose}>
          {t("singleGroup.addPaymentDrawer.submit")}
        </button>
      </div>
    </RightDrawer>
  );
};

export default AddPaymentDrawer;