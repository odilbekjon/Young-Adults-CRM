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

// The calendar day (YYYY-MM-DD) a date sent by the backend stands for. A plain
// day, or a timestamp that carries its own offset ("2026-11-14T00:00:00+05:00"),
// is read as written. A UTC timestamp ("...Z") is read in the viewer's calendar:
// "2026-11-13T19:00:00.000Z" is midnight of the 14th in Tashkent, and cutting it
// at the "T" would name the 13th. Anything unreadable gives undefined.
export const calendarDayOf = (raw?: string | null): string | undefined => {
  if (!raw) return undefined;
  if (/Z$/i.test(raw)) {
    const moment = new Date(raw);
    if (!Number.isNaN(moment.getTime())) return toLocalISODate(moment);
  }
  const day = raw.slice(0, 10);
  return ISO_DAY.test(day) ? day : undefined;
};

// The first day a student's attendance in a group may be marked: the day they
// came into the group (membership joinedAt) or the day their billing there starts
// (paymentStartDate), whichever is earlier. A student added in the middle of the
// month was not in the lessons before that, so those days stay closed; a trial
// lesson (joined, not yet billed) is open from the day it began, and billing that
// staff started on an earlier day than the join opens the days since then.
// Undefined when neither day is known - nothing is closed on a guess.
export const attendanceStartDay = (...dates: Array<string | null | undefined>): string | undefined => {
  const days = dates.map(calendarDayOf).filter((d): d is string => !!d).sort();
  return days[0];
};
