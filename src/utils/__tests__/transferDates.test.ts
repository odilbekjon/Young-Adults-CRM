import { describe, expect, it } from "vitest";
import { dayBefore, transferEndDate } from "../transferDates";

describe("dayBefore", () => {
  it("is the previous calendar day", () => {
    expect(dayBefore("2026-11-06")).toBe("2026-11-05");
  });

  it("crosses month and year ends", () => {
    expect(dayBefore("2026-11-01")).toBe("2026-10-31");
    expect(dayBefore("2026-03-01")).toBe("2026-02-28");
    expect(dayBefore("2028-03-01")).toBe("2028-02-29"); // a leap year
    expect(dayBefore("2027-01-01")).toBe("2026-12-31");
  });

  it("reads only the date of a full timestamp", () => {
    expect(dayBefore("2026-11-06T00:00:00+05:00")).toBe("2026-11-05");
  });
});

describe("transferEndDate: the last day payment is calculated in the old group", () => {
  it("is the day before the student leaves", () => {
    expect(transferEndDate("2026-11-06", "2026-09-01")).toBe("2026-11-05");
  });

  it("covers a move dated in the past: the old group is not billed up to today as well", () => {
    // Today is 6 November, the student leaves on the 2nd.
    expect(transferEndDate("2026-11-02", "2026-10-01")).toBe("2026-11-01");
  });

  it("covers a move dated in the future", () => {
    expect(transferEndDate("2026-12-01", "2026-10-01")).toBe("2026-11-30");
  });

  it("allows ending the old group on its very first day", () => {
    expect(transferEndDate("2026-11-02", "2026-11-01")).toBe("2026-11-01");
  });

  it("gives no end date when the move is on or before the day payment began there", () => {
    // Joined and moved on the same day: there is no day left to bill in the old group.
    expect(transferEndDate("2026-11-06", "2026-11-06")).toBeUndefined();
    expect(transferEndDate("2026-11-01", "2026-11-06")).toBeUndefined();
  });

  it("reads the old start from a full timestamp too", () => {
    expect(transferEndDate("2026-11-06", "2026-11-06T00:00:00+05:00")).toBeUndefined();
    expect(transferEndDate("2026-11-06", "2026-10-01T00:00:00.000Z")).toBe("2026-11-05");
  });

  it("gives the end date when the old start is not known", () => {
    expect(transferEndDate("2026-11-06")).toBe("2026-11-05");
    expect(transferEndDate("2026-11-06", null)).toBe("2026-11-05");
  });
});
