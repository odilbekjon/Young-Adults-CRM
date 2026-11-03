import { afterEach, describe, expect, it, vi } from "vitest";
import {
  bucketLabel, bucketRangeLabel, buildChartSeries, countDays, currentMonthRange, daysInMonth, endOfMonthOf,
  formatIsoDate, monthRange, parseIsoDate, pickGranularity, rangeFromLink, spansMonths, startOfMonthOf, wholeMonthsOf,
  type ChartBucket,
} from "./period";

describe("daysInMonth / monthRange", () => {
  it("knows month lengths, including leap Februaries", () => {
    expect(daysInMonth(2026, 11)).toBe(30);
    expect(daysInMonth(2026, 12)).toBe(31);
    expect(daysInMonth(2027, 2)).toBe(28);
    expect(daysInMonth(2028, 2)).toBe(29);
    expect(daysInMonth(2100, 2)).toBe(28);
    expect(daysInMonth(2000, 2)).toBe(29);
  });

  it("runs from the first to the last day of the month", () => {
    expect(monthRange(2026, 11)).toEqual({ start: "2026-11-01", end: "2026-11-30" });
    expect(monthRange(2028, 2)).toEqual({ start: "2028-02-01", end: "2028-02-29" });
    expect(monthRange(2026, 12)).toEqual({ start: "2026-12-01", end: "2026-12-31" });
  });
});

describe("currentMonthRange", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("is the viewer's current calendar month", () => {
    expect(currentMonthRange(new Date(2026, 10, 3, 12, 0))).toEqual({ start: "2026-11-01", end: "2026-11-30" });
  });

  it("is still the new month just after midnight on the 1st, when UTC is still the old one", () => {
    // 01:30 on 1 November in Asia/Tashkent is 20:30 on 31 October UTC.
    const justAfterMidnight = new Date(2026, 10, 1, 1, 30);
    expect(justAfterMidnight.toISOString().slice(0, 10)).toBe("2026-10-31");
    expect(currentMonthRange(justAfterMidnight)).toEqual({ start: "2026-11-01", end: "2026-11-30" });
  });

  it("follows the system clock by default", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2028, 1, 29, 23, 59));
    expect(currentMonthRange()).toEqual({ start: "2028-02-01", end: "2028-02-29" });
  });
});

describe("parseIsoDate", () => {
  it("reads a real calendar date", () => {
    expect(parseIsoDate("2026-11-03")).toEqual({ year: 2026, month: 11, day: 3 });
    expect(parseIsoDate("2028-02-29")).toEqual({ year: 2028, month: 2, day: 29 });
  });

  it("rejects anything else", () => {
    expect(parseIsoDate("2027-02-29")).toBeNull();
    expect(parseIsoDate("2026-13-01")).toBeNull();
    expect(parseIsoDate("2026-00-10")).toBeNull();
    expect(parseIsoDate("2026-11-31")).toBeNull();
    expect(parseIsoDate("2026-11-3")).toBeNull();
    expect(parseIsoDate("03.11.2026")).toBeNull();
    expect(parseIsoDate("2026-11-03T00:00:00+05:00")).toBeNull();
    expect(parseIsoDate("")).toBeNull();
    expect(parseIsoDate(null)).toBeNull();
    expect(parseIsoDate(undefined)).toBeNull();
  });
});

describe("startOfMonthOf / endOfMonthOf", () => {
  it("returns the bounds of the month a date is in", () => {
    expect(startOfMonthOf("2026-11-17")).toBe("2026-11-01");
    expect(endOfMonthOf("2026-11-17")).toBe("2026-11-30");
    expect(endOfMonthOf("2028-02-10")).toBe("2028-02-29");
    expect(endOfMonthOf("nope")).toBeNull();
    expect(startOfMonthOf("nope")).toBeNull();
  });
});

describe("rangeFromLink", () => {
  it("keeps the range a link carries (the Dashboard's month start -> today)", () => {
    expect(rangeFromLink("2026-11-01", "2026-11-03")).toEqual({ start: "2026-11-01", end: "2026-11-03" });
  });

  it("puts a reversed range in order", () => {
    expect(rangeFromLink("2026-11-20", "2026-11-05")).toEqual({ start: "2026-11-05", end: "2026-11-20" });
  });

  it("expands a single date to the whole month it is in", () => {
    expect(rangeFromLink("2026-11-10", null)).toEqual({ start: "2026-11-10", end: "2026-11-30" });
    expect(rangeFromLink(null, "2026-11-10")).toEqual({ start: "2026-11-01", end: "2026-11-10" });
  });

  it("ignores an invalid date and has nothing to say without any", () => {
    expect(rangeFromLink("garbage", "2026-11-10")).toEqual({ start: "2026-11-01", end: "2026-11-10" });
    expect(rangeFromLink("garbage", null)).toBeNull();
    expect(rangeFromLink(null, null)).toBeNull();
    expect(rangeFromLink("", "")).toBeNull();
  });
});

describe("countDays", () => {
  it("counts both ends", () => {
    expect(countDays({ start: "2026-11-01", end: "2026-11-30" })).toBe(30);
    expect(countDays({ start: "2026-11-05", end: "2026-11-05" })).toBe(1);
    expect(countDays({ start: "2028-02-01", end: "2028-02-29" })).toBe(29);
    expect(countDays({ start: "2026-12-25", end: "2027-01-05" })).toBe(12);
  });

  it("is 0 for a reversed or invalid range", () => {
    expect(countDays({ start: "2026-11-10", end: "2026-11-01" })).toBe(0);
    expect(countDays({ start: "x", end: "2026-11-01" })).toBe(0);
  });
});

describe("wholeMonthsOf", () => {
  it("recognises one whole month", () => {
    expect(wholeMonthsOf({ start: "2026-11-01", end: "2026-11-30" })).toEqual({ year: 2026, months: [11] });
    expect(wholeMonthsOf({ start: "2028-02-01", end: "2028-02-29" })).toEqual({ year: 2028, months: [2] });
  });

  it("recognises several whole months of one year", () => {
    expect(wholeMonthsOf({ start: "2026-09-01", end: "2026-11-30" })).toEqual({ year: 2026, months: [9, 10, 11] });
  });

  it("is null for a partial month, a short February and a range across years", () => {
    expect(wholeMonthsOf({ start: "2026-11-01", end: "2026-11-03" })).toBeNull();
    expect(wholeMonthsOf({ start: "2026-11-02", end: "2026-11-30" })).toBeNull();
    expect(wholeMonthsOf({ start: "2028-02-01", end: "2028-02-28" })).toBeNull();
    expect(wholeMonthsOf({ start: "2026-12-01", end: "2027-01-31" })).toBeNull();
    expect(wholeMonthsOf({ start: "", end: "" })).toBeNull();
  });
});

describe("pickGranularity", () => {
  it("is daily up to about three months, then weekly for a year, then monthly", () => {
    expect(pickGranularity(1)).toBe("day");
    expect(pickGranularity(30)).toBe("day");
    expect(pickGranularity(92)).toBe("day");
    expect(pickGranularity(93)).toBe("week");
    expect(pickGranularity(371)).toBe("week");
    expect(pickGranularity(372)).toBe("month");
    expect(pickGranularity(1500)).toBe("month");
  });
});

describe("buildChartSeries: a month, one point per day", () => {
  const november = { start: "2026-11-01", end: "2026-11-30" };

  it("has a bucket for every day of the month, empty days included as 0", () => {
    const series = buildChartSeries([], november);
    expect(series.granularity).toBe("day");
    expect(series.buckets).toHaveLength(30);
    expect(series.buckets[0]).toEqual({ start: "2026-11-01", end: "2026-11-01", amount: 0, count: 0 });
    expect(series.buckets[29].start).toBe("2026-11-30");
    expect(series.buckets.every((b) => b.amount === 0)).toBe(true);
  });

  it("adds each payment to its own day", () => {
    const series = buildChartSeries(
      [
        { date: "2026-11-01", amount: 100 },
        { date: "2026-11-03", amount: 250_000 },
        { date: "2026-11-03", amount: 50_000 },
        { date: "2026-11-30", amount: 7 },
      ],
      november,
    );
    expect(series.buckets[0]).toMatchObject({ amount: 100, count: 1 });
    expect(series.buckets[1]).toMatchObject({ amount: 0, count: 0 });
    expect(series.buckets[2]).toMatchObject({ start: "2026-11-03", amount: 300_000, count: 2 });
    expect(series.buckets[29]).toMatchObject({ start: "2026-11-30", amount: 7, count: 1 });
    expect(series.buckets.reduce((sum, b) => sum + b.amount, 0)).toBe(300_107);
  });

  it("ignores payments outside the range and ones without a usable day", () => {
    const series = buildChartSeries(
      [
        { date: "2026-10-31", amount: 1 },
        { date: "2026-12-01", amount: 2 },
        { date: null, amount: 3 },
        { date: "not a date", amount: 4 },
        { date: "2026-11-15", amount: 5 },
      ],
      november,
    );
    expect(series.buckets.reduce((sum, b) => sum + b.amount, 0)).toBe(5);
  });

  it("has the right number of days in a leap February and a 31-day month", () => {
    expect(buildChartSeries([], monthRange(2028, 2)).buckets).toHaveLength(29);
    expect(buildChartSeries([], monthRange(2027, 2)).buckets).toHaveLength(28);
    expect(buildChartSeries([], monthRange(2026, 12)).buckets).toHaveLength(31);
  });

  it("covers a range that crosses a month boundary day by day", () => {
    const series = buildChartSeries([{ date: "2026-12-01", amount: 9 }], { start: "2026-11-29", end: "2026-12-02" });
    expect(series.buckets.map((b) => b.start)).toEqual(["2026-11-29", "2026-11-30", "2026-12-01", "2026-12-02"]);
    expect(series.buckets[2].amount).toBe(9);
  });

  it("is one point for a single day and empty for an invalid range", () => {
    expect(buildChartSeries([{ date: "2026-11-05", amount: 4 }], { start: "2026-11-05", end: "2026-11-05" }).buckets).toEqual([
      { start: "2026-11-05", end: "2026-11-05", amount: 4, count: 1 },
    ]);
    expect(buildChartSeries([], { start: "2026-11-10", end: "2026-11-01" }).buckets).toEqual([]);
    expect(buildChartSeries([], { start: "", end: "" }).buckets).toEqual([]);
  });
});

describe("buildChartSeries: a long range falls back to weeks, then months", () => {
  it("groups a half year into 7-day blocks starting on the first day, the last one clamped", () => {
    // 2026-06-01 .. 2026-11-30 = 183 days = 26 whole weeks + 1 day.
    const range = { start: "2026-06-01", end: "2026-11-30" };
    const series = buildChartSeries(
      [
        { date: "2026-06-01", amount: 10 },
        { date: "2026-06-07", amount: 20 },
        { date: "2026-06-08", amount: 30 },
        { date: "2026-11-30", amount: 40 },
      ],
      range,
    );
    expect(series.granularity).toBe("week");
    expect(series.buckets).toHaveLength(27);
    expect(series.buckets[0]).toMatchObject({ start: "2026-06-01", end: "2026-06-07", amount: 30, count: 2 });
    expect(series.buckets[1]).toMatchObject({ start: "2026-06-08", end: "2026-06-14", amount: 30 });
    expect(series.buckets[26]).toMatchObject({ start: "2026-11-30", end: "2026-11-30", amount: 40 });
    expect(series.buckets.reduce((sum, b) => sum + b.amount, 0)).toBe(100);
  });

  it("groups several years into calendar months, the first and last clamped to the range", () => {
    const range = { start: "2024-03-15", end: "2026-11-10" };
    const series = buildChartSeries(
      [
        { date: "2024-03-15", amount: 1 },
        { date: "2024-03-31", amount: 2 },
        { date: "2024-04-01", amount: 4 },
        { date: "2025-02-28", amount: 8 },
        { date: "2026-11-10", amount: 16 },
      ],
      range,
    );
    expect(series.granularity).toBe("month");
    expect(series.buckets).toHaveLength(33);
    expect(series.buckets[0]).toMatchObject({ start: "2024-03-15", end: "2024-03-31", amount: 3, count: 2 });
    expect(series.buckets[1]).toMatchObject({ start: "2024-04-01", end: "2024-04-30", amount: 4 });
    expect(series.buckets[11]).toMatchObject({ start: "2025-02-01", end: "2025-02-28", amount: 8 });
    expect(series.buckets[32]).toMatchObject({ start: "2026-11-01", end: "2026-11-10", amount: 16 });
    expect(series.buckets.reduce((sum, b) => sum + b.amount, 0)).toBe(31);
  });

  it("still uses days for a quarter (92 days)", () => {
    expect(buildChartSeries([], { start: "2026-09-01", end: "2026-11-30" }).granularity).toBe("day");
  });
});

describe("labels", () => {
  const day = (start: string, end = start): ChartBucket => ({ start, end, amount: 0, count: 0 });

  it("formats a date as DD.MM.YYYY", () => {
    expect(formatIsoDate("2026-11-03")).toBe("03.11.2026");
    expect(formatIsoDate("junk")).toBe("junk");
  });

  it("labels a day of a single month with its number, and a day of a longer range with day.month", () => {
    expect(bucketLabel(day("2026-11-03"), "day", false)).toBe("3");
    expect(bucketLabel(day("2026-11-30"), "day", false)).toBe("30");
    expect(bucketLabel(day("2026-11-03"), "day", true)).toBe("03.11");
  });

  it("labels a week by its first day and a month by month.year", () => {
    expect(bucketLabel(day("2026-06-08", "2026-06-14"), "week", true)).toBe("08.06");
    expect(bucketLabel(day("2026-04-01", "2026-04-30"), "month", true)).toBe("04.2026");
  });

  it("titles a bucket with its date or the dates it covers", () => {
    expect(bucketRangeLabel(day("2026-11-03"))).toBe("03.11.2026");
    expect(bucketRangeLabel(day("2026-06-08", "2026-06-14"))).toBe("08.06.2026 — 14.06.2026");
  });

  it("tells whether a range runs across months", () => {
    expect(spansMonths({ start: "2026-11-01", end: "2026-11-30" })).toBe(false);
    expect(spansMonths({ start: "2026-10-15", end: "2026-11-14" })).toBe(true);
  });
});
