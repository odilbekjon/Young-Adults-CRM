import { describe, expect, it } from "vitest";
import { getStudyPeriod, type StudySpan } from "../studyPeriod";

const span = (months: number, weeks: number, days: number): StudySpan => ({ months, weeks, days });

describe("getStudyPeriod", () => {
  describe("state of the period relative to today", () => {
    it("is notStarted before the training start and still reports the total length", () => {
      expect(getStudyPeriod("2026-03-02", "2026-06-02", "2026-03-01")).toEqual({
        state: "notStarted",
        total: span(3, 0, 0),
      });
    });

    it("is running on the very first day, with nothing elapsed yet", () => {
      expect(getStudyPeriod("2026-03-02", "2026-06-02", "2026-03-02")).toEqual({
        state: "running",
        elapsed: span(0, 0, 0),
        total: span(3, 0, 0),
      });
    });

    it("is running in between and splits the elapsed time into months, weeks and days", () => {
      // 10 days after the start: one week and three days
      expect(getStudyPeriod("2026-03-02", "2026-06-02", "2026-03-12")).toEqual({
        state: "running",
        elapsed: span(0, 1, 3),
        total: span(3, 0, 0),
      });
      // 1 month, 2 weeks and 1 day after the start
      expect(getStudyPeriod("2026-03-02", "2026-06-02", "2026-04-17")).toEqual({
        state: "running",
        elapsed: span(1, 2, 1),
        total: span(3, 0, 0),
      });
    });

    it("is still running on the day before the end", () => {
      const period = getStudyPeriod("2026-03-02", "2026-06-02", "2026-06-01");
      expect(period?.state).toBe("running");
    });

    it("is finished on the end date itself and after it", () => {
      expect(getStudyPeriod("2026-03-02", "2026-06-02", "2026-06-02")).toEqual({ state: "finished", total: span(3, 0, 0) });
      expect(getStudyPeriod("2026-03-02", "2026-06-02", "2027-01-01")).toEqual({ state: "finished", total: span(3, 0, 0) });
    });

    it("keeps running without an end date and reports no total", () => {
      expect(getStudyPeriod("2026-03-02", null, "2026-03-12")).toEqual({
        state: "running",
        elapsed: span(0, 1, 3),
        total: null,
      });
      expect(getStudyPeriod("2026-03-02", undefined, "2026-03-01")).toEqual({ state: "notStarted", total: null });
    });
  });

  describe("missing or unusable input", () => {
    it("returns null without a usable start date", () => {
      expect(getStudyPeriod(null, "2026-06-02", "2026-03-01")).toBeNull();
      expect(getStudyPeriod(undefined, "2026-06-02", "2026-03-01")).toBeNull();
      expect(getStudyPeriod("", "2026-06-02", "2026-03-01")).toBeNull();
      expect(getStudyPeriod("not a date", "2026-06-02", "2026-03-01")).toBeNull();
    });

    it("returns null when today cannot be read", () => {
      expect(getStudyPeriod("2026-03-02", "2026-06-02", "")).toBeNull();
    });

    it("ignores an unreadable end date instead of failing", () => {
      expect(getStudyPeriod("2026-03-02", "garbage", "2026-03-12")).toEqual({
        state: "running",
        elapsed: span(0, 1, 3),
        total: null,
      });
    });

    it("never produces a negative span when the end is before the start", () => {
      const period = getStudyPeriod("2026-03-02", "2026-02-01", "2026-03-10");
      expect(period).toEqual({ state: "finished", total: span(0, 0, 0) });
    });
  });

  describe("month ends", () => {
    it("counts a span that reaches the clamped end of a shorter month as whole months (Jan 31 + 1 month = Feb 28)", () => {
      expect(getStudyPeriod("2026-01-31", "2026-02-28", "2026-01-31")).toMatchObject({ total: span(1, 0, 0) });
    });

    it("does not round up when the clamped month end is one day away", () => {
      // Jan 31 -> Feb 27 is 27 days: no whole month, 3 weeks and 6 days
      expect(getStudyPeriod("2026-01-31", "2026-02-27", "2026-01-31")).toMatchObject({ total: span(0, 3, 6) });
    });

    it("clamps to Feb 29 in a leap year but to Feb 28 otherwise", () => {
      expect(getStudyPeriod("2024-01-31", "2024-02-29", "2024-01-31")).toMatchObject({ total: span(1, 0, 0) });
      // Feb 28 is one day short of the clamped month end in a leap year: 28 days
      expect(getStudyPeriod("2024-01-31", "2024-02-28", "2024-01-31")).toMatchObject({ total: span(0, 4, 0) });
    });

    it("counts a leap-day start plus one year as 12 whole months", () => {
      expect(getStudyPeriod("2024-02-29", "2025-02-28", "2024-02-29")).toMatchObject({ total: span(12, 0, 0) });
    });

    it("measures elapsed time across a year boundary", () => {
      // Dec 31 -> Feb 28 = 2 whole months (Dec 31 + 2 months clamps to Feb 28)
      expect(getStudyPeriod("2025-12-31", null, "2026-02-28")).toEqual({ state: "running", elapsed: span(2, 0, 0), total: null });
      // Nov 20 -> Jan 5 = 1 month (Dec 20) and 16 days
      expect(getStudyPeriod("2025-11-20", null, "2026-01-05")).toEqual({ state: "running", elapsed: span(1, 2, 2), total: null });
    });

    it("backs off to the previous month when the clamped day has not been reached yet", () => {
      // Jan 30 -> Mar 1: Mar 30 is not reached, Feb 28 is; one day left over
      expect(getStudyPeriod("2026-01-30", null, "2026-03-01")).toEqual({ state: "running", elapsed: span(1, 0, 1), total: null });
    });
  });

  describe("timezone-safe integer dates", () => {
    it("reads only the leading YYYY-MM-DD of a full datetime, whatever the offset", () => {
      const withOffset = getStudyPeriod("2026-08-14T05:00:00+05:00", "2026-11-14T00:00:00+05:00", "2026-08-14T23:59:59-05:00");
      const plain = getStudyPeriod("2026-08-14", "2026-11-14", "2026-08-14");
      expect(withOffset).toEqual(plain);
      expect(withOffset).toEqual({ state: "running", elapsed: span(0, 0, 0), total: span(3, 0, 0) });
    });

    it("gives the same answer in any timezone for dates around a DST change", () => {
      // 2026-03-29 is the European spring-forward day: a day count based on
      // Date objects in a DST zone would be off by an hour there.
      expect(getStudyPeriod("2026-03-28", null, "2026-03-30")).toEqual({ state: "running", elapsed: span(0, 0, 2), total: null });
      expect(getStudyPeriod("2026-10-24", null, "2026-10-26")).toEqual({ state: "running", elapsed: span(0, 0, 2), total: null });
    });
  });
});
