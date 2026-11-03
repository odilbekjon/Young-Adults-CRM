import { toLocalISODate } from "./localDate";

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

// Attendance can be marked for today and the past, never for a day that has not
// come yet — whoever is asking, the CEO included. Days are compared as plain
// zero-padded YYYY-MM-DD strings, which sort the same way as the calendar: no
// timestamps, no toISOString() (UTC), so 00:30 on the 1st in UTC+5 is already the
// 1st, and month, year and leap-day boundaries need no special case.
//
// `date` that is not a readable calendar day cannot be shown to be in the past,
// so it counts as "after" (locked) rather than slipping through.
export const isAfterDay = (date: string, day: string): boolean => {
  const d = date.slice(0, 10);
  if (!ISO_DAY.test(d) || !ISO_DAY.test(day)) return true;
  return d > day;
};

// Whether `date` (YYYY-MM-DD, or a datetime — only its day is read) lies after
// the viewer's local today. `now` is injectable for tests; by default the clock
// is read at the moment of the call, so a tab left open past midnight stays right.
export const isFutureAttendanceDate = (date: string, now: Date = new Date()): boolean =>
  isAfterDay(date, toLocalISODate(now));

// The first of `dates` that is still in the future, or undefined when every one
// of them may be marked.
export const findFutureAttendanceDate = (dates: string[], now: Date = new Date()): string | undefined => {
  const today = toLocalISODate(now);
  return dates.find((date) => isAfterDay(date, today));
};
