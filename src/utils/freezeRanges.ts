import type { FreezeRange } from "../app/api/attendancesApi/types";

// A freeze whose status says it has ended.
const ENDED_STATUSES = ["EXPIRED", "CANCELLED", "CANCELED", "ENDED", "COMPLETED", "INACTIVE"];

// Whether the student is frozen on `day` (YYYY-MM-DD) according to their freezes:
// a freeze holds from its start day up to and including its end day, or with no
// end for as long as it stays open.
//
// `today` matters for one case: a freeze the backend has marked as ended is over
// from today on, even when its end date is today itself (the day it was lifted -
// the student is back). For a past day only the dates tell: a freeze that has
// since expired still covers the days it was in force.
export const isFrozenOn = (ranges: readonly FreezeRange[], day: string, today: string): boolean =>
  ranges.some((range) => {
    if (!range.startDate || day < range.startDate) return false;
    if (range.endDate && day > range.endDate) return false;
    if (day >= today && range.status && ENDED_STATUSES.includes(range.status)) return false;
    return true;
  });

// The day a month's roll call is judged on: today for the month on screen, the
// month's last day for a month already over, its first day for one that has not
// started.
export const rollCallDay = (monthStart: string, monthEnd: string, today: string): string =>
  today < monthStart ? monthStart : today > monthEnd ? monthEnd : today;
