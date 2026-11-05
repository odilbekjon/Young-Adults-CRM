import { describe, expect, it } from "vitest";
import type { FreezeRange } from "../../app/api/attendancesApi/types";
import { isFrozenOn, rollCallDay } from "../freezeRanges";

const range = (startDate: string, endDate: string | null, status: string | null = "ACTIVE"): FreezeRange => ({
  id: `f-${startDate}`, startDate, endDate, reason: null, status,
});

const TODAY = "2026-11-03";

describe("isFrozenOn", () => {
  it("is frozen from the start day up to and including the end day", () => {
    const ranges = [range("2026-10-10", "2026-10-20", "EXPIRED")];

    expect(isFrozenOn(ranges, "2026-10-09", TODAY)).toBe(false);
    expect(isFrozenOn(ranges, "2026-10-10", TODAY)).toBe(true);
    expect(isFrozenOn(ranges, "2026-10-20", TODAY)).toBe(true);
    expect(isFrozenOn(ranges, "2026-10-21", TODAY)).toBe(false);
  });

  it("stays frozen for as long as the freeze has no end", () => {
    const ranges = [range("2026-10-10", null)];

    expect(isFrozenOn(ranges, TODAY, TODAY)).toBe(true);
    expect(isFrozenOn(ranges, "2026-12-01", TODAY)).toBe(true);
    expect(isFrozenOn(ranges, "2026-10-09", TODAY)).toBe(false);
  });

  it("is not frozen with no freezes at all", () => {
    expect(isFrozenOn([], TODAY, TODAY)).toBe(false);
  });

  it("finds the freeze that matters among several", () => {
    const ranges = [range("2026-09-01", "2026-09-01", "EXPIRED"), range("2026-10-20", null)];

    expect(isFrozenOn(ranges, "2026-09-01", TODAY)).toBe(true);
    expect(isFrozenOn(ranges, "2026-09-15", TODAY)).toBe(false);
    expect(isFrozenOn(ranges, TODAY, TODAY)).toBe(true);
  });

  it("counts a freeze that has since expired for the days it was in force", () => {
    const ranges = [range("2026-09-01", "2026-09-30", "EXPIRED")];

    expect(isFrozenOn(ranges, "2026-09-30", TODAY)).toBe(true);
  });

  it("treats a freeze marked ended as over from today on, even on its own end day", () => {
    const lifted = [range("2026-10-20", TODAY, "EXPIRED")];

    expect(isFrozenOn(lifted, TODAY, TODAY)).toBe(false);
    expect(isFrozenOn(lifted, "2026-11-02", TODAY)).toBe(true);
  });

  it("does not take a freeze that has not started for a frozen student", () => {
    expect(isFrozenOn([range("2026-11-10", null)], TODAY, TODAY)).toBe(false);
  });

  it("reads a missing status by its dates alone", () => {
    expect(isFrozenOn([range("2026-10-20", null, null)], TODAY, TODAY)).toBe(true);
  });
});

describe("rollCallDay", () => {
  const MONTH = ["2026-11-01", "2026-11-30"] as const;

  it("is today for the month on screen", () => {
    expect(rollCallDay(...MONTH, "2026-11-15")).toBe("2026-11-15");
    expect(rollCallDay(...MONTH, "2026-11-01")).toBe("2026-11-01");
    expect(rollCallDay(...MONTH, "2026-11-30")).toBe("2026-11-30");
  });

  it("is the last day of a month that is over", () => {
    expect(rollCallDay(...MONTH, "2026-12-02")).toBe("2026-11-30");
  });

  it("is the first day of a month that has not started", () => {
    expect(rollCallDay(...MONTH, "2026-10-28")).toBe("2026-11-01");
  });
});
