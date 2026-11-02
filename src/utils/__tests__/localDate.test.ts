import { afterEach, describe, expect, it, vi } from "vitest";
import { toLocalISODate, todayLocalISO } from "../localDate";

describe("toLocalISODate", () => {
  it("formats the local calendar day with zero-padded month and day", () => {
    expect(toLocalISODate(new Date(2026, 0, 5, 12, 0))).toBe("2026-01-05");
    expect(toLocalISODate(new Date(2026, 10, 30, 12, 0))).toBe("2026-11-30");
  });

  it("keeps the local day just after midnight, where the UTC day is still the previous one", () => {
    // 02:00 on 1 March in the viewer's own timezone.
    const justAfterMidnight = new Date(2026, 2, 1, 2, 0, 0);
    expect(toLocalISODate(justAfterMidnight)).toBe("2026-03-01");
  });

  it("keeps the local day just before midnight", () => {
    expect(toLocalISODate(new Date(2026, 11, 31, 23, 59, 59))).toBe("2026-12-31");
    expect(toLocalISODate(new Date(2027, 0, 1, 0, 0, 0))).toBe("2027-01-01");
  });

  it("handles a leap day", () => {
    expect(toLocalISODate(new Date(2028, 1, 29, 1, 0))).toBe("2028-02-29");
  });

  it("differs from the UTC date during the early hours in a UTC+ zone (why the helper exists)", () => {
    // The suite runs in Asia/Tashkent (UTC+5, see vitest.config.ts): 02:00
    // local is 21:00 UTC of the previous day.
    const d = new Date(2026, 2, 1, 2, 0, 0);
    expect(d.toISOString().slice(0, 10)).toBe("2026-02-28");
    expect(toLocalISODate(d)).toBe("2026-03-01");
  });
});

describe("todayLocalISO", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("follows the system clock", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 5, 15, 9, 30));
    expect(todayLocalISO()).toBe("2026-06-15");

    vi.setSystemTime(new Date(2026, 5, 16, 0, 0, 1));
    expect(todayLocalISO()).toBe("2026-06-16");
  });

  it("is the local day at 01:30 even though UTC is still the day before", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 8, 1, 1, 30));
    expect(todayLocalISO()).toBe("2026-09-01");
  });
});
