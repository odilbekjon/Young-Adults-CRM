import { describe, expect, it } from "vitest";
import {
  MONEY_MAX_DIGITS, caretAfterDigits, editMoney, formatMoney, moneyDigits, moneyPasteDigits, moneyToDigits, pasteMoney,
} from "../moneyInput";

describe("formatMoney", () => {
  it("groups the digits by thousands with a regular space", () => {
    expect(formatMoney("0")).toBe("0");
    expect(formatMoney("999")).toBe("999");
    expect(formatMoney("1000")).toBe("1 000");
    expect(formatMoney("300000")).toBe("300 000");
    expect(formatMoney("1250000")).toBe("1 250 000");
    expect(formatMoney("999999999999")).toBe("999 999 999 999");
  });

  it("uses U+0020, never a non-breaking space", () => {
    expect(formatMoney("1250000")).not.toMatch(/[\u00a0\u202f]/);
  });

  it("is empty for an empty value and ignores anything that is not a digit", () => {
    expect(formatMoney("")).toBe("");
    expect(formatMoney("1 250abc000")).toBe("1 250 000");
  });
});

describe("moneyDigits", () => {
  it("keeps ASCII digits only", () => {
    expect(moneyDigits("1 250 000")).toBe("1250000");
    expect(moneyDigits("1\u00a0250\u202f000")).toBe("1250000");
    expect(moneyDigits("-1e5,5.5 UZS")).toBe("1555");
    expect(moneyDigits("")).toBe("");
  });
});

describe("moneyToDigits (prefill)", () => {
  it("turns a stored amount into the field's value", () => {
    expect(moneyToDigits(300000)).toBe("300000");
    expect(moneyToDigits(1250000)).toBe("1250000");
  });

  it("rounds a stored fraction to a whole sum", () => {
    expect(moneyToDigits(1500.5)).toBe("1501");
    expect(moneyToDigits(1500.4)).toBe("1500");
  });

  it("gives an empty field for zero, negative, missing or unusable amounts", () => {
    expect(moneyToDigits(0)).toBe("");
    expect(moneyToDigits(-5)).toBe("");
    expect(moneyToDigits(NaN)).toBe("");
    expect(moneyToDigits(Infinity)).toBe("");
    expect(moneyToDigits(null)).toBe("");
    expect(moneyToDigits(undefined)).toBe("");
    expect(moneyToDigits(1e21)).toBe("");
  });
});

describe("caretAfterDigits", () => {
  it("is the index right behind the n-th digit, skipping separators", () => {
    expect(caretAfterDigits("1 250 000", 0)).toBe(0);
    expect(caretAfterDigits("1 250 000", 1)).toBe(1);
    expect(caretAfterDigits("1 250 000", 2)).toBe(3);
    expect(caretAfterDigits("1 250 000", 4)).toBe(5);
    expect(caretAfterDigits("1 250 000", 5)).toBe(7);
    expect(caretAfterDigits("1 250 000", 7)).toBe(9);
  });

  it("clamps to the ends", () => {
    expect(caretAfterDigits("1 250", -3)).toBe(0);
    expect(caretAfterDigits("1 250", 99)).toBe(5);
    expect(caretAfterDigits("", 2)).toBe(0);
  });
});

describe("editMoney - typing", () => {
  it("groups as digits are typed at the end and keeps the caret at the end", () => {
    expect(editMoney("3", 1)).toEqual({ digits: "3", text: "3", caret: 1 });
    expect(editMoney("3000", 4)).toEqual({ digits: "3000", text: "3 000", caret: 5 });
    expect(editMoney("300000", 6)).toEqual({ digits: "300000", text: "300 000", caret: 7 });
    expect(editMoney("1 250 0000", 10)).toEqual({ digits: "12500000", text: "12 500 000", caret: 10 });
  });

  it("typing in the middle keeps the caret behind the typed digit, not at the end", () => {
    // "1 250 000", caret after the "2", type "9": the browser gives "1 2950 000", caret 4
    expect(editMoney("1 2950 000", 4)).toEqual({ digits: "12950000", text: "12 950 000", caret: 4 });
    // caret in front of everything, type "7"
    expect(editMoney("71 250 000", 1)).toEqual({ digits: "71250000", text: "71 250 000", caret: 1 });
  });

  it("moves the caret across a separator that appears right behind it", () => {
    // "1 |000", type "5" -> raw "1 5000", caret 3 -> digits 15000 -> "15 000", caret behind the 2nd digit
    expect(editMoney("1 5000", 3)).toEqual({ digits: "15000", text: "15 000", caret: 2 });
    // "99|9", type "1" -> raw "9919", caret 3 -> "9 919", caret behind the 3rd digit
    expect(editMoney("9919", 3)).toEqual({ digits: "9919", text: "9 919", caret: 4 });
  });

  it("ignores letters, minus, e, plus and separators and keeps the caret where it was", () => {
    // typed "x" at caret 2 of "1 250": raw "1 x250", caret 3
    expect(editMoney("1 x250", 3)).toEqual({ digits: "1250", text: "1 250", caret: 1 });
    expect(editMoney("-", 1)).toEqual({ digits: "", text: "", caret: 0 });
    expect(editMoney("5e", 2)).toEqual({ digits: "5", text: "5", caret: 1 });
    expect(editMoney("1,", 2)).toEqual({ digits: "1", text: "1", caret: 1 });
    expect(editMoney("1.5", 3)).toEqual({ digits: "15", text: "15", caret: 2 });
  });

  it("an empty field stays empty", () => {
    expect(editMoney("", 0)).toEqual({ digits: "", text: "", caret: 0 });
  });

  it("a caret outside the text is clamped", () => {
    expect(editMoney("12", 99)).toEqual({ digits: "12", text: "12", caret: 2 });
    expect(editMoney("12", -4)).toEqual({ digits: "12", text: "12", caret: 0 });
  });
});

describe("editMoney - leading zeros", () => {
  it('a lone "0" stays "0"', () => {
    expect(editMoney("0", 1)).toEqual({ digits: "0", text: "0", caret: 1 });
  });

  it('"007" becomes "7" and "000" becomes "0"', () => {
    expect(editMoney("007", 3)).toEqual({ digits: "7", text: "7", caret: 1 });
    expect(editMoney("000", 3)).toEqual({ digits: "0", text: "0", caret: 1 });
    expect(editMoney("0300000", 7)).toEqual({ digits: "300000", text: "300 000", caret: 7 });
  });

  it('typing after the "0" replaces it', () => {
    expect(editMoney("05", 2)).toEqual({ digits: "5", text: "5", caret: 1 });
  });

  it('typing "0" in front of a number does not change it and keeps the caret in front', () => {
    expect(editMoney("0500", 1)).toEqual({ digits: "500", text: "500", caret: 0 });
  });
});

describe("editMoney - deleting", () => {
  it("Backspace / Delete on a digit in the middle keeps the caret there", () => {
    // "1 250 000", caret after the "5" (index 4), Backspace -> browser: "1 20 000", caret 3
    expect(editMoney("1 20 000", 3, { previousDigits: "1250000", deletion: "backward" }))
      .toEqual({ digits: "120000", text: "120 000", caret: 2 });
    // caret before the "5", Delete -> browser: "1 20 000", caret 3
    expect(editMoney("1 20 000", 3, { previousDigits: "1250000", deletion: "forward" }))
      .toEqual({ digits: "120000", text: "120 000", caret: 2 });
  });

  it("regroups and keeps the caret behind the same digits when a digit is deleted", () => {
    // "1 000", caret after the first "0" (index 3), Backspace -> browser: "1 00", caret 2
    expect(editMoney("1 00", 2, { previousDigits: "1000", deletion: "backward" }))
      .toEqual({ digits: "100", text: "100", caret: 1 });
  });

  it("Backspace right behind a space deletes the digit before it instead of doing nothing", () => {
    // "1 250 000", caret after the first space (index 2), Backspace -> browser removes the space: "1250 000", caret 1
    expect(editMoney("1250 000", 1, { previousDigits: "1250000", deletion: "backward" }))
      .toEqual({ digits: "250000", text: "250 000", caret: 0 });
    // caret after the second space (index 6), Backspace -> browser: "1 250000", caret 5; the "0" before the space goes
    expect(editMoney("1 250000", 5, { previousDigits: "1250000", deletion: "backward" }))
      .toEqual({ digits: "125000", text: "125 000", caret: 3 });
  });

  it("Delete right in front of a space deletes the digit after it", () => {
    // "1 250 000", caret before the first space (index 1), Delete -> browser: "1250 000", caret 1
    expect(editMoney("1250 000", 1, { previousDigits: "1250000", deletion: "forward" }))
      .toEqual({ digits: "150000", text: "150 000", caret: 1 });
  });

  it("a separator-only deletion at the very ends deletes nothing", () => {
    expect(editMoney("1250000", 0, { previousDigits: "1250000", deletion: "backward" }))
      .toEqual({ digits: "1250000", text: "1 250 000", caret: 0 });
    expect(editMoney("1250000", 7, { previousDigits: "1250000", deletion: "forward" }))
      .toEqual({ digits: "1250000", text: "1 250 000", caret: 9 });
  });

  it("without the deletion hint an unchanged number stays unchanged", () => {
    expect(editMoney("1250 000", 1, { previousDigits: "1250000" }))
      .toEqual({ digits: "1250000", text: "1 250 000", caret: 1 });
  });

  it("clearing the field gives an empty value", () => {
    expect(editMoney("", 0, { previousDigits: "5", deletion: "backward" })).toEqual({ digits: "", text: "", caret: 0 });
  });

  it("deleting a selection spanning separators works like any other edit", () => {
    // select "250 0" of "1 250 000" and press Delete -> browser: "1 00", caret 2
    expect(editMoney("1 00", 2, { previousDigits: "1250000", deletion: "forward" }))
      .toEqual({ digits: "100", text: "100", caret: 1 });
  });
});

describe("editMoney - max length", () => {
  const max = "9".repeat(MONEY_MAX_DIGITS);

  it("is 12 digits - well inside what Number() keeps exact", () => {
    expect(MONEY_MAX_DIGITS).toBe(12);
    expect(Number(max)).toBe(999999999999);
  });

  it("accepts exactly the limit", () => {
    expect(editMoney(max, max.length).digits).toBe(max);
  });

  it("rejects a digit typed at the end of a full field", () => {
    const edit = editMoney(`${max}1`, max.length + 1);
    expect(edit.digits).toBe(max);
    expect(edit.caret).toBe(edit.text.length);
  });

  it("rejects a digit typed in the middle of a full field, without shifting the rest", () => {
    // "1234|56789012" + typed "7" after the 4th digit
    const edit = editMoney("123475678901 2".replace(" ", ""), 5);
    expect(edit.digits).toBe("123456789012");
    expect(edit.caret).toBe(caretAfterDigits(edit.text, 4));
  });

  it("cuts the overflow of a long text off the end", () => {
    expect(editMoney("1234567890123456", 0).digits).toBe("123456789012");
  });

  it("honours a custom limit", () => {
    expect(editMoney("12345", 5, { maxDigits: 4 }).digits).toBe("1234");
  });
});

describe("moneyPasteDigits", () => {
  it.each([
    ["300 000", "300000"],
    ["300,000", "300000"],
    ["300.000", "300000"],
    ["300000", "300000"],
    ["1,250,000", "1250000"],
    ["1.250.000", "1250000"],
    ["1\u00a0250\u00a0000", "1250000"],
    ["1\u202f250\u202f000", "1250000"],
    ["  1 250 000  ", "1250000"],
    ["300 000 UZS", "300000"],
    ["UZS 300 000", "300000"],
    ["300 000 so'm", "300000"],
    ["300000 сум", "300000"],
    ["-300000", "300000"],
  ])("%j -> %j", (pasted, expected) => {
    expect(moneyPasteDigits(pasted)).toBe(expected);
  });

  it("drops a fraction instead of reading its digits as part of the number", () => {
    expect(moneyPasteDigits("1 500,50")).toBe("1500");
    expect(moneyPasteDigits("1500.50")).toBe("1500");
    expect(moneyPasteDigits("300 000,00")).toBe("300000");
    expect(moneyPasteDigits("300,000.00")).toBe("300000");
    expect(moneyPasteDigits("2,5")).toBe("2");
  });

  it("gives nothing for text without digits", () => {
    expect(moneyPasteDigits("")).toBe("");
    expect(moneyPasteDigits("abc")).toBe("");
    expect(moneyPasteDigits("-.,")).toBe("");
  });
});

describe("pasteMoney", () => {
  it("pastes into an empty field", () => {
    expect(pasteMoney("", 0, 0, "300,000")).toEqual({ digits: "300000", text: "300 000", caret: 7 });
    expect(pasteMoney("", 0, 0, "300 000")).toEqual({ digits: "300000", text: "300 000", caret: 7 });
    expect(pasteMoney("", 0, 0, "300000")).toEqual({ digits: "300000", text: "300 000", caret: 7 });
  });

  it("pastes at the caret and leaves the caret behind the pasted digits", () => {
    // "1 000" with the caret after the "1", paste "250"
    expect(pasteMoney("1 000", 1, 1, "250")).toEqual({ digits: "1250000", text: "1 250 000", caret: 5 });
  });

  it("replaces the selection", () => {
    // select "250" of "1 250 000" (indexes 2..5), paste "7"
    expect(pasteMoney("1 250 000", 2, 5, "7")).toEqual({ digits: "17000", text: "17 000", caret: 2 });
    // select everything
    expect(pasteMoney("1 250 000", 0, 9, "5 000")).toEqual({ digits: "5000", text: "5 000", caret: 5 });
  });

  it("does nothing for text without digits", () => {
    expect(pasteMoney("1 000", 0, 5, "abc")).toBeNull();
    expect(pasteMoney("1 000", 0, 5, "")).toBeNull();
  });

  it("normalises leading zeros of the result", () => {
    expect(pasteMoney("", 0, 0, "007")).toEqual({ digits: "7", text: "7", caret: 1 });
  });

  it("trims what does not fit, keeping what was already there", () => {
    expect(pasteMoney("1 000", 5, 5, "9".repeat(20))?.digits).toBe(`1000${"9".repeat(8)}`);
    expect(pasteMoney("", 0, 0, "1".repeat(20))?.digits).toBe("1".repeat(12));
  });

  it("tolerates an out-of-range selection", () => {
    expect(pasteMoney("12", 50, 99, "3")?.digits).toBe("123");
    expect(pasteMoney("12", 2, 0, "3")?.digits).toBe("123");
  });
});

describe("decimals decision", () => {
  it("whole sums only: a typed separator never becomes a fraction", () => {
    expect(editMoney("1500.5", 6).digits).toBe("15005");
    expect(editMoney("1500,5", 6).digits).toBe("15005");
  });

  it("everything the field emits is a plain integer string Number() reads exactly", () => {
    for (const raw of ["300 000", "1 250 000", "007", "999999999999", "1,5", "1e5"]) {
      const { digits } = editMoney(raw, raw.length);
      expect(digits).toMatch(/^\d*$/);
      expect(Number.isSafeInteger(Number(digits))).toBe(true);
    }
  });
});
