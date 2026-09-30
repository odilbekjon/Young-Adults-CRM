// src/pages/groups/TimeSelectField.tsx
import { useRef, useState } from "react";
import { MdAccessTime } from "react-icons/md";
import { TIME_OPTIONS } from "../../../utils";
import { PortalPopover } from "../../../components/common/PortalPopover";

interface TimeSelectFieldProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}

export const TimeSelectField = ({ value, onChange, placeholder }: TimeSelectFieldProps) => {
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  return (
    <div ref={wrapRef} style={{ position: "relative", minWidth: 160 }}>
      <div
        role="button"
        tabIndex={0}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((p) => !p)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setOpen((p) => !p); }
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          display: "flex", alignItems: "center", gap: 10,
          boxSizing: "border-box", width: "100%", height: 40,
          border: `1px solid ${open || hovered ? "var(--color-primary)" : "var(--color-border)"}`,
          borderRadius: 8, padding: "0 12px", outline: "none",
          cursor: "pointer", background: "var(--color-surface)",
          transition: "border-color 0.15s",
        }}
      >
        <MdAccessTime size={17} color="var(--color-text-muted)" style={{ flexShrink: 0 }} />
        <span style={{ fontSize: 13, lineHeight: 1.2, color: value ? "var(--color-text-primary)" : "var(--color-text-muted)" }}>
          {value || placeholder}
        </span>
      </div>
      <PortalPopover open={open} onClose={() => setOpen(false)} anchorRef={wrapRef} matchAnchorWidth>
        <div
          style={{
            minWidth: 160, maxHeight: 240, overflowY: "auto",
            background: "var(--color-surface)", border: "1px solid var(--color-border)",
            borderRadius: 12, boxShadow: "0 12px 32px var(--color-shadow)",
            padding: 6,
          }}
        >
          {TIME_OPTIONS.map((time) => (
            <div
              key={time}
              onClick={() => { onChange(time); setOpen(false); }}
              style={{
                padding: "9px 12px", fontSize: 13, borderRadius: 8, cursor: "pointer",
                color: time === value ? "var(--color-primary)" : "var(--color-text-primary)",
                fontWeight: time === value ? 700 : 400,
                background: time === value ? "var(--color-primary-surface)" : "transparent",
              }}
              onMouseEnter={(e) => { if (time !== value) e.currentTarget.style.background = "var(--color-surface-hover)"; }}
              onMouseLeave={(e) => { if (time !== value) e.currentTarget.style.background = "transparent"; }}
            >
              {time}
            </div>
          ))}
        </div>
      </PortalPopover>
    </div>
  );
};

export default TimeSelectField;
