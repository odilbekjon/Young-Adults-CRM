import { afterEach, describe, expect, it, vi } from "vitest";
import { findFutureAttendanceDate, isAfterDay, isFutureAttendanceDate } from "../attendanceDates";

// The suite runs in Asia/Tashkent (UTC+5, see vitest.config.ts), so every `now`
// below is a LOCAL moment: new Date(y, m - 1, d, h, min).
const at = (year: number, month: number, day: number, hour = 12, minute = 0) =>
  new Date(year, month - 1, day, hour, minute);

describe("isAfterDay", () => {
  it.each([
    ["2026-11-04", "2026-11-03", true],
    ["2026-11-03", "2026-11-03", false],
    ["2026-11-02", "2026-11-03", false],
    ["2026-12-01", "2026-11-03", true], // a later month, though 01 < 03
    ["2027-01-01", "2026-11-03", true], // a later year, though 01 < 11
    ["2026-10-31", "2026-11-03", false], // an earlier month, though 31 > 03
    ["2025-12-31", "2026-11-03", false], // an earlier year, though 12 > 11
  ])("%s after %s -> %s", (date, day, after) => {
    expect(isAfterDay(date, day)).toBe(after);
  });

  it("reads only the day of a datetime", () => {
    expect(isAfterDay("2026-11-03T00:00:00.000Z", "2026-11-03")).toBe(false);
    expect(isAfterDay("2026-11-04T23:59:59+05:00", "2026-11-03")).toBe(true);
  });

  it.each([[""], ["not a date"], ["03.11.2026"], ["2026/11/04"], ["2026-1-4"], ["26-11-04"]])(
    "locks %j, which is not a readable calendar day",
    (date) => {
      expect(isAfterDay(date, "2026-11-03")).toBe(true);
    },
  );

  it("locks everything when today itself is unreadable", () => {
    expect(isAfterDay("2020-01-01", "NaN-NaN-NaN")).toBe(true);
  });
});

describe("isFutureAttendanceDate", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  describe("an ordinary day (Tuesday 3 November 2026, midday)", () => {
    const now = at(2026, 11, 3);

    it.each([
      ["2026-11-03", false], // today stays markable
      ["2026-11-02", false], // yesterday
      ["2026-11-01", false],
      ["2026-10-31", false],
      ["2025-11-03", false], // a year ago
      ["2026-11-04", true], // tomorrow
      ["2026-11-30", true], // last day of this month
      ["2026-12-01", true], // first day of next month
      ["2027-01-01", true],
      ["2026-12-31", true],
      ["2030-06-15", true], // far-future month
      ["2099-12-31", true],
    ])("%s -> future: %s", (date, future) => {
      expect(isFutureAttendanceDate(date, now)).toBe(future);
    });
  });

  it("treats today as markable from 00:00 to 23:59 local time", () => {
    expect(isFutureAttendanceDate("2026-11-03", at(2026, 11, 3, 0, 0))).toBe(false);
    expect(isFutureAttendanceDate("2026-11-03", at(2026, 11, 3, 23, 59))).toBe(false);
    expect(isFutureAttendanceDate("2026-11-04", at(2026, 11, 3, 23, 59))).toBe(true);
  });

  it("uses the local day just after midnight, while UTC is still the previous day", () => {
    // 00:30 on 1 November local time is 19:30 on 31 October UTC.
    const now = at(2026, 11, 1, 0, 30);
    expect(now.toISOString().slice(0, 10)).toBe("2026-10-31");

    expect(isFutureAttendanceDate("2026-11-01", now)).toBe(false);
    expect(isFutureAttendanceDate("2026-11-02", now)).toBe(true);
  });

  it("keeps tomorrow locked just before midnight", () => {
    const now = at(2026, 10, 31, 23, 30);
    expect(isFutureAttendanceDate("2026-10-31", now)).toBe(false);
    expect(isFutureAttendanceDate("2026-11-01", now)).toBe(true);
  });

  describe("month boundaries", () => {
    it("last day of a 31-day month: the 1st of the next month is the future", () => {
      const now = at(2026, 10, 31);
      expect(isFutureAttendanceDate("2026-10-31", now)).toBe(false);
      expect(isFutureAttendanceDate("2026-11-01", now)).toBe(true);
    });

    it("last day of a 30-day month", () => {
      const now = at(2026, 11, 30);
      expect(isFutureAttendanceDate("2026-11-30", now)).toBe(false);
      expect(isFutureAttendanceDate("2026-12-01", now)).toBe(true);
    });

    it("first day of a month: the whole month ahead is the future, the month behind is not", () => {
      const now = at(2026, 12, 1);
      expect(isFutureAttendanceDate("2026-12-01", now)).toBe(false);
      expect(isFutureAttendanceDate("2026-12-02", now)).toBe(true);
      expect(isFutureAttendanceDate("2026-12-31", now)).toBe(true);
      expect(isFutureAttendanceDate("2026-11-30", now)).toBe(false);
    });
  });

  describe("year boundary", () => {
    it("Dec 31 -> Jan 1: tomorrow is in the next year", () => {
      const now = at(2026, 12, 31, 23, 59);
      expect(isFutureAttendanceDate("2026-12-31", now)).toBe(false);
      expect(isFutureAttendanceDate("2027-01-01", now)).toBe(true);
      expect(isFutureAttendanceDate("2027-01-31", now)).toBe(true);
    });

    it("Jan 1: the last days of the old year are the past", () => {
      const now = at(2027, 1, 1, 0, 5);
      expect(isFutureAttendanceDate("2027-01-01", now)).toBe(false);
      expect(isFutureAttendanceDate("2026-12-31", now)).toBe(false);
      expect(isFutureAttendanceDate("2027-01-02", now)).toBe(true);
    });
  });

  describe("leap years", () => {
    it("Feb 28 2028 (leap year): Feb 29 exists and is still ahead", () => {
      const now = at(2028, 2, 28);
      expect(isFutureAttendanceDate("2028-02-28", now)).toBe(false);
      expect(isFutureAttendanceDate("2028-02-29", now)).toBe(true);
      expect(isFutureAttendanceDate("2028-03-01", now)).toBe(true);
    });

    it("Feb 29 2028: today is markable, Mar 1 is the future", () => {
      const now = at(2028, 2, 29);
      expect(isFutureAttendanceDate("2028-02-29", now)).toBe(false);
      expect(isFutureAttendanceDate("2028-02-28", now)).toBe(false);
      expect(isFutureAttendanceDate("2028-03-01", now)).toBe(true);
    });

    it("Feb 28 2027 (not a leap year): Mar 1 is the next day", () => {
      const now = at(2027, 2, 28);
      expect(isFutureAttendanceDate("2027-02-28", now)).toBe(false);
      expect(isFutureAttendanceDate("2027-03-01", now)).toBe(true);
    });

    it("Mar 1 2028 sees Feb 29 as the past", () => {
      expect(isFutureAttendanceDate("2028-02-29", at(2028, 3, 1))).toBe(false);
    });
  });

  it("reads the day of a datetime, not its instant", () => {
    const now = at(2026, 11, 3);
    expect(isFutureAttendanceDate("2026-11-03T23:59:59", now)).toBe(false);
    expect(isFutureAttendanceDate("2026-11-04T00:00:00", now)).toBe(true);
  });

  it("locks a value that is not a calendar day", () => {
    expect(isFutureAttendanceDate("", at(2026, 11, 3))).toBe(true);
    expect(isFutureAttendanceDate("tomorrow", at(2026, 11, 3))).toBe(true);
  });

  it("reads the system clock when no `now` is given", () => {
    vi.useFakeTimers({ toFake: ["Date"] });

    vi.setSystemTime(at(2026, 6, 15, 9, 30));
    expect(isFutureAttendanceDate("2026-06-15")).toBe(false);
    expect(isFutureAttendanceDate("2026-06-16")).toBe(true);

    // A tab left open past midnight: the next call already sees the new day.
    vi.setSystemTime(at(2026, 6, 16, 0, 0));
    expect(isFutureAttendanceDate("2026-06-16")).toBe(false);
    expect(isFutureAttendanceDate("2026-06-17")).toBe(true);
  });
});

describe("findFutureAttendanceDate", () => {
  const now = at(2026, 11, 3);

  it("is undefined when every date is today or earlier", () => {
    expect(findFutureAttendanceDate(["2026-10-01", "2026-11-02", "2026-11-03"], now)).toBeUndefined();
  });

  it("is undefined for an empty list", () => {
    expect(findFutureAttendanceDate([], now)).toBeUndefined();
  });

  it("names the first date that is still ahead", () => {
    expect(findFutureAttendanceDate(["2026-11-03", "2026-11-04", "2027-01-01"], now)).toBe("2026-11-04");
  });

  it("finds a single future date among past ones, wherever it is", () => {
    expect(findFutureAttendanceDate(["2026-11-05", "2026-11-01"], now)).toBe("2026-11-05");
    expect(findFutureAttendanceDate(["2026-11-01", "2026-11-02", "2026-12-01"], now)).toBe("2026-12-01");
  });

  it("counts an unreadable date as future", () => {
    expect(findFutureAttendanceDate(["2026-11-01", "garbage"], now)).toBe("garbage");
  });
});
