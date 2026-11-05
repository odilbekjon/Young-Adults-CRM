import { describe, expect, it } from "vitest";
import { cleanIdentifier, formatPhone, formatPhoneSpaced, fromPhoneInput, loginIdentifierCandidates, toPhoneInput } from "../formatPhone";

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

describe("cleanIdentifier", () => {
  it("drops surrounding blanks, the no-break space and invisible paste characters", () => {
    expect(cleanIdentifier("  90 123 45 67  ")).toBe("90 123 45 67");
    expect(cleanIdentifier("  +998901234567 ")).toBe("+998901234567");
    expect(cleanIdentifier("‎+998901234567​﻿")).toBe("+998901234567");
  });
});

describe("loginIdentifierCandidates", () => {
  const CANONICAL = ["+998901234567", "901234567"];

  it("sends a phone as +998 and 9 digits first, then as the bare 9 digits, however it was typed", () => {
    for (const raw of ["901234567", "90 123 45 67", "+998901234567", "998 90 123 45 67", "+998 (90) 123-45-67", " 90 123 45 67 "]) {
      const [first, second, ...rest] = loginIdentifierCandidates(raw);
      expect([first, second]).toEqual(CANONICAL);
      // The only other spelling worth trying is the one as typed.
      expect(rest.length).toBeLessThanOrEqual(1);
    }
  });

  it("does not repeat a spelling", () => {
    expect(loginIdentifierCandidates("901234567")).toEqual(CANONICAL);
    expect(loginIdentifierCandidates("+998901234567")).toEqual(["+998901234567", "901234567"]);
  });

  it("falls back to the number as typed, for a phone saved with spaces before the forms normalized it", () => {
    expect(loginIdentifierCandidates("90 123 45 67")).toEqual(["+998901234567", "901234567", "90 123 45 67"]);
  });

  it("keeps an email as typed, then lower-cased, without ever turning it into a phone", () => {
    expect(loginIdentifierCandidates("  teacher@school.uz ")).toEqual(["teacher@school.uz"]);
    expect(loginIdentifierCandidates("Teacher@School.uz")).toEqual(["Teacher@School.uz", "teacher@school.uz"]);
    // all digits before the @ must not be read as a phone number
    expect(loginIdentifierCandidates("901234567@mail.uz")).toEqual(["901234567@mail.uz"]);
  });

  it("passes on anything that is not an Uzbek mobile number untouched", () => {
    expect(loginIdentifierCandidates("12345")).toEqual(["12345"]);
    expect(loginIdentifierCandidates("+441234567890")).toEqual(["+441234567890"]);
    expect(loginIdentifierCandidates("some.user")).toEqual(["some.user"]);
  });

  it("has nothing to try for a blank value", () => {
    expect(loginIdentifierCandidates("")).toEqual([]);
    expect(loginIdentifierCandidates("     ")).toEqual([]);
  });

  it("agrees with what the forms save: the first candidate is what fromPhoneInput produces", () => {
    expect(loginIdentifierCandidates("90 123 45 67")[0]).toBe(fromPhoneInput("90 123 45 67"));
  });
});
