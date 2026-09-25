// Backend returns training dates as full ISO datetime strings (often with a
// timezone offset, e.g. "2026-08-14T05:00:00+05:00"). Parsing that with
// `new Date(...)` and reading local getters can roll the day backward/forward
// depending on the viewer's timezone, and naively splitting on "-" (the old
// approach) breaks entirely once a "T...+05:00" tail is present. Instead we
// read the leading YYYY-MM-DD straight out of the string — it's always in
// that position regardless of what follows — then format it for display
// without ever constructing a Date in the viewer's local timezone.
const DATE_PREFIX = /^(\d{4})-(\d{2})-(\d{2})/;

export interface ParsedTrainingDate {
  year: number;
  month: number; // 1-12
  day: number;
}

export const parseTrainingDate = (value?: string | null): ParsedTrainingDate | null => {
  if (!value) return null;
  const match = DATE_PREFIX.exec(value);
  if (!match) return null;
  const [, y, m, d] = match;
  return { year: Number(y), month: Number(m), day: Number(d) };
};

// DD.MM.YYYY, matching the day/month/year order used everywhere else in the
// app (e.g. FlatStudents' own formatDate) — this used to render a
// locale-dependent "14 Aug 2026" short-month label via Intl, which produced
// "Aug 28, 2025"-style output that didn't match the rest of the app's date
// columns.
export const formatTrainingDate = (value?: string | null): string => {
  const parsed = parseTrainingDate(value);
  if (!parsed) return "—";
  const dd = String(parsed.day).padStart(2, "0");
  const mm = String(parsed.month).padStart(2, "0");
  return `${dd}.${mm}.${parsed.year}`;
};

// Same leading-prefix approach as parseTrainingDate, extended to also read
// the HH:mm:ss that follows the date on a full ISO datetime string (e.g.
// "2026-08-14T05:00:00+05:00") — used for timestamps (history/transaction
// entries) where the time of day matters, not just the date.
const DATETIME_PREFIX = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/;

// DD.MM.YYYY HH:mm:ss when a time-of-day is present, otherwise falls back to
// the date-only DD.MM.YYYY (formatTrainingDate) — matches the timestamp
// format used across the app's history/transaction feeds.
export const formatDateTime = (value?: string | null): string => {
  if (!value) return "—";
  const match = DATETIME_PREFIX.exec(value);
  if (!match) return formatTrainingDate(value);
  const [, y, m, d, hh, mm, ss] = match;
  return `${d}.${m}.${y} ${hh}:${mm}:${ss}`;
};

// Normalizes a training-date value (plain "YYYY-MM-DD" or a full ISO
// datetime with a "T.../offset" tail) down to its "YYYY-MM-DD" prefix —
// the shape date-only inputs (DatePickerField, <input type="date">) need.
// Passing a full datetime straight through to those (the previous behavior)
// garbled the displayed date and broke the calendar's selected-day
// highlighting once a value came back from the backend.
export const toIsoDatePart = (value?: string | null): string => {
  const parsed = parseTrainingDate(value);
  if (!parsed) return "";
  return `${parsed.year}-${String(parsed.month).padStart(2, "0")}-${String(parsed.day).padStart(2, "0")}`;
};

const daysInMonth = (year: number, month: number): number =>
  // month is 1-12; day 0 of the *next* month is the last day of this one.
  new Date(year, month, 0).getDate();

// Adds `months` (Course.months, e.g. 3) to an ISO `YYYY-MM-DD`-prefixed date
// and returns a plain `YYYY-MM-DD` string — used to auto-fill a group's
// trainingEnd from its course's duration + trainingStart. Pure integer
// arithmetic on the parsed y/m/d (same approach as parseTrainingDate/
// formatTrainingDate above) rather than `new Date(...)` + setMonth, so this
// can't drift a day depending on the viewer's timezone. A start day that
// doesn't exist in the target month (e.g. Jan 31 + 1 month) clamps to that
// month's last day instead of overflowing into the month after (Mar 3).
export const addMonthsToIsoDate = (value: string, months: number): string | null => {
  const parsed = parseTrainingDate(value);
  if (!parsed || !Number.isFinite(months)) return null;
  const totalMonths = parsed.year * 12 + (parsed.month - 1) + months;
  const year = Math.floor(totalMonths / 12);
  const month = (totalMonths % 12) + 1;
  const day = Math.min(parsed.day, daysInMonth(year, month));
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
};
