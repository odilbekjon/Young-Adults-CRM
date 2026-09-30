// src/pages/groups/DatePickerField.tsx
import { useRef, useState } from "react";
import { MdCalendarToday } from "react-icons/md";
import { useTranslation } from "react-i18next";
import { Calendar } from "../Calendar";
import { PortalPopover } from "../../../components/common/PortalPopover";

interface DatePickerFieldProps {
  /** ISO date string, e.g. "2026-07-19", or "" when nothing is selected */
  value: string;
  onChange: (isoDate: string) => void;
  placeholder?: string;
  /** ISO date string; dates before this are disabled, mirrors <input type="date" min> */
  min?: string;
  /** ISO date string; dates after this are disabled, mirrors <input type="date" max> */
  max?: string;
  /** Disables opening the picker, mirrors <input type="date" disabled> */
  disabled?: boolean;
  /** Shows a "Yesterday/Today/Tomorrow/Start of month/Start of next month" quick-pick sidebar next to the calendar */
  shortcuts?: boolean;
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

const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

const buildShortcuts = (t: (key: string) => string) => {
  const today = new Date();
  return [
    { label: t("singleGroup.datePickerField.shortcuts.yesterday"), date: addDays(today, -1) },
    { label: t("singleGroup.datePickerField.shortcuts.today"), date: today },
    { label: t("singleGroup.datePickerField.shortcuts.tomorrow"), date: addDays(today, 1) },
    { label: t("singleGroup.datePickerField.shortcuts.startOfMonth"), date: new Date(today.getFullYear(), today.getMonth(), 1) },
    { label: t("singleGroup.datePickerField.shortcuts.startOfNextMonth"), date: new Date(today.getFullYear(), today.getMonth() + 1, 1) },
  ];
};

export const DatePickerField = ({ value, onChange, placeholder, min, max, disabled, shortcuts }: DatePickerFieldProps) => {
  const { t } = useTranslation();
  const resolvedPlaceholder = placeholder ?? t("singleGroup.datePickerField.noDateSelected");
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const selectedDate = value ? new Date(`${value}T00:00:00`) : null;
  const handlePick = (d: Date) => { onChange(toIso(d)); setOpen(false); };

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      <div
        onClick={() => !disabled && setOpen((p) => !p)}
        style={{
          display: "flex", alignItems: "center", gap: 10,
          border: "1px solid var(--color-border)", borderRadius: 10,
          padding: "12px 14px", cursor: disabled ? "not-allowed" : "pointer",
          background: disabled ? "var(--color-surface-alt)" : "var(--color-surface)",
          opacity: disabled ? 0.6 : 1,
        }}
      >
        <MdCalendarToday size={17} color="var(--color-text-muted)" />
        <span style={{ fontSize: 14, color: value ? "var(--color-text-primary)" : "var(--color-text-muted)" }}>
          {value ? formatDisplay(value) : resolvedPlaceholder}
        </span>
      </div>

      {!disabled && (
        <PortalPopover open={open} onClose={() => setOpen(false)} anchorRef={wrapRef}>
          <div
            style={{
              display: "flex",
              background: "var(--color-surface)", border: "1px solid var(--color-border)",
              borderRadius: 12, boxShadow: "0 12px 32px var(--color-shadow)",
              overflow: "hidden",
            }}
          >
            {shortcuts && (
              <div style={{ borderRight: "1px solid var(--color-border)", padding: "12px 0", minWidth: 150 }}>
                {buildShortcuts(t).map((sc) => (
                  <div
                    key={sc.label}
                    onClick={() => handlePick(sc.date)}
                    style={{
                      padding: "9px 16px", fontSize: 13, color: "var(--color-text-primary)",
                      cursor: "pointer", whiteSpace: "nowrap",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-surface-hover)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    {sc.label}
                  </div>
                ))}
              </div>
            )}
            <div style={{ width: "100%", minWidth: 300, padding: 16 }}>
              <Calendar value={selectedDate} onChange={handlePick} min={min} max={max} />
            </div>
          </div>
        </PortalPopover>
      )}
    </div>
  );
};

export default DatePickerField;
