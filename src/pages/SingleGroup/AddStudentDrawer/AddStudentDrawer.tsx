import { useEffect, useState } from "react";
import { MdClose, MdKeyboardArrowDown } from "react-icons/md";
import { useTranslation } from "react-i18next";
import { DatePickerField } from "../DatePickerField";

export interface AddStudentOption {
  id: string;
  name: string;
  phone: string;
}

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

const submitBtn: React.CSSProperties = {
  background: "#4a90c4",
  color: "#fff",
  border: "none",
  borderRadius: 22,
  padding: "11px 32px",
  fontSize: 14,
  fontWeight: 600,
  cursor: "pointer",
};

// Centered modal (not a side drawer) — matches the reference "Add student"
// design: title + close icon, fields stacked below, single pill submit
// button, no separate cancel button (the X covers that).
const CenterModal = ({
  open, onClose, title, children,
}: {
  open: boolean; onClose: () => void; title: string; children: React.ReactNode;
}) => {
  if (!open) return null;
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0,
        background: "rgba(0,0,0,0.35)",
        zIndex: 1300,
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff",
          borderRadius: 14,
          width: 420,
          maxWidth: "100%",
          boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
        }}
      >
        <div style={{
          display: "flex", alignItems: "center",
          justifyContent: "space-between",
          padding: "20px 24px",
          borderBottom: "1px solid #f0f0f0",
        }}>
          <span style={{ fontSize: 18, fontWeight: 600, color: "#1a1a1a" }}>{title}</span>
          <div onClick={onClose} style={{ cursor: "pointer", color: "#888", fontSize: 20, display: "flex" }}>
            <MdClose />
          </div>
        </div>
        <div style={{ padding: 24 }}>
          {children}
        </div>
      </div>
    </div>
  );
};

export const AddStudentDrawer = ({
  open, onClose, students, onSubmit, isSubmitting,
}: {
  open: boolean;
  onClose: () => void;
  students: AddStudentOption[];
  // joinedAt is an optional ISO date ("since when" this student joined) —
  // POST /student-groups already accepts it (see AddStudentToGroupRequest),
  // it just wasn't exposed in this modal before.
  onSubmit: (studentId: string, joinedAt?: string) => void;
  isSubmitting?: boolean;
}) => {
  const { t } = useTranslation();
  const [selectedId, setSelectedId] = useState("");
  const [dateFrom, setDateFrom] = useState("");

  useEffect(() => {
    if (!open) { setSelectedId(""); setDateFrom(""); }
  }, [open]);

  const handleAdd = () => {
    if (!selectedId || isSubmitting) return;
    onSubmit(selectedId, dateFrom || undefined);
  };

  return (
    <CenterModal open={open} onClose={onClose} title={t("singleGroup.addStudentDrawer.title")}>
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <div>
          <label style={labelStyle}>{t("singleGroup.addStudentDrawer.selectStudent")}</label>
          <div style={{ position: "relative" }}>
            <select
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              disabled={isSubmitting}
              style={{
                ...inputStyle, appearance: "none",
                color: selectedId ? "#1a1a1a" : "#aaa", paddingRight: 36,
              }}
            >
              <option value="">{t("singleGroup.addStudentDrawer.selectPlaceholder")}</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>{s.name}{s.phone ? ` — ${s.phone}` : ""}</option>
              ))}
            </select>
            <MdKeyboardArrowDown size={18} style={{
              position: "absolute", right: 12, top: "50%",
              transform: "translateY(-50%)", color: "#aaa", pointerEvents: "none",
            }} />
          </div>
          {students.length === 0 && (
            <div style={{ fontSize: 12, color: "#aaa", marginTop: 6 }}>{t("singleGroup.addStudentDrawer.noStudentsFound")}</div>
          )}
        </div>

        <div>
          <label style={labelStyle}>{t("singleGroup.addStudentDrawer.startDate")}</label>
          <DatePickerField value={dateFrom} onChange={setDateFrom} disabled={isSubmitting} />
        </div>

        <button
          style={{ ...submitBtn, opacity: selectedId && !isSubmitting ? 1 : 0.5, alignSelf: "flex-start" }}
          onClick={handleAdd}
          disabled={!selectedId || isSubmitting}
        >
          {isSubmitting ? "…" : t("singleGroup.addStudentDrawer.submit")}
        </button>
      </div>
    </CenterModal>
  );
};
