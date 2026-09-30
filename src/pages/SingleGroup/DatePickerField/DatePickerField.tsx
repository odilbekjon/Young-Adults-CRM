// src/pages/groups/DatePickerField.tsx
import { useRef, useState } from "react";
import { MdCalendarToday } from "react-icons/md";
import { useTranslation } from "react-i18next";
import { Calendar } from "../Calendar";
import { PortalPopover } from "../../../components/common/PortalPopover";
import { parseTrainingDate } from "../../../utils";

interface DatePickerFieldProps {
  /**
   * ISO date string, e.g. "2026-07-19", or "" when nothing is selected. A full
   * ISO datetime ("2026-07-19T00:00:00+05:00") is tolerated too — only its
   * leading YYYY-MM-DD is used. onChange always emits plain "YYYY-MM-DD".
   */
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

// Backend may hand back a full ISO datetime; reduce to the leading
// YYYY-MM-DD (no Date/timezone round-trip, so the day can never shift).
const toDateOnly = (value: string) => {
  const p = parseTrainingDate(value);
  if (!p) return "";
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
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
  const [hovered, setHovered] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const dateOnly = toDateOnly(value);
  const selectedDate = dateOnly ? new Date(`${dateOnly}T00:00:00`) : null;
  const handlePick = (d: Date) => { onChange(toIso(d)); setOpen(false); };
  const toggle = () => { if (!disabled) setOpen((p) => !p); };

  return (
    // The wrapper is the popup anchor: fills block/grid parents (modals, drawers) and
    // keeps a stable minimum width inside flex filter rows (value vs placeholder).
    <div ref={wrapRef} style={{ position: "relative", minWidth: 160 }}>
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-disabled={disabled || undefined}
        onClick={toggle}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(); }
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          display: "flex", alignItems: "center", gap: 10,
          boxSizing: "border-box", width: "100%", height: 40,
          border: `1px solid ${!disabled && (open || hovered) ? "var(--color-primary)" : "var(--color-border)"}`,
          borderRadius: 8, padding: "0 12px", outline: "none",
          cursor: disabled ? "not-allowed" : "pointer",
          background: disabled ? "var(--color-surface-alt)" : "var(--color-surface)",
          opacity: disabled ? 0.6 : 1,
          transition: "border-color 0.15s",
        }}
      >
        <MdCalendarToday size={17} color="var(--color-text-muted)" style={{ flexShrink: 0 }} />
        <span
          style={{
            fontSize: 13, lineHeight: 1.2, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            color: dateOnly ? "var(--color-text-primary)" : "var(--color-text-muted)",
          }}
        >
          {dateOnly ? formatDisplay(dateOnly) : resolvedPlaceholder}
        </span>
      </div>

      {!disabled && (
        <PortalPopover open={open} onClose={() => setOpen(false)} anchorRef={wrapRef}>
          <div
            style={{
              display: "flex",
              background: "var(--color-surface)", border: "1px solid var(--color-border)",
              borderRadius: 10, boxShadow: "0 8px 24px var(--color-shadow)",
              overflow: "hidden",
            }}
          >
            {shortcuts && (
              <div style={{ borderRight: "1px solid var(--color-border)", padding: "8px 0", minWidth: 130 }}>
                {buildShortcuts(t).map((sc) => (
                  <div
                    key={sc.label}
                    onClick={() => handlePick(sc.date)}
                    style={{
                      padding: "7px 14px", fontSize: 12, color: "var(--color-text-primary)",
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
            <div style={{ width: 272, boxSizing: "border-box", padding: 12 }}>
              <Calendar value={selectedDate} onChange={handlePick} min={min ? toDateOnly(min) || undefined : undefined} max={max ? toDateOnly(max) || undefined : undefined} />
            </div>
          </div>
        </PortalPopover>
      )}
    </div>
  );
};

export default DatePickerField;
