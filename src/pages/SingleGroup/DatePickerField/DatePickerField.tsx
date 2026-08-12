// src/pages/groups/DatePickerField.tsx
import { useEffect, useRef, useState } from "react";
import { MdCalendarToday } from "react-icons/md";
import { useTranslation } from "react-i18next";
import { Calendar } from "../Calendar";

interface DatePickerFieldProps {
  /** ISO date string, e.g. "2026-07-19", or "" when nothing is selected */
  value: string;
  onChange: (isoDate: string) => void;
  placeholder?: string;
}

const toIso = (d: Date) => {
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, "0");
  const day = d.getDate().toString().padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const formatDisplay = (iso: string) => {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y}`;
};

export const DatePickerField = ({ value, onChange, placeholder }: DatePickerFieldProps) => {
  const { t } = useTranslation();
  const resolvedPlaceholder = placeholder ?? t("singleGroup.datePickerField.noDateSelected");
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

  const selectedDate = value ? new Date(`${value}T00:00:00`) : null;

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
        <MdCalendarToday size={17} color="#9e9e9e" />
        <span style={{ fontSize: 14, color: value ? "#1a1a1a" : "#b0b0b0" }}>
          {value ? formatDisplay(value) : resolvedPlaceholder}
        </span>
      </div>

      {open && (
        <div
          style={{
            position: "absolute", top: "calc(100% + 8px)", left: 0,
            width: "100%", minWidth: 300,
            background: "#fff", border: "1px solid #eee",
            borderRadius: 12, boxShadow: "0 12px 32px rgba(0,0,0,0.14)",
            padding: 16, zIndex: 50,
          }}
        >
          <Calendar
            value={selectedDate}
            onChange={(d) => { onChange(toIso(d)); setOpen(false); }}
          />
        </div>
      )}
    </div>
  );
};

export default DatePickerField;