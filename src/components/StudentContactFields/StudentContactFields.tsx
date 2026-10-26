import { useState } from "react";
import {
  BsTelephone, BsKey, BsPerson, BsEnvelope,
  BsTelegram, BsMortarboard, BsGeoAlt, BsCardText,
} from "react-icons/bs";
import { IoClose } from "react-icons/io5";

// The student's optional contact fields (same names as POST/PATCH /students).
export type ContactFieldId = "parentPhone" | "passport" | "parentName" | "email" | "telegram" | "schoolName" | "location" | "instagram";
export type ContactValues = Record<ContactFieldId, string>;

export const EMPTY_CONTACTS: ContactValues = {
  parentPhone: "", passport: "", parentName: "", email: "",
  telegram: "", schoolName: "", location: "", instagram: "",
};

const FIELDS: { id: ContactFieldId; icon: React.ReactNode; label: string; inputType: string }[] = [
  { id: "parentPhone", icon: <BsTelephone size={16} />, label: "Additional phone", inputType: "tel" },
  { id: "passport", icon: <BsKey size={16} />, label: "Passport", inputType: "text" },
  { id: "parentName", icon: <BsPerson size={16} />, label: "Contact person", inputType: "text" },
  { id: "email", icon: <BsEnvelope size={16} />, label: "Email", inputType: "email" },
  { id: "telegram", icon: <BsTelegram size={16} />, label: "Telegram", inputType: "text" },
  { id: "schoolName", icon: <BsMortarboard size={16} />, label: "School / education", inputType: "text" },
  { id: "location", icon: <BsGeoAlt size={16} />, label: "Address", inputType: "text" },
  { id: "instagram", icon: <BsCardText size={16} />, label: "Instagram", inputType: "text" },
];

// Icon row + one input per opened field. A field that already holds a value
// is open from the start; clearing it (x) empties the value.
export const StudentContactFields = ({ values, onChange }: { values: ContactValues; onChange: (id: ContactFieldId, value: string) => void }) => {
  const [opened, setOpened] = useState<Partial<Record<ContactFieldId, boolean>>>({});
  const isOpen = (id: ContactFieldId) => opened[id] ?? Boolean(values[id]);
  const setOpen = (id: ContactFieldId, open: boolean) => setOpened((p) => ({ ...p, [id]: open }));

  return (
    <div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        {FIELDS.map((f) => (
          <button
            key={f.id}
            type="button"
            title={f.label}
            onClick={() => setOpen(f.id, !isOpen(f.id))}
            style={{
              width: 40, height: 40, borderRadius: "50%", cursor: "pointer",
              border: `1.5px solid ${isOpen(f.id) ? "#185FA5" : "#c5d8ec"}`,
              background: isOpen(f.id) ? "var(--color-primary-surface)" : "var(--color-surface)",
              color: isOpen(f.id) ? "#185FA5" : "#4a7aaa",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            {f.icon}
          </button>
        ))}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: FIELDS.some((f) => isOpen(f.id)) ? 12 : 0 }}>
        {FIELDS.filter((f) => isOpen(f.id)).map((f) => (
          <div key={f.id}>
            <label style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-primary)", marginBottom: 6, display: "block" }}>{f.label}</label>
            <div style={{
              display: "flex", alignItems: "center", gap: 8, padding: "0 6px 0 12px",
              border: "1px solid var(--color-border)", borderRadius: 8, background: "var(--color-surface)",
            }}>
              <span style={{ color: "#4a7aaa", display: "flex", flexShrink: 0 }}>{f.icon}</span>
              <input
                style={{ flex: 1, border: "none", outline: "none", fontSize: 13, padding: "10px 0", background: "transparent", color: "var(--color-text-primary)", fontFamily: "inherit" }}
                type={f.inputType}
                value={values[f.id]}
                onChange={(e) => onChange(f.id, e.target.value)}
                placeholder={f.label}
              />
              <button
                type="button"
                title="Remove"
                onClick={() => { onChange(f.id, ""); setOpen(f.id, false); }}
                style={{ width: 22, height: 22, borderRadius: "50%", border: "none", background: "transparent", color: "var(--color-text-muted)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
              >
                <IoClose size={15} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
