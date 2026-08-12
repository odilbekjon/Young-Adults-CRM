import {useState} from "react";
import { MdClose, MdSearch,  } from "react-icons/md";
import { useTranslation } from "react-i18next";
import { Student } from "../../../types";

const MOCK_STUDENTS = [
  { id: 101, name: "Aliyev Bobur", phone: "(90) 123-45-67" },
  { id: 102, name: "Karimova Malika", phone: "(93) 234-56-78" },
  { id: 103, name: "Toshmatov Jasur", phone: "(91) 345-67-89" },
  { id: 104, name: "Yusupova Nilufar", phone: "(94) 456-78-90" },
  { id: 105, name: "Rahimov Sherzod", phone: "(97) 567-89-01" },
  { id: 106, name: "Mirzayeva Zulfiya", phone: "(99) 678-90-12" },
  { id: 107, name: "Hasanov Eldor", phone: "(88) 789-01-23" },
];

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
  background: "#1a3a5c",
  color: "#fff",
  border: "none",
  borderRadius: 10,
  padding: "11px 24px",
  fontSize: 14,
  fontWeight: 600,
  cursor: "pointer",
};

const cancelBtn: React.CSSProperties = {
  background: "#fff",
  color: "#666",
  border: "1px solid #e0e0e0",
  borderRadius: 10,
  padding: "11px 24px",
  fontSize: 14,
  cursor: "pointer",
};

const RightDrawer = ({
  open, onClose, title, width = 480, children,
}: {
  open: boolean; onClose: () => void; title: string; width?: number; children: React.ReactNode;
}) => (
  <>
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0,
        background: "rgba(0,0,0,0.18)",
        zIndex: 1200,
        opacity: open ? 1 : 0,
        pointerEvents: open ? "auto" : "none",
        transition: "opacity 0.25s",
      }}
    />
    <div style={{
      position: "fixed", top: 0, right: 0,
      width, height: "100vh",
      background: "#fff",
      zIndex: 1300,
      boxShadow: "-4px 0 24px rgba(0,0,0,0.12)",
      transform: open ? "translateX(0)" : "translateX(100%)",
      transition: "transform 0.28s cubic-bezier(.4,0,.2,1)",
      display: "flex", flexDirection: "column",
      overflowY: "auto",
    }}>
      <div style={{
        display: "flex", alignItems: "center",
        justifyContent: "space-between",
        padding: "20px 24px 16px",
        borderBottom: "1px solid #f0f0f0",
        flexShrink: 0,
      }}>
        <span style={{ fontSize: 17, fontWeight: 600, color: "#1a1a1a" }}>{title}</span>
        <div onClick={onClose} style={{ cursor: "pointer", color: "#888", fontSize: 20, display: "flex" }}>
          <MdClose />
        </div>
      </div>
      <div style={{ padding: 24, flex: 1, overflowY: "auto" }}>
        {children}
      </div>
    </div>
  </>
);

export const AddStudentDrawer = ({
  open, onClose, onAdd,
}: {
  open: boolean; onClose: () => void;
  onAdd: (s: Student & { startDate?: string }) => void;
}) => {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<(typeof MOCK_STUDENTS)[0] | null>(null);
  const [startDate, setStartDate] = useState("");

  const filtered = query.length > 0
    ? MOCK_STUDENTS.filter(
        (s) => s.name.toLowerCase().includes(query.toLowerCase()) || s.phone.includes(query)
      )
    : [];

  const handleAdd = () => {
    if (!selected) return;
    onAdd({ id: selected.id, name: selected.name, phone: selected.phone, active: true });
    setQuery(""); setSelected(null); setStartDate("");
    onClose();
  };

  return (
    <RightDrawer open={open} onClose={onClose} title={t("singleGroup.addStudentDrawer.title")} width={440}>
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <div>
          <label style={labelStyle}>{t("singleGroup.addStudentDrawer.searchStudent")}</label>
          <div style={{ position: "relative" }}>
            <MdSearch size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#aaa" }} />
            <input
              style={{ ...inputStyle, paddingLeft: 36 }}
              placeholder={t("singleGroup.addStudentDrawer.searchPlaceholder")}
              value={query}
              onChange={(e) => { setQuery(e.target.value); setSelected(null); }}
            />
          </div>
          {filtered.length > 0 && !selected && (
            <div style={{ border: "1px solid #e0e0e0", borderRadius: 8, marginTop: 4, background: "#fff", boxShadow: "0 4px 16px rgba(0,0,0,0.08)", overflow: "hidden" }}>
              {filtered.map((s) => (
                <div
                  key={s.id}
                  onClick={() => { setSelected(s); setQuery(s.name); }}
                  style={{ padding: "10px 14px", cursor: "pointer", display: "flex", justifyContent: "space-between", fontSize: 13, borderBottom: "1px solid #f5f5f5" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#f7fbff")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "#fff")}
                >
                  <span style={{ fontWeight: 500 }}>{s.name}</span>
                  <span style={{ color: "#888" }}>{s.phone}</span>
                </div>
              ))}
            </div>
          )}
          {query.length > 0 && filtered.length === 0 && !selected && (
            <div style={{ fontSize: 12, color: "#aaa", marginTop: 6 }}>{t("singleGroup.addStudentDrawer.noStudentsFound")}</div>
          )}
        </div>
        {selected && (
          <div style={{ background: "#f7fbff", border: "1px solid #B5D4F4", borderRadius: 8, padding: "12px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 13 }}>{selected.name}</div>
              <div style={{ fontSize: 12, color: "#888" }}>{selected.phone}</div>
            </div>
            <div onClick={() => { setSelected(null); setQuery(""); }} style={{ cursor: "pointer", color: "#aaa" }}>
              <MdClose size={16} />
            </div>
          </div>
        )}
        <div>
          <label style={labelStyle}>{t("singleGroup.addStudentDrawer.startDate")}</label>
          <input type="date" style={inputStyle} value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button style={{ ...submitBtn, opacity: selected ? 1 : 0.5 }} onClick={handleAdd} disabled={!selected}>
            {t("singleGroup.addStudentDrawer.submit")}
          </button>
          <button style={cancelBtn} onClick={onClose}>{t("singleGroup.addStudentDrawer.cancel")}</button>
        </div>
      </div>
    </RightDrawer>
  );
};