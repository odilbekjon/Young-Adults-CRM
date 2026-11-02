import { describe, expect, it } from "vitest";
import i18n from "../../../i18n";
import { GROUP_STATUS_STYLE, toGroupStatus } from "./groupStatus";

describe("toGroupStatus", () => {
  it("recognizes the five membership statuses", () => {
    for (const status of ["PROBATION", "ACTIVE", "FROZEN", "INACTIVE", "DELETED"]) {
      expect(toGroupStatus(status)).toBe(status);
    }
  });

  it("returns undefined for anything else, so an unknown value is never mistaken for a status", () => {
    expect(toGroupStatus("ARCHIVED")).toBeUndefined();
    expect(toGroupStatus("COMPLETED")).toBeUndefined();
    expect(toGroupStatus("probation")).toBeUndefined(); // case-sensitive: callers get the backend's upper-case value
    expect(toGroupStatus("")).toBeUndefined();
    expect(toGroupStatus(null)).toBeUndefined();
    expect(toGroupStatus(undefined)).toBeUndefined();
  });
});

describe("GROUP_STATUS_STYLE", () => {
  it("paints a trial lesson light sky-blue with dark text", () => {
    expect(GROUP_STATUS_STYLE.PROBATION.background).toBe("#bfe3fa");
    expect(GROUP_STATUS_STYLE.PROBATION.color).toBe("#1a2332");
  });

  it("paints a frozen member dark blue with white text", () => {
    expect(GROUP_STATUS_STYLE.FROZEN.background).toBe("#1e4d8c");
    expect(GROUP_STATUS_STYLE.FROZEN.color).toBe("#ffffff");
  });

  it("gives trial, active and frozen three different backgrounds", () => {
    const backgrounds = [GROUP_STATUS_STYLE.PROBATION, GROUP_STATUS_STYLE.ACTIVE, GROUP_STATUS_STYLE.FROZEN].map((s) => s.background);
    expect(new Set(backgrounds).size).toBe(3);
  });

  it("shows left-the-group members (INACTIVE and DELETED) with the same archived style", () => {
    expect(GROUP_STATUS_STYLE.INACTIVE).toEqual(GROUP_STATUS_STYLE.DELETED);
    expect(GROUP_STATUS_STYLE.INACTIVE.labelKey).toBe("singleGroup.studentHoverCard.groupStatus.archived");
  });

  it("points every status at a label that exists in the English translation", () => {
    for (const [status, style] of Object.entries(GROUP_STATUS_STYLE)) {
      expect(i18n.exists(style.labelKey, { lng: "en" }), `${status} -> ${style.labelKey}`).toBe(true);
    }
    expect(i18n.t(GROUP_STATUS_STYLE.PROBATION.labelKey, { lng: "en" })).toBe("Trial lesson (Probation)");
    expect(i18n.t(GROUP_STATUS_STYLE.FROZEN.labelKey, { lng: "en" })).toBe("Frozen");
  });
});
