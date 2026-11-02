import { describe, expect, it } from "vitest";
import { addMonthsToIsoDate, formatTrainingDate, parseTrainingDate } from "../formatTrainingDate";

describe("parseTrainingDate", () => {
  it("reads the leading YYYY-MM-DD", () => {
    expect(parseTrainingDate("2026-08-14")).toEqual({ year: 2026, month: 8, day: 14 });
  });

  it("ignores the time and offset, so the day cannot roll over in another timezone", () => {
    expect(parseTrainingDate("2026-08-14T05:00:00+05:00")).toEqual({ year: 2026, month: 8, day: 14 });
    expect(parseTrainingDate("2026-08-14T23:30:00-05:00")).toEqual({ year: 2026, month: 8, day: 14 });
    expect(parseTrainingDate("2026-08-14T00:00:00.000Z")).toEqual({ year: 2026, month: 8, day: 14 });
  });

  it("returns null for empty or unreadable values", () => {
    expect(parseTrainingDate(null)).toBeNull();
    expect(parseTrainingDate(undefined)).toBeNull();
    expect(parseTrainingDate("")).toBeNull();
    expect(parseTrainingDate("14.08.2026")).toBeNull();
    expect(parseTrainingDate("tomorrow")).toBeNull();
  });
});

describe("formatTrainingDate", () => {
  it("formats as DD.MM.YYYY", () => {
    expect(formatTrainingDate("2026-08-14")).toBe("14.08.2026");
    expect(formatTrainingDate("2026-01-05T05:00:00+05:00")).toBe("05.01.2026");
  });

  it("shows a dash when there is no date", () => {
    expect(formatTrainingDate(null)).toBe("—");
    expect(formatTrainingDate(undefined)).toBe("—");
    expect(formatTrainingDate("nonsense")).toBe("—");
  });
});

describe("addMonthsToIsoDate", () => {
  it("adds whole months to a plain date", () => {
    expect(addMonthsToIsoDate("2026-03-15", 3)).toBe("2026-06-15");
    expect(addMonthsToIsoDate("2026-03-15", 0)).toBe("2026-03-15");
  });

  it("rolls over into the next year", () => {
    expect(addMonthsToIsoDate("2026-11-10", 3)).toBe("2027-02-10");
    expect(addMonthsToIsoDate("2026-12-01", 1)).toBe("2027-01-01");
    expect(addMonthsToIsoDate("2026-01-01", 24)).toBe("2028-01-01");
  });

  it("clamps a day that does not exist in the target month to its last day", () => {
    expect(addMonthsToIsoDate("2026-01-31", 1)).toBe("2026-02-28");
    expect(addMonthsToIsoDate("2026-03-31", 1)).toBe("2026-04-30");
    expect(addMonthsToIsoDate("2026-11-30", 3)).toBe("2027-02-28");
  });

  it("clamps to Feb 29 in a leap year", () => {
    expect(addMonthsToIsoDate("2024-01-31", 1)).toBe("2024-02-29");
    expect(addMonthsToIsoDate("2024-02-29", 12)).toBe("2025-02-28");
    expect(addMonthsToIsoDate("2024-02-29", 48)).toBe("2028-02-29");
  });

  it("goes back for a negative number of months", () => {
    expect(addMonthsToIsoDate("2026-01-15", -1)).toBe("2025-12-15");
  });

  it("uses only the date part of a full datetime", () => {
    expect(addMonthsToIsoDate("2026-08-14T05:00:00+05:00", 3)).toBe("2026-11-14");
  });

  it("returns null for an unreadable date or a non-finite month count", () => {
    expect(addMonthsToIsoDate("", 1)).toBeNull();
    expect(addMonthsToIsoDate("soon", 1)).toBeNull();
    expect(addMonthsToIsoDate("2026-03-15", Number.NaN)).toBeNull();
    expect(addMonthsToIsoDate("2026-03-15", Infinity)).toBeNull();
  });
});
