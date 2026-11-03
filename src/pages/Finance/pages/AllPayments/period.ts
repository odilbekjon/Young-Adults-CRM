// Calendar arithmetic and chart bucketing for the All payments page.
//
// Everything works on plain `YYYY-MM-DD` strings through UTC day numbers (the
// same approach studyPeriod.ts uses), never on local-time Dates: a Date built
// in the viewer's timezone (UTC+5 here, with `toISOString()` reporting the day
// before between 00:00 and 05:00) is exactly how a payment ends up on the
// wrong day. Month lengths and leap years come from `Date.UTC(y, m, 0)`.

interface IsoParts {
  year: number;
  month: number; // 1-12
  day: number;
}

export interface DateRange {
  start: string; // inclusive, YYYY-MM-DD
  end: string; // inclusive, YYYY-MM-DD
}

const MS_PER_DAY = 86_400_000;
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

const pad = (n: number) => String(n).padStart(2, "0");
const isoOf = (year: number, month: number, day: number) => `${year}-${pad(month)}-${pad(day)}`;

export const daysInMonth = (year: number, month: number): number => new Date(Date.UTC(year, month, 0)).getUTCDate();

const dayNumberOf = (year: number, month: number, day: number) => Date.UTC(year, month - 1, day) / MS_PER_DAY;

const fromDayNumber = (n: number): string => {
  const d = new Date(n * MS_PER_DAY);
  return isoOf(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
};

// A strict calendar date: exactly YYYY-MM-DD and a day that exists (no
// "2026-02-30"). Anything else is null, so a hand-edited URL can't poison the page.
export const parseIsoDate = (value: string | null | undefined): IsoParts | null => {
  const match = value ? ISO_DATE.exec(value) : null;
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month)) return null;
  return { year, month, day };
};

const dayNumber = (iso: string): number | null => {
  const p = parseIsoDate(iso);
  return p ? dayNumberOf(p.year, p.month, p.day) : null;
};

export const monthRange = (year: number, month: number): DateRange => ({
  start: isoOf(year, month, 1),
  end: isoOf(year, month, daysInMonth(year, month)),
});

// First day -> last day of the viewer's current calendar month.
export const currentMonthRange = (now: Date = new Date()): DateRange => monthRange(now.getFullYear(), now.getMonth() + 1);

// First / last day of the month a date belongs to (null for an invalid date).
export const startOfMonthOf = (iso: string): string | null => {
  const p = parseIsoDate(iso);
  return p ? isoOf(p.year, p.month, 1) : null;
};
export const endOfMonthOf = (iso: string): string | null => {
  const p = parseIsoDate(iso);
  return p ? isoOf(p.year, p.month, daysInMonth(p.year, p.month)) : null;
};

// The range a deep link asks for (the Dashboard's "Paid during the month" card
// links here with ?startDate=&endDate=). Both given -> exactly that range (put
// in order if reversed); only one -> the whole month it falls in; none (or
// nothing valid) -> null so the page falls back to the current month.
export const rangeFromLink = (startParam: string | null, endParam: string | null): DateRange | null => {
  const start = parseIsoDate(startParam) ? startParam! : null;
  const end = parseIsoDate(endParam) ? endParam! : null;
  if (start && end) return start <= end ? { start, end } : { start: end, end: start };
  if (start) return { start, end: endOfMonthOf(start)! };
  if (end) return { start: startOfMonthOf(end)!, end };
  return null;
};

// Number of days in the range, both ends included (0 when it is invalid or reversed).
export const countDays = (range: DateRange): number => {
  const first = dayNumber(range.start);
  const last = dayNumber(range.end);
  return first === null || last === null || last < first ? 0 : last - first + 1;
};

// The calendar months a range covers COMPLETELY (1st -> last day, one year), as
// { year, months: [11] }; null for any partial or multi-year range.
export const wholeMonthsOf = (range: DateRange): { year: number; months: number[] } | null => {
  const start = parseIsoDate(range.start);
  const end = parseIsoDate(range.end);
  if (!start || !end || start.year !== end.year || start.month > end.month) return null;
  if (start.day !== 1 || end.day !== daysInMonth(end.year, end.month)) return null;
  return { year: start.year, months: Array.from({ length: end.month - start.month + 1 }, (_, i) => start.month + i) };
};

// ─── Chart buckets ────────────────────────────────────────────────────────────

export type Granularity = "day" | "week" | "month";

// Up to ~3 months read fine one point per day; a year is 53 weekly points; beyond
// that it is calendar months (a daily line over years would be unreadable).
export const DAILY_MAX_DAYS = 92;
export const WEEKLY_MAX_DAYS = 371;

export const pickGranularity = (days: number): Granularity =>
  days <= DAILY_MAX_DAYS ? "day" : days <= WEEKLY_MAX_DAYS ? "week" : "month";

export interface ChartPoint {
  date: string | null; // the payment's own day (YYYY-MM-DD)
  amount: number;
}

export interface ChartBucket {
  start: string;
  end: string;
  amount: number;
  count: number;
}

export interface ChartSeries {
  granularity: Granularity;
  buckets: ChartBucket[];
}

// One bucket per day / 7-day block / calendar month across the WHOLE range, so an
// empty day stays a 0 and the line always spans the full period. Weeks start on
// the range's first day; the first and last month are clamped to the range.
// Payments outside the range (or without a usable day) are not counted.
export const buildChartSeries = (points: ChartPoint[], range: DateRange): ChartSeries => {
  const first = dayNumber(range.start);
  const last = dayNumber(range.end);
  if (first === null || last === null || last < first) return { granularity: "day", buckets: [] };

  const granularity = pickGranularity(last - first + 1);
  const buckets: ChartBucket[] = [];
  let indexOf: (day: IsoParts, n: number) => number;

  if (granularity === "month") {
    const from = parseIsoDate(range.start)!;
    const to = parseIsoDate(range.end)!;
    const firstMonth = from.year * 12 + from.month - 1;
    for (let k = firstMonth; k <= to.year * 12 + to.month - 1; k += 1) {
      const year = Math.floor(k / 12);
      const month = (k % 12) + 1;
      const bounds = monthRange(year, month);
      buckets.push({
        start: bounds.start < range.start ? range.start : bounds.start,
        end: bounds.end > range.end ? range.end : bounds.end,
        amount: 0,
        count: 0,
      });
    }
    indexOf = (day) => day.year * 12 + day.month - 1 - firstMonth;
  } else {
    const step = granularity === "day" ? 1 : 7;
    for (let n = first; n <= last; n += step) {
      buckets.push({ start: fromDayNumber(n), end: fromDayNumber(Math.min(n + step - 1, last)), amount: 0, count: 0 });
    }
    indexOf = (_day, n) => Math.floor((n - first) / step);
  }

  points.forEach((point) => {
    const day = parseIsoDate(point.date);
    if (!day) return;
    const n = dayNumberOf(day.year, day.month, day.day);
    if (n < first || n > last) return;
    const bucket = buckets[indexOf(day, n)];
    bucket.amount += point.amount;
    bucket.count += 1;
  });

  return { granularity, buckets };
};

// ─── Labels ───────────────────────────────────────────────────────────────────

// DD.MM.YYYY, the date order used everywhere else in the app.
export const formatIsoDate = (iso: string): string => {
  const p = parseIsoDate(iso);
  return p ? `${pad(p.day)}.${pad(p.month)}.${p.year}` : iso;
};

// Whether a range runs across more than one calendar month (then a bare day
// number on the axis would be ambiguous).
export const spansMonths = (range: DateRange): boolean => range.start.slice(0, 7) !== range.end.slice(0, 7);

// Short axis label: "3" for a day inside a single month, "03.11" for a day of
// a longer range or the start of a week, "11.2026" for a month.
export const bucketLabel = (bucket: ChartBucket, granularity: Granularity, rangeSpansMonths: boolean): string => {
  const p = parseIsoDate(bucket.start);
  if (!p) return bucket.start;
  if (granularity === "month") return `${pad(p.month)}.${p.year}`;
  if (granularity === "day" && !rangeSpansMonths) return String(p.day);
  return `${pad(p.day)}.${pad(p.month)}`;
};

// Tooltip title: the exact date, or the dates a week/month bucket covers.
export const bucketRangeLabel = (bucket: ChartBucket): string =>
  bucket.start === bucket.end
    ? formatIsoDate(bucket.start)
    : `${formatIsoDate(bucket.start)} — ${formatIsoDate(bucket.end)}`;
