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
