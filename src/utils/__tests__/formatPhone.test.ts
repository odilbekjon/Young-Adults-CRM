import { describe, expect, it } from "vitest";
import { formatPhone, formatPhoneSpaced, fromPhoneInput, toPhoneInput } from "../formatPhone";

// The same Uzbek mobile number written the ways it reaches the UI.
const SAME_NUMBER = ["+998915179774", "998915179774", "998 91 517 97 74", "915179774", "91 517 97 74", "(91) 517-97-74", "+998 (91) 517-97-74"];

describe("formatPhoneSpaced", () => {
  it("shows 91 517 97 74 for every spelling of the number, without +998", () => {
    for (const raw of SAME_NUMBER) {
      expect(formatPhoneSpaced(raw)).toBe("91 517 97 74");
    }
  });

  it("never contains the country code or brackets", () => {
    const out = formatPhoneSpaced("+998915179774");
    expect(out).not.toContain("998");
    expect(out).not.toContain("+");
    expect(out).not.toMatch(/[()-]/);
  });

  it("returns an empty string for empty values", () => {
    expect(formatPhoneSpaced("")).toBe("");
    expect(formatPhoneSpaced(null)).toBe("");
    expect(formatPhoneSpaced(undefined)).toBe("");
  });

  it("returns a value that is not an Uzbek mobile number untouched", () => {
    expect(formatPhoneSpaced("12345")).toBe("12345");
    expect(formatPhoneSpaced("not a phone")).toBe("not a phone");
    // 12 digits, but not a +998 number
    expect(formatPhoneSpaced("+441234567890")).toBe("+441234567890");
  });
});

describe("formatPhone", () => {
  it("shows (91) 517-97-74 for every spelling of the number", () => {
    for (const raw of SAME_NUMBER) {
      expect(formatPhone(raw)).toBe("(91) 517-97-74");
    }
  });

  it("returns empty input as an empty string and unknown shapes untouched", () => {
    expect(formatPhone(null)).toBe("");
    expect(formatPhone(undefined)).toBe("");
    expect(formatPhone("")).toBe("");
    expect(formatPhone("12345")).toBe("12345");
  });
});

describe("toPhoneInput / fromPhoneInput", () => {
  it("strips the fixed +998 prefix for the edit input", () => {
    expect(toPhoneInput("+998950640912")).toBe("950640912");
    expect(toPhoneInput("998950640912")).toBe("950640912");
    expect(toPhoneInput("950640912")).toBe("950640912");
  });

  it("gives an empty input for an empty value", () => {
    expect(toPhoneInput(null)).toBe("");
    expect(toPhoneInput(undefined)).toBe("");
    expect(toPhoneInput("")).toBe("");
  });

  it("puts +998 back for the request", () => {
    expect(fromPhoneInput("950640912")).toBe("+998950640912");
    expect(fromPhoneInput("95 064 09 12")).toBe("+998950640912");
    expect(fromPhoneInput("+998 95 064 09 12")).toBe("+998950640912");
  });

  it("sends an empty string for an empty input", () => {
    expect(fromPhoneInput("")).toBe("");
    expect(fromPhoneInput("   ")).toBe("");
    expect(fromPhoneInput("abc")).toBe("");
  });

  it("round-trips a stored number", () => {
    expect(fromPhoneInput(toPhoneInput("+998950640912"))).toBe("+998950640912");
  });
});
