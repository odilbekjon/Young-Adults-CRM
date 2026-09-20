// src/pages/groups/TimeSelectField.tsx
import { useEffect, useRef, useState } from "react";
import { MdAccessTime } from "react-icons/md";
import { TIME_OPTIONS } from "../../../utils";

interface TimeSelectFieldProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}

export const TimeSelectField = ({ value, onChange, placeholder }: TimeSelectFieldProps) => {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      <div
        onClick={() => setOpen((p) => !p)}
        style={{
          display: "flex", alignItems: "center", gap: 10,
          border: "1px solid #e0e0e0", borderRadius: 10,
          padding: "12px 14px", cursor: "pointer", background: "#fff",
        }}
      >
        <MdAccessTime size={17} color="#9e9e9e" />
        <span style={{ fontSize: 14, color: value ? "#1a1a1a" : "#b0b0b0" }}>
          {value || placeholder}
        </span>
      </div>
      {open && (
        <div
          style={{
            position: "absolute", top: "calc(100% + 8px)", left: 0,
            width: "100%", minWidth: 160, maxHeight: 240, overflowY: "auto",
            background: "#fff", border: "1px solid #eee",
            borderRadius: 12, boxShadow: "0 12px 32px rgba(0,0,0,0.14)",
            padding: 6, zIndex: 50,
          }}
        >
          {TIME_OPTIONS.map((time) => (
            <div
              key={time}
              onClick={() => { onChange(time); setOpen(false); }}
              style={{
                padding: "9px 12px", fontSize: 13, borderRadius: 8, cursor: "pointer",
                color: time === value ? "#185FA5" : "#1a1a1a",
                fontWeight: time === value ? 700 : 400,
                background: time === value ? "#E6F1FB" : "transparent",
              }}
              onMouseEnter={(e) => { if (time !== value) e.currentTarget.style.background = "#f3f4f6"; }}
              onMouseLeave={(e) => { if (time !== value) e.currentTarget.style.background = "transparent"; }}
            >
              {time}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TimeSelectField;
