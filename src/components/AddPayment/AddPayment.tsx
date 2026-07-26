import { useData } from "../../Context/DataContext";
import { RightDrawer } from "../../components/common/RightDrawer";
import { useState } from "react";
import { useTranslation } from "react-i18next";


import {
 
  MdKeyboardArrowDown,  MdCalendarToday,
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

/* payment method keys map to translation.json -> addPayment.methods.* */
const PAYMENT_METHOD_ROWS: (string | null)[][] = [
  ["cash", "click"],
  ["card", "uzum"],
  ["bankAccount", "humo"],
  ["payme", null],
];

export const AddPayment = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
  const { t } = useTranslation();
  const { students, editStudent } = useData();
  const [method, setMethod] = useState("cash");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [comment, setComment] = useState("");
  const [selectedUid, setSelectedUid] = useState("");

  const handleClose = () => {
    setMethod("cash"); setAmount(""); setComment("");
    setSelectedUid(""); setDate(new Date().toISOString().split("T")[0]);
    onClose();
  };

  const handleSubmit = () => {
    if (selectedUid && amount) {
      const student = students.find((s) => s.uid === selectedUid);
      if (student) {
        const paid = Number(amount);
        editStudent(selectedUid, { balance: (student.balance ?? 0) + paid });
      }
    }
    handleClose();
  };

  return (
    <RightDrawer open={open} onClose={handleClose} title={t("addPayment.title")} width={440}>
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

        {/* Student */}
        <div>
          <label style={labelStyle}>{t("addPayment.student")}</label>
          <div style={{ position: "relative" }}>
            <select
              value={selectedUid}
              onChange={(e) => setSelectedUid(e.target.value)}
              style={{
                ...inputStyle, appearance: "none",
                color: selectedUid ? "#1a1a1a" : "#aaa", paddingRight: 36,
              }}
            >
              <option value="">{t("addPayment.selectStudent")}</option>
              {students.map((s) => (
                <option key={s.uid} value={s.uid}>{s.name}</option>
              ))}
            </select>
            <MdKeyboardArrowDown size={18} style={{
              position: "absolute", right: 12, top: "50%",
              transform: "translateY(-50%)", color: "#aaa", pointerEvents: "none",
            }} />
          </div>
        </div>

        {/* Show balance if student selected */}
        {selectedUid && (() => {
          const s = students.find((st) => st.uid === selectedUid);
          return s ? (
            <div style={{
              background: "#2d4a5a", color: "#fff", borderRadius: 20,
              padding: "6px 16px", fontSize: 13, fontWeight: 600,
              display: "inline-flex", alignSelf: "flex-start",
            }}>
              {t("addPayment.balance")}: {(s.balance ?? 0).toLocaleString("ru-RU")} UZS
            </div>
          ) : null;
        })()}

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

        {/* Comment */}
        <div>
          <label style={labelStyle}>{t("addPayment.comment")}</label>
          <textarea
            style={{ ...inputStyle, minHeight: 80, resize: "vertical" }}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
        </div>

        {/* Submit */}
        <div>
          <button
            onClick={handleSubmit}
            style={{
              background: "#4a9bb5", color: "#fff", border: "none",
              borderRadius: 20, padding: "11px 32px",
              fontSize: 14, fontWeight: 600, cursor: "pointer",
            }}
          >
            {t("addPayment.submit")}
          </button>
        </div>
      </div>
    </RightDrawer>
  );
};
