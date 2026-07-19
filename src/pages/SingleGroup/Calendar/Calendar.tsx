// src/pages/groups/Calendar.tsx
import { useState } from "react";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

interface CalendarProps {
  value: Date | null;
  onChange: (date: Date) => void;
}

export const Calendar = ({ value, onChange }: CalendarProps) => {
  const [viewDate, setViewDate] = useState<Date>(value ?? new Date());

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

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
        <span style={{ fontSize: 15, fontWeight: 600, color: "#1a1a1a" }}>
          {year} {MONTH_NAMES[month]}
        </span>
        <div style={{ display: "flex", gap: 2 }}>
          <NavBtn onClick={goNextMonth}>›</NavBtn>
          <NavBtn onClick={goNextYear}>»</NavBtn>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", marginBottom: 4 }}>
        {WEEKDAYS.map((w) => (
          <div key={w} style={{ textAlign: "center", fontSize: 12, color: "#9ca3af", padding: "4px 0" }}>
            {w}
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", rowGap: 6 }}>
        {cells.map((c, i) => {
          const isToday = isSameDay(c.date, today);
          const isSelected = value ? isSameDay(c.date, value) : false;
          return (
            <button
              key={i}
              type="button"
              onClick={() => onChange(c.date)}
              style={{
                border: "none",
                background: isSelected ? "#185FA5" : "transparent",
                color: isSelected ? "#fff" : isToday ? "#185FA5" : c.inMonth ? "#1a1a1a" : "#d1d5db",
                fontWeight: isToday || isSelected ? 700 : 400,
                fontSize: 13,
                borderRadius: 8,
                padding: "6px 0",
                cursor: "pointer",
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