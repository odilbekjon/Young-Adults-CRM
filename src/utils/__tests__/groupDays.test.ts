import { describe, expect, it } from "vitest";
import type { GroupDay } from "../../app/api/groupsApi/types";
import { classifyDayList, classifyDays, DAYS_PRESETS, TIME_OPTIONS } from "../groupDays";

describe("DAYS_PRESETS", () => {
  it("defines odd days as Mon/Wed/Fri and even days as Tue/Thu/Sat", () => {
    expect(DAYS_PRESETS["Odd days"]).toEqual(["MONDAY", "WEDNESDAY", "FRIDAY"]);
    expect(DAYS_PRESETS["Even days"]).toEqual(["TUESDAY", "THURSDAY", "SATURDAY"]);
  });

  it("defines weekend days as Sat+Sun and every day as all seven", () => {
    expect(DAYS_PRESETS["Weekend days"]).toEqual(["SATURDAY", "SUNDAY"]);
    expect(DAYS_PRESETS["Every day"]).toHaveLength(7);
    expect(new Set(DAYS_PRESETS["Every day"]).size).toBe(7);
  });
});

describe("classifyDayList", () => {
  it("maps each preset back to its name", () => {
    for (const [name, days] of Object.entries(DAYS_PRESETS)) {
      expect(classifyDayList(days)).toBe(name);
    }
  });

  it("ignores the order of the days", () => {
    expect(classifyDayList(["FRIDAY", "MONDAY", "WEDNESDAY"])).toBe("Odd days");
    expect(classifyDayList(["SUNDAY", "SATURDAY"])).toBe("Weekend days");
  });

  it("returns an empty string for no days and Other for a custom selection", () => {
    expect(classifyDayList([])).toBe("");
    expect(classifyDayList(["MONDAY"])).toBe("Other");
    // a subset of a preset is not that preset
    expect(classifyDayList(["MONDAY", "WEDNESDAY"])).toBe("Other");
    // same size as a preset but different days
    expect(classifyDayList(["MONDAY", "WEDNESDAY", "SATURDAY"])).toBe("Other");
  });
});

describe("classifyDays", () => {
  const every = DAYS_PRESETS["Every day"];

  it("calls seven days Every day whatever the backend daysType says", () => {
    expect(classifyDays("ODD", every)).toBe("Every day");
    expect(classifyDays("", every)).toBe("Every day");
  });

  it("infers Weekend days from the concrete list", () => {
    expect(classifyDays("", ["SATURDAY", "SUNDAY"])).toBe("Weekend days");
    expect(classifyDays("", ["SUNDAY"])).toBe("Weekend days");
  });

  it("takes EVEN and ODD straight from the backend daysType", () => {
    expect(classifyDays("EVEN", DAYS_PRESETS["Even days"])).toBe("Even days");
    expect(classifyDays("ODD", DAYS_PRESETS["Odd days"])).toBe("Odd days");
  });

  it("falls back to Other for an unknown daysType or a list without a type", () => {
    expect(classifyDays("CUSTOM", ["MONDAY"] as GroupDay[])).toBe("Other");
    expect(classifyDays("", ["MONDAY", "THURSDAY"])).toBe("Other");
  });

  it("shows a dash when there is no schedule at all", () => {
    expect(classifyDays("", [])).toBe("—");
  });
});

describe("TIME_OPTIONS", () => {
  it("lists every full hour from 08:00 to 20:00", () => {
    expect(TIME_OPTIONS).toHaveLength(13);
    expect(TIME_OPTIONS[0]).toBe("08:00");
    expect(TIME_OPTIONS[1]).toBe("09:00");
    expect(TIME_OPTIONS[TIME_OPTIONS.length - 1]).toBe("20:00");
  });
});
