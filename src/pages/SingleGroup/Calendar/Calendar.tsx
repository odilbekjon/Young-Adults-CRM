// src/pages/groups/Calendar.tsx
import { useState } from "react";
import { useTranslation } from "react-i18next";

const WEEKDAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
const MONTH_KEYS = [
  "january", "february", "march", "april", "may", "june",
  "july", "august", "september", "october", "november", "december",
];

const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

const YEARS_PER_PAGE = 12;

interface CalendarProps {
  value: Date | null;
  onChange: (date: Date) => void;
  /** ISO date string (YYYY-MM-DD); days before this are disabled */
  min?: string;
  /** ISO date string (YYYY-MM-DD); days after this are disabled */
  max?: string;
}

export const Calendar = ({ value, onChange, min, max }: CalendarProps) => {
  const { t } = useTranslation();
  const [viewDate, setViewDate] = useState<Date>(value ?? new Date());
  const [viewMode, setViewMode] = useState<"days" | "months" | "years">("days");
  const [yearPageStart, setYearPageStart] = useState<number>(
    Math.floor((value ?? new Date()).getFullYear() / YEARS_PER_PAGE) * YEARS_PER_PAGE
  );

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const minDate = min ? startOfDay(new Date(`${min}T00:00:00`)) : null;
  const maxDate = max ? startOfDay(new Date(`${max}T00:00:00`)) : null;
  const isDisabled = (d: Date) => {
    const day = startOfDay(d);
    if (minDate && day < minDate) return true;
    if (maxDate && day > maxDate) return true;
    return false;
  };

  const firstOfMonth = new Date(year, month, 1);
  const startWeekday = firstOfMonth.getDay(); // 0 = Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const cells: { day: number; inMonth: boolean; date: Date }[] = [];

  for (let i = startWeekday - 1; i >= 0; i--) {
    const day = daysInPrevMonth - i;
    cells.push({ day, inMonth: false, date: new Date(year, month - 1, day) });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, inMonth: true, date: new Date(year, month, d) });
  }
  const remaining = 42 - cells.length;
  for (let d = 1; d <= remaining; d++) {
    cells.push({ day: d, inMonth: false, date: new Date(year, month + 1, d) });
  }

  const today = new Date();

  const goPrevYear  = () => setViewDate(new Date(year - 1, month, 1));
  const goNextYear  = () => setViewDate(new Date(year + 1, month, 1));
  const goPrevMonth = () => setViewDate(new Date(year, month - 1, 1));
  const goNextMonth = () => setViewDate(new Date(year, month + 1, 1));

  const openYears = () => {
    setYearPageStart(Math.floor(year / YEARS_PER_PAGE) * YEARS_PER_PAGE);
    setViewMode("years");
  };
  const openMonths = () => setViewMode("months");

  if (viewMode === "years") {
    const years = Array.from({ length: YEARS_PER_PAGE }, (_, i) => yearPageStart + i);
    return (
      <div style={{ width: "100%", userSelect: "none" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <NavBtn onClick={() => setYearPageStart((p) => p - YEARS_PER_PAGE)}>«</NavBtn>
          <span style={{ fontSize: 15, fontWeight: 600, color: "#1a1a1a" }}>
            {years[0]} – {years[years.length - 1]}
          </span>
          <NavBtn onClick={() => setYearPageStart((p) => p + YEARS_PER_PAGE)}>»</NavBtn>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 6 }}>
          {years.map((y) => (
            <button
              key={y}
              type="button"
              onClick={() => { setViewDate(new Date(y, month, 1)); setViewMode("days"); }}
              style={{
                border: "none",
                background: y === year ? "#185FA5" : "transparent",
                color: y === year ? "#fff" : y === today.getFullYear() ? "#185FA5" : "#1a1a1a",
                fontWeight: y === year || y === today.getFullYear() ? 700 : 400,
                fontSize: 13,
                borderRadius: 8,
                padding: "8px 0",
                cursor: "pointer",
              }}
            >
              {y}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (viewMode === "months") {
    return (
      <div style={{ width: "100%", userSelect: "none" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <NavBtn onClick={goPrevYear}>«</NavBtn>
          <span
            onClick={openYears}
            style={{ fontSize: 15, fontWeight: 600, color: "#1a1a1a", cursor: "pointer" }}
          >
            {year}
          </span>
          <NavBtn onClick={goNextYear}>»</NavBtn>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 6 }}>
          {MONTH_KEYS.map((mk, i) => (
            <button
              key={mk}
              type="button"
              onClick={() => { setViewDate(new Date(year, i, 1)); setViewMode("days"); }}
              style={{
                border: "none",
                background: i === month ? "#185FA5" : "transparent",
                color: i === month ? "#fff" : "#1a1a1a",
                fontWeight: i === month ? 700 : 400,
                fontSize: 12,
                borderRadius: 8,
                padding: "10px 4px",
                cursor: "pointer",
              }}
            >
              {t(`singleGroup.calendar.months.${mk}`)}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: "100%", userSelect: "none" }}>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        marginBottom: 12,
      }}>
        <div style={{ display: "flex", gap: 2 }}>
          <NavBtn onClick={goPrevYear}>«</NavBtn>
          <NavBtn onClick={goPrevMonth}>‹</NavBtn>
        </div>
        <span style={{ fontSize: 15, fontWeight: 600, color: "#1a1a1a", display: "flex", gap: 6 }}>
          <span onClick={openYears} style={{ cursor: "pointer" }}>{year}</span>
          <span onClick={openMonths} style={{ cursor: "pointer" }}>
            {t(`singleGroup.calendar.months.${MONTH_KEYS[month]}`)}
          </span>
        </span>
        <div style={{ display: "flex", gap: 2 }}>
          <NavBtn onClick={goNextMonth}>›</NavBtn>
          <NavBtn onClick={goNextYear}>»</NavBtn>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", marginBottom: 4 }}>
        {WEEKDAY_KEYS.map((w) => (
          <div key={w} style={{ textAlign: "center", fontSize: 12, color: "#9ca3af", padding: "4px 0" }}>
            {t(`singleGroup.calendar.weekdays.${w}`)}
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", rowGap: 6 }}>
        {cells.map((c, i) => {
          const isToday = isSameDay(c.date, today);
          const isSelected = value ? isSameDay(c.date, value) : false;
          const disabled = isDisabled(c.date);
          return (
            <button
              key={i}
              type="button"
              disabled={disabled}
              onClick={() => onChange(c.date)}
              style={{
                border: "none",
                background: isSelected ? "#185FA5" : "transparent",
                color: disabled ? "#e0e0e0" : isSelected ? "#fff" : isToday ? "#185FA5" : c.inMonth ? "#1a1a1a" : "#d1d5db",
                fontWeight: isToday || isSelected ? 700 : 400,
                fontSize: 13,
                borderRadius: 8,
                padding: "6px 0",
                cursor: disabled ? "not-allowed" : "pointer",
              }}
            >
              {c.day}
            </button>
          );
        })}
      </div>
    </div>
  );
};

const NavBtn = ({ onClick, children }: { onClick: () => void; children: React.ReactNode }) => (
  <button
    type="button"
    onClick={onClick}
    style={{
      border: "none", background: "transparent", color: "#9ca3af",
      fontSize: 15, cursor: "pointer", padding: "2px 6px", borderRadius: 6,
    }}
    onMouseEnter={(e) => (e.currentTarget.style.background = "#f3f4f6")}
    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
  >
    {children}
  </button>
);

export default Calendar;
